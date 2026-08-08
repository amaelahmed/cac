import { buildMarketingOSReport, validateMarketingOutput } from "./marketingIntelligence.js";
import { callControlledAi } from "../utils/controlled-ai.js";

const PROMPT_VERSION = "strategy-hybrid-ai-v1";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) {
    return value.map(item => clean(item)).filter(Boolean).join("; ") || fallback;
  }
  if (typeof value === "object") {
    return Object.values(value).map(item => clean(item)).filter(Boolean).join(" ") || fallback;
  }
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function lower(value) {
  return clean(value).toLowerCase();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(asArray(values).filter(Boolean))];
}

function compactSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") {
    return {
      available: false,
      url: "",
      title: "",
      description: "",
      headings: [],
      callsToAction: [],
      detectedGaps: [],
    };
  }

  return {
    available: true,
    url: clean(snapshot.url),
    title: clean(snapshot.title),
    description: clean(snapshot.description),
    headings: asArray(snapshot.headings).slice(0, 5).map(item => clean(item)).filter(Boolean),
    callsToAction: asArray(snapshot.callsToAction).slice(0, 4).map(item => clean(item)).filter(Boolean),
    detectedGaps: asArray(snapshot.detectedGaps).slice(0, 4).map(item => clean(item)).filter(Boolean),
  };
}

function compactBusinessInput(rawBiz = {}) {
  const {
    own_website_snapshot: _ownWebsiteSnapshot,
    competitor_website_snapshot: _competitorWebsiteSnapshot,
    ...rest
  } = rawBiz || {};
  const allowedKeys = [
    "biz_name",
    "biz_industry",
    "biz_type",
    "biz_stage",
    "biz_age",
    "biz_location",
    "biz_customer_model",
    "biz_offer",
    "biz_audience",
    "biz_challenge",
    "biz_usp",
    "biz_budget",
    "biz_ticket",
    "biz_website",
    "biz_comp_website",
    "platforms",
    "goal",
  ];
  return Object.fromEntries(
    allowedKeys
      .filter(key => rest[key] !== undefined && rest[key] !== null && rest[key] !== "")
      .map(key => [key, rest[key]]),
  );
}

function draftForPrompt(report) {
  const tabs = report?.tabs || {};
  return {
    calendar_days: asArray(tabs.calendar?.days).slice(0, 3).map(day => ({
      day: day.day,
      title: day.title || day.topic || day.hook,
      caption: day.caption,
    })),
    strategy_titles: asArray(tabs.strategy?.steps).slice(0, 1).map(step => step.title).filter(Boolean),
    sample_caption: asArray(tabs.captions?.caption_bank)[0] || "",
    sample_message: asArray(tabs.templates?.templates)[0]?.template || "",
    sample_problem: asArray(tabs.painPoints?.items)[0]?.problem || "",
  };
}

function compactContextForPrompt(context) {
  return {
    business_name: context.businessName,
    industry: context.industry,
    category: context.parentCategory,
    location: context.location,
    audience: context.audience,
    offer: context.offer,
    goal: context.selectedGoal,
    business_type: context.businessType,
    customer_model: context.customerModel,
    platforms: context.platforms,
  };
}

function buildPrompt({ businessProfile, rawBiz, safeDraft, marketingOS, offlineKnowledgeContext = null }) {
  const ownWebsite = compactSnapshot(rawBiz?.own_website_snapshot);
  const competitor = compactSnapshot(rawBiz?.competitor_website_snapshot);
  const context = marketingOS.context;
  const pack = marketingOS.industryPack;
  const goal = marketingOS.goalStrategy;

  const system = [
    "You are a simple marketing strategist for small businesses in India.",
    "Rewrite the safe draft into more specific, natural, website-aware action cards.",
    "Use simple English. No jargon. No long paragraphs. No fake research.",
    "Keep every field short. One sentence per field. WhatsApp templates can be up to 45 words.",
    "Use only website and competitor facts provided in the input. If a fact is not visible, do not invent it.",
    "Do not use these repeated lines: 'Here is one real look at...', 'Send us what you need...', 'if this is useful'.",
    "Do not use banned phrases like pain point, prototype, first draft, choose us, unlock growth, contact us for more details.",
    "For SaaS/software, do not mention local awareness, visits, walk-ins, or orders unless the business is local/on-premise.",
    "For cleaning services, say cleaning team or cleaning staff, not technician.",
    "For real estate, prefer CTAs like Send your budget and preferred area, Book a site visit, or Ask for available properties.",
    "Return valid JSON only in the exact requested shape.",
    "No markdown. No code fence. No explanation. The first character must be { and the last character must be }.",
  ].join(" ");

  const user = {
    instruction: "Improve these sections. Keep the same business goal. Make the final content feel like it understood the website.",
    business_input: compactBusinessInput(rawBiz),
    normalized_context: compactContextForPrompt(context),
    selected_goal: context.selectedGoal,
    goal_rules: {
      purpose: goal.purpose,
      contentAngles: asArray(goal.contentAngles).slice(0, 4),
      captionStyle: goal.captionStyle,
      messageTemplateStyle: goal.messageTemplateStyle,
      badIdeasToAvoid: asArray(goal.badIdeasToAvoid).slice(0, 4),
    },
    industry_rules: {
      vocabulary: asArray(pack.vocabulary).slice(0, 6),
      trustFactors: asArray(pack.trustFactors).slice(0, 4),
      recommendedCTAs: asArray(pack.recommendedCTAs).slice(0, 4),
      customerProblems: asArray(pack.customerProblems).slice(0, 3),
    },
    own_website_facts: ownWebsite,
    competitor_facts: competitor,
    internet_signals: offlineKnowledgeContext?.internet_signals || null,
    offline_knowledge_context: offlineKnowledgeContext,
    safe_draft: draftForPrompt(safeDraft),
    required_json_shape: {
      wf: ["website fact used", "website fact used", "website fact used"],
      cf: ["competitor fact or weakness"],
      angles: ["post angle one", "post angle two", "post angle three"],
      captions: ["caption one", "caption two", "caption three"],
      messages: ["WhatsApp message one", "WhatsApp message two", "WhatsApp message three"],
      problems: ["customer problem one", "customer problem two", "customer problem three"],
      thoughts: ["customer thought one", "customer thought two", "customer thought three"],
      growth: "one advanced growth action",
      cta: "one best next step",
      fr: [],
    },
    output_rules: [
      "Use these keys only: wf, cf, angles, captions, messages, problems, thoughts, growth, cta, fr.",
      "Return exactly 3 website facts in wf.",
      "Return 1 to 2 competitor facts in cf.",
      "Return exactly 3 angles.",
      "Return exactly 3 captions.",
      "Return exactly 3 WhatsApp messages.",
      "Return exactly 3 customer problems.",
      "Return exactly 3 customer thoughts.",
      "Return one growth action and one CTA.",
      "Keep titles under 8 words.",
      "Keep normal text fields under 18 words.",
      "Keep captions under 28 words.",
      "Keep WhatsApp templates under 45 words.",
      "Use internet_signals and visible website fields where useful: offer clarity, proof, CTA, process, trust, customer hesitation, or gaps.",
      "Mention competitor gaps only if visible in competitor_facts.",
    ],
  };

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) },
    ],
    input: user,
  };
}

function normalizeCalendarPatch(day) {
  const title = clean(day.title || day.topic || day.hook, "Post idea");
  const postType = clean(day.post_type || day.postType || day.theme, "Post");
  const whatToShow = clean(day.what_to_show || day.whatToShow || day.post, "Show one real detail.");
  const action = clean(day.customer_action || day.customerAction, "Message for the next step.");
  const why = clean(day.why_this_helps || day.whyThisHelps || day.why_this_works, "This makes the next step clearer.");
  return {
    ...day,
    title,
    topic: title,
    hook: title,
    post_type: postType,
    postType,
    what_to_show: whatToShow,
    whatToShow,
    post: whatToShow,
    caption: clean(day.caption, title),
    ready_caption: clean(day.caption, title),
    customer_action: action,
    customerAction: action,
    why_this_helps: why,
    whyThisHelps: why,
    why_this_works: why,
    how_to_create: asArray(day.how_to_create).length ? day.how_to_create : [whatToShow, `End with: ${action}.`],
  };
}

function rowValue(row, index, fallback = "") {
  return Array.isArray(row) ? row[index] : fallback;
}

function firstUseful(items, index, fallback = "") {
  const values = asArray(items).map(item => clean(item)).filter(Boolean);
  return values[index] || values[0] || fallback;
}

function expandCompactAiPatch(aiData = {}) {
  if (!aiData || typeof aiData !== "object") return {};
  if (
    aiData.calendar_days
    || aiData.strategy_steps
    || aiData.message_templates
    || aiData.customer_problems
    || aiData.customer_thoughts
    || aiData.advanced_growth_plan
  ) {
    return aiData;
  }

  if (aiData.angles || aiData.captions || aiData.messages || aiData.problems || aiData.thoughts || aiData.growth) {
    const websiteFacts = asArray(aiData.wf || aiData.website_facts).map(item => clean(item)).filter(Boolean);
    const competitorFacts = asArray(aiData.cf || aiData.competitor_facts).map(item => clean(item)).filter(Boolean);
    const angles = asArray(aiData.angles).map(item => clean(item)).filter(Boolean);
    const captions = asArray(aiData.captions).map(item => clean(item)).filter(Boolean);
    const messages = asArray(aiData.messages).map(item => clean(item)).filter(Boolean);
    const problems = asArray(aiData.problems).map(item => clean(item)).filter(Boolean);
    const thoughts = asArray(aiData.thoughts).map(item => clean(item)).filter(Boolean);
    const cta = clean(aiData.cta, "Message us");

    return {
      calendar_days: [0, 1, 2].map(index => ({
        day: index + 1,
        title: firstUseful(angles, index, `Website proof ${index + 1}`),
        what_to_show: firstUseful(angles, index, "Show one real website-backed detail."),
        caption: firstUseful(captions, index, firstUseful(websiteFacts, index, "Show one real detail customers can trust.")),
        customer_action: cta,
        why_this_helps: firstUseful(websiteFacts, index, "This uses real website proof instead of a generic claim."),
      })),
      strategy_steps: [{
        step: 1,
        title: "Use website proof first",
        why_this_matters: firstUseful(websiteFacts, 0, "Customers trust specific proof faster than general claims."),
        action_steps: angles.slice(0, 3).length ? angles.slice(0, 3) : ["Post one specific website-backed proof point."],
        copy_ready_text: firstUseful(captions, 0, firstUseful(websiteFacts, 0, "")),
        track_this: cta,
      }],
      captions,
      message_templates: messages.map((message, index) => ({
        type: index === 0 ? "First reply" : index === 1 ? "Proof reply" : "Next step reply",
        channel: "WhatsApp",
        template: message,
        why_suggested: firstUseful(websiteFacts, index, "Based on website context."),
      })),
      customer_problems: problems.map((problem, index) => ({
        problem,
        why_they_feel_this: "They need proof before taking the next step.",
        your_solution: firstUseful(websiteFacts, index, "Show a real proof point from the website."),
        text_to_use: firstUseful(captions, index, problem),
        content_idea: firstUseful(angles, index, "Turn this into a short post."),
      })),
      customer_thoughts: thoughts.map((thought, index) => ({
        customer_thought: thought,
        what_it_means: "They are checking whether this is right for them.",
        what_to_show: firstUseful(angles, index, "Show one real proof point."),
        what_to_say: firstUseful(captions, index, thought),
        why_this_works: firstUseful(websiteFacts, index, "It gives them a concrete reason to trust."),
      })),
      advanced_growth_plan: [{
        title: "Turn website proof into posts",
        action: clean(aiData.growth, firstUseful(angles, 0, "Use one website proof point in every post this week.")),
        why: firstUseful(competitorFacts, 0, "This creates clearer proof than generic content."),
        timeline: "This week",
        output: "Three website-aware posts and replies.",
      }],
      website_facts_used: websiteFacts,
      competitor_facts_used: competitorFacts,
      failed_items_rewritten: asArray(aiData.fr).map(item => clean(item)).filter(Boolean),
    };
  }

  return {
    calendar_days: asArray(aiData.d).map((row, index) => ({
      day: Number(rowValue(row, 0, index + 1)) || index + 1,
      title: clean(rowValue(row, 1)),
      what_to_show: clean(rowValue(row, 2)),
      caption: clean(rowValue(row, 3)),
      customer_action: clean(rowValue(row, 4)),
      why_this_helps: clean(rowValue(row, 5)),
    })),
    strategy_steps: asArray(aiData.s).map((row, index) => ({
      step: Number(rowValue(row, 0, index + 1)) || index + 1,
      title: clean(rowValue(row, 1)),
      why_this_matters: clean(rowValue(row, 2)),
      action_steps: asArray(rowValue(row, 3)),
      copy_ready_text: clean(rowValue(row, 4)),
      track_this: clean(rowValue(row, 5)),
    })),
    captions: asArray(aiData.c).map(item => clean(item)).filter(Boolean),
    message_templates: asArray(aiData.m).map((row, index) => ({
      type: clean(rowValue(row, 0), `AI reply ${index + 1}`),
      channel: clean(rowValue(row, 1), "WhatsApp"),
      template: clean(rowValue(row, 2)),
      why_suggested: clean(rowValue(row, 3), "Based on the website context."),
    })),
    customer_problems: asArray(aiData.p).map(row => ({
      problem: clean(rowValue(row, 0)),
      why_they_feel_this: clean(rowValue(row, 1)),
      your_solution: clean(rowValue(row, 2)),
      text_to_use: clean(rowValue(row, 3)),
      content_idea: clean(rowValue(row, 4)),
    })),
    customer_thoughts: asArray(aiData.t).map(row => ({
      customer_thought: clean(rowValue(row, 0)),
      what_it_means: clean(rowValue(row, 1)),
      what_to_show: clean(rowValue(row, 2)),
      what_to_say: clean(rowValue(row, 3)),
      why_this_works: clean(rowValue(row, 4)),
    })),
    advanced_growth_plan: asArray(aiData.g).map(row => ({
      title: clean(rowValue(row, 0)),
      action: clean(rowValue(row, 1)),
      why: clean(rowValue(row, 2)),
      timeline: clean(rowValue(row, 3)),
      output: clean(rowValue(row, 4)),
    })),
    website_facts_used: asArray(aiData.wf).map(item => clean(item)).filter(Boolean),
    competitor_facts_used: asArray(aiData.cf).map(item => clean(item)).filter(Boolean),
    failed_items_rewritten: asArray(aiData.fr).map(item => clean(item)).filter(Boolean),
  };
}

const FACT_STOPWORDS = new Set("the a an and or but with from into this that your our their has have for you are is was were will can to of in on by as it its at be".split(" "));

function groundedFact(fact, sourceText) {
  const text = lower(sourceText);
  const words = clean(fact)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 3 && !FACT_STOPWORDS.has(word));
  if (words.length === 0) return false;
  return words.filter(word => text.includes(word)).length >= Math.min(2, words.length);
}

function fallbackFactsFromSnapshot(snapshot, fallback = []) {
  const compact = compactSnapshot(snapshot);
  return unique([
    compact.title,
    compact.description,
    ...compact.headings,
    ...compact.callsToAction.map(item => `CTA: ${item}`),
    ...compact.detectedGaps,
    ...fallback,
  ].map(item => clean(item)).filter(Boolean)).slice(0, 3);
}

function sanitizeUsedFacts(report, rawBiz = {}) {
  const meta = report.meta || {};
  const own = compactSnapshot(rawBiz.own_website_snapshot);
  const competitor = compactSnapshot(rawBiz.competitor_website_snapshot);
  const ownSource = JSON.stringify(own);
  const competitorSource = JSON.stringify(competitor);
  const ownFallback = fallbackFactsFromSnapshot(rawBiz.own_website_snapshot);
  const competitorFallback = fallbackFactsFromSnapshot(rawBiz.competitor_website_snapshot, competitor.detectedGaps);

  meta.website_facts_used = unique(asArray(meta.website_facts_used)
    .map(item => clean(item))
    .filter(item => item && groundedFact(item, ownSource)))
    .slice(0, 3);
  meta.competitor_facts_used = unique(asArray(meta.competitor_facts_used)
    .map(item => clean(item))
    .filter(item => item && groundedFact(item, competitorSource)))
    .slice(0, 3);

  if (!meta.website_facts_used.length) meta.website_facts_used = ownFallback;
  if (!meta.competitor_facts_used.length) meta.competitor_facts_used = competitorFallback;

  report.meta = meta;
  return report;
}

function mergeAiPatch(safeDraft, aiData = {}) {
  aiData = expandCompactAiPatch(aiData);
  const report = clone(safeDraft);
  const tabs = report.tabs || {};

  const calendarByDay = new Map(asArray(tabs.calendar?.days).map(day => [Number(day.day), day]));
  for (const aiDay of asArray(aiData.calendar_days)) {
    const dayNumber = Number(aiDay.day);
    if (!dayNumber || !calendarByDay.has(dayNumber)) continue;
    calendarByDay.set(dayNumber, {
      ...calendarByDay.get(dayNumber),
      ...normalizeCalendarPatch(aiDay),
      ai_enhanced: true,
    });
  }
  if (tabs.calendar?.days) {
    tabs.calendar.days = tabs.calendar.days.map(day => calendarByDay.get(Number(day.day)) || day);
  }

  const strategyByStep = new Map(asArray(tabs.strategy?.steps).map(step => [Number(step.step), step]));
  for (const aiStep of asArray(aiData.strategy_steps)) {
    const stepNumber = Number(aiStep.step);
    if (!stepNumber || !strategyByStep.has(stepNumber)) continue;
    strategyByStep.set(stepNumber, {
      ...strategyByStep.get(stepNumber),
      ...aiStep,
      action_steps: asArray(aiStep.action_steps).length ? aiStep.action_steps : strategyByStep.get(stepNumber).action_steps,
      steps: asArray(aiStep.action_steps).length ? aiStep.action_steps : strategyByStep.get(stepNumber).steps,
      reason: clean(aiStep.why_this_matters || aiStep.reason, strategyByStep.get(stepNumber).reason),
      ai_enhanced: true,
    });
  }
  if (tabs.strategy?.steps) {
    tabs.strategy.steps = tabs.strategy.steps.map(step => strategyByStep.get(Number(step.step)) || step);
  }

  if (asArray(aiData.captions).length) {
    tabs.captions.caption_bank = [
      ...aiData.captions.map(item => clean(item)).filter(Boolean),
      ...asArray(tabs.captions?.caption_bank),
    ].filter(Boolean).slice(0, 12);
  }

  if (asArray(aiData.message_templates).length) {
    tabs.templates.templates = [
      ...aiData.message_templates.map((item, index) => ({
        type: clean(item.type, `AI reply ${index + 1}`),
        channel: clean(item.channel, "WhatsApp"),
        template: clean(item.template),
        why_suggested: clean(item.why_suggested, "Based on the business and website context."),
        ai_enhanced: true,
      })).filter(item => item.template),
      ...asArray(tabs.templates?.templates),
    ].slice(0, 10);
  }

  if (asArray(aiData.customer_problems).length) {
    tabs.painPoints.items = [
      ...aiData.customer_problems.map(item => ({
        problem: clean(item.problem),
        customer_problem: clean(item.problem),
        why_they_feel_this: clean(item.why_they_feel_this),
        your_solution: clean(item.your_solution),
        text_to_use: clean(item.text_to_use),
        content_idea: clean(item.content_idea),
        what_to_do: clean(item.your_solution),
        what_to_say: clean(item.text_to_use),
        post_idea: clean(item.content_idea),
        ai_enhanced: true,
      })).filter(item => item.problem),
      ...asArray(tabs.painPoints?.items),
    ].slice(0, 15);
  }

  if (asArray(aiData.customer_thoughts).length) {
    tabs.psychology.customer_thoughts = [
      ...aiData.customer_thoughts.map(item => ({
        customer_thought: clean(item.customer_thought),
        what_it_means: clean(item.what_it_means),
        what_to_show: clean(item.what_to_show),
        what_to_say: clean(item.what_to_say),
        why_this_works: clean(item.why_this_works),
        ai_enhanced: true,
      })).filter(item => item.customer_thought),
      ...asArray(tabs.psychology?.customer_thoughts),
    ].slice(0, 10);
  }

  if (asArray(aiData.advanced_growth_plan).length) {
    tabs.premiumGrowth.modules = [
      ...aiData.advanced_growth_plan.map((item, index) => ({
        module: index + 1,
        title: clean(item.title),
        action: clean(item.action),
        why: clean(item.why),
        timeline: clean(item.timeline, "This month"),
        output: clean(item.output, "One visible improvement."),
        ai_enhanced: true,
      })).filter(item => item.title),
      ...asArray(tabs.premiumGrowth?.modules),
    ].slice(0, 10).map((item, index) => ({ ...item, module: index + 1 }));
  }

  report.tabs = tabs;
  report.meta = {
    ...(report.meta || {}),
    ai_enhanced: true,
    ai_enhanced_sections: [
      "calendar_days_1_to_3",
      "strategy_steps_1_to_3",
      "captions",
      "message_templates",
      "customer_problems",
      "customer_thoughts",
      "advanced_growth_plan",
    ],
    website_facts_used: asArray(aiData.website_facts_used).map(item => clean(item)).filter(Boolean),
    competitor_facts_used: asArray(aiData.competitor_facts_used).map(item => clean(item)).filter(Boolean),
    failed_items_rewritten: asArray(aiData.failed_items_rewritten).map(item => clean(item)).filter(Boolean),
  };

  return report;
}

function fallbackFailedItems(candidate, safeDraft, validation) {
  const repaired = clone(candidate);
  const safe = safeDraft.tabs || {};
  const tabs = repaired.tabs || {};

  for (const issue of validation.calendarIssues || []) {
    const dayNumber = Number(issue.day);
    const safeDay = asArray(safe.calendar?.days).find(day => Number(day.day) === dayNumber);
    if (safeDay && tabs.calendar?.days) {
      tabs.calendar.days = tabs.calendar.days.map(day => Number(day.day) === dayNumber ? safeDay : day);
    }
  }

  const globalSectionFailure = [
    ...(validation.bannedHits || []),
    ...(validation.repeatedTemplateHits || []),
    ...(validation.saasLocalMismatchHits || []),
    ...(validation.saasWrongIndustryHits || []),
    ...(validation.cleaningLanguageHits || []),
    ...(validation.realEstateCtaHits || []),
    ...(validation.foodWrongLanguageHits || []),
    ...(validation.healthcareWrongLanguageHits || []),
    ...(validation.ecommerceWrongLanguageHits || []),
    ...(validation.serviceWrongLanguageHits || []),
    ...(validation.captionSwapHits || []),
  ].length > 0;

  if (globalSectionFailure) {
    tabs.captions = safe.captions;
    tabs.strategy = safe.strategy;
    tabs.templates = safe.templates;
    tabs.painPoints = safe.painPoints;
    tabs.psychology = safe.psychology;
    tabs.premiumGrowth = safe.premiumGrowth;
  }

  repaired.tabs = tabs;
  repaired.meta = {
    ...(repaired.meta || {}),
    fallback_failed_items_applied: true,
    failed_items_rewritten: [
      ...asArray(repaired.meta?.failed_items_rewritten),
      ...validation.issues,
    ].slice(0, 20),
  };
  return repaired;
}

function painPointSignature(item) {
  return lower(item?.problem || item?.customer_problem || item?.title || clean(item)).replace(/[^a-z0-9]+/g, " ").trim();
}

function fallbackPainPoint(index, businessName) {
  const templates = [
    {
      problem: "People do not understand the offer fast enough.",
      why_they_feel_this: "They see many options online and leave when the value is not clear in a few seconds.",
      your_solution: `Show one simple before-and-after example from ${businessName}.`,
      text_to_use: `Send us one messy request. ${businessName} will show the clean next step before you decide.`,
      content_idea: "Post a screenshot-style before and after example with the confusing input on one side and the clear result on the other.",
    },
    {
      problem: "They are not sure if this is meant for them.",
      why_they_feel_this: "The message sounds useful, but they cannot see their own situation in it yet.",
      your_solution: "Name the exact customer type, exact problem, and exact result in one post.",
      text_to_use: `Built for people who want the result without guessing the process. Ask ${businessName} to show one example.`,
      content_idea: "Make a short post called 'This is for you if...' with three simple situations.",
    },
    {
      problem: "They want proof before trusting a new business.",
      why_they_feel_this: "A new or unfamiliar business feels risky until people see real output, reviews, or a clear process.",
      your_solution: "Show the process, sample result, and one honest proof point before asking them to buy.",
      text_to_use: "See the sample first. Decide only after you understand what you are getting.",
      content_idea: "Create a proof carousel: problem, process, sample result, next step.",
    },
    {
      problem: "They do not know what to ask first.",
      why_they_feel_this: "When the next step is unclear, people delay the conversation.",
      your_solution: "Give them one copy-paste message to start the chat.",
      text_to_use: "Send: 'Hi, I want to understand if this fits my need. Can you show me one example?'",
      content_idea: "Post the exact message customers can send on WhatsApp or DM.",
    },
  ];
  return templates[index % templates.length];
}

function ensureMinimumPainPoints(report, minimum = 15) {
  if (!report || typeof report !== "object") return;
  report.tabs = report.tabs && typeof report.tabs === "object" ? report.tabs : {};
  report.tabs.painPoints = report.tabs.painPoints && typeof report.tabs.painPoints === "object"
    ? report.tabs.painPoints
    : { items: [] };

  const businessName = clean(report.business?.name, "the business");
  const existing = [
    ...asArray(report.tabs.painPoints.items),
    ...asArray(report.marketing_os?.customer_pain_points_15),
  ];
  const seen = new Set();
  const items = [];

  for (const item of existing) {
    const signature = painPointSignature(item);
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    items.push(item);
  }

  let guard = 0;
  while (items.length < minimum && guard < minimum * 2) {
    const item = fallbackPainPoint(guard, businessName);
    const signature = `${painPointSignature(item)}-${items.length}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      items.push({ ...item, fallback_generated: true });
    }
    guard += 1;
  }

  report.tabs.painPoints.items = items.slice(0, minimum);
}

function syncMarketingOsEnvelope(report) {
  if (!report || typeof report !== "object") return report;
  ensureMinimumPainPoints(report, 15);
  const tabs = report.tabs || {};
  const os = report.marketing_os && typeof report.marketing_os === "object"
    ? { ...report.marketing_os }
    : {};

  os.business_diagnosis = report["Business Health Snapshot"]?.diagnosis || os.business_diagnosis || "";
  os.positioning = report["Positioning Strategy"] || os.positioning || {};
  os.growth_strategy_10_steps = asArray(tabs.strategy?.steps).slice(0, 10);
  os.customer_pain_points_15 = asArray(tabs.painPoints?.items).slice(0, 15);
  os.consumer_psychology = tabs.psychology || report["Customer Psychology"] || os.consumer_psychology || {};
  os.competitor_intelligence = tabs.competitors || report["Competitor Intelligence"] || os.competitor_intelligence || {};
  os.website_roast = report["Website Roast"] || os.website_roast || null;
  os.content_calendar_30_days = asArray(tabs.calendar?.days).slice(0, 30);
  os.growth_ideas_20 = asArray(tabs.ideas?.experiments).slice(0, 20);
  os.execution_checklist = report["Implementation Checklist"] || os.execution_checklist || {};
  os.exportable_report_data = {
    ...(os.exportable_report_data || {}),
    source: "saved_marketing_os_json",
    pdf_source: "same_saved_json",
    business: report.business || {},
    scores: report.scores || [],
    tabs,
    flat_sections: {
      business_health_snapshot: report["Business Health Snapshot"],
      business_profile: report["Business DNA / Profile"],
      positioning_strategy: report["Positioning Strategy"],
      implementation_checklist: report["Implementation Checklist"],
      plan_30_60_90: report["30/60/90-Day Plan"],
    },
  };

  report.marketing_os = os;
  report.exportable_report_data = os.exportable_report_data;
  return report;
}

async function callAiForPatch(context, { sessionUserId, businessProfile, rawBiz, safeDraft, marketingOS, offlineKnowledgeContext, sectionName, issues = [] }) {
  const prompt = buildPrompt({ businessProfile, rawBiz, safeDraft, marketingOS, offlineKnowledgeContext });
  const messages = issues.length
    ? [
        prompt.messages[0],
        {
          role: "user",
          content: `${prompt.messages[1].content}\n\nThe previous AI output failed these quality checks. Rewrite only with clean, specific content and return the same JSON shape:\n${JSON.stringify(issues)}`,
        },
      ]
    : prompt.messages;

  return callControlledAi(context, {
    userId: sessionUserId,
    featureType: "strategy_hybrid",
    sectionName,
    promptVersion: PROMPT_VERSION,
    businessProfile,
    input: {
      ...prompt.input,
      rewrite_issues: issues,
    },
    messages,
    temperature: 0.35,
    maxTokens: 900,
    responseFormat: "json",
    fallback: null,
  });
}

export async function enhanceReportWithHybridAi(context, {
  sessionUserId,
  businessProfile,
  rawBiz,
  safeDraft,
  telemetry = {},
  forceRuleBased = false,
  forceAiFailure = false,
  offlineKnowledgeContext = null,
}) {
  const marketingOS = buildMarketingOSReport({ businessProfile, rawBiz, telemetry });
  const beforeValidation = validateMarketingOutput(safeDraft, marketingOS.context, marketingOS.industryPack, marketingOS.goalStrategy);

  if (forceRuleBased || forceAiFailure) {
    const fallbackReason = forceAiFailure
      ? "Forced AI failure test. CAC returned the offline Marketing OS fallback."
      : "Rule-based fallback was requested. CAC returned the offline Marketing OS fallback.";
    safeDraft.meta = {
      ...(safeDraft.meta || {}),
      ai_enhanced: false,
      ai_provider: "none",
      ai_calls_count: 0,
      quality_score_before_ai: beforeValidation.qualityScore,
      quality_score_after_ai: beforeValidation.qualityScore,
      ai_status: forceAiFailure ? "forced_ai_failure_offline_fallback" : "rule_based_forced",
      generation_source: "offline_fallback",
      fallback_used: true,
      fallback_reason: fallbackReason,
      website_facts_used: [],
      competitor_facts_used: [],
      failed_items_rewritten: [],
    };
    return {
      report: syncMarketingOsEnvelope(safeDraft),
      aiTelemetry: { ai_calls_count: 0, ai_enhanced: false, reason: fallbackReason },
    };
  }

  const sectionName = `${marketingOS.context.parentCategory}:${marketingOS.context.selectedGoal}`;
  let first = await callAiForPatch(context, {
    sessionUserId,
    businessProfile,
    rawBiz,
    safeDraft,
    marketingOS,
    offlineKnowledgeContext,
    sectionName,
  });

  if (!first.ok && /invalid json/i.test(first.error || first.reason || first.message || "")) {
    const retry = await callAiForPatch(context, {
      sessionUserId,
      businessProfile,
      rawBiz,
      safeDraft,
      marketingOS,
      offlineKnowledgeContext,
      sectionName: `${sectionName}:json_retry`,
      issues: [
        "The previous AI response was not valid JSON.",
        "Return only the small JSON brief with keys wf, cf, angles, captions, messages, problems, thoughts, growth, cta, fr.",
        "No markdown, no explanation, no nested objects.",
      ],
    });
    if (retry.ok && retry.data) {
      first = retry;
    }
  }

  if (!first.ok || !first.data) {
    const fallbackReason = first.reason || first.error || first.message || "AI unavailable. CAC returned the offline Marketing OS fallback.";
    safeDraft.meta = {
      ...(safeDraft.meta || {}),
      ai_enhanced: false,
      ai_provider: first.provider || "none",
      ai_status: fallbackReason,
      ai_calls_count: 0,
      generation_source: "offline_fallback",
      fallback_used: true,
      fallback_reason: fallbackReason,
      quality_score_before_ai: beforeValidation.qualityScore,
      quality_score_after_ai: beforeValidation.qualityScore,
      failed_items_rewritten: [],
      website_facts_used: [],
      competitor_facts_used: [],
    };
    return {
      report: syncMarketingOsEnvelope(safeDraft),
      aiTelemetry: { ai_calls_count: 0, ai_enhanced: false, ai_provider: first.provider || "none", reason: safeDraft.meta.ai_status },
    };
  }

  let aiCalls = first.cached ? 0 : 1;
  let candidate = sanitizeUsedFacts(mergeAiPatch(safeDraft, first.data), rawBiz);
  let afterValidation = validateMarketingOutput(candidate, marketingOS.context, marketingOS.industryPack, marketingOS.goalStrategy);

  if (!afterValidation.passed) {
    const rewrite = await callAiForPatch(context, {
      sessionUserId,
      businessProfile,
      rawBiz,
      safeDraft: candidate,
      marketingOS,
      offlineKnowledgeContext,
      sectionName: `${sectionName}:rewrite`,
      issues: afterValidation.issues,
    });
    if (rewrite.ok && rewrite.data) {
      aiCalls += rewrite.cached ? 0 : 1;
      candidate = sanitizeUsedFacts(mergeAiPatch(candidate, rewrite.data), rawBiz);
      afterValidation = validateMarketingOutput(candidate, marketingOS.context, marketingOS.industryPack, marketingOS.goalStrategy);
    }
  }

  if (!afterValidation.passed) {
    candidate = fallbackFailedItems(candidate, safeDraft, afterValidation);
    candidate = syncMarketingOsEnvelope(candidate);
    afterValidation = validateMarketingOutput(candidate, marketingOS.context, marketingOS.industryPack, marketingOS.goalStrategy);
  }

  candidate = syncMarketingOsEnvelope(candidate);
  candidate.meta = {
    ...(candidate.meta || {}),
    ai_enhanced: true,
    ai_provider: first.provider || "configured_api_provider",
    ai_model: first.model || null,
    ai_cached: Boolean(first.cached),
    ai_calls_count: Number(candidate.meta?.ai_calls_count || 0) + aiCalls,
    generation_source: "hybrid_ai",
    fallback_used: !afterValidation.passed || Boolean(candidate.meta?.fallback_failed_items_applied),
    fallback_reason: candidate.meta?.fallback_failed_items_applied
      ? "AI output failed one or more quality checks, so CAC used offline fallback for the failed items only."
      : "",
    quality_score_before_ai: beforeValidation.qualityScore,
    quality_score_after_ai: afterValidation.qualityScore,
    quality_issues_after_ai: afterValidation.issues,
    ai_status: afterValidation.passed ? "ai_enhanced_passed_quality_gate" : "ai_enhanced_with_failed_item_fallback",
    failed_items_rewritten: asArray(candidate.meta?.failed_items_rewritten),
  };

  return {
    report: candidate,
    aiTelemetry: {
      ai_calls_count: aiCalls,
      ai_enhanced: true,
      ai_provider: first.provider || "configured_api_provider",
      ai_cached: Boolean(first.cached),
      ai_model: first.model || null,
      quality_score_before_ai: beforeValidation.qualityScore,
      quality_score_after_ai: afterValidation.qualityScore,
      quality_issues_after_ai: afterValidation.issues,
    },
  };
}
