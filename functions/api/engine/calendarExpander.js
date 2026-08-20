/**
 * Second AI pass: expand the strategy brain into real calendar days.
 *
 * The master prompt deliberately says "Do not write final calendar days.
 * Create the strategy brain that all pages can use." That is the right call —
 * one model call cannot write a coherent strategy AND thirty posts. But it
 * left deterministic code as the only thing that ever wrote a day, so calendar
 * variety was capped by template slots rather than by the strategy. Three
 * distinct shot directions across thirty days was the symptom.
 *
 * This module closes that gap. It asks the model to write the *content* of ten
 * days at a time, while the deterministic plan keeps ownership of the
 * *structure* (which platform, which format, which pillar, which objection on
 * which day). The model fills a plan it is not allowed to redesign.
 *
 * Every slice is validated before it is accepted. A slice that comes back
 * generic, duplicated, or malformed is discarded and the rule-based days for
 * that range are kept. Partial success is normal and fine: slices are
 * independent, so one bad slice costs ten days, not thirty.
 */
import { callControlledAi } from "../utils/controlled-ai.js";

export const CALENDAR_PROMPT_VERSION = "calendar_expand_v1";
const SLICE_SIZE = 10;
const TOTAL_DAYS = 30;

/** Phrases that mean nothing to a small business owner. */
const BANNED = [
  "leverage", "synergy", "unlock the power", "game changer", "game-changer",
  "take it to the next level", "in today's fast-paced", "elevate your brand",
  "digital landscape", "cutting-edge", "seamless experience", "robust solution",
];

/** Content fields the model owns. Everything else stays with the plan. */
const AI_FIELDS = ["topic", "hook", "what_to_show", "caption", "customer_action", "why_this_helps"];

const text = value => String(value ?? "").replace(/\s+/g, " ").trim();
const lower = value => text(value).toLowerCase();
const arr = value => (Array.isArray(value) ? value : []);

function normaliseKey(value) {
  return lower(value).replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean).join(" ");
}

/**
 * Structural facts the model must honour rather than invent. Sending these
 * keeps the model from quietly rewriting the distribution plan (all reels, all
 * one pillar) while it writes copy.
 */
function planFor(day) {
  return {
    day: Number(day?.day) || null,
    platform: text(day?.platform) || "Instagram",
    format: text(day?.post_type || day?.postType || day?.content_format) || "Post",
    objection: text(day?.customer_objection),
    persona: text(day?.target_customer),
    psychology: text(day?.marketing_psychology),
  };
}

function buildSlicePrompt({ businessFacts, brain, plan, startDay, endDay }) {
  const system = [
    "You are a senior marketing strategist writing a content calendar for a small business.",
    "Write like you are briefing the owner, not pitching them. Simple English. No jargon.",
    "Every day must be a DIFFERENT idea. Never restate another day's topic in new words.",
    "The hook is the first line the customer reads. It must NOT repeat the topic.",
    "Use only the supplied business facts. Do not invent locations, prices, awards or numbers.",
    `Never use these phrases: ${BANNED.join(", ")}.`,
    "Return valid JSON only. No markdown, no commentary, no trailing commas.",
  ].join(" ");

  const user = {
    task: `Write the content for days ${startDay} to ${endDay} of a 30-day calendar.`,
    rules: [
      "Keep every string under 220 characters.",
      "topic: what this post is about, in plain words.",
      "hook: the opening line the customer sees. Different from topic.",
      "what_to_show: what to physically film or photograph.",
      "caption: the post caption, written to be published as-is.",
      "customer_action: the one thing the customer should do next.",
      "why_this_helps: why this post exists, in business terms.",
    ],
    business: businessFacts,
    strategy_brain: brain,
    // The plan is fixed. The model writes copy for it, it does not redesign it.
    day_plan: plan,
    output_shape: {
      days: [{
        day: startDay,
        topic: "…", hook: "…", what_to_show: "…",
        caption: "…", customer_action: "…", why_this_helps: "…",
      }],
    },
  };

  return {
    input: { start_day: startDay, end_day: endDay, plan_hash: plan.map(p => p.day).join(",") },
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
  };
}

/** Trim the brain to what actually helps write a post. */
function compactBrain(masterStrategy) {
  return {
    positioning: text(masterStrategy?.positioning?.statement),
    promise: text(masterStrategy?.unique_value_proposition?.promise),
    tone: text(masterStrategy?.messaging?.tone),
    pillars: arr(masterStrategy?.content_pillars).slice(0, 8).map(p => ({
      pillar: text(p?.pillar),
      proof_needed: text(p?.proof_needed),
    })),
    objections: arr(masterStrategy?.customer_objections).slice(0, 8).map(o => ({
      objection: text(o?.objection),
      answer: text(o?.answer),
    })),
    personas: arr(masterStrategy?.target_personas).slice(0, 4).map(p => ({
      name: text(p?.name),
      need: text(p?.need),
    })),
    offers: arr(masterStrategy?.offers).slice(0, 3).map(o => text(o?.offer_name || o?.name || o)),
  };
}

/**
 * Accept a slice only if it is genuinely better than what we already have.
 * Returns { ok, reason }.
 */
export function validateSlice(days, { startDay, endDay, seenTopics = new Set() } = {}) {
  if (!Array.isArray(days)) return { ok: false, reason: "not an array" };

  const expected = endDay - startDay + 1;
  if (days.length !== expected) return { ok: false, reason: `expected ${expected} days, got ${days.length}` };

  const localTopics = new Set();
  for (const day of days) {
    const dayNumber = Number(day?.day);
    if (!Number.isInteger(dayNumber) || dayNumber < startDay || dayNumber > endDay) {
      return { ok: false, reason: `day number ${day?.day} outside ${startDay}-${endDay}` };
    }

    for (const field of AI_FIELDS) {
      if (!text(day?.[field])) return { ok: false, reason: `day ${dayNumber} missing ${field}` };
    }

    const topic = text(day.topic);
    const hook = text(day.hook);

    // The exact defect this branch removed. Do not let the model reintroduce it.
    if (normaliseKey(hook) === normaliseKey(topic)) {
      return { ok: false, reason: `day ${dayNumber} hook repeats topic` };
    }

    const topicKey = normaliseKey(topic);
    if (localTopics.has(topicKey) || seenTopics.has(topicKey)) {
      return { ok: false, reason: `day ${dayNumber} repeats an earlier topic` };
    }
    localTopics.add(topicKey);

    const blob = lower(AI_FIELDS.map(f => day[f]).join(" "));
    const banned = BANNED.find(phrase => blob.includes(phrase));
    if (banned) return { ok: false, reason: `day ${dayNumber} used "${banned}"` };

    if (text(day.caption).length > 600) return { ok: false, reason: `day ${dayNumber} caption too long` };
  }

  return { ok: true, reason: "", topics: localTopics };
}

/**
 * Merge model copy onto the deterministic day, keeping every structural and
 * alias field the report assembler and UI expect.
 */
export function mergeDay(ruleDay, aiDay) {
  const topic = text(aiDay.topic);
  const hook = text(aiDay.hook);
  const caption = text(aiDay.caption);
  const action = text(aiDay.customer_action);
  const show = text(aiDay.what_to_show);
  const why = text(aiDay.why_this_helps);

  return {
    ...ruleDay,
    title: topic,
    topic,
    hook,
    what_to_show: show,
    whatToShow: show,
    visual_direction: show,
    post: show,
    caption,
    ready_caption: caption,
    full_caption: `${caption}\n\nNext step: ${action}`,
    customer_action: action,
    customerAction: action,
    cta: action,
    why_this_helps: why,
    why_this_works: why,
    exact_content_idea: topic,
    _source: "ai_expanded",
  };
}

export async function expandCalendarWithAi(requestContext, {
  sessionUserId,
  businessProfile,
  masterStrategy,
  businessFacts,
  enabled = true,
  // Injectable so the degradation paths (quota exhausted, malformed output,
  // duplicated topics) can be tested without a provider or a network.
  callAi = callControlledAi,
} = {}) {
  const telemetry = {
    calendar_ai_enabled: Boolean(enabled),
    calendar_slices_attempted: 0,
    calendar_slices_accepted: 0,
    calendar_ai_calls: 0,
    calendar_cached_slices: 0,
    calendar_limited: false,
    calendar_reject_reasons: [],
  };

  const ruleDays = arr(masterStrategy?.content_calendar_30_days);
  if (!enabled || ruleDays.length < TOTAL_DAYS) {
    return { days: ruleDays, telemetry };
  }

  const brain = compactBrain(masterStrategy);
  const days = ruleDays.slice();
  // Topics already accepted, so a later slice cannot repeat an earlier one.
  const seenTopics = new Set();

  for (let start = 0; start < TOTAL_DAYS; start += SLICE_SIZE) {
    const startDay = start + 1;
    const endDay = Math.min(start + SLICE_SIZE, TOTAL_DAYS);
    const sliceRuleDays = days.slice(start, endDay);
    telemetry.calendar_slices_attempted += 1;

    const { input, messages } = buildSlicePrompt({
      businessFacts,
      brain,
      plan: sliceRuleDays.map(planFor),
      startDay,
      endDay,
    });

    let result;
    try {
      result = await callAi(requestContext, {
        userId: sessionUserId,
        featureType: "calendar_slice",
        sectionName: `calendar:days_${startDay}_${endDay}`,
        promptVersion: CALENDAR_PROMPT_VERSION,
        businessProfile,
        input,
        messages,
        temperature: 0.55,
        maxTokens: 2000,
        responseFormat: "json",
        fallback: null,
      });
    } catch (error) {
      telemetry.calendar_reject_reasons.push(`days ${startDay}-${endDay}: ${error?.message || "call failed"}`);
      continue;
    }

    if (result?.limited) {
      // Quota exhausted. Every later slice would be refused too, so stop
      // paying the latency cost and keep the deterministic remainder.
      telemetry.calendar_limited = true;
      telemetry.calendar_reject_reasons.push(`days ${startDay}-${endDay}: daily AI limit reached`);
      break;
    }
    if (!result?.ok) {
      telemetry.calendar_reject_reasons.push(`days ${startDay}-${endDay}: ${result?.error || "no output"}`);
      continue;
    }

    if (result.cached) telemetry.calendar_cached_slices += 1;
    else telemetry.calendar_ai_calls += 1;

    const payload = result.data;
    const parsed = Array.isArray(payload) ? payload : arr(payload?.days);
    const check = validateSlice(parsed, { startDay, endDay, seenTopics });
    if (!check.ok) {
      telemetry.calendar_reject_reasons.push(`days ${startDay}-${endDay}: ${check.reason}`);
      continue;
    }

    const byDay = new Map(parsed.map(day => [Number(day.day), day]));
    for (let offset = 0; offset < sliceRuleDays.length; offset += 1) {
      const ruleDay = sliceRuleDays[offset];
      const aiDay = byDay.get(startDay + offset);
      if (aiDay) days[start + offset] = mergeDay(ruleDay, aiDay);
    }
    for (const topic of check.topics) seenTopics.add(topic);
    telemetry.calendar_slices_accepted += 1;
  }

  return { days, telemetry };
}
