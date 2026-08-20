import { StrategyBlockRetrieval } from "./strategyBlockRetrieval.js";
import { buildMarketingOSReport, normalizeBusinessContext, validateSemanticAlignment } from "./marketingIntelligence.js";
import { callControlledAi } from "../utils/controlled-ai.js";

const PROMPT_VERSION = "master-strategy-v2";

const BANNED_GENERIC_PHRASES = [
  "show one trust signal",
  "build awareness",
  "increase engagement",
  "customers like quality",
  "name the problem",
  "teach one tip",
  "post consistently",
  "be authentic",
  "create value",
  "people struggle with this",
];

const SAFE_WORDS_TO_AVOID = [
  "vague slogans",
  "generic agency words",
  "empty claims",
  "copy that could fit any business",
  "unclear next steps",
];

const WEAK_GENERIC_PHRASES = [
  "product explanation",
  "trust building",
  "brand awareness",
  "customer engagement",
  "social media marketing",
  "content creation",
  "sales growth",
  "lead generation",
  "online presence",
  "digital marketing",
  "customer acquisition",
  "market positioning",
  "value proposition",
  "target audience",
  "general promotion",
  "business growth",
  "quality service",
];

const ROBOTIC_OUTPUT_PATTERNS = [
  /\bfeels specific\b/i,
  /\bproof beats\b/i,
  /\bdecision on\b/i,
  /\breply with the easiest starting point\b/i,
  /\bsend the one detail\b/i,
  /\bsafe-looking generic post\b/i,
  /\bbefore the pretty part\b/i,
  /\bmessage the option you are considering\b/i,
  /\bturn this into one useful\b/i,
  /\blead with proof\b/i,
  /\bmake this a useful post\b/i,
  /\bbelongs in the first line\b/i,
  /\bdeserves plain words\b/i,
  /\bshould not hide behind broad brand talk\b/i,
  /\bshould make action feel\b/i,
  /\bshould make the first reply\b/i,
  /\bwill act faster when\b/i,
  /\bneeds the next step before\b/i,
  /\bsend the useful date first\b/i,
  /\bask for the real example first\b/i,
  /\bmessage what feels unclear\b/i,
  /\binstagram decision\b/i,
  /\bwhatsapp decision\b/i,
  /\bgoogle business decision\b/i,
  /\bsearch\/profile decision\b/i,
  /\bI be\b/i,
  /\bYou safe\b/i,
  /\bif\s+will\b/i,
  /\bsoftware clinics\b/i,
  /\bvalue test starts\b/i,
  /\bneed this detail before they act\b/i,
  /\bturn\s+"[^"]{4,140}"\s+into a plain answer\b/i,
  /\b([a-z]+)\s+\1\b/i,
  /^\s*[a-z0-9 ]{2,40}\s+(route|check|reply|path|proof|fix|pause|sort|guide|helper|decision|timing):/i,
];

const KNOWLEDGE_SECTION_QUOTAS = {
  simple_summary: 2,
  first_priority: 3,
  customer_question: 5,
  confidence_step: 5,
  instagram_action: 4,
  whatsapp_message: 4,
  seven_day_plan: 3,
  thirty_day_calendar: 8,
  caption: 4,
  measurement: 3,
  google_business_action: 3,
  offer_idea: 4,
  local_action: 3,
};

function clean(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (Array.isArray(value)) return value.map(item => clean(item)).filter(Boolean).join("; ") || fallback;
  if (typeof value === "object") return Object.values(value).map(item => clean(item)).filter(Boolean).join(" ") || fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function lower(value, fallback = "") {
  return clean(value, fallback).toLowerCase();
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null && clean(item));
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function unique(values) {
  return [...new Set(asArray(values).map(item => clean(item)).filter(Boolean))];
}

function toObject(value) {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function flattenText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return "";
}

function hasRoboticOutput(text) {
  return ROBOTIC_OUTPUT_PATTERNS.some(pattern => pattern.test(clean(text)));
}

function normalizeSignature(text) {
  return lower(text)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|and|for|with|this|that|your|their|business|customer|customers|people)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 10)
    .join(" ");
}

function compactText(value, fallback = "", maxLength = 180) {
  const text = clean(value, fallback);
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength - 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || text.slice(0, maxLength - 1).trim()}.`;
}

function detectPsychology(text) {
  const source = lower(text);
  const matches = [];
  if (/price|cost|expensive|cheap|value|budget/.test(source)) matches.push("price framing");
  if (/review|proof|trust|result|testimonial|before|after|real/.test(source)) matches.push("social proof");
  if (/risk|safe|worry|doubt|confus|mistake|preview/.test(source)) matches.push("risk reduction");
  if (/limited|first|launch|slot|available|deadline/.test(source)) matches.push("urgency");
  if (/free|sample|demo|trial|first step/.test(source)) matches.push("reciprocity");
  if (/simple|clear|easy|step|how it works/.test(source)) matches.push("cognitive ease");
  if (/miss|lose|avoid|wrong/.test(source)) matches.push("loss aversion");
  return matches.length ? unique(matches) : ["clarity"];
}

function sanitizeAvoidList(values) {
  const banned = [...BANNED_GENERIC_PHRASES, ...WEAK_GENERIC_PHRASES].map(phrase => lower(phrase));
  const cleaned = unique(values)
    .map(item => clean(item))
    .filter(item => item && !banned.some(phrase => lower(item).includes(phrase)));
  return cleaned.length ? cleaned.slice(0, 8) : SAFE_WORDS_TO_AVOID;
}

function sanitizeGeneratedText(value, context) {
  let text = clean(value);
  if (!text) return text;
  const offer = leadOffer(context);
  const firstPlatform = context.platforms?.[0] || "main channel";
  const kind = businessKind(context);
  const concreteProof = {
    software: `real ${offer} workflow proof`,
    food: `real ${offer} portion and ready-time proof`,
    salon: `real ${offer} result and timing proof`,
    clinic: `real ${offer} care-path proof`,
    gym: `real ${offer} trainer guidance proof`,
    real_estate: `real ${offer} availability and area proof`,
    law_firm: `real ${offer} document-prep proof`,
    agency: `real ${offer} audit proof`,
    education: `real ${offer} teaching-method proof`,
    retail: `real ${offer} preview with price and delivery detail`,
    local: `real ${offer} proof`,
  }[kind] || `real ${offer} proof`;
  const replacements = [
    ["show one trust signal", `show real proof for ${offer}`],
    ["build awareness", `make ${offer} easy to understand`],
    ["increase engagement", `get useful ${actionPhrase(context)} replies`],
    ["customers like quality", `${context.audience} need proof before choosing`],
    ["name the problem", `show the exact buyer doubt about ${offer}`],
    ["teach one tip", `answer one real ${context.audience} question`],
    ["post consistently", `repeat the proof format that gets action`],
    ["be authentic", `show the real process behind ${offer}`],
    ["create value", `give one useful answer before the CTA`],
    ["people struggle with this", `${context.audience} hesitate before acting`],
    ["product explanation", `${offer} clarity`],
    ["trust building", `${offer} proof`],
    ["brand awareness", `${context.businessName} discovery`],
    ["customer engagement", `${actionPhrase(context)} reply path`],
    ["social media marketing", `${firstPlatform} proof path`],
    ["content creation", `${offer} proof content`],
    ["sales growth", `${baseMetric(context)} growth`],
    ["lead generation", `${actionPhrase(context)} path`],
    ["online presence", `${firstPlatform} proof`],
    ["digital marketing", `${firstPlatform} action plan`],
    ["customer acquisition", `${context.audience} first-action path`],
    ["market positioning", `${context.businessName} choice reason`],
    ["value proposition", `${offer} promise`],
    ["target audience", `${context.audience} buyers`],
    ["general promotion", `${offer} proof push`],
    ["business growth", `${baseMetric(context)} growth`],
    ["quality service", `${offer} result proof`],
    ["record a 15-second video showcasing", `make a quick proof clip about`],
    ["record a 15-second video", `make a quick proof clip`],
    ["record a short video", `make a quick proof clip`],
    ["showcase", `show`],
  ];
  for (const [phrase, replacement] of replacements) {
    text = text.replace(new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), replacement);
  }
  if (/^create a referral program for\b/i.test(text)) {
    text = {
      food: "Ask happy group-order customers to bring one friend with the same budget and pickup time",
      salon: "Ask happy clients for one referral after the result photo and appointment experience are approved",
      clinic: "Ask comfortable patients to share one review after the appointment path feels clear",
      gym: "Ask consistent trial members to bring one friend for the same beginner session",
      software: "Ask one active user to introduce another team with the same workflow problem",
      real_estate: "Ask satisfied buyers to refer one person with budget, area, and property type ready",
      law_firm: "Ask helped clients to refer one person with the same document or deadline problem",
      agency: "Ask a happy client to introduce one business with the same sales or content blocker",
      education: "Ask happy parents to refer one student with the same class or subject need",
      retail: "Ask happy buyers to share one friend who needs the same occasion, size, or delivery date",
      local: "Ask happy customers to refer one person with the same clear need",
    }[kind] || "Ask happy customers to refer one person with the same clear need";
  }
  if (/^highlight the benefits of shopping with\b/i.test(text)) {
    text = kind === "retail"
      ? "Show real stock, size, price, and pickup detail before asking people to choose"
      : `Show the clearest reason to choose ${context.businessName} before asking for action`;
  }
  if (/^(create|test|debunk|publish)\s+a series of\s+(social media|blog)\s+posts highlighting the benefits of working with\b/i.test(text)) {
    text = kind === "real_estate"
      ? "Show three matched property options with budget, area, and visit reason"
      : `Show the proof customers need before choosing ${offer}`;
  }
  if (contextVariant(context, kind) === "skin_clinic") {
    text = text
      .replace(/\bfinal look may not match the photo\b/ig, `${offer} result may not match the treatment promise`)
      .replace(/\bfinal look\b/ig, `${offer} result`)
      .replace(/\bsaved photo\b/ig, "treatment example");
  }
  if (kind === "law_firm") {
    text = text.replace(/^Reframe the founder agreement as a pre-signing risk check$/i, "Check the founder agreement before anyone signs");
  }
  if (kind === "real_estate") {
    text = text
      .replace(/^Publish the shortlisted site visit with .+$/i, "Publish the matched property shortlist before the site visit")
      .replace(/^Demonstrate budget-fit property search into a buyer shortlist$/i, "Demonstrate the buyer shortlist for a budget-fit property search");
  }
  if (isEducationContext(context)) {
    text = text
      .replace(/\bfamily appointment path\b/ig, "parent enquiry path")
      .replace(/\btreatment talk\b/ig, "fee or admission talk")
      .replace(/\btreatment delay\b/ig, "admission delay")
      .replace(/\bfirst checkup step\b/ig, "demo class step")
      .replace(/\bdental consultation\b/ig, "demo class")
      .replace(/\bdental cleaning\b/ig, "demo class")
      .replace(/\bdental care\b/ig, "tuition support")
      .replace(/\bdental fear\b/ig, "class hesitation")
      .replace(/\bdental visit\b/ig, "demo class")
      .replace(/\bsymptom\b/ig, "class and subject")
      .replace(/\bage group\b/ig, "student class")
      .replace(/\bpreferred visit time\b/ig, "preferred demo time")
      .replace(/\bvisit time\b/ig, "demo time")
      .replace(/\btreatment\b/ig, "class plan")
      .replace(/\bpatient(s)?\b/ig, "parent$1")
      .replace(/\bclinic\b/ig, "tuition centre")
      .replace(/\bdoctor\b/ig, "teacher")
      .replace(/\bappointment\b/ig, "demo class");
  }
  text = text
    .replace(/\breal example of strong\s+(instagram|whatsapp|google business|linkedin|website|email)\s+proof\b/ig, concreteProof)
    .replace(/\bstrong\s+(instagram|whatsapp|google business|linkedin|website|email)\s+proof\b/ig, concreteProof)
    .replace(/\b(instagram|whatsapp|google business|linkedin|website|email)\s+proof\b/ig, concreteProof)
    .replace(/\byet using [^.?!]+/ig, "yet")
    .replace(/\bwhatsapp\b/ig, "WhatsApp");
  text = text.replace(/\s+/g, " ").trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function isEducationContext(context = {}) {
  const source = lower([
    context.vertical,
    context.parentCategory,
    context.businessType,
    context.productsOrServices,
    context.audience,
    context.businessProblem,
    context.customerAction,
  ].filter(Boolean).join(" "));
  return /education|tuition|coaching|school|academy|teacher|learning centre|learning center|study centre|study center|demo class|batch|student|parent|maths|science/.test(source);
}

function sanitizeGeneratedValue(value, context) {
  if (typeof value === "string") return sanitizeGeneratedText(value, context);
  if (Array.isArray(value)) return value.map(item => sanitizeGeneratedValue(item, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeGeneratedValue(item, context)]));
  }
  return value;
}

function visibleRecommendationTexts(master) {
  const texts = [
    ...asArray(master?.marketing_priorities).flatMap(item => [
      item?.priority || item?.title,
      item?.why,
      ...(asArray(item?.how || item?.steps || item?.action_steps)),
      item?.expected_result,
    ]),
    ...asArray(master?.content_pillars).flatMap(item => [
      item?.pillar || item?.title,
      item?.purpose,
      item?.proof_needed,
    ]),
    ...asArray(master?.content_calendar_30_days).flatMap(item => [
      item?.title,
      item?.hook,
      item?.caption,
      item?.visual_direction,
      item?.why_this_works || item?.why_this_helps,
    ]),
    ...asArray(master?.growth_ideas_20).flatMap(item => [
      item?.title,
      item?.why,
      ...(asArray(item?.steps)),
      item?.expected_result,
    ]),
    ...asArray(master?.customer_pain_points_15).flatMap(item => [
      item?.problem,
      item?.your_solution,
      item?.text_to_use,
      item?.content_idea,
    ]),
    ...asArray(master?.captions),
    ...asArray(master?.message_templates).flatMap(item => [item?.type, item?.template, item?.why_suggested]),
  ];
  return texts.map(item => clean(item)).filter(Boolean);
}

function recommendationTitleTexts(master) {
  const texts = [
    ...asArray(master?.marketing_priorities).map(item => item?.priority || item?.title),
    ...asArray(master?.content_pillars).map(item => item?.pillar || item?.title),
    ...asArray(master?.content_calendar_30_days).map(item => item?.title || item?.hook || item?.topic),
    ...asArray(master?.growth_ideas_20).map(item => item?.title),
    ...asArray(master?.customer_pain_points_15).map(item => item?.problem || item?.customer_problem),
  ];
  return texts.map(item => clean(item)).filter(Boolean);
}

function knowledgeCategoriesUsed(units = []) {
  const categories = {};
  for (const unit of units || []) {
    const key = clean(unit?.type || unit?.source || "unknown", "unknown");
    categories[key] = (categories[key] || 0) + 1;
  }
  return categories;
}

function recommendationSignature(text) {
  return lower(text)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|and|for|with|this|that|your|their|business|customer|customers|people)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 22)
    .join(" ");
}

function duplicateRecommendationScore(master) {
  const groups = [
    asArray(master?.marketing_priorities).map(item => item?.priority || item?.title),
    asArray(master?.content_pillars).map(item => item?.pillar || item?.title),
    asArray(master?.content_calendar_30_days).map(item => item?.title || item?.hook || item?.topic),
    asArray(master?.growth_ideas_20).map(item => item?.title),
    asArray(master?.customer_pain_points_15).map(item => item?.problem || item?.customer_problem),
  ].map(group => group.map(text => recommendationSignature(text)).filter(Boolean));
  const texts = groups.flat();
  if (!texts.length) return { score: 0, duplicates: [] };
  const duplicateEntries = [];
  let duplicateTotal = 0;
  for (const group of groups) {
    const counts = new Map();
    for (const text of group) counts.set(text, (counts.get(text) || 0) + 1);
    const entries = [...counts.entries()].filter(([, count]) => count > 1);
    duplicateEntries.push(...entries);
    duplicateTotal += entries.reduce((sum, [, count]) => sum + count - 1, 0);
  }
  return {
    score: Math.min(100, Math.round((duplicateTotal / texts.length) * 100)),
    duplicates: duplicateEntries.slice(0, 8).map(([text, count]) => ({ text, count })),
  };
}

function genericLanguageScore(master) {
  const texts = visibleRecommendationTexts(master);
  const hits = [];
  for (const text of texts) {
    const source = lower(text);
    for (const phrase of [...BANNED_GENERIC_PHRASES, ...WEAK_GENERIC_PHRASES]) {
      if (source.includes(phrase)) hits.push({ phrase, text: compactText(text, "", 160) });
    }
  }
  const score = texts.length
    ? Math.max(0, 100 - Math.round((hits.length / texts.length) * 400))
    : 0;
  return { score, hits: hits.slice(0, 12) };
}

function businessSpecificityScore(master, context) {
  const allTexts = visibleRecommendationTexts(master);
  if (!allTexts.length) return 0;
  const primaryTexts = [
    ...recommendationTitleTexts(master),
    ...asArray(master?.content_calendar_30_days).flatMap(item => [
      item?.hook,
      item?.caption,
      item?.visual_direction,
      item?.script,
    ]),
    ...asArray(master?.message_templates).flatMap(item => [item?.template, item?.why_suggested]),
    ...asArray(master?.customer_pain_points_15).flatMap(item => [item?.text_to_use, item?.content_idea]),
  ].map(item => clean(item)).filter(Boolean);
  const phraseSource = unique([
    context.businessName,
    context.productsOrServices,
    context.audience,
    context.city,
    context.location,
    context.businessType,
    ...asArray(context.platforms),
    ...offerKeywords(context, 12),
    ...wordsForVertical(context, { industryPack: {} }),
  ].filter(Boolean));
  const phraseTokens = phraseSource.flatMap(phrase => clean(phrase).split(/[^a-z0-9]+/i).filter(word => word.length >= 4));
  const tokens = unique([...phraseSource, ...phraseTokens]).map(token => lower(token)).filter(Boolean);
  const scoreFor = (texts) => {
    if (!texts.length) return 0;
    const specificCount = texts.filter(text => {
      const source = lower(text);
      return tokens.some(token => source.includes(token));
    }).length;
    return Math.round((specificCount / texts.length) * 100);
  };
  const primaryScore = scoreFor(primaryTexts);
  const overallScore = scoreFor(allTexts);
  if (!primaryTexts.length) return overallScore;
  return Math.round(primaryScore * 0.72 + overallScore * 0.28);
}

function whyHowImpactScore(master) {
  const priorities = asArray(master?.marketing_priorities);
  if (!priorities.length) return 0;
  const covered = priorities.filter(item =>
    clean(item?.why).length >= 12
    && asArray(item?.how || item?.steps || item?.action_steps).length >= 2
    && clean(item?.expected_result || item?.track_this || item?.what_to_check).length >= 8
  ).length;
  return Math.round((covered / priorities.length) * 100);
}

function sentenceStem(text, length = 6) {
  return lower(text)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(paragon|urban|brew|third|wave|bean|square|naturals|glow|room|cult|iron|hour|hubspot|queuepilot|civicpoint|clearcase|schbang|pixelproof|clove|smiledock|sobha|northline|cartroid|nila)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, length)
    .join(" ");
}

function templateLikenessScore(master) {
  const calendar = asArray(master?.content_calendar_30_days);
  const titles = calendar.map(item => clean(item.title || item.hook || item.topic)).filter(Boolean);
  const captions = asArray(master?.captions).map(item => clean(item)).filter(Boolean);
  const messages = asArray(master?.message_templates).map(item => clean(item.template || item.message)).filter(Boolean);
  const texts = [...titles, ...captions, ...messages].filter(Boolean);
  if (!texts.length) return { score: 100, hits: ["No visible copy to review."] };

  const hitExamples = [];
  let weakHits = 0;
  const weakPatterns = [
    /record a 15[-\s]?second video/i,
    /record a short video/i,
    /showcase/i,
    /hi,?\s+thanks for asking/i,
    /tell us what you need/i,
    /we will guide the next step/i,
    /for .+ - (will|what|how|is|do|they)\b/i,
    /\babout\s+(they|will|what|how|is|do|can|i\b|are|does|why)\b/i,
    /^.+:\s*.+:\s*/i,
    ...ROBOTIC_OUTPUT_PATTERNS,
  ];
  for (const text of texts) {
    if (weakPatterns.some(pattern => pattern.test(text))) {
      weakHits += 1;
      if (hitExamples.length < 8) hitExamples.push(compactText(text, "", 140));
    }
  }

  const stems = new Map();
  for (const text of texts) {
    const stem = sentenceStem(text);
    if (stem.split(" ").length < 4) continue;
    stems.set(stem, (stems.get(stem) || 0) + 1);
  }
  const repeatedStems = [...stems.entries()].filter(([, count]) => count > 2);
  const repeatedCount = repeatedStems.reduce((sum, [, count]) => sum + count - 2, 0);
  const captionEchoes = calendar.slice(0, captions.length).filter((day, index) => {
    const title = lower(day.title || day.hook || day.topic);
    const caption = lower(captions[index]);
    return title && caption && caption.startsWith(title.slice(0, Math.min(title.length, 48)));
  }).length;
  const score = Math.min(100, Math.round(
    (weakHits / texts.length) * 48
    + (repeatedCount / texts.length) * 34
    + (captionEchoes / Math.max(1, captions.length)) * 28
  ));
  return {
    score,
    hits: [
      ...hitExamples,
      ...repeatedStems.slice(0, 5).map(([stem, count]) => `Repeated opening "${stem}" (${count}x)`),
      ...(captionEchoes ? [`${captionEchoes} captions repeat their card title.`] : []),
    ].slice(0, 12),
  };
}

function humanAgencyReviewScore(master, context) {
  const template = templateLikenessScore(master);
  const captions = asArray(master?.captions).map(item => clean(item)).filter(Boolean);
  const messages = asArray(master?.message_templates).map(item => clean(item.template || item.message)).filter(Boolean);
  const calendar = asArray(master?.content_calendar_30_days);
  const cta = lower(actionPhrase(context));
  const captionReady = captions.filter(text => {
    const source = lower(text);
    return text.length >= 70
      && text.length <= 260
      && !/record a|create a|showcase|before-after proof for| - /.test(source)
      && !hasRoboticOutput(text)
      && !source.startsWith(lower(context.businessName))
      && (source.includes(cta.split(" ")[0]) || /message|reply|send|share|ask|book|demo|trial|visit|save|comment|order|preview|check|start|confirm/.test(source));
  }).length / Math.max(1, captions.length);
  const messageReady = messages.filter(text => {
    const source = lower(text);
    return text.length >= 70
      && text.length <= 300
      && !/thanks for asking|tell us what you need|guide the next step clearly|area\/date/.test(source)
      && !hasRoboticOutput(text)
      && (
        source.includes(lower(leadOffer(context)).split(" ")[0])
        || source.includes(lower(context.businessName))
        || source.includes(cta.split(" ")[0])
        || /send|share|message|ask|reply|book|demo|trial|visit|slot|budget|appointment|photo|menu|order|shortlist|consultation|tell|describe|write|confirm|check/.test(source)
      );
  }).length / Math.max(1, messages.length);
  const executionReady = calendar.slice(0, 12).filter(day =>
    asArray(day.how_to_create).some(step => /price|slot|timing|script|overlay|reply|photo|proof|budget|document|demo|trial|preview|review|walkthrough/i.test(step))
    && asArray(day.shot_list).length >= 3
  ).length / Math.max(1, Math.min(12, calendar.length));
  const score = Math.round(
    Math.max(0, 100 - template.score) * 0.35
    + captionReady * 25
    + messageReady * 22
    + executionReady * 18
  );
  return {
    score,
    template_likeness_score: template.score,
    template_likeness_hits: template.hits,
    caption_ready_ratio: Number(captionReady.toFixed(2)),
    message_ready_ratio: Number(messageReady.toFixed(2)),
    execution_ready_ratio: Number(executionReady.toFixed(2)),
  };
}

function executionFieldScore(items, checks) {
  const list = asArray(items);
  if (!list.length) return { passed: 0, total: 1, failures: ["missing_items"] };
  let passed = 0;
  const failures = [];
  list.forEach((item, index) => {
    const missing = checks
      .filter(([label, test]) => !test(item))
      .map(([label]) => label);
    if (!missing.length) passed += 1;
    else if (failures.length < 8) failures.push(`${index + 1}:${missing.join(",")}`);
  });
  return { passed, total: list.length, failures };
}

function pageExecutionScore(master) {
  const hasText = (...values) => values.some(value => clean(value).length >= 18);
  const hasShortText = (...values) => values.some(value => clean(value).length >= 3);
  const hasList = value => asArray(value).filter(item => clean(item).length >= 12).length >= 3;
  const checks = [];
  checks.push(executionFieldScore(master?.growth_strategy_10_steps, [
    ["exact_action", item => hasText(item.exact_action, item.title)],
    ["why", item => hasText(item.why_this_matters, item.reason, item.why_it_matters)],
    ["when", item => hasShortText(item.when_to_do_this, item.timeline)],
    ["who", item => hasShortText(item.who_should_do_it, item.owner)],
    ["how", item => hasList(item.how_to_execute || item.action_steps || item.steps)],
    ["doubt", item => hasText(item.customer_doubt_solved)],
    ["result", item => hasText(item.expected_result, item.business_result, item.track_this)],
  ]));
  checks.push(executionFieldScore(master?.target_personas, [
    ["motivation", item => hasText(item.motivation, item.need)],
    ["fear", item => hasText(item.fear, item.hesitation, item.objection)],
    ["trigger", item => hasText(item.buying_trigger)],
    ["sell", item => hasText(item.how_to_sell, item.best_message)],
  ]));
  checks.push(executionFieldScore(master?.customer_pain_points_15, [
    ["problem", item => hasText(item.problem, item.customer_problem)],
    ["exact_action", item => hasText(item.exact_action, item.what_to_do)],
    ["when", item => hasShortText(item.when_to_do_this)],
    ["who", item => hasShortText(item.who_should_do_it)],
    ["how", item => hasList(item.how_to_execute)],
    ["doubt", item => hasText(item.customer_doubt_solved, item.problem)],
    ["result", item => hasText(item.expected_result)],
  ]));
  const competitors = master?.competitor_intelligence?.archetypes || master?.competitors;
  checks.push(executionFieldScore(competitors, [
    ["why_choose", item => hasText(item.why_customers_choose_it, item.why_people_choose_it, asArray(item.strengths)[0])],
    ["weakness", item => hasText(item.weakness_to_use, asArray(item.weaknesses)[0])],
    ["counter", item => hasText(item.exact_counter_move, item.how_to_beat_them, item.how_to_win)],
    ["content", item => hasText(item.content_to_make, item.message_to_use)],
  ]));
  checks.push(executionFieldScore(master?.growth_ideas_20, [
    ["exact_action", item => hasText(item.exact_action, item.title)],
    ["why", item => hasText(item.why_it_matters, item.why)],
    ["when", item => hasShortText(item.when_to_do_this, item.when_to_try)],
    ["who", item => hasShortText(item.who_should_do_it)],
    ["how", item => hasList(item.how_to_execute || item.steps)],
    ["doubt", item => hasText(item.customer_doubt_solved)],
    ["result", item => hasText(item.expected_result)],
  ]));
  checks.push(executionFieldScore(master?.content_calendar_30_days, [
    ["objective", item => hasText(item.objective)],
    ["idea", item => hasText(item.exact_content_idea, item.title)],
    ["format", item => hasShortText(item.post_type, item.postType, item.content_format, item.campaign_type)],
    ["when", item => hasShortText(item.when_to_do_this)],
    ["who", item => hasShortText(item.who_should_do_it, item.target_customer)],
    ["hook", item => hasText(item.hook)],
    ["shot_list", item => hasList(item.shot_list)],
    ["caption", item => hasText(item.caption, item.ready_caption)],
    ["cta", item => hasText(item.cta, item.customer_action)],
    ["why", item => hasText(item.why_this_works, item.why_this_helps)],
    ["result", item => hasText(item.expected_result, item.expected_outcome)],
  ]));
  checks.push(executionFieldScore(master?.advanced_growth_plan?.moves, [
    ["week", item => Number(item.week || item.module || 0) > 0 || hasText(item.timeline)],
    ["exact_action", item => hasText(item.exact_action, item.action, item.title)],
    ["why", item => hasText(item.why_it_matters, item.why)],
    ["when", item => hasShortText(item.when_to_do_this, item.timeline)],
    ["who", item => hasShortText(item.who_should_do_it)],
    ["how", item => hasList(item.how_to_execute || item.steps)],
    ["result", item => hasText(item.expected_result, item.output)],
  ]));
  const brand = master?.brand_style || {};
  const brandPassed = [
    hasText(brand.voice, brand.tone),
    asArray(brand.words_to_use).length >= 4,
    asArray(brand.words_to_avoid).length >= 4,
    asArray(brand.sample_lines).filter(line => clean(line).length >= 18).length >= 2,
  ].filter(Boolean).length;
  checks.push({ passed: brandPassed, total: 4, failures: brandPassed === 4 ? [] : ["brand_style_missing_execution_examples"] });
  const passed = checks.reduce((sum, item) => sum + item.passed, 0);
  const total = checks.reduce((sum, item) => sum + item.total, 0);
  return {
    score: total ? Math.round((passed / total) * 100) : 0,
    failures: checks.flatMap(item => item.failures).slice(0, 12),
  };
}

function contentMixScore(master) {
  const days = asArray(master?.content_calendar_30_days);
  if (days.length < 30) return { score: 0, failures: ["calendar_missing_30_days"] };
  const categories = days.map(day => clean(day.campaign_type || day.post_type || day.postType || day.content_format)).filter(Boolean);
  const counts = new Map();
  for (const category of categories) counts.set(category.toLowerCase(), (counts.get(category.toLowerCase()) || 0) + 1);
  const uniqueCount = counts.size;
  const maxCount = Math.max(...counts.values());
  const failures = [];
  if (uniqueCount < 12) failures.push(`too_few_content_categories:${uniqueCount}`);
  if (maxCount > 5) failures.push(`dominant_content_category:${maxCount}`);
  return {
    score: failures.length ? Math.max(0, 100 - failures.length * 35) : 100,
    failures,
    unique_categories: uniqueCount,
    largest_category_count: maxCount,
  };
}

function pageDistinctnessScore(master) {
  const groups = {
    marketing_plan: asArray(master?.growth_strategy_10_steps).flatMap(item => [item?.title, item?.exact_action]),
    customer_types: asArray(master?.target_personas).flatMap(item => [item?.name, item?.motivation, item?.how_to_sell]),
    customer_problems: asArray(master?.customer_pain_points_15).flatMap(item => [item?.problem, item?.exact_action, item?.content_idea]),
    competitors: asArray(master?.competitor_intelligence?.archetypes || master?.competitors).flatMap(item => [item?.alternative, item?.exact_counter_move, item?.content_to_make]),
    calendar: asArray(master?.content_calendar_30_days).flatMap(item => [item?.title, item?.exact_content_idea]),
    post_ideas: asArray(master?.growth_ideas_20).flatMap(item => [item?.title, item?.exact_action]),
    captions: asArray(master?.captions),
    messages: asArray(master?.message_templates).flatMap(item => [item?.type, item?.template]),
    brand_style: [
      master?.brand_style?.voice,
      ...asArray(master?.brand_style?.sample_lines),
      ...asArray(master?.brand_style?.use_this_style),
    ],
    advanced_growth: asArray(master?.advanced_growth_plan?.moves).flatMap(item => [item?.title, item?.exact_action]),
  };
  const signatures = new Map();
  for (const [group, values] of Object.entries(groups)) {
    for (const value of asArray(values)) {
      const signature = recommendationSignature(value);
      if (!signature || signature.split(" ").length < 5) continue;
      const list = signatures.get(signature) || [];
      list.push({ group, value: clean(value) });
      signatures.set(signature, list);
    }
  }
  const failures = [...signatures.entries()]
    .map(([signature, list]) => {
      const distinctGroups = unique(list.map(item => item.group));
      return { signature, distinctGroups, list };
    })
    .filter(item => item.distinctGroups.length > 1)
    .map(item => `${item.signature}:${item.distinctGroups.join("+")}`)
    .slice(0, 12);
  return {
    score: failures.length ? Math.max(0, 100 - failures.length * 20) : 100,
    failures,
  };
}

function reviewerScorecard(metrics) {
  const inverseDuplicate = Math.max(0, 100 - Number(metrics.duplicate_recommendation_score || 0));
  const inverseTemplate = Math.max(0, 100 - Number(metrics.template_likeness_score || 0));
  const captionReady = Number(metrics.caption_ready_ratio || 0) * 100;
  const messageReady = Number(metrics.message_ready_ratio || 0) * 100;
  const scores = {
    founder: Math.round((metrics.business_specificity_score * 0.34) + (metrics.page_execution_score * 0.33) + (metrics.cross_page_distinctness_score * 0.33)),
    agency_owner: Math.round((metrics.master_strategy_quality_score * 0.35) + (metrics.why_how_impact_score * 0.25) + (inverseDuplicate * 0.2) + (metrics.content_mix_score * 0.2)),
    creative_director: Math.round((inverseTemplate * 0.34) + (metrics.verb_diversity_score * 0.33) + (metrics.content_mix_score * 0.33)),
    senior_copywriter: Math.round((inverseTemplate * 0.4) + (captionReady * 0.3) + (messageReady * 0.3)),
    performance_marketer: Math.round((metrics.why_how_impact_score * 0.4) + (metrics.page_execution_score * 0.3) + (metrics.content_mix_score * 0.3)),
    product_designer: Math.round((metrics.page_execution_score * 0.45) + (metrics.human_agency_review_score * 0.25) + (metrics.cross_page_distinctness_score * 0.3)),
  };
  const failures = Object.entries(scores)
    .filter(([, score]) => score < 95)
    .map(([role, score]) => `${role}:${score}`);
  return {
    scores,
    min_score: Math.min(...Object.values(scores)),
    failures,
  };
}

function scoreMasterStrategy(master, context, intelligence) {
  const duplicate = duplicateRecommendationScore(master);
  const generic = genericLanguageScore(master);
  const specificity = businessSpecificityScore(master, context);
  const whyHowImpact = whyHowImpactScore(master);
  const agency = humanAgencyReviewScore(master, context);
  const pageExecution = pageExecutionScore(master);
  const mix = contentMixScore(master);
  const crossPage = pageDistinctnessScore(master);
  const verbDiversity = verbDiversityScore([
    ...recommendationTitleTexts(master),
    ...asArray(master?.growth_strategy_10_steps).map(item => item.exact_action || item.title),
    ...asArray(master?.growth_ideas_20).map(item => item.exact_action || item.title),
    ...asArray(master?.content_calendar_30_days).map(item => item.exact_content_idea || item.title),
  ]);
  const structureScore = Math.min(100, Math.round((
    Math.min(asArray(master?.marketing_priorities).length, 10) / 10
    + Math.min(asArray(master?.content_pillars).length, 6) / 6
    + Math.min(asArray(master?.customer_objections).length, 6) / 6
    + Math.min(asArray(master?.content_calendar_30_days).length, 30) / 30
  ) * 25));
  const preReviewerMetrics = {
    master_strategy_quality_score: structureScore,
    duplicate_recommendation_score: duplicate.score,
    generic_language_score: generic.score,
    business_specificity_score: specificity,
    why_how_impact_score: whyHowImpact,
    template_likeness_score: agency.template_likeness_score,
    human_agency_review_score: agency.score,
    caption_ready_ratio: agency.caption_ready_ratio,
    message_ready_ratio: agency.message_ready_ratio,
    page_execution_score: pageExecution.score,
    verb_diversity_score: verbDiversity.score,
    content_mix_score: mix.score,
    cross_page_distinctness_score: crossPage.score,
  };
  const score = Math.round(
    structureScore * 0.07
    + generic.score * 0.12
    + specificity * 0.16
    + whyHowImpact * 0.15
    + Math.max(0, 100 - duplicate.score) * 0.06
    + Math.max(0, 100 - agency.template_likeness_score) * 0.08
    + agency.score * 0.09
    + pageExecution.score * 0.08
    + verbDiversity.score * 0.04
    + mix.score * 0.04
    + crossPage.score * 0.06
    + reviewerScorecard({ ...preReviewerMetrics, master_strategy_quality_score: 100 }).min_score * 0.09
  );
  const finalScore = Math.min(100, score);
  const reviewer = reviewerScorecard({
    ...preReviewerMetrics,
    master_strategy_quality_score: finalScore,
  });
  return {
    master_strategy_quality_score: finalScore,
    knowledge_categories_used: knowledgeCategoriesUsed(intelligence?.units || []),
    duplicate_recommendation_score: duplicate.score,
    duplicate_recommendation_examples: duplicate.duplicates,
    generic_language_score: generic.score,
    generic_language_hits: generic.hits,
    business_specificity_score: specificity,
    why_how_impact_score: whyHowImpact,
    template_likeness_score: agency.template_likeness_score,
    template_likeness_hits: agency.template_likeness_hits,
    human_agency_review_score: agency.score,
    caption_ready_ratio: agency.caption_ready_ratio,
    message_ready_ratio: agency.message_ready_ratio,
    execution_ready_ratio: agency.execution_ready_ratio,
    page_execution_score: pageExecution.score,
    page_execution_failures: pageExecution.failures,
    verb_diversity_score: verbDiversity.score,
    verb_diversity_failures: verbDiversity.overused,
    dominant_action_verb: verbDiversity.dominant,
    content_mix_score: mix.score,
    content_mix_failures: mix.failures,
    content_mix_unique_categories: mix.unique_categories,
    content_mix_largest_category_count: mix.largest_category_count,
    cross_page_distinctness_score: crossPage.score,
    cross_page_distinctness_failures: crossPage.failures,
    reviewer_quality_scores: reviewer.scores,
    reviewer_min_score: reviewer.min_score,
    reviewer_failures: reviewer.failures,
  };
}

function qualityIssueMessages(metrics) {
  const issues = [];
  if (metrics.generic_language_score < 92) issues.push("Generic marketing language or weak labels found.");
  if (metrics.business_specificity_score < 55) issues.push("Recommendations are not specific enough to the business.");
  if (metrics.duplicate_recommendation_score > 18) issues.push("Too many repeated recommendation patterns.");
  if (metrics.why_how_impact_score < 90) issues.push("Not every priority explains why, how, and expected impact.");
  if (metrics.template_likeness_score > 24) issues.push("Output still sounds like a reusable template.");
  if (metrics.human_agency_review_score < 76) issues.push("Human agency review score is too low.");
  if ((metrics.page_execution_score || 0) < 92) issues.push("One or more report pages lacks execution-ready fields.");
  if ((metrics.verb_diversity_score || 0) < 90) issues.push("Action/title openings overuse the same verb pattern.");
  if ((metrics.content_mix_score || 0) < 95) issues.push("30-day calendar does not use a balanced marketing mix.");
  if ((metrics.cross_page_distinctness_score || 0) < 100) issues.push("Different report pages repeat the same recommendation skeleton.");
  if ((metrics.reviewer_min_score || 0) < 95) issues.push("One reviewer lens scored the report below 9.5/10.");
  return issues;
}

function mergeWeakAiWithFallback(candidate, ruleDraft, metrics, issues = []) {
  const genericText = lower(metrics.generic_language_hits?.map(hit => hit.text).join(" "));
  const weakContent = metrics.generic_language_score < 92
    || /product explanation|trust building|brand awareness|customer engagement|simple menu/.test(genericText);
  const weakPriorities = metrics.why_how_impact_score < 90 || metrics.business_specificity_score < 55;
  const wrongVertical = issues.some(issue => /software strategy contains/i.test(issue));
  return {
    ...candidate,
    target_personas: wrongVertical ? ruleDraft.target_personas : candidate.target_personas,
    customer_objections: wrongVertical ? ruleDraft.customer_objections : candidate.customer_objections,
    competitors: wrongVertical ? ruleDraft.competitors : candidate.competitors,
    psychology: wrongVertical ? ruleDraft.psychology : candidate.psychology,
    offers: wrongVertical ? ruleDraft.offers : candidate.offers,
    content_pillars: (weakContent || wrongVertical) ? ruleDraft.content_pillars : candidate.content_pillars,
    marketing_priorities: (weakPriorities || wrongVertical) ? ruleDraft.marketing_priorities : candidate.marketing_priorities,
    growth_strategy_10_steps: (weakPriorities || wrongVertical) ? ruleDraft.growth_strategy_10_steps : candidate.growth_strategy_10_steps,
  };
}

function inferObjection(text, context) {
  const source = lower(text);
  if (/price|cost|expensive|budget/.test(source)) return "It may feel expensive before the value is clear.";
  if (/trust|proof|review|real|result/.test(source)) return "They may not trust the business enough yet.";
  if (/time|slot|booking|appointment|wait/.test(source)) return "They may worry about timing, availability, or waiting.";
  if (/order|whatsapp|message|reply|process|how it works/.test(source)) return "They may not know the next step.";
  if (/location|near|google|map|visit|parking/.test(source)) return "They may not know if the business is easy to reach.";
  if (/hygiene|clean|safe|clinic|food/.test(source)) return "They may worry about safety and cleanliness.";
  if (/demo|trial|feature|setup|software|app/.test(source)) return "They may not understand the product fast enough.";
  return `They may not understand why ${context.businessName} is the right choice yet.`;
}

function inferProofMethod(text, context) {
  const source = lower(text);
  if (/review|testimonial/.test(source)) return "customer review";
  if (/before|after|result/.test(source)) return "before-after proof";
  if (/demo|screen|feature|workflow/.test(source)) return context.parentCategory === "software" ? "product demo" : "service walkthrough";
  if (/kitchen|clean|hygiene|process|making/.test(source)) return "process proof";
  if (/price|menu|package|offer/.test(source)) return "clear price/package proof";
  if (/google|map|location/.test(source)) return "local presence proof";
  return "real example";
}

function classifyUnitType(text, sectionType = "") {
  const source = lower(`${sectionType} ${text}`);
  if (/price|cost|expensive|value|budget/.test(source)) return "pricing_principle";
  if (/question|doubt|problem|objection|worry|confus/.test(source)) return "customer_objection";
  if (/proof|review|trust|result|before|after/.test(source)) return "proof_method";
  if (/offer|package|combo|discount|trial|starter/.test(source)) return "offer_style";
  if (/instagram|reel|post|story|caption|whatsapp|google/.test(source)) return "channel_strategy";
  if (/psychology|fear|trigger|decision|buy/.test(source)) return "psychology";
  return "marketing_principle";
}

function contextFromProfile(businessProfile = {}, rawBiz = {}) {
  const context = normalizeBusinessContext(businessProfile, rawBiz);
  const source = lower([
    businessProfile?.market?.industry,
    businessProfile?.identity?.type,
    businessProfile?.offering?.coreOffer,
    rawBiz?.biz_industry,
    rawBiz?.biz_type,
    rawBiz?.biz_offer,
    rawBiz?.biz_extra,
  ].filter(Boolean).join(" "));
  const industrySource = lower([
    businessProfile?.market?.industry,
    businessProfile?.identity?.type,
    rawBiz?.biz_industry,
    rawBiz?.biz_type,
  ].filter(Boolean).join(" "));
  const offerSource = lower([
    businessProfile?.offering?.coreOffer,
    rawBiz?.biz_offer,
    rawBiz?.biz_extra,
  ].filter(Boolean).join(" "));
  const hasSoftwareIntent = /saas|software|micro[-\s]?saas|ai tool|developer tool|subscription app|subscription software/.test(industrySource)
    || /software|automation platform|dashboard|developer tool|subscription app|crm|app for|platform for/.test(offerSource);
  const vertical = /gym|fitness|workout|strength|weight loss|training/.test(industrySource)
    ? "gym"
    : hasSoftwareIntent
    ? "software"
    : /education|tuition|coaching|school|academy|teacher|study centre|study center|demo class|batch|student|parent/.test(source)
      ? "education"
    : /salon|beauty|bridal|makeup|facial|haircut|hair styling|grooming|party grooming/.test(source)
      ? "salon"
    : /dental|clinic|doctor|healthcare|diagnostic|physician|derma|dermatology|laser|acne|pigmentation|treatment/.test(source)
      ? "clinic"
    : /law|legal|lawyer|advocate|contract|law firm/.test(source)
      ? "law_firm"
      : /real estate|property|properties|apartment|flat|plot|rental|villa/.test(source)
        ? "real_estate"
        : /marketing agency|creative agency|ad agency|content strategy/.test(source)
          ? "marketing_agency"
          : "";
  const overrides = context.briefSubtype ? {} : ({
    software: {
      parentCategory: "software",
      businessType: "SaaS / Software",
      customerAction: "ask for a demo or early access",
    },
    gym: {
      parentCategory: "fitness",
      businessType: "Gym",
      customerAction: "ask for a trial session",
    },
    clinic: {
      parentCategory: "healthcare",
      businessType: "Clinic",
      customerAction: "book an appointment",
    },
    salon: {
      parentCategory: "beauty",
      businessType: "Salon",
      customerAction: "book a slot",
    },
    real_estate: {
      parentCategory: "real_estate",
      businessType: "Real Estate Agency",
      customerAction: "send budget and preferred area",
    },
    law_firm: {
      parentCategory: "professional_service",
      businessType: "Law Firm",
      customerAction: "book a consultation",
    },
    marketing_agency: {
      parentCategory: "professional_service",
      businessType: "Marketing Agency",
      customerAction: "book a consultation",
    },
    education: {
      parentCategory: "education",
      businessType: "Education / Coaching",
      customerAction: "ask for a demo class or batch details",
    },
  }[vertical] || {});
  return {
    ...context,
    ...overrides,
    vertical,
    businessName: clean(context.businessName, "Your Business"),
    businessType: clean(overrides.businessType || context.businessType, "business"),
    productsOrServices: clean(context.productsOrServices, "the offer"),
    audience: clean(context.audience, "the right customers"),
    businessProblem: clean(rawBiz?.biz_problem || rawBiz?.biggest_problem || rawBiz?.biz_challenge || businessProfile?.customers?.challenge || businessProfile?.objectives?.primaryChallenge, ""),
    city: clean(context.city, context.parentCategory === "software" ? "online market" : "your market"),
    location: clean(context.location, context.parentCategory === "software" ? "online market" : "your market"),
    customerAction: clean(overrides.customerAction || context.customerAction, "message us the exact need"),
    isSoftware: overrides.parentCategory === "software" || context.parentCategory === "software",
  };
}

function compactSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    url: clean(snapshot.url),
    title: clean(snapshot.title),
    description: clean(snapshot.description),
    headings: asArray(snapshot.headings).slice(0, 6).map(item => clean(item)),
    callsToAction: asArray(snapshot.callsToAction).slice(0, 6).map(item => clean(item)),
    detectedGaps: asArray(snapshot.detectedGaps).slice(0, 6).map(item => clean(item)),
  };
}

function knowledgeUnitFromBlock(block, context) {
  const content = toObject(block.content_json);
  const text = flattenText([
    block.title,
    block.section_type,
    block.domain,
    block.category_tags,
    block.problem_tags,
    block.platform_tags,
    block.product_type_tags,
    content.title,
    content.what_to_do,
    content.why_this_helps,
    content.customer_action,
    content.example,
  ]);
  const signature = normalizeSignature(text);
  if (!signature) return null;

  return {
    id: block.id,
    source: "strategy_block_extracted_knowledge",
    type: classifyUnitType(text, block.section_type),
    industry: unique(block.category_tags || []).slice(0, 4),
    platform: unique(block.platform_tags || []).slice(0, 4),
    problem: inferObjection(text, context),
    psychology: detectPsychology(text),
    proof_method: inferProofMethod(text, context),
    principle: compactText(content.why_this_helps || block.why_suggested || block.title, "", 150),
    raw_hint: compactText(content.what_to_do || content.example || content.title || block.title, "", 150),
    signature,
  };
}

function knowledgeUnitsFromPack(marketingOS, context) {
  const pack = marketingOS.industryPack || {};
  const goal = marketingOS.goalStrategy || {};
  const units = [];

  for (const item of asArray(pack.customerProblems)) {
    const text = flattenText(item);
    units.push({
      id: `pack_problem:${normalizeSignature(item.problem || text)}`,
      source: "industry_pack",
      type: "customer_objection",
      industry: [context.parentCategory],
      platform: [],
      problem: clean(item.problem, inferObjection(text, context)),
      psychology: detectPsychology(text),
      proof_method: inferProofMethod(text, context),
      principle: clean(item.why, ""),
      raw_hint: clean(item.solution || item.text || item.contentIdea, ""),
      signature: normalizeSignature(`${item.problem} ${item.solution}`),
    });
  }

  for (const idea of asArray(pack.shootablePostIdeas)) {
    const [title, visual, why] = Array.isArray(idea) ? idea : [idea?.title, idea?.visual, idea?.why];
    const text = flattenText(idea);
    units.push({
      id: `pack_content:${normalizeSignature(title || text)}`,
      source: "industry_pack",
      type: "content_format",
      industry: [context.parentCategory],
      platform: context.platforms,
      problem: inferObjection(text, context),
      psychology: detectPsychology(text),
      proof_method: inferProofMethod(text, context),
      principle: clean(why, ""),
      raw_hint: clean(visual || title, ""),
      signature: normalizeSignature(`${title} ${visual}`),
    });
  }

  for (const angle of asArray(goal.contentAngles)) {
    units.push({
      id: `goal_angle:${normalizeSignature(angle)}`,
      source: "goal_strategy",
      type: "goal_angle",
      industry: [context.parentCategory],
      platform: context.platforms,
      problem: inferObjection(angle, context),
      psychology: detectPsychology(angle),
      proof_method: inferProofMethod(angle, context),
      principle: clean(goal.purpose, ""),
      raw_hint: clean(angle, ""),
      signature: normalizeSignature(`goal ${angle}`),
    });
  }

  return units;
}

function makeSpecialUnit(vertical, index, type, problem, psychology, proofMethod, principle, rawHint) {
  return {
    id: `vertical_${vertical}_${type}_${index}`,
    source: "vertical_knowledge_override",
    type,
    industry: [vertical],
    platform: [],
    problem,
    psychology: asArray(psychology),
    proof_method: proofMethod,
    principle,
    raw_hint: rawHint || principle,
    signature: normalizeSignature(`${vertical} ${type} ${problem} ${rawHint}`),
  };
}

function knowledgeUnitsFromVertical(context) {
  const vertical = context.vertical;
  if (vertical === "software") {
    return [
      makeSpecialUnit(vertical, 1, "customer_objection", "They do not understand what the product actually does yet.", ["cognitive ease", "risk reduction"], "short product demo", "Show one real workflow from start to finish."),
      makeSpecialUnit(vertical, 2, "customer_objection", "They worry setup will take too much time.", ["risk reduction"], "setup walkthrough", "Show the first setup step and how long it takes."),
      makeSpecialUnit(vertical, 3, "customer_objection", "They fear the software will not fit their real daily work.", ["social proof", "clarity"], "use-case proof", "Create one use-case card for the exact buyer workflow."),
      makeSpecialUnit(vertical, 4, "content_format", "They need to see the screen before they trust the promise.", ["clarity"], "screen recording", "Record a 15-second screen video showing one workflow from start to finish."),
      makeSpecialUnit(vertical, 5, "content_format", "They need to compare manual work with the product workflow.", ["contrast"], "before-after workflow", "Show manual process versus software process in two columns."),
      makeSpecialUnit(vertical, 6, "content_format", "They need proof that support exists after signup.", ["risk reduction"], "support proof", "Show onboarding, help replies, or founder support clearly."),
      makeSpecialUnit(vertical, 7, "offer_style", "The first step feels risky before they see the product.", ["reciprocity", "commitment"], "demo or early access", "Offer a short demo, early access, or guided trial instead of asking for payment first."),
    ];
  }
  if (vertical === "gym") {
    return [
      makeSpecialUnit(vertical, 1, "customer_objection", "They worry they will feel awkward as beginners.", ["risk reduction", "social proof"], "beginner-friendly trainer clip", "Show a trainer correcting one simple exercise safely."),
      makeSpecialUnit(vertical, 2, "customer_objection", "They fear paying and not staying consistent.", ["commitment", "loss aversion"], "weekly habit tracker", "Show a 3-day starter routine and how beginners are guided."),
      makeSpecialUnit(vertical, 3, "content_format", "They need to see the gym is not only for advanced people.", ["social proof"], "beginner member story", "Record a beginner-friendly tour: entrance, trainer desk, one machine, trial step."),
      makeSpecialUnit(vertical, 4, "content_format", "They need proof that trainers help normal beginners.", ["authority", "risk reduction"], "trainer form correction", "Film a trainer correcting one common exercise mistake."),
      makeSpecialUnit(vertical, 5, "content_format", "They need to imagine a simple first week.", ["cognitive ease"], "3-day beginner plan", "Show Monday, Wednesday, Friday beginner workout cards."),
      makeSpecialUnit(vertical, 6, "content_format", "They need social proof without fake transformation claims.", ["social proof"], "member habit story", "Share a member story about consistency, not miracle results."),
      makeSpecialUnit(vertical, 7, "offer_style", "The first visit feels like a big commitment.", ["reciprocity"], "trial session", "Offer a guided trial session with clear timing and what to bring."),
    ];
  }
  if (vertical === "real_estate") {
    return [
      makeSpecialUnit(vertical, 1, "customer_objection", "They do not trust property listings until details are verified.", ["risk reduction", "social proof"], "verified property walkthrough", "Show location, price range, property type, legal/basic verification, and site visit step."),
      makeSpecialUnit(vertical, 2, "customer_objection", "They do not want random properties outside their budget.", ["cognitive ease"], "budget-to-area match", "Ask for budget, preferred area, property type, and timeline before sharing options."),
      makeSpecialUnit(vertical, 3, "content_format", "They need to understand the area before booking a visit.", ["clarity"], "area explainer", "Create an area card with landmark, commute, nearby essentials, and who the property fits."),
      makeSpecialUnit(vertical, 4, "content_format", "They need to inspect the property without wasting a visit.", ["risk reduction"], "video walkthrough", "Record a simple walkthrough showing entrance, rooms, road access, and nearby landmark."),
      makeSpecialUnit(vertical, 5, "content_format", "They compare area, budget, and property type together.", ["cognitive ease"], "matched shortlist", "Post a three-option comparison for one budget range."),
      makeSpecialUnit(vertical, 6, "content_format", "They need proof that listings are current.", ["social proof"], "availability update", "Share a weekly available-properties update with budget and area."),
      makeSpecialUnit(vertical, 7, "offer_style", "Site visits feel risky if the property is not relevant.", ["commitment"], "shortlisted site visit", "Send three matched options before asking for a site visit."),
    ];
  }
  if (vertical === "law_firm") {
    return [
      makeSpecialUnit(vertical, 1, "customer_objection", "They are scared legal help will become expensive and confusing.", ["price framing", "risk reduction"], "process map", "Explain the first consultation, document check, expected timeline, and next step."),
      makeSpecialUnit(vertical, 2, "customer_objection", "They delay because they do not know which documents matter.", ["cognitive ease"], "document checklist", "Create a simple checklist for property, contract, or startup legal enquiries."),
      makeSpecialUnit(vertical, 3, "content_format", "They need plain-language legal education before they trust the firm.", ["authority", "clarity"], "legal myth explainer", "Turn one common legal mistake into a short plain-English post."),
      makeSpecialUnit(vertical, 4, "content_format", "They need to know what happens in the first call.", ["risk reduction"], "consultation walkthrough", "Show the first-call process: issue type, documents, options, next step."),
      makeSpecialUnit(vertical, 5, "content_format", "They need examples without private client details.", ["authority"], "anonymous case lesson", "Explain one common contract or property mistake without naming anyone."),
      makeSpecialUnit(vertical, 6, "content_format", "They need fee and process clarity before asking.", ["price framing"], "legal process card", "Create a card explaining consultation, document review, and next-step fee range."),
      makeSpecialUnit(vertical, 7, "offer_style", "The first conversation feels intimidating.", ["risk reduction"], "consultation path", "Invite them to share the issue type and documents before booking a consultation."),
    ];
  }
  if (vertical === "marketing_agency") {
    return [
      makeSpecialUnit(vertical, 1, "customer_objection", "Founders think agency work means pretty posts without business impact.", ["risk reduction"], "before-after strategy proof", "Show one client problem, the thinking, the creative direction, and the business result."),
      makeSpecialUnit(vertical, 2, "customer_objection", "They do not know why strategy should come before content.", ["cognitive ease"], "strategy teardown", "Break down one weak ad or page and show what should change."),
      makeSpecialUnit(vertical, 3, "content_format", "They need proof that the agency understands business, not only design.", ["authority"], "consultant-style audit", "Create a mini audit post with problem, reason, fix, and expected result."),
      makeSpecialUnit(vertical, 4, "content_format", "They need to see the difference between random content and strategy.", ["clarity"], "bad vs better content teardown", "Compare a weak post with a strategy-led version."),
      makeSpecialUnit(vertical, 5, "content_format", "They need to trust the thinking process.", ["authority"], "strategy map", "Show how one customer problem becomes content, offer, and follow-up."),
      makeSpecialUnit(vertical, 6, "content_format", "They need proof before retainer talk.", ["social proof"], "audit result story", "Share one audit insight and the business action it created."),
      makeSpecialUnit(vertical, 7, "offer_style", "They hesitate to commit to a retainer.", ["commitment"], "paid audit starter", "Offer a small strategy audit before a bigger monthly plan."),
    ];
  }
  return [];
}

function competitorsForVertical(context) {
  if (context.vertical === "software") {
    return [
      { alternative: "Manual process", why_people_choose_it: "It feels familiar and costs nothing upfront.", weakness_to_use: "It wastes time and creates repeated mistakes.", how_to_win: `${context.businessName} should show the exact workflow it makes faster.` },
      { alternative: "Large software tool", why_people_choose_it: "It looks established.", weakness_to_use: "It may feel too complex for small teams.", how_to_win: "Show simpler setup, faster support, and one clear use case." },
      { alternative: "Spreadsheet or WhatsApp tracking", why_people_choose_it: "It is already part of daily work.", weakness_to_use: "It becomes messy when volume grows.", how_to_win: "Show what becomes easier after the first week of use." },
    ];
  }
  if (context.vertical === "gym") {
    return [
      { alternative: "Nearby gym", why_people_choose_it: "It may already feel familiar.", weakness_to_use: "It may not explain beginner support clearly.", how_to_win: `${context.businessName} should show trainer guidance, trial steps, and beginner habit support.` },
      { alternative: "Home workout", why_people_choose_it: "It feels free and private.", weakness_to_use: "People often lack form checks and consistency.", how_to_win: "Show safe coaching, routine support, and a simple first visit." },
      { alternative: "Fitness app", why_people_choose_it: "It feels convenient.", weakness_to_use: "It cannot correct local beginner form in person.", how_to_win: "Show real trainer correction and gym environment." },
    ];
  }
  if (context.vertical === "real_estate") {
    return [
      { alternative: "Property portal", why_people_choose_it: "It has many listings.", weakness_to_use: "Listings can feel unverified or overwhelming.", how_to_win: "Give matched options based on budget, area, and property type." },
      { alternative: "Local broker", why_people_choose_it: "They may know the area.", weakness_to_use: "The process may not be transparent.", how_to_win: "Show verified details, area notes, and site-visit steps." },
      { alternative: "Direct owner listing", why_people_choose_it: "It may look cheaper.", weakness_to_use: "Buyers still need verification and comparison.", how_to_win: "Explain what is checked before a visit." },
    ];
  }
  if (context.vertical === "law_firm") {
    return [
      { alternative: "Asking friends for legal advice", why_people_choose_it: "It feels free.", weakness_to_use: "It may not fit the actual document or issue.", how_to_win: "Offer a plain consultation path and document checklist." },
      { alternative: "Online legal templates", why_people_choose_it: "They look fast and cheap.", weakness_to_use: "Templates miss context.", how_to_win: "Show one mistake a generic template can create." },
      { alternative: "Large law office", why_people_choose_it: "It may feel established.", weakness_to_use: "The first step may feel intimidating.", how_to_win: "Make process, documents, and consultation timing simple." },
    ];
  }
  if (context.vertical === "marketing_agency") {
    return [
      { alternative: "Freelance designer", why_people_choose_it: "It may look cheaper.", weakness_to_use: "Design alone may not fix the business problem.", how_to_win: "Show strategy before creative execution." },
      { alternative: "DIY posting", why_people_choose_it: "It feels free.", weakness_to_use: "It usually repeats random content.", how_to_win: "Show how a problem becomes a content system." },
      { alternative: "Big agency", why_people_choose_it: "It may feel impressive.", weakness_to_use: "It can feel expensive and distant.", how_to_win: "Show sharp thinking and founder-level involvement." },
    ];
  }
  return [];
}

function wordsForVertical(context, marketingOS) {
  const subtypeWords = {
    d2c_skincare: ["sunscreen", "SPF", "formula", "ingredients", "fragrance-free", "application", "delivery", "returns", "reviews", "order"],
    physiotherapy: ["physiotherapy", "physiotherapist", "assessment", "rehabilitation", "mobility", "exercise", "injury", "recovery", "safety", "progress"],
    b2b_solar: ["solar", "rooftop", "panel", "electricity", "generation", "site survey", "EPC", "DISCOM", "net-metering", "warranty", "ROI"],
    nonprofit_education: ["cohort", "digital skills", "learner", "mentor", "safeguarding", "eligibility", "application", "referral", "volunteer", "partner"],
  };
  if (subtypeWords[context.briefSubtype]) return subtypeWords[context.briefSubtype];
  if (context.vertical === "software") return ["demo", "workflow", "setup", "early access", "trial", "automation", "dashboard", "support"];
  if (context.vertical === "gym") return ["trial session", "trainer guidance", "beginner routine", "form check", "membership", "consistency", "strength", "progress"];
  if (context.vertical === "real_estate") return ["budget", "preferred area", "property type", "verified listing", "site visit", "area notes", "shortlist", "availability"];
  if (context.vertical === "law_firm") return ["consultation", "document check", "legal issue", "timeline", "contract", "property document", "plain guidance", "next step"];
  if (context.vertical === "marketing_agency") return ["strategy", "audit", "customer problem", "creative direction", "proof", "lead quality", "content system", "business result"];
  const kind = businessKind(context);
  if (kind === "food") return ["menu", "price", "portion", "wait time", "parcel", "takeaway", "family dining", "order"];
  if (kind === "salon") return ["slot", "starting price", "hair", "skin", "bridal", "facial", "result proof", "appointment"];
  if (kind === "clinic") return ["appointment", "first step", "consultation", "treatment", "patient", "timing", "safe care", "cost range"];
  if (kind === "retail") return ["real photo", "preview", "price", "size", "availability", "custom order", "delivery", "gift"];
  return unique((marketingOS.industryPack?.vocabulary || []).slice(0, 8));
}

function offersForVertical(context, marketingOS) {
  if (context.vertical === "software") return ["guided demo", "early access", "free setup call", "workflow audit", "trial workspace"];
  if (context.vertical === "gym") return ["guided trial session", "beginner 3-day starter plan", "form-check intro session", "monthly habit support"];
  if (context.vertical === "real_estate") return ["matched property shortlist", "verified listing walkthrough", "area-and-budget consultation", "site visit plan"];
  if (context.vertical === "law_firm") return ["first consultation", "document checklist review", "contract clarity session", "property document check"];
  if (context.vertical === "marketing_agency") return ["paid strategy audit", "content direction sprint", "profile/page teardown", "30-day action plan"];
  return marketingOS.industryPack?.commonOffers || [];
}

function prioritiesForVertical(context, intelligence) {
  if (!context.vertical) return [];
  const focus = leadOffer(context);
  const contentHints = intelligence.units
    .filter(unit => unit.type === "content_format")
    .map(unit => unit.raw_hint)
    .filter(Boolean);
  const objections = intelligence.units
    .filter(unit => unit.type === "customer_objection")
    .map(unit => unit.problem)
    .filter(Boolean);
  const proof = unique(intelligence.units.map(unit => unit.proof_method)).filter(Boolean);
  const base = [
    {
      priority: `${context.businessName}: make ${actionPhrase(context)} for ${focus} the first visible action`,
      why: `People should know exactly how to start with ${focus} at ${context.businessName}.`,
      how: [`Put "${actionPhrase(context)}" for ${focus} in bio, first reply, and every important post.`, `Use words customers understand: ${wordsForVertical(context, { industryPack: {} }).slice(0, 4).join(", ")}.`, `Track ${baseMetric(context)}.`],
      expected_result: baseMetric(context),
    },
    {
      priority: `${context.businessName}: answer the biggest hesitation first`,
      why: objections[0] || `This removes hesitation before people act.`,
      how: [contentHints[0] || "Create one clear proof post.", `Use ${proof[0] || "real proof"} as the evidence.`, `End with ${actionPhrase(context)}.`],
      expected_result: baseMetric(context),
    },
    {
      priority: `${context.businessName}: build one proof library`,
      why: `A proof library makes every future post and reply stronger.`,
      how: proof.slice(0, 3).map(item => `Collect ${item}.`),
      expected_result: "More trust before the first conversation.",
    },
    {
      priority: `${context.businessName}: turn repeated questions into content`,
      why: `Repeated questions show what customers need before they act.`,
      how: objections.slice(0, 3).map(item => `Make one post answering: ${item}`),
      expected_result: baseMetric(context),
    },
    {
      priority: `${context.businessName}: create a clear starter offer`,
      why: `A smaller first step makes action feel safer.`,
      how: [`Package ${focus} into one starter path.`, `Explain who it is for.`, `Close with ${actionPhrase(context)}.`],
      expected_result: baseMetric(context),
    },
    {
      priority: `${context.businessName}: make comparison easy`,
      why: `Customers compare alternatives before trusting ${context.businessName}.`,
      how: ["Name the common alternative.", "Show the gap clearly.", "Explain why your process is safer or clearer."],
      expected_result: "More qualified conversations.",
    },
    {
      priority: `${context.businessName}: build a follow-up habit`,
      why: `Many serious customers need one clear reminder.`,
      how: ["Save every useful enquiry.", "Follow up once with a helpful proof point.", "Track who replied."],
      expected_result: baseMetric(context),
    },
    {
      priority: `${context.businessName}: use the strongest channel for intent`,
      why: `${context.platforms[0] || "The main channel"} should move people toward action, not just attention.`,
      how: [`Use ${context.platforms[0] || "the main channel"} for proof.`, "Use direct messages for questions.", "Use saved replies for speed."],
      expected_result: baseMetric(context),
    },
    {
      priority: `${context.businessName}: review what created real action`,
      why: `The best strategy comes from what customers actually respond to.`,
      how: ["Check the top three replies/questions weekly.", "Repeat the strongest proof format.", "Drop ideas that only get empty likes."],
      expected_result: "Better decisions every week.",
    },
    {
      priority: `${context.businessName}: turn results into the next campaign`,
      why: `Real results make the next month easier to sell.`,
      how: ["Save outcomes.", "Turn them into posts and replies.", "Use them in the next offer."],
      expected_result: baseMetric(context),
    },
  ];
  return base;
}

function personasForVertical(context) {
  if (context.vertical === "software") {
    return [
      { label: "Busy owner", what_they_want: "Less manual work without learning a complicated tool.", what_may_stop_them: "They worry setup will take too long.", message_to_use: `${context.businessName} shows the workflow before asking you to start.`, best_channel: "Website" },
      { label: "Operations lead", what_they_want: "A clearer system for repeated tasks.", what_may_stop_them: "They need proof it fits the current workflow.", message_to_use: "Ask for a short demo using your real workflow.", best_channel: "LinkedIn" },
      { label: "Founder buyer", what_they_want: "A tool that saves time and looks credible.", what_may_stop_them: "They do not want another unused subscription.", message_to_use: "Start with early access and one use case.", best_channel: "Email" },
      { label: "Team member", what_they_want: "Something easy enough to use daily.", what_may_stop_them: "They fear the tool will add more work.", message_to_use: "See the simple workflow before switching.", best_channel: "Demo" },
    ];
  }
  if (context.vertical === "gym") {
    return [
      { label: "Beginner student", what_they_want: "A gym where they will not feel judged.", what_may_stop_them: "They do not know how to start safely.", message_to_use: `${context.businessName} gives beginners a guided first session.`, best_channel: "Instagram" },
      { label: "Consistency struggler", what_they_want: "A simple routine they can continue.", what_may_stop_them: "They have joined gyms before and stopped.", message_to_use: "Start with three guided days instead of guessing alone.", best_channel: "WhatsApp" },
      { label: "Weight-loss starter", what_they_want: "Visible support and clear progress.", what_may_stop_them: "They fear wasting money without results.", message_to_use: "Ask for the beginner plan and trial session.", best_channel: "WhatsApp" },
      { label: "Strength learner", what_they_want: "Correct form and trainer attention.", what_may_stop_them: "They worry about injury or embarrassment.", message_to_use: "Book a form-check trial at the gym.", best_channel: "Instagram" },
    ];
  }
  if (context.vertical === "real_estate") {
    return [
      { label: "First-home buyer", what_they_want: "Relevant homes within budget.", what_may_stop_them: "They do not trust random listings.", message_to_use: "Send your budget and preferred area to get matched options.", best_channel: "WhatsApp" },
      { label: "Rental family", what_they_want: "Safe location, timing, and clear rent details.", what_may_stop_them: "They do not want wasted site visits.", message_to_use: "Ask for available properties that fit your area and budget.", best_channel: "WhatsApp" },
      { label: "Investor", what_they_want: "Clear area logic and property proof.", what_may_stop_them: "They need numbers before visiting.", message_to_use: "Ask for shortlisted options with area notes.", best_channel: "WhatsApp" },
      { label: "Outstation buyer", what_they_want: "Trust before travelling for a visit.", what_may_stop_them: "They need verified details first.", message_to_use: "Request a video walkthrough before booking a site visit.", best_channel: "Instagram" },
    ];
  }
  if (context.vertical === "law_firm") {
    return [
      { label: "Founder with legal doubt", what_they_want: "Plain guidance before a mistake becomes expensive.", what_may_stop_them: "They fear high fees and confusing words.", message_to_use: "Share the issue type and documents before booking a consultation.", best_channel: "LinkedIn" },
      { label: "Family property owner", what_they_want: "A safe document check.", what_may_stop_them: "They do not know which papers matter.", message_to_use: "Ask for the property document checklist.", best_channel: "WhatsApp" },
      { label: "Small business owner", what_they_want: "Contract clarity.", what_may_stop_them: "They delay because legal work feels heavy.", message_to_use: "Book a short consultation for the contract question.", best_channel: "LinkedIn" },
      { label: "First-time legal client", what_they_want: "A calm first step.", what_may_stop_them: "They feel intimidated by lawyers.", message_to_use: "Explain your issue in simple words and ask what to prepare first.", best_channel: "WhatsApp" },
    ];
  }
  if (context.vertical === "marketing_agency") {
    return [
      { label: "Founder who tried random posting", what_they_want: "Clear strategy before more content.", what_may_stop_them: "They think agencies only make pretty posts.", message_to_use: "Book a small strategy audit first.", best_channel: "LinkedIn" },
      { label: "Local business owner", what_they_want: "Content that brings real enquiries.", what_may_stop_them: "They do not understand strategy terms.", message_to_use: "Ask for one simple content direction.", best_channel: "WhatsApp" },
      { label: "Service business lead", what_they_want: "Better enquiries.", what_may_stop_them: "They cannot tell what is broken.", message_to_use: "Share the page or profile for a quick audit.", best_channel: "Instagram" },
      { label: "Scaling founder", what_they_want: "A repeatable marketing system.", what_may_stop_them: "They fear retainers without proof.", message_to_use: "Start with a paid audit and action plan.", best_channel: "LinkedIn" },
    ];
  }
  return [];
}

function knowledgeUnitFromObject(row, context) {
  const content = toObject(row.content_json);
  const text = flattenText(content);
  const signature = normalizeSignature(`${row.id} ${row.domain_name} ${row.object_type} ${text}`);
  if (!signature) return null;
  return {
    id: row.id,
    source: "knowledge_object",
    type: clean(row.object_type, "marketing_knowledge"),
    domain: clean(row.domain_name),
    industry: [clean(row.industry_id)],
    platform: [],
    problem: inferObjection(text, context),
    psychology: detectPsychology(text),
    proof_method: inferProofMethod(text, context),
    principle: compactText(content.core_truth || content.principle || content.insight || text, "", 180),
    raw_hint: compactText(content.implication || content.solution || content.hook || text, "", 180),
    signature,
  };
}

function diversifyUnits(units, limit = 42) {
  const seenSignatures = new Set();
  const typeCounts = new Map();
  const sourceCounts = new Map();
  const selected = [];

  for (const unit of units.filter(Boolean)) {
    const signature = unit.signature || normalizeSignature(flattenText(unit));
    if (!signature || seenSignatures.has(signature)) continue;
    const type = unit.type || "knowledge";
    const source = unit.source || "unknown";
    const typeCount = typeCounts.get(type) || 0;
    const sourceCount = sourceCounts.get(source) || 0;
    if (typeCount >= 8 || sourceCount >= 22) continue;
    seenSignatures.add(signature);
    typeCounts.set(type, typeCount + 1);
    sourceCounts.set(source, sourceCount + 1);
    selected.push({ ...unit, signature });
    if (selected.length >= limit) break;
  }

  return selected;
}

async function fetchKnowledgeObjects(db, lineage = [], context) {
  if (!db || !Array.isArray(lineage) || lineage.length === 0) return [];
  const placeholders = lineage.map(() => "?").join(",");
  try {
    const { results } = await db.prepare(`
      SELECT ko.id, ko.industry_id, ko.object_type, ko.content_json, kd.name AS domain_name
      FROM knowledge_objects ko
      JOIN knowledge_domains kd ON kd.id = ko.domain_id
      WHERE ko.review_status = 'Published'
        AND kd.is_active = 1
        AND ko.industry_id IN (${placeholders})
      ORDER BY ko.base_confidence DESC, ko.updated_at DESC
      LIMIT 36
    `).bind(...lineage).all();
    return (results || []).map(row => knowledgeUnitFromObject(row, context)).filter(Boolean);
  } catch (error) {
    console.warn("Master strategy knowledge_objects retrieval failed:", error?.message || error);
    return [];
  }
}

async function fetchStrategyBlocksAsKnowledge(db, businessProfile, rawBiz, context) {
  if (!db) {
    return {
      candidateCount: 0,
      selectedCount: 0,
      units: [],
      selectedIds: [],
    };
  }
  try {
    const retriever = new StrategyBlockRetrieval(db);
    const result = await retriever.retrieveForReport(businessProfile, rawBiz, {
      candidateLimit: 180,
      quotas: KNOWLEDGE_SECTION_QUOTAS,
    });
    return {
      candidateCount: result.candidateCount,
      selectedCount: result.selectedCount,
      units: (result.selectedBlocks || []).map(block => knowledgeUnitFromBlock(block, context)).filter(Boolean),
      selectedIds: (result.selectedBlocks || []).map(block => block.id).filter(Boolean),
    };
  } catch (error) {
    console.warn("Master strategy block-to-knowledge retrieval failed:", error?.message || error);
    return {
      candidateCount: 0,
      selectedCount: 0,
      units: [],
      selectedIds: [],
    };
  }
}

export async function retrieveMarketingIntelligence({ db, businessProfile, rawBiz, lineage = [], internetSignals = null }) {
  const context = contextFromProfile(businessProfile, rawBiz);
  const marketingOS = buildMarketingOSReport({ businessProfile, rawBiz, telemetry: {} });
  const verticalUnits = knowledgeUnitsFromVertical(context);
  const packUnits = verticalUnits.length ? [] : knowledgeUnitsFromPack(marketingOS, context);
  const objectUnits = await fetchKnowledgeObjects(db, lineage, context);
  const blockResult = await fetchStrategyBlocksAsKnowledge(db, businessProfile, rawBiz, context);
  const websiteUnits = [];

  const ownSnapshot = rawBiz?.own_website_snapshot || null;
  const competitorSnapshot = rawBiz?.competitor_website_snapshot || null;
  if (ownSnapshot) {
    const text = flattenText(compactSnapshot(ownSnapshot));
    websiteUnits.push({
      id: "own_website_facts",
      source: "website",
      type: "website_fact",
      industry: [context.parentCategory],
      platform: ["website"],
      problem: inferObjection(text, context),
      psychology: detectPsychology(text),
      proof_method: inferProofMethod(text, context),
      principle: "Use visible website facts instead of guessing.",
      raw_hint: compactText(text, "", 220),
      signature: normalizeSignature(`own website ${text}`),
    });
  }
  if (competitorSnapshot) {
    const text = flattenText(compactSnapshot(competitorSnapshot));
    websiteUnits.push({
      id: "competitor_website_facts",
      source: "competitor",
      type: "competitive_gap",
      industry: [context.parentCategory],
      platform: ["competitor_website"],
      problem: inferObjection(text, context),
      psychology: detectPsychology(text),
      proof_method: inferProofMethod(text, context),
      principle: "Use visible competitor facts only where they are present.",
      raw_hint: compactText(text, "", 220),
      signature: normalizeSignature(`competitor ${text}`),
    });
  }

  const units = diversifyUnits([
    ...websiteUnits,
    ...verticalUnits,
    ...objectUnits,
    ...packUnits,
    ...blockResult.units,
  ]);

  return {
    context,
    marketingOS,
    units,
    stats: {
      knowledge_objects_used: objectUnits.length,
      strategy_blocks_repurposed: blockResult.units.length,
      strategy_block_candidates: blockResult.candidateCount || 0,
      industry_pack_units: packUnits.length,
      vertical_override_units: verticalUnits.length,
      website_units: websiteUnits.length,
      total_units: units.length,
      duplicate_reduction_note: "Strategy blocks were converted into knowledge units and deduped before AI reasoning.",
    },
    retrievedPackIds: unique([
      ...objectUnits.map(unit => unit.id),
      ...blockResult.selectedIds,
      ...websiteUnits.map(unit => unit.id),
    ]),
    internetSignals,
  };
}

function actionPhrase(context) {
  if (context.parentCategory === "software") return "ask for a demo or early access";
  if (context.vertical === "real_estate" || /real estate/i.test(context.businessType)) return "send budget and preferred area";
  if (context.vertical === "law_firm") return "book a consultation";
  if (context.vertical === "gym") return "ask for a trial session";
  if (/clinic|dental|health/i.test(context.businessType)) return "book a safe appointment";
  return lower(context.customerAction, "message us the exact need");
}

function baseMetric(context) {
  if (context.parentCategory === "software") return "demo requests, signups, trial starts, qualified replies, and activation questions";
  if (context.vertical === "real_estate" || /real estate/i.test(context.businessType)) return "budget messages, site-visit bookings, property enquiries, and follow-ups";
  if (context.vertical === "law_firm") return "consultation requests, document-check enquiries, qualified legal questions, and follow-ups";
  if (context.vertical === "gym") return "trial session requests, membership enquiries, visit bookings, and beginner questions";
  if (/clinic|dental|health/i.test(context.businessType)) return "appointment calls, timing questions, consultation bookings, and patient-safe reviews";
  return "useful messages, saves, calls, bookings, orders, reviews, and repeated questions";
}

function defaultMasterCore({ marketingOS, intelligence }) {
  const context = intelligence.context;
  const tabs = marketingOS.workspace.tabs || {};
  const problems = asArray(tabs.painPoints?.items);
  const strategy = asArray(tabs.strategy?.steps);
  const personas = asArray(tabs.clientPersona?.personas);
  const verticalPersonas = personasForVertical(context);
  const competitors = asArray(tabs.competitors?.archetypes);
  const verticalCompetitors = competitorsForVertical(context);
  const ideas = asArray(tabs.ideas?.experiments);
  const verticalPriorities = prioritiesForVertical(context, intelligence);
  const knowledgeObjections = intelligence.units
    .filter(unit => unit.type === "customer_objection" && unit.problem)
    .map(unit => ({
      problem: unit.problem,
      why_they_feel_this: unit.principle,
      your_solution: unit.raw_hint,
      trust_factor: unit.proof_method,
    }));
  const proofUnits = intelligence.units.filter(unit => /proof|trust|risk|social/.test(flattenText(unit.psychology)));
  const problemSource = knowledgeObjections.length ? knowledgeObjections : problems;
  const firstProblem = problemSource[0] || {};
  const firstUnit = intelligence.units[0] || {};

  return {
    business_summary: {
      name: context.businessName,
      industry: context.businessType,
      location: context.location,
      audience: context.audience,
      offer: context.productsOrServices,
      goal: context.selectedGoal,
      read: `${context.businessName} needs a sharper path from attention to ${actionPhrase(context)}.`,
    },
    business_diagnosis: {
      top_problems: unique([
        firstProblem.problem,
        firstUnit.problem,
        `${context.audience} need proof before they act.`,
        `${context.productsOrServices} must be explained in plain words.`,
        `The next step must be visible on ${context.platforms[0] || "the main channel"}.`,
      ]).slice(0, 10),
      root_causes: [
        "The offer may be clear to the owner but not obvious to a first-time customer.",
        "The proof, process, price, and next step are not tied together strongly enough.",
        `The content must answer why ${context.businessName} is safer or better for ${context.audience}.`,
      ],
      opportunities: [
        `Make ${context.productsOrServices} easy to understand in one screen.`,
        `Turn customer doubts into posts, replies, and proof moments for ${context.businessName}.`,
        `Use ${context.city} context only where it helps the buyer decide.`,
      ],
      competitive_gaps: (verticalCompetitors.length ? verticalCompetitors : competitors).slice(0, 3).map(item => clean(item.how_to_win || item.how_to_beat_them || item.label || item.alternative)),
      risk_warnings: [
        "Do not publish vague posts that could belong to any business.",
        `Do not ask for ${actionPhrase(context)} before showing enough proof.`,
      ],
    },
    positioning: {
      statement: `${context.businessName} should be known as the ${context.businessType} choice for ${context.audience} who want ${context.productsOrServices} with less confusion.`,
      one_liner: `${context.businessName} makes ${context.productsOrServices} easier to understand, trust, and act on.`,
      proof_to_show: unique([
        ...(context.briefSubtype ? asArray(marketingOS.industryPack?.trustFactors) : []),
        ...proofUnits.map(unit => unit.proof_method),
      ]).slice(0, 6),
      category_enemy: "confusing marketing, unclear proof, and weak next steps",
    },
    unique_value_proposition: {
      promise: `${context.productsOrServices} with clearer proof and an easier next step.`,
      why_believe: proofUnits[0]?.principle || "The plan uses real proof, customer questions, and simple action paths.",
      first_action: actionPhrase(context),
    },
    target_personas: (verticalPersonas.length ? verticalPersonas : personas).slice(0, 4).map((item, index) => ({
      name: clean(item.label || item.who_they_are, `Customer type ${index + 1}`),
      need: clean(item.what_they_want, `A clear reason to choose ${context.businessName}.`),
      hesitation: clean(item.what_may_stop_them, problemSource[index % Math.max(1, problemSource.length)]?.problem || firstProblem.problem || "They need more proof."),
      best_message: clean(item.message_to_use, `${context.businessName} can guide the next step clearly.`),
      best_channel: clean(item.best_channel, context.platforms[index % context.platforms.length] || "Instagram"),
    })),
    customer_objections: problemSource.slice(0, 8).map(item => ({
      objection: clean(item.problem || item.customer_problem),
      reason: clean(item.why_they_feel_this || item.why),
      answer: clean(item.your_solution || item.what_to_do || item.text_to_use),
      proof: clean(item.trust_factor || inferProofMethod(flattenText(item), context)),
    })),
    competitors: (verticalCompetitors.length ? verticalCompetitors : competitors).slice(0, 4).map(item => ({
      alternative: clean(item.alternative || item.label, "Another option"),
      why_people_choose_it: clean(item.why_people_choose_it || asArray(item.strengths)[0], "It feels familiar."),
      weakness_to_use: clean(item.weakness_to_use || asArray(item.weaknesses)[0], "The next step may not be clear."),
      how_to_win: clean(item.how_to_win || item.how_to_beat_them || item.message_to_use, `${context.businessName} should make proof and action clearer.`),
    })),
    messaging: {
      tone: "simple, specific, proof-first, and easy to act on",
      proof_messages: unique([
        ...(context.briefSubtype ? asArray(marketingOS.industryPack?.trustFactors) : []),
        ...intelligence.units.map(unit => unit.proof_method),
      ]).slice(0, 6),
      words_to_use: wordsForVertical(context, marketingOS),
      words_to_avoid: SAFE_WORDS_TO_AVOID,
    },
    psychology: unique(intelligence.units.flatMap(unit => unit.psychology)).slice(0, 8).map(name => ({
      principle: name,
      use_it_by: `Apply ${name} to make ${context.businessName} easier to trust before asking people to ${actionPhrase(context)}.`,
    })),
    offers: unique([
      ...offersForVertical(context, marketingOS),
      `${context.productsOrServices} starter path`,
      `${context.businessName} first-customer proof offer`,
    ]).slice(0, 5).map(offer => ({
      offer,
      why: `It gives ${context.audience} a smaller, clearer first step.`,
      next_step: actionPhrase(context),
    })),
    content_pillars: unique([
      ...intelligence.units.filter(unit => unit.type === "content_format").map(unit => unit.raw_hint),
      ...(context.vertical || context.briefSubtype ? [] : (marketingOS.goalStrategy?.contentAngles || [])),
      ...(context.vertical || context.briefSubtype ? [] : (ideas || []).map(item => item.title)),
    ]).slice(0, 8).map((pillar, index) => ({
      pillar: clean(pillar, `Proof angle ${index + 1}`),
      purpose: `Help ${context.audience} understand ${context.businessName} before they act.`,
      proof_needed: unique(intelligence.units.map(unit => unit.proof_method))[index % Math.max(1, unique(intelligence.units.map(unit => unit.proof_method)).length)] || "real example",
    })),
    marketing_priorities: (verticalPriorities.length ? verticalPriorities : strategy.slice(0, 10).map(item => ({
      priority: clean(item.title),
      why: clean(item.why_this_matters || item.reason),
      how: asArray(item.steps || item.action_steps).slice(0, 3).map(step => clean(step)),
      expected_result: clean(item.track_this || item.what_to_check || baseMetric(context)),
    }))),
    retention_strategy: {
      idea: `Turn every useful question, result, and review into a repeatable proof loop for ${context.businessName}.`,
      actions: ["Save repeated questions", "Ask for a review after a good result", "Follow up with people who showed intent"],
      metric: baseMetric(context),
    },
    growth_strategy: {
      first_7_days: "Fix the promise, proof, first reply, and first content angles.",
      next_30_days: "Repeat the proof formats that create real customer action.",
      main_metric: baseMetric(context),
    },
    kpis: unique([baseMetric(context), "source of every enquiry", "repeated customer questions", "proof posts saved", "reply-to-action rate"]).slice(0, 6),
  };
}

function ensureArrayLength(values, target, factory) {
  const output = asArray(values);
  let index = 0;
  while (output.length < target && index < target * 3) {
    output.push(factory(output.length, index));
    index += 1;
  }
  return output.slice(0, target);
}

function uniqueBySignature(values, signatureFn) {
  const seen = new Set();
  const output = [];
  for (const value of asArray(values)) {
    const signature = normalizeSignature(signatureFn(value));
    if (!signature || seen.has(signature)) continue;
    seen.add(signature);
    output.push(value);
  }
  return output;
}

function normalizePriority(item, index, context) {
  const focus = businessFacingFocus(context, offerFocus(context, index), index);
  const finalizeTitle = (title) => {
    const cleaned = sanitizeGeneratedText(title, context);
    const source = lower(cleaned);
    if (source.includes(lower(focus))) return cleaned;
    if (/visible|whatsapp|demo|consultation|trial session|budget and preferred area|check availability|order/.test(source)) {
      return `${cleaned.replace(/[.!?]+$/g, "")} for ${focus}`;
    }
    return cleaned;
  };
  const contextualizeTitle = (title) => {
    const rawTitle = clean(title, `Priority ${index + 1}`);
    const source = lower(rawTitle);
    if (/increase visibility|visibility on instagram|instagram visibility/.test(source)) return `${context.businessName}: show ${focus} proof on ${context.platforms[0] || "Instagram"}`;
    if (/make .*whatsapp.*visible|whatsapp.*visible/.test(source)) return `${context.businessName}: make ${actionPhrase(context)} for ${focus} visible`;
    if (/show real results|explain services/.test(source)) return `${context.businessName}: show real ${focus} results before asking for action`;
    if (/first visible action|visible action/.test(source)) return `${context.businessName}: make ${actionPhrase(context)} for ${focus} the first visible action`;
    if (/make the first action visible/.test(source)) return `${context.businessName}: make "${actionPhrase(context)}" visible`;
    if (/show one real example/.test(source)) return `${context.businessName}: prove ${context.productsOrServices} with one real example`;
    if (/answer the biggest doubt/.test(source)) return `${context.businessName}: answer the doubt before customers ask`;
    if (/saved reply/.test(source)) return `${context.businessName}: prepare replies for ${context.productsOrServices}`;
    if (/proof visible|local trust|product proof/.test(source)) return `${context.businessName}: make proof impossible to miss`;
    if (/offer path/.test(source)) return `${context.businessName}: turn ${context.productsOrServices} into one clear starter step`;
    if (/best channel/.test(source)) return `${context.businessName}: use ${context.platforms[0] || "the main channel"} for the next action`;
    if (/useful numbers|track/.test(source)) return `${context.businessName}: track only action that can become business`;
    if (/winning post/.test(source)) return `${context.businessName}: repeat the format that gets real replies`;
    if (/result into proof/.test(source)) return `${context.businessName}: turn every result into public proof`;
    return source.includes(lower(context.businessName)) ? rawTitle : `${context.businessName}: ${rawTitle}`;
  };

  if (typeof item === "string") {
    return {
      priority: finalizeTitle(contextualizeTitle(item)),
      why: `This helps ${context.businessName} move ${context.audience} closer to ${actionPhrase(context)} for ${focus}.`,
      how: [
        `Turn ${focus} into one visible action on ${context.platforms[0] || "the main channel"}.`,
        `Use one proof point that answers a buyer doubt about ${focus}.`,
        `Close with ${actionPhrase(context)} and track ${baseMetric(context)}.`,
      ],
      expected_result: baseMetric(context),
    };
  }
  const steps = asArray(item.how || item.steps || item.action_steps)
    .map(step => sanitizeGeneratedText(clean(step), context))
    .filter(Boolean)
    .slice(0, 4);
  return {
    priority: finalizeTitle(contextualizeTitle(item.priority || item.title || item.name)),
    why: sanitizeGeneratedText(clean(item.why || item.reason || item.why_this_matters, `This matters because ${context.audience} need a clear reason to trust ${context.businessName} for ${focus}.`), context),
    how: ensureArrayLength(steps, 3, n => [
      `Use ${focus} as the proof point.`,
      `Publish it on ${context.platforms[n % Math.max(1, context.platforms.length)] || "the main channel"}.`,
      `Close with ${actionPhrase(context)} and track ${baseMetric(context)}.`,
    ][n % 3]),
    expected_result: clean(item.expected_result || item.track_this || item.metric, baseMetric(context)),
  };
}

function normalizeObjection(item, index, context) {
  const focus = businessFacingFocus(context, offerFocus(context, index), index);
  if (typeof item === "string") {
    return {
      objection: strengthenCustomerDoubt(item, context, focus),
      reason: `This can stop ${context.audience} before they ask about ${context.productsOrServices}.`,
      answer: `Show one real example from ${context.businessName} and make the next step clear.`,
      proof: "real example",
    };
  }
  return {
    objection: strengthenCustomerDoubt(item.objection || item.problem || item.customer_problem, context, focus),
    reason: clean(item.reason || item.why || item.why_they_feel_this, `This doubt slows down ${actionPhrase(context)}.`),
    answer: clean(item.answer || item.solution || item.your_solution || item.what_to_do, `Give a simple answer using ${context.businessName}'s real offer.`),
    proof: clean(item.proof || item.trust_factor || item.proof_method, "real proof"),
  };
}

function strengthenCustomerDoubt(value, context, focus = "") {
  const text = clean(value);
  const offer = clean(focus || leadOffer(context), "the offer");
  const source = lower(`${text} ${context.productsOrServices} ${context.businessType}`);
  const variant = contextVariant(context, businessKind(context));
  if (variant === "sales_software" && /understand|product actually|software|demo|workflow|setup/.test(source)) {
    return `They need to see the lead handoff screen before trusting ${offer}.`;
  }
  if (variant === "clinic_software" && /understand|product actually|software|demo|workflow|setup|queue/.test(source)) {
    return `They need to see the reception queue flow before trusting ${offer}.`;
  }
  if (variant === "finance_software" && /understand|product actually|software|demo|workflow|setup|complicated|invoice|payment|cashflow/.test(source)) {
    return `They need to see the invoice or payment reminder workflow before trusting ${offer}.`;
  }
  if (/salon$/.test(variant) && /final look|match.*photo|saved photo|reference photo/.test(source)) {
    return `They worry ${offer} will not match the reference photo, budget, or event timing.`;
  }
  if (variant === "gift_retail" && /size|fit|stock|available|availability/.test(source)) {
    return `They need preview, delivery, and real-photo clarity before paying for ${offer}.`;
  }
  if (variant === "skin_clinic" && /final look|match.*photo|saved photo|hair|style|outfit|fit preference/.test(source)) {
    return `They worry ${offer} will not be safe, realistic, or worth the cost.`;
  }
  if (text.length >= 18) return text;
  if (/clean|safe|hygiene/.test(source)) return `They need proof that ${context.businessName} is clean and safe before choosing ${offer}.`;
  if (/price|cost|budget|rate/.test(source)) return `They need price or budget clarity before asking about ${offer}.`;
  if (/time|slot|wait|delay|delivery/.test(source)) return `They need timing clarity before they take the next step for ${offer}.`;
  if (/quality|good|real|trust/.test(source)) return `They need real proof that ${offer} will be worth choosing.`;
  if (/fit|size|style/.test(source)) return `They need fit and style clarity before confirming ${offer}.`;
  if (/demo|setup|software|workflow/.test(source)) return `They need to see the workflow before trusting ${offer}.`;
  return `They need clearer proof about ${offer} before they take action.`;
}

function strengthenCompetitorReason(value, alternative, context) {
  const text = clean(value);
  if (text.length >= 18) return text;
  const alt = clean(alternative, "this option");
  if (/cheap|price|affordable/i.test(text)) return `${alt} can look safer because the price feels lower at first.`;
  if (/familiar|known|established/i.test(text)) return `${alt} feels familiar, so customers assume it is the safer first choice.`;
  if (/free/i.test(text)) return `${alt} feels free or easier because the hidden cost is not obvious yet.`;
  return `${alt} can feel easier because customers understand it faster than ${context.businessName}.`;
}

function strengthenExpectedResult(value, context) {
  const text = clean(value);
  return text.length >= 18 ? text : baseMetric(context);
}

function leadOffer(context) {
  return clean(context.productsOrServices)
    .split(/,|\/|\band\b|\+/i)
    .map(item => clean(item))
    .filter(item => item.length >= 4 && !/services?|products?|items?|offer/.test(lower(item)))[0]
    || clean(context.productsOrServices, "the main offer");
}

function offerKeywords(context, limit = 8) {
  const pieces = clean(context.productsOrServices)
    .split(/,|;|\/|\band\b|\+|\|/i)
    .map(item => clean(item))
    .filter(item => item.length >= 4 && !/^(services?|products?|items?|offers?|main offer)$/i.test(item));
  return unique([leadOffer(context), ...pieces]).slice(0, limit);
}

function offerFocus(context, index = 0) {
  const offers = offerKeywords(context);
  return offers[index % Math.max(1, offers.length)] || leadOffer(context);
}

function naturalOfferFocus(context, index = 0) {
  const subtypeSets = {
    d2c_skincare: ["mineral SPF sunscreen", "fragrance-free formula", "real sunscreen application", "delivery and returns proof"],
    physiotherapy: ["physiotherapy assessment", "mobility plan", "guided rehabilitation exercise", "recovery progress review"],
    b2b_solar: ["rooftop solar site survey", "generation estimate", "DISCOM approval plan", "EPC safety and warranty proof"],
    nonprofit_education: ["free digital-skills cohort", "learner eligibility", "mentor-led learning", "safeguarding and supporter path"],
  };
  const subtypeList = subtypeSets[context.briefSubtype];
  if (subtypeList) return subtypeList[index % subtypeList.length];
  const source = lower([
    context.businessName,
    context.productsOrServices,
    context.audience,
    context.location,
  ].join(" "));
  const kind = businessKind(context);
  const sets = {
    food: /shawarma|hostel|student dinner|grilled/.test(source)
      ? ["shawarma combo", "student dinner order", "quick parcel meal", "juice combo"]
      : /coffee|workspace|pastr|cold coffee|brownie|sandwich/.test(source)
        ? ["coffee break order", "student combo", "brownie-and-drink pick", "takeaway snack"]
        : ["family biryani order", "seafood meal", "takeaway parcel", "first-time order"],
    salon: /college|party|glow/.test(source)
      ? ["party grooming slot", "hair styling appointment", "facial booking", "event look plan"]
      : ["event makeup booking", "haircut appointment", "facial service", "bridal consultation"],
    gym: ["beginner trial session", "first-week routine", "trainer form check", "guided workout"],
    software: /queue|clinic|reception/.test(source)
      ? ["clinic queue workflow", "reception demo", "patient-flow setup", "desk handoff"]
      : /gst|invoice|cashflow|payment|accounting|ledger|finance|tax|bookkeep/.test(source)
        ? ["invoice reminder workflow", "cashflow dashboard", "payment follow-up screen", "finance setup demo"]
        : ["CRM demo workflow", "lead handoff screen", "sales pipeline setup", "guided trial"],
    law_firm: /property|civicpoint/.test(source)
      ? ["property document check", "first consultation", "contract review", "deadline checklist"]
      : ["founder agreement check", "startup compliance review", "contract consultation", "legal first step"],
    agency: /pixel|small business|local/.test(source)
      ? ["local page audit", "reel strategy audit", "offer clarity check", "content direction"]
      : ["strategy audit", "campaign diagnosis", "content direction", "brand proof check"],
    clinic: ["first dental checkup", "appointment step", "patient concern", "consultation path"],
    real_estate: ["budget-fit shortlist", "verified property option", "site-visit filter", "area match"],
    retail: /boutique|kurti|outfit|clothing/.test(source)
      ? ["college outfit", "available stock", "size-and-style reply", "pickup-ready look"]
      : ["gift preview", "custom gift option", "real product photo", "delivery-date check"],
    local: [leadOffer(context), "first enquiry", "starter offer", "proof post"],
  };
  const list = sets[kind] || sets.local;
  return list[index % list.length] || leadOffer(context);
}

function businessFacingFocus(context, value, index = 0) {
  const source = clean(value);
  if (!source) return naturalOfferFocus(context, index);
  if (/\b(opening day tasting plate|first visit package|clearance bundle|checkup camp|matched property shortlist|guided trial(?: session)?|early access|paid strategy audit|content direction sprint|document checklist review|consultation slot|verified listing walkthrough|new arrival drop|weekend slot offer|family combo|service recommendation tool|real example on website|workflow audit)\b/i.test(source)) {
    return naturalOfferFocus(context, index);
  }
  if (/\bon\s+(website|instagram|whatsapp|google business|linkedin|email)\b/i.test(source)) {
    return naturalOfferFocus(context, index);
  }
  return compactPhrase(source, naturalOfferFocus(context, index), 4);
}

function stableHash(value) {
  const source = clean(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededIndex(context, salt, index, length) {
  if (!length) return 0;
  const source = [
    context.businessName,
    context.businessType,
    context.productsOrServices,
    context.audience,
    salt,
  ].join(":");
  const hash = stableHash(source);
  const mixed = (hash ^ (hash >>> 7) ^ (hash >>> 17)) >>> 0;
  return (mixed + index * 7) % length;
}

function pickSeeded(list, context, salt, index) {
  if (!list?.length) return "";
  return list[seededIndex(context, salt, index, list.length)];
}

const ACTION_VERB_STARTERS = [
  "take viewers inside",
  "walk through",
  "break down",
  "price-check",
  "follow up",
  "reply with",
  "ask about",
  "ask for",
  "set up",
  "compare",
  "reveal",
  "document",
  "interview",
  "test",
  "debunk",
  "demonstrate",
  "audit",
  "rank",
  "map",
  "challenge",
  "answer",
  "highlight",
  "diagnose",
  "localize",
  "survey",
  "publish",
  "collect",
  "rewrite",
  "prototype",
  "celebrate",
  "explain",
  "sort",
  "package",
  "verify",
  "turn",
  "guide",
  "design",
  "prepare",
  "frame",
  "qualify",
  "calm",
  "fix",
  "introduce",
  "position",
  "invite",
  "confirm",
  "check",
  "book",
  "request",
  "choose",
  "pick",
  "list",
  "attach",
  "mention",
  "bring",
  "describe",
  "forward",
  "film",
  "show",
  "record",
  "shoot",
  "plan",
  "build",
  "prove",
  "ask",
  "send",
  "message",
  "share",
  "tell",
  "write",
  "make",
  "create",
].sort((a, b) => b.length - a.length);

function escapedActionVerbPattern() {
  return ACTION_VERB_STARTERS
    .map(starter => starter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
}

const STRONG_ACTION_VERB_PATTERN = new RegExp(`^(${escapedActionVerbPattern()})\\b`, "i");
const OVERUSED_ACTION_VERB_PATTERN = /^(film|show|make|ask)\b/i;

function titleStarter(text) {
  const source = clean(text)
    .toLowerCase()
    .replace(/^[^a-z0-9]+/g, "")
    .replace(/^[a-z0-9 .&'/-]{2,60}:\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return source.match(STRONG_ACTION_VERB_PATTERN)?.[1] || "";
}

function verbDiversityScore(texts) {
  const starters = asArray(texts).map(titleStarter).filter(Boolean);
  if (!starters.length) return { score: 0, overused: [], dominant: "" };
  const counts = new Map();
  for (const starter of starters) counts.set(starter, (counts.get(starter) || 0) + 1);
  const total = starters.length;
  const overused = [...counts.entries()]
    .filter(([verb, count]) => (OVERUSED_ACTION_VERB_PATTERN.test(verb) && count / total > 0.22) || count / total > 0.28)
    .map(([verb, count]) => `${verb}:${count}/${total}`);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.join(":") || "";
  return {
    score: overused.length ? Math.max(0, 100 - overused.length * 25) : 100,
    overused,
    dominant,
  };
}

function contentMixForIndex(context, index) {
  const kind = businessKind(context);
  const local = [
    ["Instagram Reel", "Instagram", "proof reel", "Founder or staff", "Day of posting, before peak enquiry time"],
    ["Carousel", "Instagram", "decision guide", "Owner or content helper", "Same day, after collecting one proof point"],
    ["Story", "Instagram", "question poll", "Owner", "Morning or evening when replies are easiest"],
    ["Static post", "Instagram", "clear offer card", "Owner", "When price, process, or timing is ready"],
    ["Customer review post", "Instagram", "review proof", "Owner", "Within 24 hours of a good customer moment"],
    ["Google Business update", "Google Business", "search trust", "Owner", "Before the weekend or local search peak"],
    ["WhatsApp Status", "WhatsApp", "warm follow-up", "Owner", "Same day, after posting on Instagram"],
    ["Referral story", "WhatsApp", "referral ask", "Owner", "After a happy customer or warm reply"],
    ["Loyalty post", "Instagram", "repeat customer habit", "Owner", "After the first useful customer action"],
    ["Email or broadcast note", "Email / WhatsApp", "reactivation", "Owner", "End of week, before planning the next week"],
    ["Offer test", "Instagram", "starter offer", "Owner", "When the first action is too unclear"],
    ["Pricing clarity post", "Instagram", "price framing", "Owner", "Before people ask price repeatedly"],
    ["Website/profile fix", "Website", "landing page clarity", "Owner", "Before sending traffic to the page"],
    ["SEO/Search post", "Google Business", "search answer", "Owner", "When customers search by location or need"],
    ["Local partnership pitch", "WhatsApp / Instagram", "partnership", "Owner", "After one strong proof post exists"],
    ["Community post", "Instagram / WhatsApp", "community marketing", "Owner", "When a local group or audience cluster is obvious"],
    ["Event or occasion post", "Instagram", "occasion trigger", "Owner", "A few days before the buying occasion"],
    ["UGC request", "Instagram / WhatsApp", "customer content", "Owner", "Right after delivery, visit, or result"],
    ["Behind-the-scenes post", "Instagram Reel", "process proof", "Staff or founder", "While the work is actually happening"],
    ["Founder story", "Instagram", "human trust", "Founder", "When the business needs more human proof"],
    ["Staff story", "Instagram", "team trust", "Staff member", "When trust depends on who does the work"],
    ["Case-study post", "Instagram / LinkedIn", "result story", "Owner", "After one customer journey can be explained"],
    ["Comparison post", "Instagram", "alternative comparison", "Owner", "When buyers are choosing between options"],
    ["Educational post", "Instagram", "buyer education", "Owner", "When buyers ask the same question"],
    ["FAQ post", "Instagram / Website", "doubt removal", "Owner", "When repeated questions slow replies"],
    ["Sales message", "WhatsApp", "direct sales reply", "Owner", "After someone has shown interest"],
    ["Booking/order flow post", "Instagram", "first-step clarity", "Owner", "When people do not know what to send"],
    ["Retention message", "WhatsApp", "repeat action", "Owner", "After a completed order, visit, trial, or enquiry"],
    ["Cross-sell/upsell post", "WhatsApp / Instagram", "better basket", "Owner", "After the starter offer is understood"],
    ["Reactivation message", "WhatsApp / Email", "old lead revival", "Owner", "End of week, after checking old conversations"],
  ];
  const software = [
    ["Screen demo", "Website / LinkedIn", "workflow proof", "Founder or product owner", "Before asking for a demo call"],
    ["Use-case carousel", "LinkedIn", "buyer education", "Founder", "After choosing one target role"],
    ["Founder build note", "LinkedIn", "human trust", "Founder", "When credibility needs a human face"],
    ["Before-after workflow", "Website / LinkedIn", "comparison", "Founder or product owner", "When buyers compare with spreadsheets or manual work"],
    ["Case-study post", "LinkedIn", "result story", "Founder", "After one beta/user workflow is available"],
    ["FAQ post", "Website", "doubt removal", "Founder", "Before people ask setup, price, or fit questions"],
    ["Email follow-up", "Email", "warm lead follow-up", "Founder", "After a demo, trial request, or waitlist signup"],
    ["Referral request", "Email / LinkedIn", "referral", "Founder", "After a user confirms the workflow is useful"],
    ["Pricing clarity page", "Website", "price framing", "Founder", "Before sales calls become repetitive"],
    ["Landing page rewrite", "Website", "landing page clarity", "Founder", "Before sending traffic to the product"],
    ["SEO comparison page", "Website", "search answer", "Founder", "When users search for alternatives"],
    ["Community post", "LinkedIn / community", "community marketing", "Founder", "When the audience gathers in one community"],
    ["Product tour clip", "Website / LinkedIn", "guided trial", "Product owner", "When the first useful result is ready"],
    ["Support proof post", "LinkedIn", "risk reduction", "Founder", "When setup or support is a common doubt"],
    ["Activation checklist", "Email", "retention", "Founder", "After signup or early access"],
  ];
  const source = kind === "software" ? software : local;
  let item = source[index % source.length];
  if (context.briefSubtype && item?.[0] === "Event or occasion post") {
    item = {
      d2c_skincare: ["Product education post", "Instagram", "product-use education", "Owner", "After one product question repeats"],
      physiotherapy: ["Recovery education post", "Instagram", "safe recovery education", "Physiotherapist", "After one assessment question repeats"],
      b2b_solar: ["Project proof post", "LinkedIn", "commercial project proof", "Project lead", "After one buyer question repeats"],
      nonprofit_education: ["Community application post", "Instagram / WhatsApp", "eligible application support", "Program team", "Before the cohort application date"],
    }[context.briefSubtype] || item;
  }
  return {
    postType: item[0],
    platform: item[1],
    campaign_type: item[2],
    who_should_do_it: item[3],
    when_to_do_this: item[4],
  };
}

function uniqueRecommendationSuffix(context, index, group) {
  const mix = contentMixForIndex(context, index);
  const focus = businessFacingFocus(context, offerFocus(context, index), index);
  const platform = mix.platform || context.platforms?.[index % Math.max(1, context.platforms.length)] || "main channel";
  const suffixes = group === "priority"
    ? [
      `for ${focus}`,
      `on ${platform}`,
      `before ${actionPhrase(context)}`,
      `using ${mix.campaign_type}`,
    ]
    : [
      `as ${mix.postType}`,
      `using ${mix.campaign_type}`,
      `on ${platform}`,
      `for ${focus}`,
      `as move ${index + 1}`,
    ];
  return suffixes[index % suffixes.length];
}

function personaSellInstruction(context, name, hesitation, brief) {
  const customer = compactPhrase(name, "this buyer", 3).toLowerCase();
  return sanitizeGeneratedText(
    `Help ${customer} understand "${hesitation}" by showing ${brief.proof_to_show}, then offer this low-pressure next step: ${brief.cta}`,
    context,
  );
}

function painPointAction(context, objection, brief) {
  return sanitizeGeneratedText(
    `Answer "${objection}" by showing ${brief.proof_to_show}; end with ${brief.cta}`,
    context,
  );
}

function painPointContentTitle(context, objection, index) {
  const label = titleDoubtLabel(objection, "buyer doubt").replace(/[.!?]+$/g, "");
  const formats = [
    `Doubt remover: ${label}`,
    `Customer worry to answer: ${label}`,
    `Trust blocker: ${label}`,
    `Reply script for: ${label}`,
    `Proof angle for: ${label}`,
  ];
  return sanitizeGeneratedText(formats[index % formats.length], context);
}

function advancedRoadmapMove(context, idea, index) {
  const focus = businessFacingFocus(context, offerFocus(context, index), index);
  const moves = [
    `Week ${index + 1}: build the proof system around ${focus}`,
    `Week ${index + 1}: turn the strongest reply path into a repeatable routine`,
    `Week ${index + 1}: convert one working content angle into a sales loop`,
    `Week ${index + 1}: make follow-up, proof, and measurement work together`,
    `Week ${index + 1}: tighten the owner workflow behind ${focus}`,
    `Week ${index + 1}: review what created action and remove what did not`,
  ];
  const title = sanitizeGeneratedText(moves[index % moves.length], context);
  const exactAction = sanitizeGeneratedText(
    `Build one weekly owner checklist for ${focus}: proof asset, saved reply, follow-up line, and one result metric to review every Friday.`,
    context,
  );
  return { title, exactAction };
}

function calendarExecutionLine(context, { format, platform, creative, brief }) {
  const leadShot = asArray(brief.how_to_execute)[0] || creative.visual_direction || `Show ${leadOffer(context)} clearly.`;
  const formatText = clean(format, "content");
  const platformText = clean(platform, "main channel");
  return sanitizeGeneratedText(
    `Use a ${formatText} on ${platformText}. ${leadShot} Pair it with the line "${trimEndPunctuation(creative.hook || brief.hook)}" and close with "${trimEndPunctuation(creative.customer_action || brief.cta)}."`,
    context,
  );
}

function competitorCounterMove(context, { alternative, weakness, brief }) {
  return sanitizeGeneratedText(
    `Make the comparison easy against ${alternative}: show ${brief.proof_to_show}, point out "${trimEndPunctuation(weakness)}", then end with "${trimEndPunctuation(brief.cta)}."`,
    context,
  );
}

function competitorContentMove(context, { alternative, weakness, brief }) {
  const kind = businessKind(context);
  const action = actionNounForKind(kind);
  const focus = compactPhrase(brief.customer_doubt_solved || leadOffer(context), "buyer doubt", 5);
  return sanitizeGeneratedText(
    `Comparison card: why ${alternative} feels safer, what it leaves unclear about ${focus}, and the ${action} step ${context.businessName} makes easier.`,
    context,
  );
}

function growthIdeaExperiment(context, brief, index) {
  const kind = businessKind(context);
  const focus = businessFacingFocus(context, offerFocus(context, index), index);
  const cta = trimEndPunctuation(brief.cta);
  const action = actionNounForKind(kind);
  const buyer = audienceCue(context);
  const starter = sequentialStarterForIndex(index * 2, 0);
  const actionStarter = sequentialStarterForIndex(index * 2, 17);
  const options = {
    software: [
      [`one workflow before the demo request`, `the current manual step, the ${context.businessName} screen, the week-one result, and the demo question in one short post`],
      [`a buyer role to a product outcome`, `one buyer role, the task they own, and how ${focus} changes that task before inviting a demo`],
      [`trial interest with one use-case question`, `a reply prompt asking which workflow they want fixed first, then answer with one screen path instead of a feature list`],
      [`setup fear into a five-minute proof`, `the first setup step, who touches it, what changes after setup, and the safest demo next step`],
      [`manual work against the product path`, `a two-column comparison of spreadsheet or WhatsApp tracking versus the cleaner ${focus} workflow`],
      [`support proof before the signup ask`, `the onboarding reply, help path, founder support, and one reason the user will not be left alone`],
      [`one feature into a buyer job`, `the feature only after naming the real job it solves for ${lowerFirst(buyer)}, then close with the demo question`],
      [`the first-week result as the promise`, `what gets faster or cleaner in seven days, using one screen and one measurable outcome`],
    ],
    food: [
      [`two order paths around ${lowerFirst(focus)}`, `two choices: fastest pickup and safest family order; ask for headcount, budget, and pickup time, then track which reply comes faster`],
      [`portion, ready time, and parcel detail before the menu`, `a real plate or parcel with size reference, ready-time note, and the keyword buyers should message`],
      [`a weekend order filter`, `a simple filter for group size, spice level, budget, and pickup time so buyers can choose without group-chat confusion`],
      [`the safest first order for tourists and families`, `one recommended order with portion, spice level, packing, and who it fits best`],
      [`takeaway timing as the decision point`, `the counter handoff, wait-time range, and pickup instruction before showing the full menu`],
      [`one group-order mistake customers should avoid`, `the common ordering mistake, the better order path, and the exact details to send on WhatsApp`],
      [`today's best choice without making people scroll`, `the best dish for one situation: family meal, quick parcel, or visitor recommendation`],
      [`a review into a buying shortcut`, `one review line, the dish it proves, the portion detail, and the next order message`],
    ],
    salon: [
      [`the booking around result and time`, `reference photo, realistic result, time needed, and starting price before asking for date and service`],
      [`the slot before selling the service`, `event date, service, and comfort budget first; reply with the safest slot and prep step`],
      [`consultation proof before the final look`, `one consultation note, one prep step, and one finished detail so buyers know what happens before booking`],
      [`price comfort into a better slot reply`, `starting price, what changes cost, and the slot-check question in the same reply path`],
      [`the saved reference photo into a realistic plan`, `what is possible, what needs prep, and what the stylist will confirm before the chair work`],
      [`bridal or event urgency without pressure`, `date, trial/prep need, time required, and the booking detail that prevents last-minute confusion`],
      [`clean setup as trust proof`, `tools, products, hygiene step, and the result angle that makes the visit feel safer`],
      [`repeat questions into salon highlights`, `the three questions customers ask before booking and the short saved reply for each`],
    ],
    clinic: [
      [`the appointment with a first-step explainer`, `concern, timing, and what to bring before discussing treatment; ask for symptom and preferred time`],
      [`the visit before booking pressure`, `a visit-prep card explaining what happens first and what details the clinic needs`],
      [`the care path with process clarity`, `message, consultation, and next-step flow so nervous patients can act without guessing`],
      [`cost fear into a calmer question`, `what affects price, when it is confirmed, and the question patients should send before booking`],
      [`doctor or team proof before treatment talk`, `the person, role, first check, and booking step without making medical claims`],
      [`one symptom into a safe first action`, `the symptom, urgency cue, what to bring, and appointment message in plain language`],
      [`the first five minutes of the visit`, `reception, consultation start, explanation style, and the exact next step for nervous patients`],
      [`patient FAQs into appointment confidence`, `three repeated doubts and the short answer that helps patients choose a slot`],
    ],
    gym: [
      [`a no-awkwardness trial path`, `arrival, trainer greeting, first movement, and what to bring before asking beginners to message a trial time`],
      [`the first-week routine before membership`, `the first three beginner actions and the support available before asking for a plan commitment`],
      [`fitness restart as one guided visit`, `a comfortable time and current level question, then the least intimidating first-session reply`],
      [`trainer correction as the trust proof`, `one common exercise mistake, the safe correction, and the trial message for beginners`],
      [`membership fear into a three-day start`, `three simple visits, what happens each day, and how the trainer supports consistency`],
      [`the gym entrance before the workout`, `where to enter, who meets the beginner, what to bring, and how long day one takes`],
      [`one habit story instead of a transformation claim`, `a realistic consistency story, the support behind it, and the next trial step`],
      [`class confusion into a better first choice`, `which class fits which beginner, what intensity to expect, and how to book the trial`],
    ],
    real_estate: [
      [`property leads before the site visit`, `budget, area, timeline, and must-have first; send only matched options with one reason to visit`],
      [`a budget-fit shortlist`, `one filtered shortlist with landmark, availability, price range, and who the property fits`],
      [`why the visit is worth the travel`, `commute, area proof, availability, and visit reason before asking buyers to book a site visit`],
      [`portal scrolling into matched options`, `the usual random-listing problem, the filter used, and the three details needed before sharing options`],
      [`area confidence before property photos`, `landmarks, daily-life fit, road access, and who should consider the property`],
      [`buyer seriousness with a budget-first reply`, `the budget, area, property type, and timeline fields needed before a site visit is suggested`],
      [`one listing into a decision card`, `price range, availability, verification note, visit reason, and who should skip it`],
      [`site-visit waste into a better filter`, `the common wasted-visit reason and the qualifying question that prevents it`],
    ],
    law_firm: [
      [`the consultation with one document checklist`, `issue type, document name, and deadline first; reply with what to prepare before consultation`],
      [`legal panic with a first-step sort`, `the safest first action for one issue type before discussing fees or long advice`],
      [`the value of early legal help`, `what can go wrong when documents are delayed, then give the document check step`],
      [`fee fear into process clarity`, `what the first consultation covers, what documents are needed, and when the next fee is discussed`],
      [`one contract mistake into a saveable post`, `the mistake, why it matters, what to check, and when to ask for review`],
      [`property-document confusion into a checklist`, `the document names, missing-detail warning, and consultation-prep message`],
      [`founder delay into a legal priority list`, `the agreement, compliance, or employment item that should be handled before it becomes urgent`],
      [`plain-language proof before legal advice`, `one anonymous lesson, the document type, and the first safe step without exposing client details`],
    ],
    agency: [
      [`one sales blocker before pitching content`, `one weak page or post, the business problem, the fix, and the current sales goal question`],
      [`strategy before creative`, `offer gap, proof gap, and CTA gap on one example before recommending any reel or ad`],
      [`content as a revenue move`, `one buyer doubt, a post idea, a caption line, and the follow-up message that should come after replies`],
      [`the owner complaint behind weak enquiries`, `the exact complaint, what the current content misses, and the one action the next post should create`],
      [`a profile teardown into paid-audit demand`, `one screenshot, one sharp diagnosis, one fix, and the audit reply message`],
      [`pretty-post requests into business diagnosis`, `why the requested content will not fix the sales issue and what must be clarified first`],
      [`one case-study lesson without vanity metrics`, `problem, decision, execution, result, and what another founder should copy`],
      [`retainer fear into a smaller first step`, `a paid audit scope, what the client receives, and what decision it helps them make`],
    ],
    retail: [
      [`the product preview before purchase`, `real photo, size, price, delivery date, and what can change before asking buyers to message PREVIEW`],
      [`gift choice by occasion and budget`, `occasion, budget, and needed date first; reply with one safe option plus a real photo`],
      [`a no-surprise order path`, `preview, confirmation, packing, and pickup steps so buyers know exactly what happens after they message`],
      [`quality doubt into close-up proof`, `material, size reference, finish, and delivery detail before asking for payment`],
      [`last-minute buying into a safer suggestion`, `occasion, relationship, budget, and deadline before recommending one practical gift`],
      [`stock confusion into a better product reply`, `available colours, size, price, pickup/delivery, and the next message to send`],
      [`customisation risk before confirmation`, `what can change, what cannot change, preview timing, and the approval step`],
      [`one customer question into a product post`, `the repeated doubt, the real product photo, and the reply keyword for the matching option`],
    ],
    local: [
      [`the offer before asking for action`, `result, process, price or timing, and the first message customers should send`],
      [`serious buyers with one clear question`, `the detail that decides fit first, then reply with proof and the next step`],
      [`the buyer for the first step`, `what happens after the first message so customers do not need to guess`],
      [`one repeated question into proof`, `the repeated doubt, the proof customers need, and the exact next action`],
      [`a safer comparison against the usual option`, `the familiar alternative, what it leaves unclear, and why ${context.businessName} is easier to choose`],
      [`response speed into trust`, `the saved reply, proof point, and timing promise that makes the first conversation easier`],
      [`one result into a repeatable sales post`, `the result, process, customer doubt solved, and the message that should follow replies`],
      [`the first action path from post to reply`, `what buyers see, what they send, how the owner replies, and what gets tracked`],
    ],
  };
  const selected = (options[kind] || options.local)[index % (options[kind] || options.local).length];
  const titleRest = stripLeadingAction(selected[0]) || selected[0];
  const actionRest = stripLeadingAction(selected[1]) || selected[1];
  return {
    title: sanitizeGeneratedText(`${starter} ${lowerFirst(titleRest)}`, context),
    exactAction: sanitizeGeneratedText(`${actionStarter} ${lowerFirst(actionRest)}. End with "${cta}."`, context),
  };
}

function ensureUniqueRecommendationItems(items, fields, context, group, seen = new Set()) {
  return asArray(items).map((item, index) => {
    const next = { ...(item || {}) };
    const field = fields.find(name => clean(next[name]));
    if (!field) return item;
    let value = clean(next[field]);
    let signature = recommendationSignature(value);
    if (seen.has(signature)) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const candidate = sanitizeGeneratedText(`${value} ${uniqueRecommendationSuffix(context, index + attempt, group)}`, context);
        const candidateSignature = recommendationSignature(candidate);
        if (!seen.has(candidateSignature)) {
          value = candidate;
          signature = candidateSignature;
          break;
        }
      }
      if (seen.has(signature)) {
        value = sanitizeGeneratedText(`${value} as move ${index + 1}`, context);
        signature = recommendationSignature(value);
      }
      next[field] = value;
    }
    seen.add(signature);
    return next;
  });
}

function compactPhrase(value, fallback = "customer", maxWords = 4) {
  const text = clean(value, fallback)
    .replace(/[.!?]+$/g, "")
    .replace(/\bfor\b\s+.+$/i, "")
    .replace(/\b(the|a|an|and|or|with|for)\b/ig, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text.split(/\s+/).filter(Boolean).slice(0, maxWords);
  return words.join(" ") || fallback;
}

function compactProofPhrase(value, fallback = "proof detail", maxWords = 5) {
  let text = clean(value, fallback)
    .replace(/^[a-z0-9 .&'/-]{2,80}:\s*/i, "")
    .replace(/\bconnected to\b.+$/i, "")
    .replace(/\bbefore asking\b.+$/i, "")
    .replace(/\bon\s+(website|instagram|whatsapp|google business|linkedin|email)\b/ig, "")
    .replace(/[.!?]+$/g, "")
    .trim();
  text = stripLeadingAction(text) || text;
  return compactPhrase(text, fallback, maxWords);
}

function trimEndPunctuation(value, fallback = "") {
  return clean(value, fallback).replace(/[.!?]+$/g, "");
}

function audienceCue(context) {
  const segments = clean(context.audience, "buyers")
    .split(/,|\/|\band\b|\+/i)
    .map(item => compactPhrase(item, "", 3))
    .map(item => item.replace(/\b(managing|seeking|looking|wanting|restarting)\b.*$/i, "").trim())
    .filter(item => item && !/^(customers?|buyers?|clients?|people|users?)$/i.test(item));
  return segments[0] || compactPhrase(context.audience, "buyers", 3);
}

function businessMoment(context, kind) {
  const source = lower([
    context.businessName,
    context.businessType,
    context.productsOrServices,
    context.audience,
    context.location,
  ].join(" "));
  const city = shortLocation(context, kind);
  const cityPrefix = city && !/india|online/i.test(city) ? `${city} ` : "";
  if (kind === "food") {
    if (/workspace|remote|specialty coffee|pastries|weekday/.test(source)) return "workday coffee";
    if (/cold coffee|brownie|sandwich|after class|college/.test(source)) return "after-class cafe";
    if (/hostel|student|shawarma|grilled chicken|dinner combo/.test(source)) return "hostel dinner";
    if (/family|biryani|seafood|tourist|takeaway/.test(source)) return "family meal";
    return `${cityPrefix}${compactPhrase(leadOffer(context), "first order", 2)}`;
  }
  if (kind === "salon") {
    if (/college|student|party|hair styling/.test(source)) return "college styling";
    if (/bridal|event|makeup|grooming/.test(source)) return "event look";
    if (/facial|skin/.test(source)) return "skin-care visit";
    return "salon booking";
  }
  if (kind === "gym") {
    if (/cult|app|group|class|office|restart/.test(source)) return "restart fitness";
    if (/beginner|awkward|young professional|trial/.test(source)) return "first gym week";
    return "training start";
  }
  if (kind === "software") {
    if (/queue|clinic|reception/.test(source)) return "clinic queue";
    if (/gst|invoice|cashflow|payment|accounting|ledger|finance|tax|bookkeep/.test(source)) return "invoice reminder";
    if (/crm|lead|sales|pipeline/.test(source)) return "sales pipeline";
    if (/founder|startup|early/.test(source)) return "founder workflow";
    return "team workflow";
  }
  if (kind === "law_firm") {
    if (/startup|founder|employment|compliance/.test(source)) return "founder legal";
    if (/property|document|family|buyer/.test(source)) return "property document";
    return "legal first step";
  }
  if (kind === "agency") {
    if (/local|small business|reels|pretty posts|kozhikode/.test(source)) return "local owner content";
    if (/brand|campaign|performance|retainer|growth/.test(source)) return "brand growth";
    return "strategy audit";
  }
  if (kind === "clinic") {
    if (/kozhikode|working adults|tooth pain/.test(source)) return "local dental visit";
    if (/family|families|adults/.test(source)) return "family dental visit";
    if (/tooth|dental|braces|implant|cleaning/.test(source)) return "dental visit";
    return "first appointment";
  }
  if (kind === "real_estate") {
    if (/kozhikode|rental|plot|tenant|owner/.test(source)) return "local property search";
    if (/investor|villa|apartment|home buyer/.test(source)) return "home-buyer shortlist";
    return "property shortlist";
  }
  if (kind === "retail") {
    if (/custom|gift|gen-z|student gift/.test(source)) return "custom gift";
    if (/kurti|outfit|ethnic|clothing|boutique|college/.test(source)) return "college outfit";
    return "product choice";
  }
  return compactPhrase(context.businessType || context.productsOrServices, "buyer decision", 3);
}

function problemCue(context, objection) {
  const source = objection?.objection || context.businessProblem || "";
  const cleaned = titleDoubtLabel(source, "");
  return compactPhrase(cleaned, "decision doubt", 5);
}

function stripFirstSentence(text) {
  const source = clean(text);
  const match = source.match(/^.{20,150}?[.!?]\s+(.*)$/);
  return clean(match?.[1] || source);
}

function distinctSocialOpening(context, kind, index, { focus, objection, channel }) {
  const audience = audienceCue(context);
  const offer = businessFacingFocus(context, focus || leadOffer(context), index);
  const problem = problemCue(context, objection);
  const render = template => template
    .replace(/\{audience\}/g, audience)
    .replace(/\{offer\}/g, offer)
    .replace(/\{problem\}/g, problem)
    .replace(/\{business\}/g, context.businessName);
  const captionFrames = [
    `Start with the question {audience} already have about {offer}, then answer it with one real proof point.`,
    `Take viewers through the moment where {problem} usually appears, and end with the simplest next step.`,
    `Compare the usual way people choose {offer} with the cleaner path {business} offers.`,
    `Reveal the one detail about {offer} that makes the decision less risky for {audience}.`,
    `Walk through the proof behind {offer} before asking anyone to decide.`,
    `Break down the difference between guessing and choosing {offer} with confidence.`,
    `Answer {problem} using a real example, not a broad promise.`,
    `Guide {audience} from doubt to action by showing what happens first.`,
    `Document the part of {offer} customers usually never see, then explain why it matters.`,
    `Highlight the small detail that helps {audience} stop comparing random alternatives.`,
    `Demonstrate how {offer} works in a real situation, then invite one simple reply.`,
    `Introduce the easiest version of {offer} for someone who is still unsure.`,
    `Challenge the usual buying mistake around {offer} and give a safer way to choose.`,
    `Follow one customer situation from confusion to a clear next step.`,
    `Teach one practical rule {audience} can use before choosing {offer}.`,
    `Celebrate one real proof moment and connect it to the customer decision.`,
    `Solve {problem} in public so the next buyer does not have to ask twice.`,
    `Remove one hesitation by showing the proof, timing, and next action together.`,
  ];
  const messageFrames = [
    `Tell us the situation, deadline, and what you are comparing. We will suggest the safest {offer} next step.`,
    `Share the detail that matters most right now. We will reply with proof, timing, and the cleanest option.`,
    `Send the result you want, not a long explanation. We will map it to the right {offer} path.`,
    `Describe where {problem} is happening. We will answer with one practical option and what to do next.`,
    `Share budget, timing, and priority. We will avoid the wrong fit and recommend the useful first move.`,
    `Send one photo, screen, document, or note if it helps. We will use it to give a clearer answer.`,
    `Tell us what you have already tried. We will reply with the next step that actually fits {offer}.`,
    `Share the deadline or decision point first. We will keep the reply focused instead of sending everything.`,
    `Send the use case, occasion, service, or product you care about. We will show the matching option.`,
    `Ask what proof, price, or booking detail comes first. We will explain the process clearly.`,
    `Share the main concern in normal words. We will answer it before asking you to commit.`,
    `Send timing, preference, and must-have detail. We will narrow the choice instead of making it bigger.`,
    `Tell us the outcome you want. We will reply with what is realistic, what it needs, and the next action.`,
    `Ask for the real example first. We will show proof before asking you to decide.`,
    `Share what feels unclear. We will reply with price or process clarity and one action.`,
    `Send the exact need and the date if there is one. We will confirm the best first step.`,
    `Tell us what you are comparing. We will explain where {business} is the better fit and where it is not.`,
    `Reply with the thing stopping you. We will answer that doubt directly before you decide.`,
  ];
  const frames = channel === "message" ? messageFrames : captionFrames;
  return render(frames[seededIndex(context, `${channel}:wide-opening:${kind}`, index * 11, frames.length)]);
  const captionOpenings = {
    software: [
      `${offer} should look useful before anyone books a demo.`,
      `${audience} need one clean workflow, not a product lecture.`,
      `If ${problem}, show the working screen first.`,
      `Make the messy task visible before pitching ${offer}.`,
      `${context.businessName} has to prove the week-one change.`,
    ],
    food: [
      `${offer} should be easy to choose before hunger wins.`,
      `${audience} need price, timing, and one safe pick.`,
      `If ${problem}, make the order path obvious.`,
      `A first order should start with the clearest ${offer} option.`,
      `Make today's ${offer} decision faster than the group chat.`,
    ],
    salon: [
      `${offer} should start with price, time, and proof.`,
      `${audience} need the slot answer before the style idea.`,
      `If ${problem}, remove the booking doubt first.`,
      `The right look starts with one honest ${offer} check.`,
      `Make the visit feel planned before anyone sits down.`,
    ],
    clinic: [
      `${offer} needs calm instructions before booking.`,
      `${audience} want the first step explained without fear.`,
      `If ${problem}, answer the patient question first.`,
      `A clinic post should lower panic before asking for action.`,
      `Make the appointment path clear before treatment talk.`,
    ],
    gym: [
      `${audience} need day-one confidence before membership talk.`,
      `${offer} works better when the first visit feels guided.`,
      `If ${problem}, show the beginner path first.`,
      `The first workout should feel planned, not intimidating.`,
      `Make the trial step easier than postponing again.`,
    ],
    real_estate: [
      `${audience} need budget-fit options before any site visit.`,
      `${offer} should start with area, timeline, and proof.`,
      `If ${problem}, qualify the search before the visit.`,
      `A serious property lead starts with the right shortlist.`,
      `Make the next visit earn its place on the calendar.`,
    ],
    law_firm: [
      `${offer} should start with facts, not panic.`,
      `${audience} need the document step before consultation pressure.`,
      `If ${problem}, make the legal next step plain.`,
      `A legal reply should reduce risk before asking for time.`,
      `Make the first consultation feel less like a blind jump.`,
    ],
    agency: [
      `${offer} should prove thinking before creative polish.`,
      `${audience} need a business reason before another post.`,
      `If ${problem}, fix the offer logic first.`,
      `A serious campaign starts with the buyer doubt.`,
      `Make the audit point sharper than the design moodboard.`,
    ],
    retail: [
      `${offer} should show the real look before checkout.`,
      `${audience} need preview, price, and delivery clarity.`,
      `If ${problem}, make the product proof visible first.`,
      `A custom order should not feel like a guess.`,
      `Make the buying decision easier than scrolling more photos.`,
    ],
    local: [
      `${offer} should feel clear before the first message.`,
      `${audience} need proof, price, and timing in one place.`,
      `If ${problem}, answer the doubt before the pitch.`,
      `The first action should be obvious, not buried.`,
      `Make the next step easier than comparing alternatives.`,
    ],
  };
  const messageOpenings = {
    software: [
      `For ${offer}, send the workflow you want fixed first.`,
      `Quick check for ${audience}: share the task and owner.`,
      `If ${problem}, reply with the current process.`,
      `Before a demo, send the team role and bottleneck.`,
      `Start with one repeated task, then we map the screen path.`,
    ],
    food: [
      `For ${offer}, send count, timing, and pickup choice.`,
      `Quick order check: tell us hunger level and budget.`,
      `If ${problem}, message the item you are considering.`,
      `Send parcel or dine-in first so the food reply is useful.`,
      `Start with the group size, then we suggest the safest pick.`,
    ],
    salon: [
      `For ${offer}, send date, service, and budget comfort.`,
      `Quick slot check: share the service and preferred time.`,
      `If ${problem}, send the reference or result you want.`,
      `Before booking, message the event date and service idea.`,
      `Start with your current concern, then we suggest the slot path.`,
    ],
    clinic: [
      `For ${offer}, send the concern and preferred time.`,
      `Quick appointment check: describe the problem in normal words.`,
      `If ${problem}, ask what happens first.`,
      `Before booking, message the symptom and timeline.`,
      `Start with the first worry, then we share the safe next step.`,
    ],
    gym: [
      `For ${offer}, send your goal and comfort level.`,
      `Quick trial check: message timing and beginner status.`,
      `If ${problem}, reply with what feels awkward.`,
      `Before membership talk, ask for the first-day routine.`,
      `Start with your available time, then we plan the trial step.`,
    ],
    real_estate: [
      `For ${offer}, send budget, area, and timeline first.`,
      `Quick shortlist check: share property type and must-have.`,
      `If ${problem}, qualify the visit before travelling.`,
      `Before any site visit, message budget and preferred area.`,
      `Start with move-in timing, then we filter the options.`,
    ],
    law_firm: [
      `For ${offer}, send the issue type and document name.`,
      `Quick legal check: share deadline and what happened.`,
      `If ${problem}, ask which document matters first.`,
      `Before consultation, message the timeline and parties involved.`,
      `Start with the legal question, then we list missing details.`,
    ],
    agency: [
      `For ${offer}, send the page, goal, and current offer.`,
      `Quick audit check: share the channel and weak result.`,
      `If ${problem}, message the campaign that disappointed you.`,
      `Before new creative, send audience, offer, and proof gap.`,
      `Start with the sales goal, then we find the content problem.`,
    ],
    retail: [
      `For ${offer}, send the real option you want checked.`,
      `Quick preview check: share occasion, budget, and date.`,
      `If ${problem}, message the product idea before paying.`,
      `Before confirming, send size, colour, or theme.`,
      `Start with delivery date, then we suggest the safe option.`,
    ],
    local: [
      `For ${offer}, send the service and timing first.`,
      `Quick decision check: share budget, date, and question.`,
      `If ${problem}, ask for proof before booking.`,
      `Before saying yes, message the exact result you want.`,
      `Start with one detail, then we make the next step clear.`,
    ],
  };
  const openings = channel === "message" ? messageOpenings : captionOpenings;
  return pickSeeded(openings[kind] || openings.local, context, `${channel}-opening:${kind}:${offer}:${audience}:${problem}`, index);
}

function withDistinctOpening(text, context, kind, index, details, channel) {
  const opening = distinctSocialOpening(context, kind, index, { ...details, channel });
  const tail = stripFirstSentence(text);
  const limit = channel === "message" ? 300 : 260;
  const actionPattern = channel === "message"
    ? /send|share|message|ask|reply|book|demo|trial|visit|slot|budget|appointment|photo|menu|order|shortlist|consultation/i
    : /message|reply|send|share|ask|book|demo|trial|visit|save|comment|order/i;
  let combined = `${opening} ${tail}`;
  if (!actionPattern.test(combined)) {
    combined = `${combined} ${industryCta(context, kind, index)}`;
  }
  return sanitizeGeneratedText(compactText(combined, "", limit), context);
}

function businessKind(context) {
  const source = lower([
    context.vertical,
    context.parentCategory,
    context.businessType,
    context.productsOrServices,
    context.audience,
  ].join(" "));
  if (context.briefSubtype) return "local";
  if (context.vertical === "software" || context.parentCategory === "software") return "software";
  if (context.vertical === "gym" || /gym|fitness|workout|trainer|membership/.test(source)) return "gym";
  if (context.vertical === "law_firm" || /law|legal|lawyer|advocate|contract|document/.test(source)) return "law_firm";
  if (context.vertical === "real_estate" || /real estate|property|apartment|flat|villa|plot|rental|site visit/.test(source)) return "real_estate";
  if (context.vertical === "marketing_agency" || /agency|marketing|creative|branding|advertising|content strategy/.test(source)) return "agency";
  if (context.vertical === "education" || context.parentCategory === "education" || /education|tuition|coaching|school|academy|teacher|study centre|study center|demo class|batch|student|parent/.test(source)) return "local";
  if (/restaurant|cafe|coffee|bakery|food|kitchen|cloud kitchen|biryani|juice|snack|menu/.test(source)) return "food";
  if (/dental|clinic|doctor|health|patient|appointment|treatment|derma|dermatology|laser|acne|pigmentation/.test(source)) return "clinic";
  if (/salon|beauty|spa|makeup|hair|skin|bridal|facial/.test(source)) return "salon";
  if (/ecommerce|e-commerce|retail|store|shop|gift|custom|product|fashion|clothing|boutique/.test(source)) return "retail";
  if (/\b(saas|software|app|automation|dashboard|crm|platform|tool)\b/.test(source)) return "software";
  return context.parentCategory === "software" ? "software" : "local";
}

function shortLocation(context, kind) {
  if (kind === "software") return "";
  const location = clean(context.city || context.location);
  if (!location || /your market|local market|online market|india/i.test(location)) return "";
  return clean(location.split(",")[0]);
}

function titleDoubtLabel(value, fallback = "buyer doubt") {
  let text = clean(value, fallback)
    .replace(/^i\s+be\b/i, "will I be")
    .replace(/^i\s+trust\b/i, "can I trust")
    .replace(/^i\s+can\b/i, "can I")
    .replace(/^i\s+will\b/i, "will I")
    .replace(/^you\s+safe\b/i, "is this safe")
    .replace(/^they\s+/i, "")
    .replace(/^are\s+/i, "")
    .replace(/^will\s+/i, "")
    .replace(/^can\s+/i, "")
    .replace(/\bthey\s+/ig, "")
    .replace(/\btheir\s+/ig, "")
    .replace(/\bi\s+be\b/ig, "I will be")
    .replace(/\byou\s+safe\b/ig, "is this safe")
    .replace(/\bdo not\b/ig, "don't")
    .replace(/\bdoes not\b/ig, "doesn't")
    .replace(/\bwill not\b/ig, "won't")
    .replace(/[.!?]+$/g, "");
  text = text
    .replace(/^scared\b/i, "fear")
    .replace(/^afraid\b/i, "fear")
    .replace(/^don't know\b/i, "unclear")
    .replace(/^worry\b/i, "worry")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 54) text = text.slice(0, 54).replace(/\s+\S*$/, "");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : fallback;
}

function industryCta(context, kind, index = 0) {
  const subtypeVariants = {
    d2c_skincare: [
      "Shop the sunscreen online after checking the formula and delivery details.",
      "Add the sunscreen to cart when the ingredient and returns information is clear.",
      "Order online after reviewing the real application and customer proof.",
    ],
    physiotherapy: [
      "Book a physiotherapy assessment and ask what the first mobility review includes.",
      "Schedule a mobility consultation after reviewing the physiotherapist credentials.",
      "Book a physiotherapy assessment to discuss the safe rehabilitation next step.",
    ],
    b2b_solar: [
      "Request a rooftop solar site survey and share the recent electricity bill.",
      "Send an electricity bill for a site-specific generation and ROI proposal.",
      "Request a commercial solar quote with EPC, approval, safety, and warranty details.",
    ],
    nonprofit_education: [
      "Apply for the free digital-skills cohort after checking learner eligibility.",
      "Refer an eligible learner or volunteer as a mentor.",
      "Ask about partnership and the learner safeguarding process.",
    ],
  };
  const subtypeList = subtypeVariants[context.briefSubtype];
  if (subtypeList) return subtypeList[index % subtypeList.length];
  const variants = {
    software: [
      "Reply DEMO and we will show the workflow before you sign up.",
      "Ask for early access with the exact workflow you want fixed.",
      "Send the task you still do manually and we will show the cleaner path.",
    ],
    food: [
      "Message MENU for price, timing, and today's best pick.",
      "Send ORDER and we will share price, wait time, and parcel option.",
      "Ask for today's menu before you decide.",
    ],
    salon: [
      "Message SLOT with your date and service.",
      "Send your service name and preferred time to check availability.",
      "Ask for starting price, time needed, and one recent result.",
    ],
    clinic: [
      "Message APPOINTMENT for timing, first step, and consultation details.",
      "Ask what happens first before booking.",
      "Send the concern and preferred time to check the safe next step.",
    ],
    gym: [
      "Message TRIAL for timing, what to bring, and the beginner routine.",
      "Ask for a guided first session before joining.",
      "Send BEGINNER and we will share the first visit plan.",
    ],
    real_estate: [
      "Send budget and preferred area for matched options.",
      "Ask for available properties before booking a site visit.",
      "Send budget, area, and property type for a shortlist.",
    ],
    law_firm: [
      "Send the issue type and document name before booking.",
      "Ask for the safest first step before the consultation.",
      "Send the document type and timeline to get the next step.",
    ],
    agency: [
      "Send your page and goal for one sharp audit point.",
      "Ask for the one content problem hurting enquiries.",
      "Send your current offer and we will point to the next move.",
    ],
    retail: [
      "Message PHOTO for real pictures, price, and availability.",
      "Ask for a preview before confirming.",
      "Send the product name to check size, price, and delivery.",
    ],
    local: [
      "Message with the service name and preferred time.",
      "Ask for price, proof, and the next step in one message.",
      "Send your question and we will make the next step clear.",
    ],
  };
  const list = variants[kind] || variants.local;
  return list[index % list.length];
}

function customerCaptionForKind(context, index, { focus, objection, proof, persona }) {
  const kind = businessKind(context);
  const city = shortLocation(context, kind);
  const place = city ? ` in ${city}` : "";
  const cta = industryCta(context, kind, index);
  const doubt = compactText(objection?.objection, "", 86).replace(/[.!?]+$/g, "");
  const proofText = compactText(proof, "real proof", 70).replace(/[.!?]+$/g, "");
  const personaName = clean(persona?.name, context.audience);
  const audience = audienceCue(context);
  const moment = businessMoment(context, kind);
  const offer = businessFacingFocus(context, focus || leadOffer(context), index);
  const override = visibleCaptionOverride(context, kind, index, offer);
  if (override) return override;
  const lines = {
    software: [
      `${moment} mess still living in spreadsheets? Reply DEMO with the task name and we will show the cleaner screen path before signup.`,
      `Your team does not need a product lecture. Send the ${offer} workflow you repeat every week and ask for the shortest demo path.`,
      `Before another software trial, compare the current ${offer} process with one cleaner version. Reply DEMO if you want the walkthrough.`,
      `The first demo should answer one job, not every feature. Share the task owner and we will show where ${context.businessName} fits.`,
      `If "${doubt}" is the blocker, skip the big promise. Send the workflow and ask for the exact setup step first.`,
      `${moment} week-one value needs a real before-and-after. Ask what becomes faster after the first ${offer} setup.`,
      `${moment} demo works best with the messy task, the screen, and the result visible. Reply with your task if you want that demo.`,
      `${moment} teams hate unused tools. Ask for one ${offer} use case before you let another app enter the stack.`,
    ],
    food: [
      `${moment} plans should not die in the group chat. Message MENU for the best ${offer} pick, price, and ready time today.`,
      `${moment} first order? Ask what is moving fastest today and whether ${offer} fits your budget, parcel plan, and hunger level.`,
      `${moment} buyers should ask about portion, freshness, and wait time for ${offer} before choosing the cheaper spot.`,
      `${moment} with friends? Send the headcount and budget. We will suggest the easiest ${offer} order with price and pickup time.`,
      `${moment} menu choice gets easier with one good answer. Message ORDER and ask which ${offer} option is worth picking now.`,
      `If dinner has to happen fast, tell us parcel or dine-in first. We will share the quickest ${offer} route without menu drama.`,
      `${audience} do not need twenty choices. Ask for one safe ${offer} recommendation with price, portion, and wait time.`,
      `Old food photos are not a plan. Message MENU and ask what ${offer} is actually available fresh today.`,
      `${moment} buyers usually ask the same thing: price, portion, and timing. Send those three before you order.`,
      `${moment} hunger check${place}? Ask for the current ${offer} pick instead of scrolling until everyone gives up.`,
      `Ordering for a small group? Share budget and pickup window first; we will narrow ${offer} to the easiest choice.`,
      `Choosing from photos alone is risky. Ask what is ready now, what serves your group, and when ${offer} can leave the kitchen.`,
      `One quick order beats twenty screenshots. Send hunger level, headcount, and timing so ${offer} does not become a group-chat debate.`,
      `If nobody can agree, ask for the safest crowd pick. We will match ${offer} to budget, spice comfort, and ready time.`,
      `Before opening every delivery app, ask the counter what is fresh, fast, and worth ordering today.`,
      `The best order is usually the clearest one. Ask for portion size, current wait time, and one honest recommendation.`,
    ],
    salon: [
      `${moment} bookings need clarity before excitement. Ask for starting price, time needed, and one recent result before choosing a slot.`,
      `Planning a look${place}? Send the date, service, and budget comfort first so the stylist can tell you what is realistic.`,
      `${personaName} should not walk in guessing. Ask what fits your hair, skin, event, and timing before the appointment.`,
      `${moment} reference photos start the conversation. Share one early and ask what can actually be done for ${offer}.`,
      `One old before-after photo is not enough. Ask for recent proof, prep needed, and timing before booking ${offer}.`,
      `Event date close? Message the date and service. We will help you pick the right ${offer} slot without a price shock.`,
      `The final look matters, so begin with consultation. Ask what result is realistic, how long it takes, and when to come in.`,
      `${moment} customers should know the prep before the chair. Send your service idea and ask what to do before the visit.`,
    ],
    clinic: [
      `${moment} fear drops when the first step is clear. Message APPOINTMENT and ask what happens first, timing, and cost range.`,
      `${moment} pain gets worse when people keep guessing. Send the concern and preferred time so the clinic can suggest the safest first step.`,
      `Before booking ${offer}, ask what to bring, how long it may take, and whether consultation is needed first.`,
      `A calm patient needs plain steps. Message the concern and ask what happens before treatment talk starts.`,
      `If the visit feels scary, ask for the first checkup flow. Good care should explain the path before the chair.`,
      `${audience} should not wait for panic. Send the symptom, timeline, and preferred visit time to check the right appointment.`,
      `Not sure whether ${offer} needs a visit? Message the concern first and ask what timing is available.`,
      `${moment} decisions get easier with three facts: first step, time needed, and what details to bring. Ask for those before booking.`,
    ],
    gym: [
      `${moment} should not feel like an exam. Message TRIAL and ask what to bring, who guides you, and what routine starts first.`,
      `Cost, awkwardness, or consistency fears are normal. Choose a guided trial before guessing alone and ask for the beginner plan.`,
      `${moment} progress starts easier when the first week is visible. Ask for the ${offer} routine, trainer support, and trial timing.`,
      `${moment} first visit is harder when people walk in confused. Send BEGINNER and ask for the first-visit plan before membership talk.`,
      `${moment} membership should not be blind. Ask who guides you, what happens on day one, and what comes after the trial.`,
      `Consistency fear is normal. Ask for a three-day starter plan and one trainer check before promising yourself a whole year.`,
      `${audience} need a gym entry that feels human. Message your goal and ask which trial slot fits your comfort level.`,
      `A good first session answers the awkward questions. Send your available time and ask what happens when you arrive.`,
    ],
    real_estate: [
      `${moment} should start before the site visit. Send budget, area, property type, and timeline so the shortlist fits.`,
      `${moment} listing photos are not enough. Ask for location, price range, availability, and visit timing before you travel.`,
      `Buying or renting${place}? Send your budget first, not your whole Saturday. We will share options that match the area.`,
      `${moment} starts with budget, area, and timeline. Share those before asking for visits.`,
      `${moment} site visits need road access, landmark, current availability, and one reason the property fits your routine.`,
      `Do not fall in love with a photo. Ask what is verified, what is available, and whether the area works for daily life.`,
      `${audience} save time when the shortlist is honest. Send the must-have first and ask what truly matches.`,
      `A better visit starts with filtering. Message budget, preferred area, and property type before booking anything.`,
    ],
    law_firm: [
      `${moment} questions need facts before opinions. Send the issue type and document name before booking a consultation.`,
      `Legal help feels scary when "${doubt}" is unanswered. Ask what documents matter, what happens next, and when to consult.`,
      `Random advice can make ${offer} riskier. Send the document type and deadline first, then ask what risk to check before consultation.`,
      `${moment} problems get worse when the first step is vague. Share the document, timeline, and what already happened.`,
      `Do not wait for panic to become the plan. Ask which document matters, what risk exists, and what legal step comes next.`,
      `Urgent issue? Start with facts: document name, timeline, and people involved. Then book the right consultation.`,
      `${audience} do not need legal theatre. Message the question in normal words and ask what to keep ready.`,
      `Before paying for advice, ask whether ${offer} needs a document check, a consultation, or a first risk review.`,
    ],
    agency: [
      `${moment} needs more than pretty posts. Send the page and goal so the first business problem is named before creative starts.`,
      `Likes without enquiries usually mean the strategy is thin. Ask for one audit point before buying another content package.`,
      `${moment} planning starts by naming the customer problem the next reel should solve.`,
      `${moment} strategy starts before the idea. Send the page and ask what is actually blocking sales.`,
      `Your next campaign should not start with colours. Ask which buyer doubt, offer gap, and proof gap must be fixed first.`,
      `If the page looks good but leads are weak, ask for an audit that names one problem and one revenue move.`,
      `${audience} should hear the thinking, not only the moodboard. Share the current offer and ask what needs fixing first.`,
      `Do not buy content because the feed looks quiet. Ask which sales question the next post must answer.`,
    ],
    retail: [
      `${moment} should not arrive as a surprise. Ask for real photo, price, size, and delivery step before paying.`,
      `${audience} do not want vague product claims. Show the actual ${offer}, the price, and the preview before confirmation.`,
      `Before confirming ${offer}, ask for the real look, available option, and delivery or pickup detail.`,
      `Gift buying should not feel like gambling. Ask for preview, price, size, and delivery date before confirming.`,
      `${moment} previews create trust before checkout. Ask to see the final direction before paying, not after.`,
      `${moment} confirmation needs stock, final look, and pickup or delivery detail for ${offer}.`,
      `${moment} buyers decide faster when the product is visible. Message PHOTO and ask what is available today.`,
      `A better order starts with the occasion. Send budget, date needed, and style preference before choosing ${offer}.`,
    ],
    local: [
      `Thinking about ${focus}${place}? Ask for price, proof, and timing in one message. We will make the decision easier.`,
      `If "${doubt}" is stopping you, ask for one real example before deciding. ${cta}`,
      `Good businesses make the first step clear. Ask about ${focus}, see ${proofText}, and then decide. ${cta}`,
    ],
  };
  const list = lines[kind] || lines.local;
  return sanitizeGeneratedText(pickSeeded(list, context, `caption:${kind}:${moment}:human`, index), context);
}

function actionNounForKind(kind) {
  return {
    software: "demo",
    food: "order",
    salon: "booking",
    clinic: "appointment",
    gym: "trial",
    real_estate: "site visit",
    law_firm: "consultation",
    agency: "audit",
    retail: "purchase",
    local: "enquiry",
  }[kind] || "enquiry";
}

function titleFlavorForKind(context, kind, index) {
  const flavors = {
    software: ["with workflow proof", "without setup confusion", "for team buy-in", "through a screen-level demo", "around week-one adoption", "against manual-work confusion"],
    food: ["with portion clarity", "through pickup timing", "with freshness proof", "for group orders", "before the menu decision", "with ready-time detail"],
    salon: ["with reference-photo clarity", "before the slot is chosen", "through result proof", "around prep timing", "with budget comfort", "through consultation detail"],
    clinic: ["around symptom clarity", "with first-step calm", "before appointment timing", "through care-path proof", "with patient confidence", "around visit preparation"],
    gym: ["with trainer guidance", "around first-session comfort", "through a routine preview", "before membership pressure", "with habit support", "through form-check proof"],
    real_estate: ["around landmark clarity", "through budget filtering", "with verified availability", "before the site visit", "with area confidence", "through shortlist quality"],
    law_firm: ["around document clarity", "with deadline context", "through risk sorting", "before consultation prep", "with a plain-English next step", "through case-fit proof"],
    agency: ["around offer clarity", "through audit evidence", "around the sales blocker", "before campaign logic", "through the content-to-revenue link", "with buyer-problem proof"],
    retail: ["with real-photo proof", "through stock clarity", "before preview confidence", "around delivery timing", "with size-and-style fit", "with checkout confidence"],
    local: ["with proof clarity", "around reply confidence", "through timing detail", "before the fit check", "with first-step ease", "around buyer trust"],
  };
  const list = flavors[kind] || flavors.local;
  return list[seededIndex(context, `title-flavor:${kind}`, index, list.length)];
}

function joinTitleDetail(base, detail) {
  const title = clean(base);
  const suffix = clean(detail).replace(/[.!?]+$/g, "");
  if (!suffix) return title;
  if (/^(with|through|around|before|for|against|without)\b/i.test(suffix)) return `${title} ${suffix}`;
  return `${title} with ${suffix}`;
}

function groundTitleWithOffer(title, offer) {
  const source = clean(title);
  return source;
}

function contextVariant(context, kind) {
  const source = lower([
    context.businessName,
    context.productsOrServices,
    context.audience,
    context.city,
    context.location,
  ].join(" "));
  if (kind === "food") {
    if (/shawarma|hostel|grilled|student dinner/.test(source)) return "hostel_food";
    if (/cold coffee|brownies|sandwich|after|combo/.test(source)) return "after_class_cafe";
    if (/coffee|workspace|pastries|remote|weekday/.test(source)) return "workday_cafe";
    return "family_food";
  }
  if (kind === "salon") return /college|party|local women|glow/.test(source) ? "college_salon" : "event_salon";
  if (kind === "gym") return /iron|weight|beginner training/.test(source) ? "first_gym" : "restart_gym";
  if (kind === "software") {
    if (/queue|clinic|reception/.test(source)) return "clinic_software";
    if (/gst|invoice|cashflow|payment|accounting|ledger|finance|tax|bookkeep/.test(source)) return "finance_software";
    return "sales_software";
  }
  if (kind === "law_firm") return /property|civicpoint/.test(source) ? "property_law" : /startup|employment|founder agreements|clearcase/.test(source) ? "startup_law" : "property_law";
  if (kind === "agency") return /pixel|small business|reels|kozhikode/.test(source) ? "local_agency" : "brand_agency";
  if (kind === "clinic") {
    if (/skin|derma|dermatology|laser|acne|pigmentation|glow/.test(source)) return "skin_clinic";
    return /smiledock|tooth pain|kozhikode/.test(source) ? "local_clinic" : "family_clinic";
  }
  if (kind === "real_estate") return /northline|rentals|plots|tenants/.test(source) ? "local_property" : "premium_property";
  if (kind === "retail") return /boutique|kurtis|ethnic|outfit|clothing/.test(source) ? "boutique_retail" : "gift_retail";
  return "local";
}

function visibleTitleOverride(context, kind, index, offer) {
  if (index > 2) return "";
  const variant = contextVariant(context, kind);
  const lines = {
    family_food: [
      "Plan one family order around headcount, parcel time, and portion proof",
      "Sort the seafood choice by freshness, wait time, and pickup comfort",
      "Turn dining doubt into one ready family recommendation",
    ],
    hostel_food: [
      "Build the hostel dinner order from budget, spice level, and pickup time",
      "Narrow the shawarma choice before the group chat becomes noise",
      "Prove the student combo is filling before anyone compares price",
    ],
    workday_cafe: [
      "Design the office coffee break around seat comfort and pickup speed",
      "Narrow the pastry add-on before the team leaves for break",
      "Prove weekday workspace value with one table, plug, and coffee path",
    ],
    after_class_cafe: [
      "Sort the after-class combo by budget, hunger, and ready time",
      "Frame the cold coffee pick as the easiest group decision today",
      "Turn brownie-and-sandwich confusion into one pocket-friendly order",
    ],
    event_salon: [
      "Prepare the event look around date, service time, and recent result proof",
      "Calm booking hesitation with a realistic style check before the slot",
      "Frame bridal makeup as a planned consultation, not a price-list guess",
    ],
    college_salon: [
      "Sort the party look by reference photo, budget comfort, and slot timing",
      "Prepare the first salon visit with result proof before price talk",
      "Turn saved-photo confusion into one realistic hair and makeup plan",
    ],
    restart_gym: [
      "Design the restart week around one guided class and one easy win",
      "Calm fitness delay with a trial path that explains day one",
      "Prove the first workout feels guided before membership talk begins",
    ],
    first_gym: [
      "Prepare beginners for the first gym visit with arrival and trainer clarity",
      "Turn awkwardness into a simple trial routine with form-check proof",
      "Frame weight-loss training as one supported week, not a scary promise",
    ],
    sales_software: [
      "Map the messy lead handoff to one cleaner CRM screen",
      "Prove week-one CRM value with a pipeline task buyers already repeat",
      "Frame the demo around the sales job, not the full feature list",
    ],
    finance_software: [
      "Map the invoice reminder from due date to paid follow-up",
      "Prove cashflow clarity with one simple dashboard moment",
      "Frame the demo around payment follow-up, not feature lists",
    ],
    clinic_software: [
      "Map the reception queue mess to one cleaner patient flow",
      "Prove setup value with a live waiting-room workflow before demo talk",
      "Frame the clinic software demo around fewer repeated desk questions",
    ],
    property_law: [
      "Prepare the property document check around deadline, risk, and missing papers",
      "Sort legal fear into one plain first-step consultation path",
      "Prove the lawyer needs facts before advice, not panic screenshots",
    ],
    startup_law: [
      "Map the founder agreement risk before the startup grows around it",
      "Prepare compliance questions with document names, deadlines, and owners",
      "Frame legal support as risk sorting before a costly mistake",
    ],
    brand_agency: [
      "Audit the campaign gap before another creative presentation",
      "Prove strategy quality with one buyer doubt and one sharper offer",
      "Map the retainer conversation to business outcomes before moodboards",
    ],
    local_agency: [
      "Audit the pretty-post problem through one local enquiry blocker",
      "Prove the reel idea has a sales reason before it gets filmed",
      "Turn the owner's vague content request into a buyer-problem diagnosis",
    ],
    family_clinic: [
      "Calm treatment delay with the first checkup step and cost range",
      "Prepare families for dental care with timing, safety, and doctor proof",
      "Frame the appointment as a clear consultation before treatment talk",
    ],
    skin_clinic: [
      "Calm skin-treatment doubt with doctor proof and patch-test clarity",
      "Prepare acne and laser enquiries with concern, timing, and cost range",
      "Frame the consultation before package or treatment pressure",
    ],
    local_clinic: [
      "Prepare tooth-pain patients with symptom, timing, and visit clarity",
      "Calm dental fear with a step-by-step first appointment explanation",
      "Prove the clinic process is safe before patients book the chair",
    ],
    premium_property: [
      "Qualify home buyers with budget, area, and visit reason before travel",
      "Map the shortlist around lifestyle fit, availability, and verified details",
      "Prove the property deserves a visit before sharing more listing photos",
    ],
    local_property: [
      "Sort local property leads by budget, area, and must-have details",
      "Qualify rentals and plots before the visit wastes both sides' time",
      "Frame the shortlist around verified availability and daily-life fit",
    ],
    gift_retail: [
      "Prepare custom gift buyers with preview, deadline, and real-photo proof",
      "Turn last-minute gifting into one clear design and pickup path",
      "Prove the customised product will not look cheap before checkout",
    ],
    boutique_retail: [
      "Sort outfit demand by size, occasion, and available stock",
      "Frame old stock as styling help instead of a weak discount dump",
      "Prove the clothing fit with close-up detail before price talk",
    ],
  };
  const list = lines[variant] || [
    `Map the buyer decision to one clear ${offer} next step`,
    `Prove the value of ${offer} before asking for action`,
    "Turn hesitation into one practical path customers can follow",
  ];
  return list[index] || "";
}

function visibleCaptionOverride(context, kind, index, offer) {
  if (index > 2) return "";
  const variant = contextVariant(context, kind);
  const lines = {
    family_food: [
      `Ordering for family? Send the headcount and pickup time. We will point you to the ${offer} option that keeps the table simple.`,
      `A good family order needs portion clarity first. Ask what serves 3-4 people, what is fresh now, and when it can be packed.`,
      `Before everyone votes in the group chat, ask for one safe order with price, portion, and ready time.`,
    ],
    hostel_food: [
      `Hostel dinner should not become a budget argument. Send spend limit, spice comfort, and pickup time before choosing ${offer}.`,
      `If the group is hungry now, ask what is filling, fresh, and fast instead of scrolling the full menu again.`,
      `Cheap is not useful if half the room stays hungry. Ask for the ${offer} combo that fits budget and appetite.`,
    ],
    workday_cafe: [
      `Coffee breaks have a clock. Ask what is ready fastest, what pairs with ${offer}, and whether seating is open before leaving office.`,
      `Do not make the team scroll during break time. Send taste preference and pickup window, then pick one clear coffee option.`,
      `A weekday cafe choice works when timing is clear. Ask for ready time, seat comfort, and one easy order suggestion.`,
    ],
    after_class_cafe: [
      `After class, nobody wants a long menu debate. Ask what combo is fresh, pocket-friendly, and ready before the group splits.`,
      `Cafe plans move faster when the reply says price, portion, and ready time in one shot.`,
      `For a student order, send budget, hunger, and parcel time. We will point you to one combo that fits today.`,
    ],
    event_salon: [
      `Event grooming starts with the date, not the price list. Ask what result is realistic, how long it takes, and which slot fits.`,
      `A reference photo helps only when the stylist explains what can actually be done for your hair, skin, and timing.`,
      `Before booking ${offer}, ask for one recent result, prep needed, and the safest appointment window.`,
    ],
    college_salon: [
      `${context.businessName} college styling needs a clear slot and a realistic result. Send the event date, budget comfort, and reference before booking ${offer}.`,
      `Do not walk in with only a reference photo. Send the date, service, and budget so ${context.businessName} can suggest a realistic plan.`,
      `A useful ${context.businessName} reply should tell you time needed, starting price, and what to do before the ${offer} visit.`,
    ],
    restart_gym: [
      `Restarting fitness is easier when day one is clear. Ask who guides you, what to bring, and what the first routine looks like.`,
      `A trial should remove awkwardness, not add pressure. Send your goal and ask for the beginner-friendly first session.`,
      `Before paying for fitness, ask what happens in week one and how a trainer keeps you consistent.`,
    ],
    first_gym: [
      `First gym week works better with a guide. Ask which trainer helps, what movements start first, and how form is checked.`,
      `If embarrassment is the blocker, request a quiet trial slot and a beginner routine before membership talk.`,
      `A better gym post shows the first session clearly: arrival, trainer support, routine, and next step.`,
    ],
    sales_software: [
      `A CRM demo should start with the messy lead task, not a feature parade. Reply with the workflow you want cleaned up.`,
      `If leads still live across sheets and chats, ask to see one cleaner screen path before starting another trial.`,
      `Before signup, compare your current ${offer} routine with one week-one workflow the team can actually use.`,
    ],
    finance_software: [
      `An accounting demo should start with the unpaid invoice problem, not a feature parade. Reply with the finance workflow you want cleaned up.`,
      `If payment follow-ups still live across WhatsApp and memory, ask to see one cleaner reminder path before starting another trial.`,
      `Before beta signup, compare your current ${offer} routine with one week-one finance workflow the team can actually use.`,
    ],
    clinic_software: [
      `Clinic software needs a queue example first. Ask what changes at reception in the first week before talking features.`,
      `A useful demo shows the patient flow, staff handoff, and the screen where confusion disappears.`,
      `If the reception desk is overloaded, send one queue problem and ask for the exact setup path.`,
    ],
    property_law: [
      `Property paperwork should start with the document name and deadline. Ask what risk to check before booking a full consultation.`,
      `Legal panic gets expensive when facts are missing. Send timeline, parties involved, and document type first.`,
      `Before paying for advice, ask whether the issue needs a document check, a consultation, or a first risk review.`,
    ],
    startup_law: [
      `Founder legal work should not wait for a crisis. Send the agreement type, deadline, and what decision is stuck.`,
      `Before signing another document, ask what clause, obligation, or founder risk needs a lawyer's eye first.`,
      `Startup compliance feels lighter when the reply lists what to prepare before the first call.`,
    ],
    brand_agency: [
      `A brand campaign should begin with the buyer problem, not the colour palette. Send the page and ask what blocks sales.`,
      `If the feed looks polished but leads are weak, ask for the first strategic leak before buying more content.`,
      `Good agency thinking names the offer gap, proof gap, and next content move before design starts.`,
    ],
    local_agency: [
      `Local business content has one job: answer a sales question. Share the page and ask which customer doubt the next reel must fix.`,
      `Pretty posts are easy. The useful audit is the one that says why enquiries are not coming.`,
      `Before buying a content package, ask for one weak point, one proof angle, and one next post that can create replies.`,
    ],
    family_clinic: [
      `Dental fear drops when the first visit is explained. Ask what happens first, how long it takes, and what details to bring.`,
      `Families should not wait for tooth pain to become urgent. Send symptom, timeline, and preferred visit time.`,
      `Before booking ${offer}, ask whether it needs a checkup first and what the safe appointment path is.`,
    ],
    skin_clinic: [
      `Skin treatment feels safer when the clinic explains consultation, patch test, timing, and side-effect care. Message the concern and ask what the doctor checks first.`,
      `Before choosing ${offer}, ask what result is realistic, how many sessions may be needed, and what the doctor checks first.`,
      `Price shoppers need proof, not pressure. Send your concern, timeline, and budget comfort before choosing a treatment package.`,
    ],
    local_clinic: [
      `A local dental visit feels safer when the clinic explains the first step before treatment talk.`,
      `If the symptom is confusing, message it in simple words and ask what timing makes sense.`,
      `A useful clinic reply should cover concern, appointment window, and what information to bring.`,
    ],
    premium_property: [
      `A site visit should start with budget, area, and daily-life fit. Ask for matched options before travelling.`,
      `Listing photos are not proof. Ask for availability, landmark, price range, and why the property fits your routine.`,
      `Before booking a visit, request three options that match your budget and one reason each is worth seeing.`,
    ],
    local_property: [
      `A property search gets easier when budget and landmark preference come before random visits.`,
      `A useful rental reply filters by area, move-in date, and must-have before sending listings.`,
      `Do not spend Saturday chasing mismatched properties. Send budget, location, and property type first.`,
    ],
    gift_retail: [
      `Custom gifts need proof before checkout. Ask for real photo, preview, delivery date, and what can be changed.`,
      `Gift buying feels safer when the reply has occasion, budget, and needed date before the final gift choice.`,
      `Before confirming, ask what is in stock, what can be customised, and how the preview will look.`,
    ],
    boutique_retail: [
      `College outfits sell faster when the real piece is visible. Ask for size, colour, price, and pickup detail first.`,
      `Do not choose clothes from a vague caption. Ask for real photo, fit detail, and what is available today.`,
      `A good boutique reply shows stock, styling suggestion, and delivery or pickup step before checkout.`,
    ],
  };
  return sanitizeGeneratedText(lines[variant]?.[index] || "", context);
}

function visibleMessageOverride(context, kind, index, offer) {
  if (index > 2) return "";
  const variant = contextVariant(context, kind);
  const lines = {
    family_food: [
      `Send FAMILY with headcount, parcel or dine-in, and pickup time. We will suggest one ${offer} order with portion and price.`,
      `Message what time you need food and how many people are eating. We will reply with the safest family order.`,
      `Ask for today's family pick, portion size, and ready time. We will keep the order simple.`,
    ],
    hostel_food: [
      `Send HOSTEL with budget, spice level, and pickup time. We will suggest the filling option without sending the whole menu.`,
      `Message QUICK if everyone is hungry now. We will reply with one fresh order, price, and parcel timing.`,
      `Share headcount and max spend. We will choose the order that avoids a group-chat fight.`,
    ],
    workday_cafe: [
      `Tell us pickup time and taste preference. We will suggest one coffee order that fits the work break.`,
      `Message BREAK with drink style and time available. We will reply with the fastest sensible pick.`,
      `Ask what is ready before leaving office. We will confirm price, wait time, and one easy add-on.`,
    ],
    after_class_cafe: [
      `Send STUDENT COMBO with budget and parcel time. We will suggest one cafe pick that fits the group.`,
      `Message hunger level and max spend. We will reply with the combo that is fresh and ready fastest.`,
      `Share budget, hunger level, and parcel time. We will send price, portion, and ready time in one reply.`,
    ],
    event_salon: [
      `Send the event date, service, and reference photo. We will reply with time needed, starting price, and what result is realistic.`,
      `Message SLOT CHECK with the service and preferred time. We will confirm whether the slot fits your event plan.`,
      `Share hair or skin concern plus date. We will suggest the safest booking path before you visit.`,
    ],
    college_salon: [
      `Share the look you want, event date, and budget comfort. We will say what is realistic for ${offer} and which slot fits.`,
      `Send a reference photo if you have one. We will explain prep, timing, and what result is realistic for ${offer}.`,
      `Send the event date, service, and budget comfort. We will reply with starting price, time needed, and the slot that fits.`,
    ],
    restart_gym: [
      `Message START with your goal and available time. We will share the first-session plan and trainer support.`,
      `Ask for the beginner trial. We will tell you what to bring, who guides you, and what happens first.`,
      `Send your fitness level and preferred time. We will reply with the least awkward entry point.`,
    ],
    first_gym: [
      `Message BEGINNER with your goal and any injury worry. We will share the safest first routine.`,
      `Ask for a quiet trial slot and the first three movements. We will explain the day-one plan.`,
      `Send available time and comfort level. We will reply with trainer guidance before membership talk.`,
    ],
    sales_software: [
      `Tell us the lead task your team still handles manually. We will show the exact CRM screen path for that job.`,
      `Message DEMO with role, team size, and workflow. We will avoid feature dumping and show the useful path.`,
      `Describe the current sales process in one line. We will reply with the first setup step to test.`,
    ],
    finance_software: [
      `Tell us the invoice or payment follow-up your team still handles manually. We will show the exact ${context.businessName} screen path for that job.`,
      `Message DEMO with role, team size, and finance workflow. We will avoid feature dumping and show the useful path.`,
      `Describe the current cashflow or reminder process in one line. We will reply with the first setup step to test.`,
    ],
    clinic_software: [
      `Send the queue problem your reception team repeats daily. We will show the before-after workflow.`,
      `Message DEMO with patient flow and staff role. We will map the first setup step clearly.`,
      `Describe the busiest desk moment. We will reply with the screen path that can simplify it.`,
    ],
    property_law: [
      `Send document name, deadline, and what happened. We will say what to prepare before consultation.`,
      `Message ISSUE with the document type. We will reply with the first risk to check.`,
      `Share timeline and parties involved. We will tell you whether this needs document review or consultation first.`,
    ],
    startup_law: [
      `Send agreement type, deadline, and the decision you are stuck on. We will list what to prepare first.`,
      `Message CONTRACT with the clause or document name. We will say what risk to check before a call.`,
      `Write the legal question in normal words. We will point out missing details before a call.`,
    ],
    brand_agency: [
      `Send page, offer, and sales goal. We will name one business problem before suggesting creative.`,
      `Message the campaign that disappointed you. We will explain what likely broke and what to test next.`,
      `Share the last three posts and current CTA. We will identify the first message gap.`,
    ],
    local_agency: [
      `Send your page and the enquiry problem. We will reply with one weak point and one reel angle.`,
      `Message AUDIT with offer, buyer, and current channel. We will say whether proof, message, or follow-up is broken.`,
      `Share the content package you are considering. We will name the business problem it should solve first.`,
    ],
    family_clinic: [
      `Send the symptom, age group, and preferred visit time. We will explain the first step and what to bring.`,
      `Send what you are worried about. We will share what happens first and how to book safely.`,
      `Describe the concern in simple words. We will reply with the right appointment timing.`,
    ],
    skin_clinic: [
      `Send your skin concern, how long it has been there, and preferred visit time. We will explain the consultation step and what to bring.`,
      `For ${offer}, describe what result you want and what side effect worries you. We will explain what the doctor checks first.`,
      `Share treatment area, timeline, and budget comfort. We will tell you whether consultation or patch test comes first.`,
    ],
    local_clinic: [
      `Send the concern, how long it has been there, and available time. We will suggest the right appointment timing.`,
      `Ask whether this needs a visit. We will explain the first check, timing, and what details matter.`,
      `Message APPOINTMENT with symptom and preferred slot. We will confirm timing and what details to bring.`,
    ],
    premium_property: [
      `Send budget, area, property type, and timeline. We will match options before suggesting a site visit.`,
      `Message SHORTLIST with must-have and preferred landmark. We will filter the properties first.`,
      `Share family size and location preference. We will send available matches with one reason each fits.`,
    ],
    local_property: [
      `Send max budget, preferred area, and move-in timeline. We will remove random listings from the reply.`,
      `Message property type and landmark preference. We will send relevant options with visit timing.`,
      `Ask for verified matches first. We will share availability, area fit, and what to check before visiting.`,
    ],
    gift_retail: [
      `Message PREVIEW with occasion, budget, and needed date. We will show real photo, price, and customisation option.`,
      `Send the product idea and delivery date. We will check stock and show the safest gift option.`,
      `Share theme, size, or colour. We will confirm the custom options before you pay.`,
    ],
    boutique_retail: [
      `Message PHOTO with product type and size. We will share real photos, price, and availability.`,
      `Send occasion, fit preference, and budget. We will suggest one outfit that is actually available today.`,
      `Send STOCK with size, colour, and pickup preference. We will reply with what is available today.`,
    ],
  };
  return sanitizeGeneratedText(lines[variant]?.[index] || "", context);
}

function naturalDayTitleForKind(context, kind, index, { focus, objection, persona }) {
  const city = shortLocation(context, kind);
  const place = city ? ` in ${city}` : "";
  const audience = audienceCue(context);
  const doubt = titleDoubtLabel(objection?.objection, "buyer doubt").toLowerCase();
  const moment = businessMoment(context, kind);
  const offer = businessFacingFocus(context, focus || leadOffer(context), index);
  const action = actionNounForKind(kind);
  const market = place || (kind === "software" ? "for the buyer team" : "for the buyer");
  const variant = contextVariant(context, kind);
  const variantTitles = {
    family_food: [
      `Run a family portion test with parcel timing on screen`,
      `Simplify table-size ordering for the WhatsApp group`,
      `Turn pickup versus dine-in into one parent-friendly choice`,
      `Turn family menu confusion into one safe order`,
      `Show the bill, box, and ready-time proof for ${offer}`,
      `Film staff recommending a family order under one budget`,
      `Show the sharing portion before the WhatsApp CTA`,
      `Record the handoff for a family parcel order`,
      `Make the weekend family order easy to choose`,
      `Show freshness, portion, and pickup time together`,
    ],
    hostel_food: [
      `Launch the hostel dinner combo with price and pickup time`,
      `Prove the budget order can fill a student group`,
      `Turn spice level into a simple parcel-order choice`,
      `Turn hostel group-chat confusion into one order`,
      `Show the quickest filling option after class`,
      `Film the late-evening parcel path for ${offer}`,
      `Make the student dinner budget visible before ordering`,
      `Show the group-size filter before sending the menu`,
      `Record the combo that avoids the cheap-food regret`,
      `Turn hunger, budget, and timing into one reply`,
    ],
    workday_cafe: [
      `Shape the office coffee break into a ten-minute order plan`,
      `Film the weekday pickup route before buyers leave office`,
      `Pair one takeaway coffee with the pastry that fits a short break`,
      `Turn workspace coffee choice into one clear order`,
      `Show seating, ready time, and drink choice together`,
      `Record a remote-worker table choice before the CTA`,
      `Make the weekday cafe visit easy to plan`,
      `Show what is ready fastest for a work break`,
      `Film the takeaway coffee route for busy buyers`,
      `Turn break-time pressure into one simple coffee pick`,
    ],
    after_class_cafe: [
      `Prove the after-class combo by price and portion`,
      `Guide the student group order before the bill split`,
      `Sell the brownie-and-drink combo with ready-time proof`,
      `Turn college snack confusion into one combo`,
      `Show the pocket-friendly order without hiding portion size`,
      `Film the parcel counter path for students`,
      `Make the cafe plan fit budget and hunger`,
      `Show the fresh snack option before the menu scroll`,
      `Record the group table order with max spend visible`,
      `Turn after-class hunger into one useful reply`,
    ],
    event_salon: [
      `Film the event consultation that prevents makeup confusion`,
      `Turn a reference photo into prep, timing, and result clarity`,
      `Make the bridal slot feel clear before booking pressure`,
      `Turn event-date panic into one appointment plan`,
      `Show the recent result that explains realistic timing`,
      `Film the grooming checklist for an event week`,
      `Make the service choice clear before the slot check`,
      `Show starting price, prep, and final detail together`,
      `Record the first salon message for event buyers`,
      `Turn reference-photo doubt into a consultation step`,
    ],
    college_salon: [
      `Guide the college-event look with budget comfort visible`,
      `Teach students exactly what to send before hair styling`,
      `Package party-grooming slots for event-week decisions`,
      `Turn saved-photo confusion into one salon reply`,
      `Show price range, time needed, and realistic result`,
      `Guide students from reference photo to slot check`,
      `Make the party look decision easy before the slot`,
      `Show prep, reference, and final style expectation`,
      `Record the quick slot check for event-week grooming`,
      `Turn “will it suit me?” into a clear consultation`,
    ],
    restart_gym: [
      `Turn the restart workout into one guided class booking`,
      `Explain first-week support before membership talk starts`,
      `Frame day-one fitness as possible for office workers`,
      `Turn fitness delay into one scheduled session`,
      `Show trainer guidance for people restarting fitness`,
      `Film the easy win that makes week one feel possible`,
      `Make consistency feel smaller than a full plan`,
      `Show what happens in the first 20 minutes`,
      `Record the no-pressure trial route for beginners`,
      `Turn “I will start later” into one class booking`,
    ],
    first_gym: [
      `Walk through the first gym visit from door to routine`,
      `Demonstrate trainer correction before membership pressure`,
      `Calm the quiet-trial fear for nervous beginners`,
      `Turn awkward-gym fear into one guided session`,
      `Show the first three movements with form help`,
      `Film what to bring and who helps on day one`,
      `Make beginner training feel planned before signup`,
      `Show the safest first routine for new members`,
      `Record the entry, warmup, and trainer handoff`,
      `Turn first-day fear into a simple trial message`,
    ],
    sales_software: [
      `Map the lead handoff before and after the CRM`,
      `Compare the sales pipeline screen with the messy sheet`,
      `Turn one rep workflow into a clear enquiry-to-follow-up demo`,
      `Turn CRM feature doubt into one useful demo`,
      `Show the week-one sales task that gets cleaner`,
      `Record the role-based screen a sales team cares about`,
      `Make the demo start with the current manual problem`,
      `Show how one lead stops getting lost`,
      `Film the setup step before the trial CTA`,
      `Turn sales-process mess into one screen path`,
    ],
    finance_software: [
      `Map the unpaid invoice follow-up before and after setup`,
      `Compare the cashflow dashboard with the messy payment sheet`,
      `Turn one GST reminder workflow into a clear demo`,
      `Turn finance-data fear into one useful screen walkthrough`,
      `Show the week-one payment task that gets cleaner`,
      `Record the role-based screen an accountant cares about`,
      `Make the demo start with the current manual reminder problem`,
      `Show how one overdue payment stops getting missed`,
      `Film the setup step before the beta CTA`,
      `Turn cashflow confusion into one screen path`,
    ],
    clinic_software: [
      `Document the reception queue before and after setup`,
      `Demonstrate the patient-flow screen clinic owners need first`,
      `Document the desk handoff from patient arrival to update`,
      `Turn queue confusion into one clinic workflow demo`,
      `Show the first setup step for reception staff`,
      `Record the waiting-room problem before feature talk`,
      `Make the demo about staff time, not software labels`,
      `Show how one patient update moves through the system`,
      `Film the clinic use case before asking for trial`,
      `Turn manual queue handling into one screen path`,
    ],
    property_law: [
      `Turn the property document into a consultation checklist`,
      `Explain the deadline and document that changes legal risk`,
      `Frame the first legal step for a property buyer`,
      `Turn property-paper confusion into one checklist`,
      `Show what to send before legal advice starts`,
      `Film the contract review path without legal theatre`,
      `Make the consultation prep clear before fees`,
      `Show the missing document that changes the risk`,
      `Record the plain-English property issue sort`,
      `Turn late legal help into an early document check`,
    ],
    startup_law: [
      `Turn the founder agreement into a pre-signing risk check`,
      `List the startup document founders should prepare first`,
      `Break down the contract risk before the consultation CTA`,
      `Turn compliance delay into one legal checklist`,
      `Show what founders should send before advice`,
      `Film the employment-contract issue in plain English`,
      `Make legal support feel useful before urgency hits`,
      `Show the deadline and clause that changes next step`,
      `Record the founder prep path for legal consultation`,
      `Turn “we will do it later” into one document review`,
    ],
    brand_agency: [
      `Audit one campaign gap before pitching creative`,
      `Reveal the strategy issue behind a weak brand post`,
      `Break down a founder-level teardown of one offer`,
      `Turn pretty-content demand into a business diagnosis`,
      `Show proof gap, CTA gap, and next content move`,
      `Film why a campaign failed before suggesting reels`,
      `Make the retainer conversation start with a sales problem`,
      `Show the buyer doubt hidden inside a brand page`,
      `Record the audit note a growth team would value`,
      `Turn vague creative feedback into one revenue move`,
    ],
    local_agency: [
      `Audit one local page before suggesting a reel`,
      `Reveal why enquiries are weak before selling content`,
      `Map the offer gap on a small business profile`,
      `Turn “make pretty posts” into one sales diagnosis`,
      `Show the customer doubt behind a weak WhatsApp CTA`,
      `Film a local business audit with one revenue fix`,
      `Make the owner see the problem before the package`,
      `Show proof gap, price gap, and first reply gap`,
      `Record the practical content move for one local offer`,
      `Turn random posting into one buyer-problem post`,
    ],
    family_clinic: [
      `Walk through the family appointment path before treatment talk`,
      `Highlight doctor proof and first-step calm for patients`,
      `Frame the dental consultation before booking`,
      `Turn pain fear into one safe booking explanation`,
      `Show what families should bring or share first`,
      `Film the checkup path without cost pressure`,
      `Make the visit feel predictable for nervous patients`,
      `Show team proof before asking for appointment`,
      `Record the consultation prep for a family patient`,
      `Turn treatment delay into one calm first step`,
    ],
    skin_clinic: [
      `Explain the consultation before acne or laser package talk`,
      `Show patch-test and doctor proof before treatment pressure`,
      `Turn side-effect fear into one calm clinic visit`,
      `Show realistic skin-result timing before price questions`,
      `Film what happens before a laser session decision`,
      `Make the cost range visible before package comparison`,
      `Answer the safety question before asking for appointment`,
      `Record the clinic route from skin concern to consultation`,
      `Show recent proof without promising miracle results`,
      `Turn treatment confusion into one WhatsApp reply`,
    ],
    local_clinic: [
      `Guide the local checkup path before appointment booking`,
      `Walk through what happens before dental cleaning starts`,
      `Turn a tooth-pain message into a calm visit route`,
      `Turn patient trust doubt into one clinic explainer`,
      `Show appointment timing, concern, and first step`,
      `Film the safe consultation path for working adults`,
      `Make the dental visit feel clear before booking`,
      `Show team proof before discussing treatment`,
      `Record the first reply a nervous patient needs`,
      `Turn dental fear into one calm booking message`,
    ],
    premium_property: [
      `Build the premium shortlist before the site visit`,
      `Verify landmark, price range, and visit reason in one post`,
      `Turn budget-fit property search into a buyer shortlist`,
      `Turn random apartment browsing into one filtered visit`,
      `Show daily-life fit before asking for travel`,
      `Film availability, area, and property type together`,
      `Make the visit feel selected before the appointment`,
      `Show the property proof a portal listing misses`,
      `Record the buyer filter before sending options`,
      `Turn investment doubt into one useful shortlist`,
    ],
    local_property: [
      `Localize the area filter before listings`,
      `Qualify budget, landmark, and move-in timing before options`,
      `Build a local property shortlist with must-have fit`,
      `Turn mismatched enquiries into one buyer filter`,
      `Show availability before asking for a site visit`,
      `Film the apartment or plot route with area proof`,
      `Make the property reply useful before travel`,
      `Show what tenants or buyers should send first`,
      `Record the visit timing only after budget fit`,
      `Turn broad property search into one clean shortlist`,
    ],
    gift_retail: [
      `Demonstrate the custom gift preview before checkout`,
      `Bundle real photo, price, and delivery date in one preview`,
      `Clarify gift customisation choices before confirmation`,
      `Turn last-minute gifting into one preview message`,
      `Show the student gift option by occasion and budget`,
      `Film packing and pickup for a real custom order`,
      `Prove the gift feels safe before the buyer pays`,
      `Show close-up quality before asking for confirmation`,
      `Record the preview path for a Gen-Z gift buyer`,
      `Turn “will it look cheap?” into real product proof`,
    ],
    boutique_retail: [
      `Compare the real outfit with size and pickup detail`,
      `Display fit, price, stock, and styling option together`,
      `Show what is available before checkout`,
      `Turn college outfit doubt into one photo reply`,
      `Show the fabric, colour, and size in real light`,
      `Film the pickup or delivery step for a real order`,
      `Make outfit choice safer before checkout`,
      `Show how to ask for the right size first`,
      `Record a student styling option with budget visible`,
      `Turn old-stock pressure into one fresh styling angle`,
    ],
  };
  if (variantTitles[variant]?.length) {
    const list = variantTitles[variant];
    return sanitizeGeneratedText(groundTitleWithOffer(list[index % list.length], offer), context);
  }
  const directTitles = {
    software: [
      `Record the ${offer} workflow from problem to result`,
      `Show the first setup step buyers worry about`,
      `Compare the manual process with the ${context.businessName} screen`,
      `Walk through one buyer use case in under a minute`,
      `Show the week-one result a team can expect`,
      `Film the support path after a demo request`,
      `Turn one feature into a real workflow example`,
      `Show what changes before and after ${offer}`,
      `Answer the “will this fit us?” demo question`,
      `Make early access feel low-risk and useful`,
    ],
    food: [
      `Film the ${offer} portion, packing, and ready time`,
      `Show one safe order for a family or group`,
      `Compare the full menu with one easy recommendation`,
      `Record the counter handoff from order to pickup`,
      `Show price, portion, and what is ready today`,
      `Film staff choosing the best first-time order`,
      `Show the parcel box before customers message`,
      `Turn a group order into one simple suggestion`,
      `Record the fresh item before peak order time`,
      `Show the cleanest way to order without scrolling the menu`,
    ],
    salon: [
      `Film the consultation before the ${offer} booking`,
      `Show reference photo, time needed, and realistic result`,
      `Record the slot check before asking for payment`,
      `Show the prep step that makes the result safer`,
      `Film one recent result with price range and timing`,
      `Turn a saved look into a clear appointment plan`,
      `Show hygiene, setup, and final result in one reel`,
      `Answer the “will this suit me?” service question`,
      `Guide the first salon message from reference to chair`,
      `Show what to send before booking ${offer}`,
    ],
    clinic: [
      `Explain the first appointment step in plain words`,
      `Show what happens before ${offer} is discussed`,
      `Answer the pain, timing, or cost worry calmly`,
      `Record the message-to-appointment path`,
      `Show what patients should bring or share first`,
      `Film the consultation prep without treatment pressure`,
      `Make the visit feel predictable before booking`,
      `Show doctor or team proof before asking for action`,
      `Turn symptom confusion into one safe next step`,
      `Explain the checkup path before the appointment`,
    ],
    gym: [
      `Film the first beginner session from entry to routine`,
      `Show what to bring and who guides the first visit`,
      `Record trainer correction without transformation claims`,
      `Make the trial session feel less awkward`,
      `Show the first three movements a beginner will do`,
      `Explain the first-week routine before membership talk`,
      `Film a form check that reduces gym fear`,
      `Show the easiest time slot to start this week`,
      `Turn fitness delay into one guided visit`,
      `Record the support a beginner gets on day one`,
    ],
    real_estate: [
      `Filter one property by budget, area, and visit reason`,
      `Show landmark, commute, and availability before site visit`,
      `Compare random listings with a matched shortlist`,
      `Record the budget question before sending properties`,
      `Show why one option deserves a site visit`,
      `Explain what buyers should verify before travelling`,
      `Turn a broad enquiry into a useful property filter`,
      `Show the area proof portal listings usually miss`,
      `Record a shortlist with price, location, and fit`,
      `Make the site visit feel selected, not random`,
    ],
    law_firm: [
      `Explain the first document check before consultation`,
      `Show what details to send for ${offer}`,
      `Turn one legal doubt into a plain next step`,
      `Record the deadline, risk, and document checklist`,
      `Show what to prepare before calling a lawyer`,
      `Explain one mistake clients should avoid`,
      `Make consultation prep feel simple and safe`,
      `Show how issue type changes the next step`,
      `Turn legal panic into a first-step checklist`,
      `Record a plain-English contract or document check`,
    ],
    agency: [
      `Audit one weak post and name the business problem`,
      `Compare pretty content with enquiry-focused strategy`,
      `Show the offer gap before suggesting creative`,
      `Record a one-page page or profile teardown`,
      `Turn one buyer doubt into a shootable post`,
      `Explain why leads are weak before making another reel`,
      `Show the CTA change that can improve lead quality`,
      `Map one customer problem to one content move`,
      `Record a founder-level audit in simple words`,
      `Turn a vague content request into a sales diagnosis`,
    ],
    retail: [
      `Film the real ${offer} preview before checkout`,
      `Show price, size, stock, and delivery detail`,
      `Record what can change before order confirmation`,
      `Compare product photos with real close-up proof`,
      `Show one safe gift choice by budget and occasion`,
      `Film packing, pickup, or delivery for a real order`,
      `Answer the “will it look cheap?” product doubt`,
      `Show what buyers should message before paying`,
      `Turn last-minute gift buying into one preview step`,
      `Record availability before customers choose the design`,
    ],
    local: [
      `Film one real proof point for ${offer}`,
      `Show price, timing, proof, and the next step`,
      `Answer the customer doubt before asking for action`,
      `Record what happens after someone messages`,
      `Show the detail competitors usually hide`,
      `Turn one common question into a practical post`,
      `Make the first reply easy for serious buyers`,
      `Show the result, process, and next step together`,
      `Explain the safest first step for ${offer}`,
      `Turn hesitation into one small action today`,
    ],
  };
  const concreteTitles = directTitles[kind] || directTitles.local;
  if (concreteTitles?.length) {
    return sanitizeGeneratedText(
      groundTitleWithOffer(concreteTitles[seededIndex(context, `concrete-day-title:${kind}:${offer}:${action}`, index, concreteTitles.length)], offer),
      context,
    );
  }
  const titles = [
    `${moment} proof before the first ${action}`,
    `A clearer ${offer} choice for ${audience}`,
    `What to show before ${audience} ask the price`,
    `The safest first step for ${moment}`,
    `Make ${offer} easier to compare ${market}`,
    `Turn the main doubt into a useful post`,
    `${moment} buyers need one useful detail first`,
    `Show the real process behind ${offer}`,
    `A one-message path to the right ${action}`,
    `Use timing and proof to reduce hesitation`,
    `Make ${context.businessName} easier to choose`,
    `What ${moment} buyers should know first`,
    `Show one result instead of another claim`,
    `Turn the main hesitation into a plain answer`,
    `Give the buyer a reason to reply today`,
    `Show price, timing, and fit together`,
    `Make the next step obvious from the post`,
    `Compare the usual option with your better path`,
    `Show what happens after the buyer says yes`,
    `Use a real example to explain ${offer}`,
    `Help ${audience} avoid the wrong choice`,
    `Make the first reply feel easy`,
    `Show why ${offer} fits this buyer`,
    `Use proof before asking for commitment`,
    `Turn a common question into the CTA`,
    `Show the detail competitors usually hide`,
    `Make the decision faster without pressure`,
    `Explain the step most buyers delay`,
    `Show the useful version of ${offer}`,
    `Close the loop from doubt to action`,
    `Make ${moment} feel less risky`,
    `Show the buyer what to send first`,
    `Turn comparison into one clear recommendation`,
    `Make ${action} feel planned, not random`,
    `Use today’s availability as the hook`,
    `Show the proof that changes the conversation`,
    `Use one buyer question as the post hook`,
    `Turn the first reply into the offer`,
    `Show the proof before the promise`,
    `Make the buying path visible`,
    `Give comparison buyers a shortcut`,
    `Show the smallest useful next step`,
    `Make timing part of the reason to act`,
    `Use a real situation instead of a claim`,
    `Answer the question that blocks action`,
    `Show the handoff from interest to reply`,
    `Make the offer easier to judge`,
    `Show the first five minutes after interest`,
    `Turn price doubt into useful context`,
    `Use availability to create a decision`,
    `Show what happens before checkout`,
    `Make the buyer's first message simple`,
    `Use one mistake as the lesson`,
    `Show the safer option without pressure`,
    `Explain what buyers should not guess`,
    `Make proof feel current, not old`,
    `Show the real choice behind the CTA`,
    `Turn hesitation into a short checklist`,
    `Use one customer situation as the angle`,
    `Show the boring detail that builds trust`,
    `Make the alternative look harder`,
    `Explain the fastest route to a yes or no`,
    `Show what to compare before deciding`,
    `Use the first objection as the opening`,
    `Make the offer easy to ask about`,
    `Show the exact detail to send in DM`,
    `Explain the safest route from interest`,
    `Make the decision feel smaller`,
    `Show what happens if they wait`,
    `Turn proof into a reply trigger`,
    `Use the everyday problem as the hook`,
    `Show one reason to choose now`,
    `Make the next action impossible to miss`,
    `Explain the hidden cost of guessing`,
    `Use one clear filter for better buyers`,
    `Show the easiest way to start`,
    `Make the promise visible with one detail`,
    `Turn a common delay into a quick action`,
    `Show the buyer what good looks like`,
    `Make trust visible before the CTA`,
    `Use the first proof point as the story`,
    `Show why waiting creates more confusion`,
  ];
  const selected = titles[seededIndex(context, `day-title:${kind}:${moment}`, index, titles.length)];
  const momentSource = lower(moment);
  const titled = lower(selected).includes(momentSource)
    ? selected
    : `${moment}: ${selected.charAt(0).toLowerCase()}${selected.slice(1)}`;
  return sanitizeGeneratedText(`${titled} ${titleFlavorForKind(context, kind, index)}`, context);
}

function calendarCreative(context, index, { pillar, objection, persona, psych, offer, focus, platform, format }) {
  const kind = businessKind(context);
  const proof = clean(pillar?.proof_needed, "real proof");
  const cta = industryCta(context, kind, index);
  const city = shortLocation(context, kind);
  const place = city ? ` in ${city}` : "";
  const doubt = compactText(objection?.objection, "", 66).replace(/[.!?]+$/g, "");
  const titleDoubt = titleDoubtLabel(doubt);
  const titleSets = {
    software: [
      `${focus} workflow before and after`,
      `The setup step buyers are scared of`,
      `Manual work versus ${context.businessName}`,
      `One use case for ${clean(persona?.name, "busy teams")}`,
      `Week-one result for ${focus}`,
      `The support proof buyers need`,
      `Small workflow, clear demo`,
      `Feature promise turned into proof`,
      `Current process versus clean dashboard`,
      `Early-access reason to act`,
    ],
    food: [
      `${focus} first-order helper`,
      `Price and wait-time check`,
      `Kitchen proof for ${focus}`,
      `Combo decision card${place}`,
      `Parcel timing explainer`,
      `Student-safe order prompt`,
      `Family table choice`,
      `Today's best pick`,
      `Menu doubt answer`,
      `Clean-order confidence post`,
    ],
    salon: [
      `${focus} before booking`,
      `Price, time, and result proof`,
      `The look consultation post`,
      `Slot clarity for ${clean(persona?.name, "new customers")}`,
      `Recent result check`,
      `Event-ready service guide`,
      `Hygiene and timing proof`,
      `Reference photo reality check`,
      `Budget-fit beauty reply`,
      `First visit confidence post`,
    ],
    clinic: [
      `${focus} first-step explainer`,
      `What happens before the appointment`,
      `${titleDoubt} patient question`,
      `Safe booking clarity`,
      `Cost and timing explainer`,
      `Treatment fear reducer`,
      `Consultation path post`,
      `Symptom-to-next-step guide`,
      `Doctor trust proof`,
      `Visit preparation card`,
    ],
    gym: [
      `Beginner first visit plan`,
      `${focus} trial session clarity`,
      `What to bring, what to expect`,
      `The no-judgement starter post`,
      `Trainer guidance proof`,
      `Three-day routine preview`,
      `Form-check confidence post`,
      `Membership doubt answer`,
      `Restart fitness helper`,
      `First-week habit plan`,
    ],
    real_estate: [
      `Budget-to-area shortlist`,
      `Before you book a site visit`,
      `${focus} availability check`,
      `Area proof for serious buyers`,
      `Verified listing explainer`,
      `Commute and landmark check`,
      `Buyer-fit property card`,
      `Visit-worthy option filter`,
      `Rent or buy decision helper`,
      `Current availability post`,
    ],
    law_firm: [
      `Document check first step`,
      `Legal doubt in plain English`,
      `What to send before consultation`,
      `The mistake to avoid`,
      `Fee fear clarity card`,
      `Contract risk explainer`,
      `Founder document checklist`,
      `Timeline and next-step post`,
      `Plain-English consultation path`,
      `Issue type sorting guide`,
    ],
    agency: [
      `One page audit, one business problem`,
      `Pretty post versus strategy post`,
      `Content that should create enquiries`,
      `Offer clarity before creative`,
      `Weak page teardown`,
      `Customer problem to content map`,
      `Audit insight with next move`,
      `Lead-quality proof post`,
      `Campaign thinking breakdown`,
      `Founder-level strategy note`,
    ],
    retail: [
      `${focus} real photo and preview`,
      `Before you confirm the order`,
      `Price, size, and delivery proof`,
      `The no-surprise product post`,
      `Custom order preview path`,
      `Gift-budget decision card`,
      `Real stock availability post`,
      `Student-friendly product proof`,
      `Quality check before checkout`,
      `Delivery and pickup clarity`,
    ],
    local: [
      `${focus} proof before action`,
      `Answer the customer doubt`,
      `Price, proof, and next step`,
      `The first-message helper`,
      `Timing clarity post`,
      `Real result proof card`,
      `Comparison confidence post`,
      `Saved reply trigger`,
      `Buyer-fit explainer`,
      `Follow-up proof post`,
    ],
  };
  const title = naturalDayTitleForKind(context, kind, index, { focus, objection, persona });
  let caption = customerCaptionForKind(context, index, { focus, objection, proof, persona });
  const titleLead = lower(title).replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean).slice(0, 5).join(" ");
  const captionLead = lower(caption).replace(/[^a-z0-9]+/g, " ").split(" ").filter(Boolean).slice(0, 5).join(" ");
  if (titleLead && captionLead && (captionLead === titleLead || captionLead.startsWith(titleLead) || titleLead.startsWith(captionLead))) {
    caption = customerCaptionForKind(context, index + 9, { focus, objection, proof, persona });
  }
  const visualOpeners = {
    software: [`Show the messy workflow screen first.`, `Then show the cleaner ${context.businessName} screen.`, `End with the demo or early-access step.`],
    food: [`Open with the real ${focus} or menu item.`, `Show price, portion, timing, or parcel detail.`, `End with the exact message keyword.`],
    salon: [`Open with the result or consultation question.`, `Show price range, time needed, or recent proof.`, `End with the slot-check message.`],
    clinic: [`Open with the patient worry in plain words.`, `Show the first step, timing, or consultation path.`, `End with the safe booking action.`],
    gym: [`Open with the beginner worry.`, `Show trainer guidance, timing, or first routine.`, `End with the trial message.`],
    real_estate: [`Open with budget and area.`, `Show one matched property detail or area proof.`, `End with shortlist or site-visit step.`],
    law_firm: [`Open with the document or issue type.`, `Show what to check first in plain words.`, `End with consultation next step.`],
    agency: [`Open with a weak post or page problem.`, `Show the business reason behind the fix.`, `End with the audit CTA.`],
    retail: [`Open with the real product photo or preview.`, `Show size, price, option, or delivery detail.`, `End with the product message CTA.`],
    local: [`Open with the customer doubt.`, `Show ${proof}.`, `End with ${cta}.`],
  };
  const shots = visualOpeners[kind] || visualOpeners.local;
  return {
    title,
    hook: title,
    caption,
    visual_direction: sanitizeGeneratedText(`${context.businessName}: show ${proof} connected to ${focus}.`, context),
    shot_list: shots.map(step => sanitizeGeneratedText(step, context)),
    script: sanitizeGeneratedText(`${context.businessName} should answer "${doubt || `Need ${focus}?`}" with ${proof}, the first step, and this exact action: ${cta}`, context),
    how_to_create: [
      sanitizeGeneratedText(`Use ${proof} as the proof point for ${focus}.`, context),
      sanitizeGeneratedText(`Write the first line around this doubt: ${doubt || objection?.objection || `Can I trust this?`}.`, context),
      sanitizeGeneratedText(`Close with: ${cta}`, context),
    ],
    customer_action: cta,
    why_this_works: sanitizeGeneratedText(`For ${context.businessName}, ${clean(psych?.use_it_by, `this reduces doubt and gives ${context.audience} a clear action.`)}`, context),
    offer_used: businessFacingFocus(context, clean(offer?.offer, focus), index),
    objective: sanitizeGeneratedText(clean(pillar?.purpose, `Make ${focus} easier to understand and act on.`), context),
  };
}

function messageTemplateForContext(context, index, { objection, persona, focus }) {
  const kind = businessKind(context);
  const customer = clean(persona?.name, "customer");
  const concern = compactText(objection?.objection, "", 80).replace(/[.!?]+$/g, "");
  const moment = businessMoment(context, kind);
  const offer = businessFacingFocus(context, focus || leadOffer(context), index);
  const override = visibleMessageOverride(context, kind, index, offer);
  if (override) {
    return {
      type: `${customer} reply`,
      channel: context.platforms.includes("WhatsApp") ? "WhatsApp" : "DM",
      template: override,
      why_suggested: sanitizeGeneratedText(`${context.businessName} uses this to handle "${concern || "the buyer doubt"}" with a clear action for ${focus}.`, context),
    };
  }
  const templates = {
    software: [
      `${moment} demo? Tell us the task you still handle manually, and we will show the ${context.businessName} screen path for that exact job.`,
      `For ${offer}, send the team role and what slows them down. We will reply with the setup step before asking you to try anything.`,
      `If another tool feels risky, describe your current process in one line. We will show what changes in week one and what stays familiar.`,
      `${moment} demo prep: share the task name and who owns it today. We will map the before-after workflow for ${context.businessName}.`,
      `One messy screenshot is enough. Send it or describe the workflow, and we will show whether ${offer} can simplify that step.`,
      `Message DEMO with the workflow you care about. We will avoid feature dumping and show only the relevant path.`,
      `${moment} fastest test: send the repeated task, current tool, and team size. We will reply with the cleanest first use case.`,
      `Not ready to switch? Ask for a week-one walkthrough and compare it with how your team works today.`,
    ],
    food: [
      `${moment} order? Tell us headcount, budget, and parcel or dine-in. We will suggest one ${offer} option with price and ready time.`,
      `For ${offer}, message the item name and pickup time. We will confirm availability, price, and the easiest order step.`,
      `${moment} menu too long? Send your taste preference and we will recommend one safe pick instead of making you scroll.`,
      `Before the group gets confused, share the number of people and budget range. We will reply with the simplest order path.`,
      `${moment} fast order? Message QUICK with parcel or dine-in. We will tell you what is available fastest today.`,
      `${moment} first timer? Ask for FIRST PICK and we will send one popular option, price, and wait time.`,
      `${moment} quick filter: share hunger level, budget, and pickup time. We will suggest the order that fits.`,
      `${moment} unsure? Message TODAY'S PICK and we will reply with price, timing, and whether ${offer} is ready now.`,
      `${moment} group order? Send the time and number of people. We will recommend the cleanest parcel or dine-in option.`,
      `Message FOOD FAST with parcel or dine-in, budget, and pickup time. We will reply with one order that makes sense today.`,
      `Tell us spice level, group size, and how soon you need it. We will choose the simplest ${offer} option from the current menu.`,
      `Planning for friends? Send headcount and max spend. We will suggest the order that avoids both waste and confusion.`,
      `Ask what is ready right now before choosing. We will send one fresh option, price, and exact collection time.`,
      `Need parcel? Share time, budget, and appetite level. We will recommend one order instead of sending the whole menu again.`,
    ],
    salon: [
      `${moment} slot? Send the service name, date, and concern. We will share starting price, time needed, and availability.`,
      `For ${offer}, share a reference photo if you have one. We will explain what is realistic, timing, and the next slot.`,
      `If the final result feels unclear, message the event date first. We will guide service choice and timing clearly.`,
      `Before booking, send date, budget comfort, and service idea. We will suggest the right ${offer} option with realistic timing.`,
      `${moment} plan starts with the look you want and when you need it. We will say what can be done, what it may cost, and which slot fits.`,
      `Message SLOT CHECK with service and preferred time. We will confirm availability before you plan the visit.`,
      `The quick consultation: send hair or skin concern, date, and occasion. We will reply with the safest booking path.`,
      `Not sure which service fits? Tell us the result you want and your timing. We will recommend the first slot to consider.`,
    ],
    clinic: [
      `${moment} concern? Send the problem and preferred time. We will explain the first step, timing, and what details to bring.`,
      `For ${offer}, message APPOINTMENT if you are worried. We will share what happens first and how to book safely.`,
      `If the symptom is confusing, write it in simple words. We will reply with the right first step and consultation timing.`,
      `Before booking, send concern and age group. We will say whether consultation is needed and what timing is available.`,
      `Share how long the problem has been there and your preferred visit time. We will suggest the right appointment timing.`,
      `Ask what happens before ${offer}. We will explain the check, timing, and what information to bring.`,
      `${moment} calm route starts with symptom, timeline, and availability. We will reply with the appointment step that makes sense.`,
      `Not sure if this needs a visit? Message the concern first and ask what timing is available.`,
    ],
    gym: [
      `${moment} trial? Send your preferred time. We will share what to bring, who guides you, and the starter routine.`,
      `For ${offer}, tell us your goal and comfort level. We will suggest the safest first session before membership talk.`,
      `If you do not know where to start, message BEGINNER. We will share the first-week plan and trainer support.`,
      `${moment} first visit? Reply with goal and available time. We will tell you the routine and who will guide you.`,
      `Share your fitness goal and whether you are a beginner. We will suggest the trial path before any membership decision.`,
      `Message FORM CHECK if injury or embarrassment is the worry. We will explain the guided first session and timing.`,
      `${moment} easy entry starts with available time and current fitness level. We will reply with the least awkward first step.`,
      `Not ready for a full plan? Ask for one trial session and the three moves you will do on day one.`,
    ],
    real_estate: [
      `${moment} request? Send budget, area, property type, and timeline. We will match options before suggesting any site visit.`,
      `For ${offer}, share budget plus area first. We will send only available properties that fit, with one reason each matches.`,
      `If you are buying or renting, tell us family size and location preference. We will shortlist options and share the visit step.`,
      `${moment} before travelling? Message SHORTLIST with budget, area, and must-have. We will filter options first.`,
      `Share preferred location and max budget. We will reply with available matches and what to verify first.`,
      `Message property type, move-in timeline, and area. We will send only relevant options with visit timing.`,
      `${moment} serious-buyer filter starts with budget, landmark preference, and timeline. We will remove the random listings.`,
      `Not ready for visits? Ask for three matched options and why each one fits before booking a slot.`,
    ],
    law_firm: [
      `${moment} question? Send issue type, document name, and deadline. We will tell you the safest first step before consultation.`,
      `For ${offer}, share the document type first. We will reply with what to check and when consultation is needed.`,
      `If the legal problem feels messy, message it in normal words. We will tell you what details matter and what to keep ready.`,
      `${moment} consultation prep: message ISSUE plus document type. We will reply with what to prepare first.`,
      `Share timeline, parties involved, and document name. We will say whether this needs consultation or document check first.`,
      `Message the legal question in one paragraph. We will list missing details and the first risk to check.`,
      `${moment} facts first: send what happened, when it happened, and which document exists. We will sort the consultation path.`,
      `Not sure whether to call a lawyer? Ask which document matters and what risk to check first.`,
    ],
    agency: [
      `${moment} audit? Send page, current goal, and offer. We will reply with one business problem and one content move to fix first.`,
      `For ${offer}, share the last three posts if enquiries are weak. We will point out the pattern and sharper next action.`,
      `${moment} profile audit starts with website or page plus budget range. We will name the first strategic issue.`,
      `${moment} creative prep: message AUDIT with page and sales goal. We will reply with the first weak point and next angle.`,
      `Share offer, audience, and current channel. We will tell you whether the issue is message, proof, or follow-up.`,
      `Message one campaign that disappointed you. We will explain what likely broke before suggesting new creative.`,
      `${moment} useful brief: send target buyer, offer, and current CTA. We will turn it into one sharper content direction.`,
      `Not sure what to post? Ask which business problem the next post should solve before asking for design ideas.`,
    ],
    retail: [
      `${moment} preview? Send product name and preferred option. We will share real photos, price, availability, and delivery detail.`,
      `For ${offer}, send the idea, needed date, and budget range. We will reply with preview step, price range, and confirmation process.`,
      `If you are buying a gift, message the occasion and budget. We will suggest options, show real photos, and confirm availability.`,
      `Message PREVIEW with the product idea. We will show photo, price, and what can be customised before you pay.`,
      `Share size, colour, or theme. We will check stock and show the real option before you confirm.`,
      `Message the occasion and delivery date. We will suggest a safe gift option with price and availability.`,
      `${moment} stock reply starts with product type and pickup or delivery need. We will reply with what is actually available.`,
      `Not sure what fits the person? Share age, occasion, and budget. We will suggest one safe option first.`,
    ],
    local: [
      `${moment} request? Send the service name, preferred time, and one question. We will reply with price clarity and the next step.`,
      `For ${offer}, share the result you want first. We will send proof and the simplest first action before you decide.`,
      `If the choice feels unclear, ask for price, timing, and proof in one message. We will make the decision easier.`,
    ],
  };
  const list = templates[kind] || templates.local;
  const selected = sanitizeGeneratedText(pickSeeded(list, context, `message:${kind}:${moment}`, index), context);
  return {
    type: `${customer} reply`,
    channel: context.platforms.includes("WhatsApp") ? "WhatsApp" : "DM",
    template: selected,
    why_suggested: sanitizeGeneratedText(`${context.businessName} uses this to handle "${concern || "the buyer doubt"}" with a clear action for ${focus}.`, context),
  };
}

const DIVERSE_ACTION_STARTERS = [
  "Compare",
  "Reveal",
  "Walk through",
  "Document",
  "Test",
  "Debunk",
  "Demonstrate",
  "Map",
  "Challenge",
  "Answer",
  "Highlight",
  "Break down",
  "Publish",
  "Collect",
  "Follow up",
  "Explain",
  "Sort",
  "Package",
  "Verify",
  "Turn",
  "Guide",
  "Design",
  "Prepare",
  "Frame",
  "Calm",
  "Fix",
  "Introduce",
  "Position",
  "Film",
  "Show",
  "Record",
  "Ask",
  "Build",
  "Teach",
  "Review",
  "Clarify",
];

const MESSAGE_ACTION_STARTERS = [
  "For a quick check, send",
  "Before you decide, share",
  "Need it soon? Send",
  "To compare properly, write",
  "Before booking, confirm",
  "When you message, describe",
  "To avoid the wrong fit, send",
  "So we do not guess, share",
  "Ready to choose? Confirm",
  "Need the faster option? Send",
  "To get a useful answer, describe",
  "Before a call, write",
  "To keep the reply useful, share",
  "Before choosing, ask",
  "If you want clarity, send",
  "Tell us what you want solved and",
  "Describe the result you want and",
  "To check fit, send",
  "If the choice feels unclear, ask",
  "Before you lock it in, confirm",
];

function titleCaseStarter(starter) {
  const text = clean(starter);
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Show";
}

function lowerFirst(value) {
  const text = clean(value);
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function removeRepeatedWords(value) {
  return clean(value).replace(/\b([a-z]+)\s+\1\b/ig, "$1");
}

function stripLeadingAction(value) {
  return clean(value)
    .replace(STRONG_ACTION_VERB_PATTERN, "")
    .replace(/^[:\-\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function starterForIndex(context, salt, index, offset = 0) {
  return DIVERSE_ACTION_STARTERS[
    seededIndex(context, `diverse-starter:${salt}:${offset}`, index, DIVERSE_ACTION_STARTERS.length)
  ];
}

function sequentialStarterForIndex(index, offset = 0) {
  const safeIndex = ((index + offset) % DIVERSE_ACTION_STARTERS.length + DIVERSE_ACTION_STARTERS.length) % DIVERSE_ACTION_STARTERS.length;
  return DIVERSE_ACTION_STARTERS[safeIndex];
}

function messageStarterForIndex(context, salt, index, offset = 0) {
  const kind = businessKind(context);
  const focus = businessFacingFocus(context, offerFocus(context, index + offset), index + offset);
  const city = shortLocation(context, kind);
  const localHint = city ? ` in ${city}` : "";
  const lists = {
    software: [
      `Testing ${focus}? Describe`,
      `${focus} workflow stuck? Send`,
      `${focus} trial question? Share`,
      `${focus} demo prep starts with`,
      `${focus} setup feels risky? Describe`,
      `Need ${focus} cleaner? Share`,
    ],
    food: [
      `Ordering ${focus}? Send`,
      `${focus} craving now? Share`,
      `Planning ${focus} for a group? Send`,
      `Need ${focus} parcel${localHint}? Share`,
      `Choosing ${focus} from the menu? Send`,
      `Want ${focus} fastest? Share`,
    ],
    salon: [
      `Planning ${focus}? Send`,
      `${focus} reference ready? Share`,
      `${focus} for an event? Send`,
      `Checking ${focus} slot${localHint}? Share`,
      `Choosing ${focus} at ${context.businessName}? Send`,
      `Planning ${context.businessName} ${focus}? Share`,
    ],
    clinic: [
      `Need help with ${focus}? Send`,
      `${focus} first visit? Share`,
      `${focus} worry? Describe`,
      `Booking ${focus}? Send`,
      `${focus} first step? Share`,
      `Checking ${focus} timing${localHint}? Send`,
    ],
    gym: [
      `Starting ${focus}? Tell us`,
      `${focus} trial first? Share`,
      `${focus} beginner support? Send`,
      `Planning ${focus} session? Share`,
      `${focus} trainer guidance? Send`,
      `Restarting ${focus}${localHint}? Tell us`,
    ],
    real_estate: [
      `Searching for ${focus}? Share`,
      `Planning ${focus} site visit? Send`,
      `Need ${focus} shortlist${localHint}? Share`,
      `Checking ${focus} fit? Send`,
      `Filtering ${focus} options? Share`,
      `Comparing ${focus} areas? Send`,
    ],
    law_firm: [
      `Need clarity on ${focus}? Send`,
      `${focus} deadline? Share`,
      `Checking ${focus} document? Send`,
      `${focus} consultation prep? Share`,
      `Sorting ${focus} issue? Send`,
      `${focus} first risk? Share`,
    ],
    agency: [
      `Need an audit for ${focus}? Share`,
      `Fixing ${focus} enquiries? Send`,
      `Checking ${focus} offer? Share`,
      `Planning ${focus} campaign? Send`,
      `${focus} content direction? Share`,
      `Reviewing ${focus} page? Send`,
    ],
    retail: [
      `Choosing ${focus}? Send`,
      `${focus} needed by a date? Share`,
      `Want ${focus} preview? Send`,
      `Checking ${focus} stock${localHint}? Share`,
      `Buying ${focus} for someone? Send`,
      `Looking for safe ${focus}? Share`,
    ],
    local: [
      `Need ${focus}? Send`,
      `Checking ${focus} availability? Share`,
      `Want the right ${focus}? Send`,
      `Planning ${focus} today? Share`,
      `Need ${focus} clarity? Send`,
      `Choosing ${focus} service? Share`,
    ],
  };
  const list = lists[kind] || lists.local;
  return list[seededIndex(context, `message-starter:${salt}:${offset}`, index, list.length)];
}

function freshTitleDetailForIndex(context, index) {
  const kind = businessKind(context);
  const details = {
    software: ["with the first screen visible", "through a before-after workflow", "with the setup question answered", "around one buyer task", "with the week-one result shown"],
    food: ["with price and ready time visible", "through a real counter handoff", "with portion proof on screen", "around one buyer situation", "with the order message shown"],
    salon: ["with reference and timing visible", "through the consultation step", "with starting price clarity", "around the slot-check reply", "with realistic result proof"],
    gym: ["with trainer guidance visible", "through the first routine", "with the trial step shown", "around beginner comfort", "with the form check included"],
    clinic: ["with the first check explained", "through the appointment path", "with what-to-bring clarity", "around patient comfort", "with the safe booking step"],
    real_estate: ["with budget and area visible", "through the shortlist filter", "with availability checked", "around the visit reason", "with landmark detail included"],
    law_firm: ["with the document checklist visible", "through the first risk sort", "with deadline context", "around consultation prep", "with plain-English next step"],
    agency: ["with the sales blocker marked", "through one page screenshot", "with the proof gap shown", "around a buyer doubt", "with the next revenue move"],
    retail: ["with real-photo proof", "through preview before checkout", "with stock and price visible", "around occasion and budget", "with delivery detail shown"],
    local: ["with proof before the CTA", "through a real customer question", "with timing and next step visible", "around one buyer doubt", "with the reply path shown"],
  };
  const list = details[kind] || details.local;
  return list[index % list.length];
}

function compactDecisionDetail(context, day, index) {
  const focus = businessFacingFocus(context, day?.offer_used || offerFocus(context, index), index);
  const doubt = titleDoubtLabel(day?.customer_objection || "", "buyer doubt").toLowerCase();
  const proof = compactProofPhrase(day?.visual_direction || day?.marketing_psychology || day?.why_this_works, "proof detail", 5);
  const action = actionNounForKind(businessKind(context));
  const audience = compactPhrase(audienceCue(context), "buyers", 4).toLowerCase();
  const timing = compactPhrase(day?.when_to_do_this || "today", "today", 5);
  return { focus, doubt, proof, action, audience, timing };
}

function calendarTitleCandidate(context, day, index, attempt = 0) {
  const kind = businessKind(context);
  const { focus } = compactDecisionDetail(context, day, index + attempt);
  const objection = { objection: day?.customer_objection || day?.customer_doubt_solved || day?.why_this_works || "" };
  const persona = { name: audienceCue(context) };
  const title = naturalDayTitleForKind(context, kind, index + attempt, { focus, objection, persona });
  return sanitizeGeneratedText(removeRepeatedWords(title), context);
}

function calendarExactIdeaCandidate(context, day, index, title) {
  const { focus, doubt, proof, action } = compactDecisionDetail(context, day, index);
  const starter = titleStarter(title) || lower(starterForIndex(context, "calendar-idea", index));
  const cta = trimEndPunctuation(day?.customer_action || day?.cta || industryCta(context, businessKind(context), index));
  const format = clean(day?.post_type || day?.postType || day?.content_format || "content");
  const platform = clean(day?.platform || context.platforms?.[index % Math.max(1, context.platforms.length)] || "main channel");
  const rest = `${focus} as a ${format} on ${platform}. Use ${proof}, answer "${doubt}", and close with "${cta}" so the next ${action} is clear`;
  return sanitizeGeneratedText(`${titleCaseStarter(starter)} ${lowerFirst(rest)}.`, context);
}

function needsSafeTitleRewrite(text) {
  const source = clean(text);
  return /\b(Build|Fix|Record|Introduce)\s+(clarify|bundle|show|turn|record|make)\b/i.test(source)
    || /\b(the gift feel safe|gift feel safe)\b/i.test(source)
    || /\b(Ask|Teach|Sort|Follow up|Challenge|Map|Answer)\s+(close-up quality|real photo|the gift feels safe|custom gift preview|gift preview)\b/i.test(source)
    || /\bPrepare last-minute gifting into\b/i.test(source);
}

function ensureFreshStem(candidate, used, context, salt, index, maker) {
  let text = clean(candidate);
  let stem = sentenceStem(text);
  for (let attempt = 1; attempt < DIVERSE_ACTION_STARTERS.length && used.has(stem); attempt += 1) {
    text = maker(attempt);
    stem = sentenceStem(text);
  }
  if (used.has(stem)) {
    const starter = starterForIndex(context, salt, index, 11);
    let base;
    if (needsSafeTitleRewrite(text)) {
      base = rewriteDominantOpening(text, context, starter);
    } else {
      let rest = lowerFirst(stripLeadingAction(text) || text);
      if (!/^turn$/i.test(starter)) {
        rest = rest.replace(/\s+into\s+/i, " as ");
      }
      base = `${starter} ${rest}`;
    }
    text = sanitizeGeneratedText(joinTitleDetail(base, freshTitleDetailForIndex(context, index)), context);
    stem = sentenceStem(text);
  }
  used.add(stem);
  return text;
}

function diversifyCalendarEntries(calendar, context) {
  const usedTitleStems = new Set();
  return asArray(calendar).map((item, index) => {
    const next = { ...(item || {}) };
    const title = ensureFreshStem(
      calendarTitleCandidate(context, next, index),
      usedTitleStems,
      context,
      "calendar-title",
      index,
      attempt => calendarTitleCandidate(context, next, index, attempt),
    );
    const exactIdea = calendarExactIdeaCandidate(context, next, index, title);
    next.title = title;
    next.topic = title;
    next.hook = title;
    next.exact_content_idea = exactIdea;
    next.how_to_create = [
      exactIdea,
      ...asArray(next.how_to_create).filter(step => clean(step) !== clean(item?.exact_content_idea)).slice(0, 3),
    ];
    return next;
  });
}

function stripMessageStarter(value) {
  return clean(value)
    .replace(/^(reply with|ask about|ask for|tell us|send us|message us|dm us|share with us|send|message|ask|share|describe|write|confirm|check|book|request|choose|pick|list|attach|mention|bring|forward)\b\s*/i, "")
    .replace(/^(?:[A-Z][A-Z0-9'-]{2,})(?:\s+[A-Z][A-Z0-9'-]{2,})?\s+(with|if|and|for)\s+/g, "")
    .replace(/^[:\-\s]+/g, "")
    .trim();
}

function messageWithFreshOpening(text, context, salt, index) {
  let starter = messageStarterForIndex(context, salt, index);
  if (/^to avoid the wrong fit, send$/i.test(starter)) {
    starter = `To avoid the wrong fit for ${businessFacingFocus(context, offerFocus(context, index), index)}, send`;
  }
  let rest = stripMessageStarter(text) || text;
  rest = rest
    .replace(/^us\s+/i, "")
    .replace(/^with us\s+/i, "")
    .replace(/^you are\b/i, "that you are")
    .replace(/^everyone is\b/i, "whether everyone is")
    .replace(/^that you are worried\b/i, "what you are worried about")
    .replace(/^the\s+/i, "")
    .replace(/^whether this needs\b/i, "the concern and ask whether this needs")
    .trim();
  if (businessKind(context) === "law_firm" && contextVariant(context, businessKind(context)) === "property_law" && /\bdocument type\b/i.test(rest)) {
    starter = "Property document check? Send";
  }
  if (/^[A-Z][^.!?]{12,}[.!?]\s+[A-Z]/.test(rest)) {
    return sanitizeGeneratedText(removeRepeatedWords(rest), context);
  }
  const line = `${starter} ${rest}`
    .replace(/^If ([^,]+) feels unclear,\s*/i, (_match, item) => `For ${item}, share `)
    .replace(/^About [^,]+,\s*share property paper type\b/i, "For property documents, share the document type")
    .replace(/^For [^,]+,\s*share property paper type\b/i, "For property documents, share the document type")
    .replace(/^With [^,]+,\s*share property paper type\b/i, "For property documents, share the document type")
    .replace(/^[^?]{3,80}\?\s+(Send|Share)\s+property paper type\b/i, "Property document check? Send the document type")
    .replace(/\bproperty paper type\b/ig, "document type");
  return sanitizeGeneratedText(removeRepeatedWords(line), context);
}

function copyWithFreshOpening(text, context, salt, index) {
  const starter = starterForIndex(context, salt, index);
  const rest = stripLeadingAction(text) || text;
  if (/^(send|share|message|ask|reply|book|demo|trial|visit|slot|budget|appointment|photo|menu|order|shortlist|consultation|tell|describe|write|confirm|check)\b/i.test(text)) {
    return sanitizeGeneratedText(removeRepeatedWords(text), context);
  }
  return sanitizeGeneratedText(removeRepeatedWords(`${starter} ${lowerFirst(rest)}`), context);
}

function diversifyTextOpenings(values, context, salt) {
  const used = new Set();
  return asArray(values).map((value, index) => ensureFreshStem(
    sanitizeGeneratedText(removeRepeatedWords(value), context),
    used,
    context,
    salt,
    index,
    attempt => copyWithFreshOpening(value, context, `${salt}:${attempt}`, index + attempt),
  ));
}

function diversifyMessageTemplates(messages, context) {
  const used = new Set();
  return asArray(messages).map((item, index) => {
    const next = { ...(item || {}) };
    next.template = ensureFreshStem(
      messageWithFreshOpening(next.template || next.message, context, "message", index),
      used,
      context,
      "message",
      index,
      attempt => messageWithFreshOpening(next.template || next.message, context, `message:${attempt}`, index + attempt),
    );
    return next;
  });
}

function contextSignalTokens(context) {
  const values = unique([
    context.businessName,
    context.productsOrServices,
    context.audience,
    context.city,
    context.location,
    context.businessType,
    ...asArray(context.platforms),
    ...offerKeywords(context, 12),
    ...wordsForVertical(context, { industryPack: {} }),
  ].filter(Boolean));
  return unique(values.flatMap(value => [
    value,
    ...clean(value).split(/[^a-z0-9]+/i).filter(word => word.length >= 4),
  ])).map(token => lower(token)).filter(Boolean);
}

function hasContextSignal(text, context) {
  const source = lower(text);
  if (!source) return false;
  return contextSignalTokens(context).some(token => source.includes(token));
}

function anchorSpecificText(text, context, index) {
  const source = sanitizeGeneratedText(removeRepeatedWords(text), context);
  if (!source || hasContextSignal(source, context)) return source;
  if (STRONG_ACTION_VERB_PATTERN.test(source) && source.split(/\s+/).length >= 6) return source;
  const focus = businessFacingFocus(context, offerFocus(context, index), index);
  if (/^(how|what|when|where|why|will|can|do|does|is|are)\b/i.test(source)) {
    return sanitizeGeneratedText(`For ${lowerFirst(focus)}, ${lowerFirst(trimEndPunctuation(source))}?`, context);
  }
  if (/\bbefore (booking|choosing|ordering|trying|buying)\b/i.test(source)) {
    return sanitizeGeneratedText(`${trimEndPunctuation(source)} ${lowerFirst(focus)}.`, context);
  }
  if (/\bbefore paying\b/i.test(source)) {
    return sanitizeGeneratedText(`${trimEndPunctuation(source)} for ${lowerFirst(focus)}.`, context);
  }
  return sanitizeGeneratedText(`${trimEndPunctuation(source)} for ${lowerFirst(focus)}.`, context);
}

function anchorSpecificList(items, fields, context, salt = 0) {
  return asArray(items).map((item, index) => {
    const next = { ...(item || {}) };
    fields.forEach(field => {
      if (clean(next[field])) next[field] = anchorSpecificText(next[field], context, index + salt);
    });
    return next;
  });
}

function anchorSpecificMaster(master, context) {
  return {
    ...master,
    marketing_priorities: anchorSpecificList(master.marketing_priorities, ["priority", "why", "expected_result"], context, 0).map((item, index) => ({
      ...item,
      how: asArray(item.how).map(step => anchorSpecificText(step, context, index)),
    })),
    content_pillars: anchorSpecificList(master.content_pillars, ["pillar", "purpose", "proof_needed"], context, 3),
    growth_strategy_10_steps: anchorSpecificList(master.growth_strategy_10_steps, ["title", "exact_action", "why_it_matters", "customer_doubt_solved", "expected_result"], context, 5).map((item, index) => ({
      ...item,
      how_to_execute: asArray(item.how_to_execute).map(step => anchorSpecificText(step, context, index + 5)),
    })),
    customer_pain_points_15: anchorSpecificList(master.customer_pain_points_15, ["problem", "your_solution", "exact_action", "text_to_use", "content_idea", "customer_doubt_solved", "expected_result"], context, 8),
    growth_ideas_20: anchorSpecificList(master.growth_ideas_20, ["title", "exact_action", "why", "why_it_matters", "customer_doubt_solved", "expected_result"], context, 11).map((item, index) => ({
      ...item,
      steps: asArray(item.steps).map(step => anchorSpecificText(step, context, index + 11)),
      how_to_execute: asArray(item.how_to_execute).map(step => anchorSpecificText(step, context, index + 11)),
    })),
    content_calendar_30_days: anchorSpecificList(master.content_calendar_30_days, ["title", "hook", "objective", "exact_content_idea", "caption", "why_this_works", "expected_result"], context, 17),
    captions: asArray(master.captions).map((caption, index) => anchorSpecificText(caption, context, index + 23)),
    message_templates: asArray(master.message_templates).map((item, index) => ({
      ...(item || {}),
      template: anchorSpecificText(item?.template || item?.message, context, index + 29),
      why_suggested: anchorSpecificText(item?.why_suggested, context, index + 29),
    })),
  };
}

function dominantOpeningEntries(master) {
  const entries = [];
  const add = (owner, key) => {
    const text = clean(owner?.[key]);
    const starter = titleStarter(text);
    if (starter) entries.push({ owner, key, text, starter });
  };
  const addFields = (items, fields) => {
    asArray(items).forEach(item => fields.forEach(field => add(item, field)));
  };
  addFields(master?.marketing_priorities, ["priority", "title"]);
  addFields(master?.content_pillars, ["pillar", "title"]);
  addFields(master?.growth_strategy_10_steps, ["title", "exact_action"]);
  addFields(master?.growth_ideas_20, ["title", "exact_action"]);
  addFields(master?.content_calendar_30_days, ["title", "exact_content_idea"]);
  addFields(master?.customer_pain_points_15, ["problem", "customer_problem", "content_idea", "exact_action"]);
  addFields(master?.advanced_growth_plan?.moves, ["title", "exact_action"]);
  return entries;
}

function starterWithRoom(counts, avoid = "") {
  for (const starter of DIVERSE_ACTION_STARTERS) {
    const key = titleStarter(starter);
    if (key && key !== avoid && (counts.get(key) || 0) < 6) return starter;
  }
  return DIVERSE_ACTION_STARTERS.find(starter => titleStarter(starter) !== avoid) || "Explain";
}

function titleRestWithoutStackedAction(value) {
  return clean(value)
    .replace(/^(bundle|clarify|localize|qualify|introduce|position|fix|build|record|show|make|turn)\b\s*/i, "")
    .replace(/^[:\-\s]+/g, "")
    .trim();
}

function rewriteDominantOpening(text, context, starter) {
  let rest = stripLeadingAction(text) || text;
  const unstackedRest = titleRestWithoutStackedAction(rest);
  if (unstackedRest) rest = unstackedRest;
  const lowerRest = lower(rest);
  if (/^the\s+[^.!?]{2,60}\s+feels?\b/.test(lowerRest)) {
    rest = rest.replace(/^the\s+(.+?)\s+feels?\b/i, "why the $1 feels");
    return sanitizeGeneratedText(removeRepeatedWords(`Prove ${lowerFirst(rest)}`), context);
  }
  if (/^last-minute\b/i.test(rest)) {
    return sanitizeGeneratedText(removeRepeatedWords(`Frame ${lowerFirst(rest.replace(/\s+into\s+/i, " as "))}`), context);
  }
  if (/^(real photo|close-up|custom gift|gift preview|preview|stock|price|delivery|packing|pickup|product|gift|outfit|size|quality)\b/i.test(rest)) {
    const visualStarter = /^(compare|reveal|walk through|document|demonstrate|highlight|show|film|package|verify|frame)$/i.test(starter) ? starter : "Show";
    return sanitizeGeneratedText(removeRepeatedWords(`${visualStarter} ${lowerFirst(rest)}`), context);
  }
  if (/^(gift customisation|customisation|occasion|budget|last-minute|student gift|college|friendship)\b/i.test(rest)) {
    const clearStarter = /^(explain|clarify|walk through|guide|show|demonstrate)$/i.test(starter) ? starter : "Explain";
    return sanitizeGeneratedText(removeRepeatedWords(`${clearStarter} ${lowerFirst(rest)}`), context);
  }
  if (/\s+into\s+/i.test(rest) && !/^turn$/i.test(starter)) {
    rest = rest.replace(/\s+into\s+/i, " as ");
    return sanitizeGeneratedText(removeRepeatedWords(`Reframe ${lowerFirst(rest)}`), context);
  }
  if (/^(test|debunk)$/i.test(starter) && /\b(proof|calm|patient|trust|support|guidance)\b/i.test(rest)) {
    return sanitizeGeneratedText(removeRepeatedWords(`Spotlight ${lowerFirst(rest)}`), context);
  }
  const cleaned = removeRepeatedWords(`${starter} ${lowerFirst(rest)}`);
  return sanitizeGeneratedText(cleaned, context);
}

function balanceDominantActionOpeners(master, context) {
  const next = { ...master };
  for (let pass = 0; pass < 12; pass += 1) {
    const entries = dominantOpeningEntries(next);
    const counts = new Map();
    entries.forEach(entry => counts.set(entry.starter, (counts.get(entry.starter) || 0) + 1));
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!dominant || dominant[1] <= 7) break;
    let kept = 0;
    entries.forEach((entry, index) => {
      if (entry.starter !== dominant[0]) return;
      kept += 1;
      if (kept <= 7) return;
      const starter = starterWithRoom(counts, dominant[0]);
      counts.set(dominant[0], Math.max(0, (counts.get(dominant[0]) || 0) - 1));
      counts.set(titleStarter(starter), (counts.get(titleStarter(starter)) || 0) + 1);
      entry.owner[entry.key] = rewriteDominantOpening(entry.text, context, starter);
    });
  }
  return next;
}

function diversifyExpandedMaster(master, context) {
  const next = { ...master };
  next.content_calendar_30_days = diversifyCalendarEntries(next.content_calendar_30_days, context);
  next.captions = diversifyTextOpenings(next.captions, context, "caption");
  next.message_templates = diversifyMessageTemplates(next.message_templates, context);
  return balanceDominantActionOpeners(anchorSpecificMaster(next, context), context);
}

function consultantTitleForKind(context, kind, index, { focus, persona }) {
  const offer = businessFacingFocus(context, focus || leadOffer(context), index);
  const audience = compactPhrase(audienceCue(context), "buyer", 3).toLowerCase();
  const moment = businessMoment(context, kind);
  const action = actionNounForKind(kind);
  const detail = titleFlavorForKind(context, kind, index).replace(/[.!?]+$/g, "");
  const visibleTitle = visibleTitleOverride(context, kind, index, offer);
  if (visibleTitle) return sanitizeGeneratedText(visibleTitle, context);
  const frames = {
    software: [
      `Compare the current ${moment} with the cleaner ${context.businessName} workflow`,
      `Walk through the first useful ${offer} screen for ${audience}`,
      `Reveal the setup step that makes ${offer} feel safe to try`,
      `Break down the manual task ${context.businessName} should replace first`,
      `Answer the demo question buyers ask before trying ${offer}`,
      `Guide ${audience} from messy process to week-one result`,
      `Document the support path after someone asks for ${offer}`,
      `Map one team role to one ${context.businessName} use case`,
      `Challenge the feature-list habit with one real workflow`,
      `Introduce the smallest safe trial path for ${offer}`,
    ],
    food: [
      `Invite ${audience} into a real ${moment} decision`,
      `Compare the full menu with one safer ${offer} recommendation`,
      `Reveal the price, portion, and ready-time behind ${offer}`,
      `Walk through a group order before the WhatsApp message`,
      `Break down what makes ${offer} worth choosing today`,
      `Answer the first-order question before customers ask for the menu`,
      `Document the counter handoff from order to ready pickup`,
      `Guide hungry buyers from craving to one clear ${action}`,
      `Highlight the freshest option instead of another generic food photo`,
      `Turn the group-chat confusion into one practical recommendation`,
    ],
    salon: [
      `Invite viewers into the consultation before the ${offer} booking`,
      `Compare the reference photo with the realistic result path`,
      `Reveal the time, starting price, and prep behind ${offer}`,
      `Walk through the slot decision before the customer books`,
      `Break down what changes from consultation to final look`,
      `Answer the style doubt that stops ${audience} from booking`,
      `Document the clean setup and result proof around ${offer}`,
      `Guide first-time visitors from reference photo to realistic plan`,
      `Highlight the result detail customers should check before booking`,
      `Turn event-look confusion into a clear slot plan`,
    ],
    gym: [
      `Invite beginners into the first ${moment} session`,
      `Compare postponing fitness with one guided trial path`,
      `Reveal the trainer support behind the first ${offer} visit`,
      `Walk through arrival, first movement, and form check`,
      `Break down the first-week routine for ${audience}`,
      `Answer the awkward-gym fear before membership talk`,
      `Document a beginner correction without fake transformation claims`,
      `Guide ${audience} from hesitation to a trial session`,
      `Highlight what to bring and what happens in the first 20 minutes`,
      `Turn fitness delay into one small scheduled visit`,
    ],
    clinic: [
      `Invite patients through the first appointment step calmly`,
      `Compare waiting in fear with one clear consultation path`,
      `Reveal what happens before ${offer} is discussed`,
      `Walk through symptom, timing, and what-to-bring details`,
      `Break down the safest first step for ${audience}`,
      `Answer the pain or cost worry before booking pressure`,
      `Document the clinic process from message to consultation`,
      `Guide nervous patients from concern to appointment clarity`,
      `Highlight doctor or team proof before treatment talk`,
      `Turn treatment fear into a calm first-step explanation`,
    ],
    real_estate: [
      `Invite buyers into a filtered ${moment} shortlist`,
      `Compare random listings with a budget-fit property path`,
      `Reveal the landmark, availability, and visit reason first`,
      `Walk through budget, area, and property type before the site visit`,
      `Break down why one option deserves a visit`,
      `Answer the serious-buyer question before sharing listings`,
      `Document the road access and daily-life fit buyers need`,
      `Guide ${audience} from broad search to useful shortlist`,
      `Highlight what portal listings usually leave unclear`,
      `Turn mismatched enquiries into a cleaner property filter`,
    ],
    law_firm: [
      `Invite clients through the first document check`,
      `Compare panic advice with a plain legal next step`,
      `Reveal the document, deadline, and risk before consultation`,
      `Walk through what to prepare for ${offer}`,
      `Break down one legal mistake without legal theatre`,
      `Answer the fee fear with process clarity`,
      `Document the facts a lawyer needs before advice`,
      `Guide ${audience} from messy issue to consultation prep`,
      `Highlight the clause or document detail that changes risk`,
      `Turn legal delay into a simple first-step checklist`,
    ],
    agency: [
      `Invite founders into a one-page audit of the sales blocker`,
      `Compare pretty content with strategy that can create enquiries`,
      `Reveal the offer gap and proof gap before creative starts`,
      `Walk through one weak post and the business reason it failed`,
      `Break down the customer problem behind the next content move`,
      `Answer why the current page gets attention but weak leads`,
      `Document the path from buyer doubt to content direction`,
      `Guide ${audience} from random posting to one revenue move`,
      `Highlight the CTA change that could improve lead quality`,
      `Turn a vague content request into a business diagnosis`,
    ],
    retail: [
      `Invite buyers to inspect the real ${offer} before checkout`,
      `Compare guessing from photos with preview-first buying`,
      `Reveal the size, price, stock, and delivery detail behind ${offer}`,
      `Walk through the order path from idea to confirmation`,
      `Break down what can change before the customer pays`,
      `Answer the quality doubt with close-up product proof`,
      `Document packing, pickup, or delivery for a real order`,
      `Guide ${audience} from occasion to the safest product choice`,
      `Highlight the product detail that avoids a wrong order`,
      `Turn last-minute buying into a clearer preview message`,
    ],
    local: [
      `Invite buyers into the first clear step for ${offer}`,
      `Compare the usual option with the clearer ${context.businessName} path`,
      `Reveal the proof, price, and timing behind ${offer}`,
      `Walk through what happens after a customer messages`,
      `Break down the doubt that blocks the first ${action}`,
      `Answer the common question before asking for action`,
      `Document one real result and the process behind it`,
      `Guide ${audience} from interest to one practical next step`,
      `Highlight the detail competitors usually hide`,
      `Turn hesitation into a small action customers can take today`,
    ],
  };
  const list = frames[kind] || frames.local;
  const base = pickSeeded(list, context, `consultant-title:${kind}:${moment}:${offer}:${audience}`, index);
  return sanitizeGeneratedText(joinTitleDetail(base, detail), context);
}

function agencyTitleForKind(context, kind, index, { focus, persona }) {
  const offer = businessFacingFocus(context, focus || leadOffer(context), index);
  const audience = compactPhrase(audienceCue(context), "buyer", 3).toLowerCase();
  const variant = contextVariant(context, kind);
  const consultantTitle = consultantTitleForKind(context, kind, index, { focus, persona });
  if (consultantTitle) return consultantTitle;
  const titles = {
    family_food: [
      `Film staff recommending one ${offer} order for a family`,
      `Show portion size, parcel packing, and ready time for ${offer}`,
      `Make the group order easier with one honest ${offer} pick`,
    ],
    hostel_food: [
      `Film the filling ${offer} order for a hostel group`,
      `Show the student combo with price, spice level, and pickup time`,
      `Turn the dinner-budget fight into one clear order suggestion`,
    ],
    workday_cafe: [
      `Film the fastest coffee break order for office buyers`,
      `Show the ready-time, seat comfort, and one easy ${offer} pairing`,
      `Make a 10-minute work break order feel simple`,
    ],
    after_class_cafe: [
      `Film a pocket-friendly after-class combo`,
      `Show the student order with price, portion, and ready time`,
      `Help students choose one cafe pick without group-chat confusion`,
    ],
    event_salon: [
      `Film a consultation before the ${offer} booking`,
      `Show reference photo, realistic result, time needed, and starting price`,
      `Make event grooming feel planned before the slot is chosen`,
    ],
    college_salon: [
      `Film the college-event look plan before booking`,
      `Show starting price, prep, and realistic result for ${offer}`,
      `Turn a saved reference photo into a clear salon plan`,
    ],
    restart_gym: [
      `Film the first guided gym session for a restarting beginner`,
      `Show what to bring, who guides them, and the first routine`,
      `Make the trial session feel less awkward before membership talk`,
    ],
    first_gym: [
      `Film the first three movements a beginner will do`,
      `Show trainer correction, comfort, and the day-one routine`,
      `Turn gym fear into a guided first-session plan`,
    ],
    sales_software: [
      `Record the messy lead workflow beside the cleaner demo`,
      `Show one ${offer} workflow from manual work to useful result`,
      `Make the product demo answer one sales-team job`,
    ],
    finance_software: [
      `Record the messy invoice follow-up beside the cleaner demo`,
      `Show one ${offer} workflow from manual reminder to useful result`,
      `Make the product demo answer one finance-team job`,
    ],
    clinic_software: [
      `Record the clinic queue workflow before and after setup`,
      `Show the reception handoff, patient flow, and first setup step`,
      `Make clinic software useful before feature talk starts`,
    ],
    property_law: [
      `Film a plain-English checklist for the property document`,
      `Show document name, deadline, risk, and consultation next step`,
      `Turn legal panic into a simple first document check`,
    ],
    startup_law: [
      `Film a founder contract checklist before the consultation`,
      `Show what to prepare before signing or delaying an agreement`,
      `Make legal help feel clear before a startup problem grows`,
    ],
    brand_agency: [
      `Film a one-page audit that names the real sales blocker`,
      `Show the offer gap, proof gap, and next content move`,
      `Turn pretty-post demand into a business diagnosis`,
    ],
    local_agency: [
      `Film a local business page audit with one revenue fix`,
      `Show why enquiries are weak before suggesting a reel`,
      `Turn a customer doubt into the next shootable post`,
    ],
    family_clinic: [
      `Film the first appointment path for a nervous patient`,
      `Show concern, timing, what to bring, and the safe next step`,
      `Make the dental visit feel predictable before booking`,
    ],
    skin_clinic: [
      `Film the consultation path before treatment-package talk`,
      `Show doctor proof, patch-test clarity, and realistic timing`,
      `Turn side-effect worry into one clear appointment step`,
    ],
    local_clinic: [
      `Film the first checkup explanation in simple words`,
      `Show appointment timing, concern, and what happens first`,
      `Turn patient fear into a calm booking path`,
    ],
    premium_property: [
      `Film a matched property shortlist before the site visit`,
      `Show budget, area, landmark, availability, and visit reason`,
      `Make the property visit feel filtered, not random`,
    ],
    local_property: [
      `Film the property filter before sending listings`,
      `Show budget, preferred landmark, availability, and visit timing`,
      `Turn random property enquiries into a useful shortlist`,
    ],
    gift_retail: [
      `Film the custom gift preview before checkout`,
      `Show real photo, price, size, delivery date, and what can change`,
      `Make the gift order feel safe before confirmation`,
    ],
    boutique_retail: [
      `Film the real outfit with size, fit, price, and pickup detail`,
      `Show how to choose the right ${offer} before checkout`,
      `Turn clothing doubt into a clear size-and-style reply`,
    ],
    local: [
      `Film one real proof point for ${offer}`,
      `Show price, timing, proof, and the next step for ${audience}`,
      `Turn the first customer doubt into a practical post`,
    ],
  };
  const list = titles[variant] || titles.local;
  const detailSets = {
    food: [
      "with price, portion, and ready time visible",
      "using a real counter handoff and parcel close-up",
      "by answering the group-order question first",
      "with one honest recommendation instead of a full menu",
      "by showing what is fresh today before the CTA",
      "with a budget, spice, and pickup-time filter",
      "by comparing the usual choice with the safer pick",
      "with a customer-reaction or table-sharing moment",
      "by showing the packing, bill, and pickup window",
      "with the exact WhatsApp keyword on screen",
    ],
    salon: [
      "with reference photo, time needed, and starting price",
      "by showing the consultation before the chair work",
      "with prep, clean setup, and recent result proof",
      "by explaining what is realistic before booking",
      "with the slot-check message shown on screen",
      "by showing the result from two angles",
      "with a budget-comfort explanation before the CTA",
      "by turning one customer worry into a stylist answer",
      "with date, service, and prep details visible",
      "by showing what happens after the customer messages",
    ],
    gym: [
      "with trainer greeting, first movement, and form check",
      "by showing what to bring and what happens on arrival",
      "with the beginner routine written on screen",
      "by removing membership pressure from the first visit",
      "with the trial-session timing and next step",
      "by showing a common mistake corrected safely",
      "with a three-day starter plan preview",
      "by showing the least awkward entry point",
      "with one member habit story instead of fake transformation",
      "by ending with the exact trial message",
    ],
    software: [
      "with the messy current workflow shown first",
      "by showing the first useful screen before feature talk",
      "with setup time, owner role, and week-one result",
      "by comparing spreadsheet/manual work with the product path",
      "with one buyer role and one job-to-be-done",
      "by showing support or onboarding after signup",
      "with a before-after workflow in two columns",
      "by turning a feature into a real use case",
      "with the exact demo question buyers should ask",
      "by showing what happens in the first five minutes",
    ],
    clinic: [
      "with symptom, timing, and what-to-bring clarity",
      "by explaining the first consultation step calmly",
      "with doctor/team proof before treatment talk",
      "by showing appointment flow from message to visit",
      "with cost-range context and no pressure",
      "by answering the fear before the booking CTA",
      "with a patient-safe checklist on screen",
      "by showing the first five minutes of the visit",
      "with review proof and process clarity together",
      "by ending with the exact appointment message",
    ],
    real_estate: [
      "with budget, area, and property type shown first",
      "by showing landmark, road access, and availability",
      "with one reason the property fits the buyer",
      "by filtering before asking for a site visit",
      "with a three-option shortlist comparison",
      "by showing the detail portal listings usually miss",
      "with visit timing and verification step visible",
      "by explaining who should not visit this option",
      "with commute and daily-life fit included",
      "by ending with the budget-and-area message",
    ],
    law_firm: [
      "with document name, deadline, and risk first",
      "by showing what to prepare before consultation",
      "with one legal mistake explained in plain English",
      "by sorting the issue type before advice",
      "with a checklist customers can save",
      "by explaining whether this needs document review or a call",
      "with fee fear reduced through process clarity",
      "by showing the first legal risk without legal theatre",
      "with facts, timeline, and parties involved",
      "by ending with the consultation-prep message",
    ],
    agency: [
      "with the buyer problem named before the creative idea",
      "by pointing to the proof gap and offer gap",
      "with one weak post turned into a revenue move",
      "by explaining why pretty content did not create enquiries",
      "with a page screenshot and one sharp annotation",
      "by mapping customer doubt to the next reel",
      "with a content-to-sales reason, not a moodboard",
      "by showing what the founder should fix this week",
      "with the current CTA rewritten in plain words",
      "by ending with the audit message",
    ],
    retail: [
      "with real photo, size, price, and delivery date",
      "by showing preview before checkout",
      "with stock, colour, and pickup detail visible",
      "by matching the product to occasion and budget",
      "with close-up quality proof before the CTA",
      "by explaining what can still be changed",
      "with packing or delivery proof included",
      "by showing the safer option before confirmation",
      "with one customer question answered on screen",
      "by ending with the photo or preview message",
    ],
    local: [
      "with proof, price, timing, and next step visible",
      "by answering the first buyer doubt directly",
      "with a real result instead of a claim",
      "by showing what happens after the message",
      "with one comparison that makes the choice easier",
      "by showing the process behind the promise",
      "with the easiest first step on screen",
      "by turning a repeated question into the post",
      "with one customer situation as the example",
      "by ending with the exact reply keyword",
    ],
  };
  const detailKind = variant.includes("law") ? "law_firm"
    : variant.includes("food") ? "food"
    : variant.includes("salon") ? "salon"
    : variant.includes("gym") ? "gym"
    : variant.includes("software") ? "software"
    : variant.includes("clinic") ? "clinic"
    : variant.includes("property") ? "real_estate"
    : variant.includes("agency") ? "agency"
    : variant.includes("retail") || variant.includes("boutique") ? "retail"
    : kind;
  const detailList = detailSets[detailKind] || detailSets.local;
  const base = list[index % list.length];
  const detail = detailList[index % detailList.length];
  const cleanDetail = /\bwith\b/i.test(base) && /^with\s+/i.test(detail)
    ? detail.replace(/^with\s+/i, "showing ")
    : detail;
  return sanitizeGeneratedText(`${base} ${cleanDetail}`, context);
}

function agencyShotListForKind(context, kind, { focus, proof }) {
  const offer = businessFacingFocus(context, focus || leadOffer(context), 0);
  const variant = contextVariant(context, kind);
  const shots = {
    food: [
      `Open with the actual ${offer}, not a logo or empty plate.`,
      "Show portion size with a hand, box, plate, or table reference.",
      "Show packing, counter handoff, or ready-time proof.",
      "End with the exact keyword customers should message.",
    ],
    salon: [
      "Open with the reference photo or desired result.",
      "Show the stylist explaining what is realistic.",
      "Show time needed, starting price, prep, or clean setup.",
      "End with the slot-check WhatsApp line.",
    ],
    gym: [
      "Open with the beginner worry in one line.",
      "Show trainer greeting, first movement, and form correction.",
      "Show what to bring and how long the trial takes.",
      "End with the trial-session message.",
    ],
    software: [
      "Open with the messy current workflow.",
      `Show the ${context.businessName} screen solving one step.`,
      "Show the result after the first setup or demo action.",
      "End with the demo or early-access CTA.",
    ],
    clinic: [
      "Open with the patient concern in plain words.",
      "Show reception, consultation step, or doctor explanation.",
      "Show timing, what to bring, and how booking works.",
      "End with the appointment message.",
    ],
    real_estate: [
      "Open with budget, area, and property type.",
      "Show landmark, road access, availability, or room walkthrough.",
      "Show why this option matches the buyer.",
      "End with the shortlist or site-visit message.",
    ],
    law_firm: [
      "Open with the document or issue type.",
      "Show the checklist of facts needed before advice.",
      "Explain the risk in one simple line.",
      "End with the consultation-prep message.",
    ],
    agency: [
      "Open with the weak page, post, offer, or CTA as proof.",
      "Point to the business reason it is weak and what reply it should create.",
      "Show one sharper content or offer move with the proof angle.",
      "End with the audit reply message.",
    ],
    retail: [
      `Open with the real ${offer} photo or product in hand.`,
      "Show size, colour, stock, price, or preview detail.",
      "Show delivery, pickup, packing, or confirmation step.",
      "End with the photo or preview message.",
    ],
    local: [
      `Open with ${proof || "real proof"}.`,
      `Show how ${offer} works in practice.`,
      "Show price, timing, process, or result.",
      "End with one clear customer action.",
    ],
  };
  if (variant.includes("food")) return shots.food;
  if (variant.includes("salon")) return shots.salon;
  if (variant.includes("gym")) return shots.gym;
  if (variant.includes("software")) return shots.software;
  if (variant.includes("clinic")) return shots.clinic;
  if (variant.includes("property")) return shots.real_estate;
  if (variant.includes("law")) return shots.law_firm;
  if (variant.includes("agency")) return shots.agency;
  if (variant.includes("retail") || variant.includes("boutique")) return shots.retail;
  return shots[kind] || shots.local;
}

function isWeakAgencyTitle(title) {
  const text = clean(title);
  if (!text) return true;
  if (hasRoboticOutput(text)) return true;
  if (!STRONG_ACTION_VERB_PATTERN.test(text)) return true;
  return /\b(use availability to create|before the menu decision|make the alternative look harder|buyers should know first|proof before the first|use timing and proof|turn the main doubt|make .* easier to compare|decision before|decision on|with portion clarity|through pickup timing|for group orders|around offer clarity|without setup confusion)\b/i.test(text)
    || /\b(record a (?:15-second|short) video|make a quick proof clip|create a video showcasing|get ready with|social media contest|share their positive experiences)\b/i.test(text)
    || /\bon\s+YouTube\b/i.test(text)
    || (text.split(/\s+/).length > 14 && /\b(on|for)\s+(Instagram|WhatsApp|Google Business|LinkedIn|Website|Email)\b/i.test(text))
    || /\bfor\s+[A-Z][a-z]+(?:,|\s+(?:health|budget|careful|skeptical|founder|student|home|buyer|patient|individual|lead|manager|owner|member)\b)/.test(text);
}

function agencyBrief(context, index, { focus, objection = {}, persona = {}, proof = "", platform = "", title = "" } = {}) {
  const kind = businessKind(context);
  const offer = businessFacingFocus(context, focus || offerFocus(context, index), index);
  const action = industryCta(context, kind, index);
  const buyerDoubt = clean(objection.objection || objection.problem || context.businessProblem, inferObjection(`${offer} ${context.productsOrServices}`, context));
  const proofPoint = clean(proof || objection.proof || inferProofMethod(`${offer} ${buyerDoubt}`, context), "real proof");
  const customer = clean(persona.name || persona.label || context.audience, context.audience);
  const exactTitle = title && !isWeakAgencyTitle(title) && title.length >= 18
    ? sanitizeGeneratedText(title, context)
    : agencyTitleForKind(context, kind, index, { focus: offer, persona });
  const shotList = agencyShotListForKind(context, kind, { focus: offer, proof: proofPoint });
  const exactAction = STRONG_ACTION_VERB_PATTERN.test(exactTitle)
    ? exactTitle
    : `Turn this into a practical customer action: ${exactTitle.charAt(0).toLowerCase()}${exactTitle.slice(1)}`;
  const platformName = clean(platform || context.platforms[index % Math.max(1, context.platforms.length)] || "the main channel", "the main channel");
  const mix = contentMixForIndex(context, index);
  const expected = baseMetric(context);
  return {
    title: exactTitle,
    exact_action: exactAction,
    owner_instruction: `${exactAction}. Use ${platformName}, keep it tight, include proof before the CTA, and close with: ${action}`,
    why_it_matters: `This matters because ${customer} may hesitate when "${buyerDoubt}" is not answered clearly.`,
    when_to_do_this: mix.when_to_do_this,
    who_should_do_it: mix.who_should_do_it,
    recommended_format: mix.postType,
    campaign_type: mix.campaign_type,
    how_to_execute: shotList,
    customer_doubt_solved: buyerDoubt,
    proof_to_show: proofPoint,
    expected_result: expected,
    cta: action,
    hook: exactTitle
      .replace(/^(Invite|Compare|Reveal|Walk through|Break down|Answer|Guide|Document|Take viewers inside|Highlight|Demonstrate|Introduce|Challenge|Follow|Teach|Explain|Celebrate|Solve|Remove|Build|Map|Audit|Rewrite|Turn|Film|Record|Shoot|Show|Make|Create|Help)\b/i, "Watch")
      .replace(/\.$/, ""),
    founder_check: `Before posting, check whether a stranger can understand ${offer}, the proof, and the next step in 10 seconds.`,
  };
}

function generatedObjection(index, context) {
  const software = [
    ["They do not understand what the product actually does yet.", "The product promise is still abstract until they see a real workflow.", "Show one screen recording of the exact workflow from start to finish.", "screen demo"],
    ["They worry setup will take too much time.", "Busy teams avoid tools that look like extra work.", "Show the first setup step and how long it takes.", "setup walkthrough"],
    ["They fear the software will not fit daily work.", "Buyers compare the product with their current messy process.", "Create a use-case card for one real buyer workflow.", "use-case proof"],
    ["They do not want another unused subscription.", "They have paid for tools that nobody adopted.", "Offer a guided demo or trial around one workflow.", "guided trial"],
    ["They are unsure who on the team should use it.", "Unclear ownership slows software adoption.", "Show the team member, task, and result for one use case.", "role-based workflow"],
    ["They need proof support will be available.", "Support fear blocks signups for small teams.", "Show onboarding, reply speed, or founder support clearly.", "support proof"],
    ["They do not know what changes after week one.", "The value needs a near-term result.", "Show what gets faster, cleaner, or easier in seven days.", "week-one outcome"],
    ["They are comparing it with spreadsheets or WhatsApp.", "Manual tools feel free because the hidden cost is not visible.", "Show manual process versus product workflow side by side.", "manual vs product comparison"],
    ["They worry their data or process will become messy.", "Trust depends on control and clarity.", "Show what information is captured and where it appears.", "dashboard clarity"],
    ["They need a reason to act now.", "Software launches can feel easy to postpone.", "Offer early access with a clear use-case slot.", "early access offer"],
    ["They need internal buy-in.", "One buyer may need to convince another person.", "Create a simple shareable explainer for the team.", "team buy-in card"],
    ["They want to see real numbers.", "Specific time saved beats broad claims.", "Ask early users to measure one repeated task before and after.", "before-after metric"],
    ["They are afraid switching will interrupt work.", "Change feels risky during busy days.", "Show how the product can start with one small workflow.", "low-risk rollout"],
    ["They do not know if the product is real yet.", "Pre-launch software needs credibility before signups.", "Show build progress, demo screens, and founder support.", "build proof"],
    ["They need a clear next step after interest.", "Interest disappears when the path is vague.", "Use one CTA: ask for demo or early access.", "single CTA"],
  ];
  const local = [
    ["They do not know the exact next step.", "A confused buyer delays action.", "Show the first step clearly in the post and reply.", "next-step proof"],
    ["They worry the price will not match the value.", "Price feels risky before proof is visible.", "Show what is included and why it is worth it.", "value proof"],
    ["They need proof before trusting the business.", "New or unfamiliar businesses must reduce risk.", "Show real work, results, reviews, or process proof.", "trust proof"],
    ["They do not know if it fits their need.", "Generic offers make buyers hesitate.", "Show who the offer is for and who it is not for.", "fit clarity"],
    ["They compare with a familiar alternative.", "People choose what feels safer.", "Show the gap between your process and the alternative.", "comparison proof"],
    ["They worry about timing or availability.", "Buyers act faster when timing is clear.", "Show slots, delivery timing, visit timing, or response time.", "timing clarity"],
    ["They need a reason to reply today.", "Interest fades without a prompt.", "Use one simple question that starts the conversation.", "reply trigger"],
    ["They want to see the real result.", "Outcome proof is easier to believe than claims.", "Show before-after, final product, or customer result.", "result proof"],
    ["They do not want to feel pushed.", "Hard selling creates resistance.", "Give a useful answer before asking for action.", "helpful answer"],
    ["They need local relevance.", "Location matters only when it helps the decision.", "Mention area, access, timing, or local buyer context.", "local decision clue"],
    ["They need confidence after messaging.", "Bad replies lose serious buyers.", "Use a saved reply with proof and one next step.", "saved reply"],
    ["They are unsure what to ask.", "A buyer may want help but lack words.", "Give simple options they can choose from.", "choice menu"],
    ["They need reassurance after purchase or booking.", "Follow-up affects repeat business.", "Explain what happens after they say yes.", "after-action clarity"],
    ["They forget unless reminded.", "Most buyers need more than one touch.", "Create one reminder post using real proof.", "reminder proof"],
    ["They need to justify the decision.", "People want a reason they can explain.", "Give a simple reason to choose this option.", "decision reason"],
  ];
  const source = context.parentCategory === "software" || context.vertical === "software" ? software : local;
  const item = [...source[index % source.length]];
  if (context.briefSubtype && item[3] === "choice menu") item[3] = "guided reply options";
  return {
    objection: item[0],
    reason: item[1],
    answer: item[2],
    proof: item[3],
  };
}

function normalizePillar(item, index, context) {
  const rawPillar = typeof item === "string"
    ? item
    : item?.pillar || item?.title || item?.angle || `Content pillar ${index + 1}`;
  const product = leadOffer(context);
  let pillar = context.parentCategory === "food_beverage"
    ? clean(rawPillar)
        .replace(/main dish|hero dish|dish reveal/ig, product)
        .replace(/kitchen prep/ig, `${product} prep`)
    : clean(rawPillar);
  if (context.parentCategory !== "software") {
    pillar = pillar
      .replace(/15[-\s]?second screen video/ig, "short video")
      .replace(/screen video/ig, "short video")
      .replace(/buyer'?s workflow before and after using[^-–.]+/ig, `${product} before-and-after proof`)
      .replace(/buyer'?s workflow before and after[^-–.]+/ig, `${product} before-and-after proof`)
      .replace(/buyer'?s workflow before and after the product/ig, `${product} before-and-after proof`)
      .replace(/workflow before and after the product/ig, `${product} before-and-after proof`)
      .replace(/buyer'?s workflow/ig, `${product} decision path`)
      .replace(/website'?s booking page/ig, `${actionPhrase(context)} step`);
    const productTokens = product.toLowerCase().split(/[^a-z0-9]+/).filter(word => word.length >= 4);
    const hasProduct = productTokens.some(word => lower(pillar).includes(word));
    if (!hasProduct && /proof|photo|stock|wall|before|after|result|price|slot|available|service|style|look|combo|offer|video|workflow|product/i.test(pillar)) {
      pillar = `${product}: ${pillar}`;
    }
  }
  if (typeof item === "string") {
    return {
      pillar,
      purpose: `Make ${context.businessName} easier to understand.`,
      proof_needed: "real example",
    };
  }
  return {
    pillar: clean(pillar, `Content pillar ${index + 1}`),
    purpose: clean(item.purpose || item.why, `Help ${context.audience} understand ${context.productsOrServices}.`),
    proof_needed: clean(item.proof_needed || item.proof || item.visual, "real example"),
  };
}

function generatedPillar(index, context) {
  const software = [
    ["Real workflow screen recording", "Show one buyer workflow from start to finish.", "screen recording"],
    ["Manual vs product workflow", "Make the time saving visible without hype.", "before-after workflow"],
    ["First setup proof", "Reduce fear that setup will be difficult.", "setup walkthrough"],
    ["Buyer use-case card", "Connect the product to the exact daily job.", "use-case proof"],
    ["Support and onboarding proof", "Show buyers they will not be left alone.", "support proof"],
    ["Mistake avoided story", "Show the cost of staying manual.", "manual error example"],
    ["Demo question answer", "Answer the question buyers ask before booking.", "FAQ screen or short demo"],
    ["Early access proof", "Make the launch feel real and safe to try.", "early access workflow"],
  ];
  const local = [
    ["First step proof", "Show exactly how a customer starts.", "next-step screenshot or counter/service visual"],
    ["Price or process clarity", "Remove confusion before people message.", "simple price/process card"],
    ["Behind-the-scenes trust", "Show the work that creates the result.", "real preparation moment"],
    ["Customer doubt answer", "Turn one hesitation into a useful post.", "customer question and clear answer"],
    ["Result or product proof", "Make the outcome visible.", "before-after, final product, or service result"],
    ["Local decision helper", "Help nearby buyers decide faster.", "location, timing, parking, area, or delivery detail"],
    ["Comparison proof", "Show why this option is safer or clearer.", "side-by-side comparison"],
    ["Follow-up trigger", "Give interested people a reason to reply.", "limited slot, reminder, or saved reply"],
  ];
  const source = context.parentCategory === "software" || context.vertical === "software" ? software : local;
  const item = source[index % source.length];
  return {
    pillar: `${context.businessName}: ${item[0]}`,
    purpose: item[1],
    proof_needed: item[2],
  };
}

function stripBusinessPrefix(text, context) {
  let source = clean(text);
  const prefix = `${context.businessName}:`;
  const escapedName = context.businessName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  source = source.replace(new RegExp(`^(?:${escapedName}\\s*:?\\s*)+`, "i"), "");
  source = source.replace(new RegExp(`:\\s*${escapedName}\\s*:?\\s*`, "ig"), ": ");
  return source.toLowerCase().startsWith(prefix.toLowerCase())
    ? source.slice(prefix.length).trim()
    : source;
}

function expandMasterStrategy(core, { marketingOS, intelligence }) {
  const context = intelligence.context;
  const fallback = defaultMasterCore({ marketingOS, intelligence });
  const merged = {
    ...fallback,
    ...(core || {}),
    business_summary: { ...fallback.business_summary, ...(core?.business_summary || {}) },
    business_diagnosis: { ...fallback.business_diagnosis, ...(core?.business_diagnosis || {}) },
    positioning: { ...fallback.positioning, ...(core?.positioning || {}) },
    unique_value_proposition: { ...fallback.unique_value_proposition, ...(core?.unique_value_proposition || {}) },
    messaging: { ...fallback.messaging, ...(core?.messaging || {}) },
    retention_strategy: { ...fallback.retention_strategy, ...(core?.retention_strategy || {}) },
    growth_strategy: { ...fallback.growth_strategy, ...(core?.growth_strategy || {}) },
  };

  const priorities = ensureArrayLength(
    asArray(core?.marketing_priorities || merged.marketing_priorities).map((item, index) => normalizePriority(item, index, context)),
    10,
    (index) => normalizePriority(fallback.marketing_priorities[index % fallback.marketing_priorities.length], index, context),
  );
  const objections = ensureArrayLength(
    uniqueBySignature(
      asArray(core?.customer_objections || merged.customer_objections).map((item, index) => normalizeObjection(item, index, context)),
      item => item.objection,
    ),
    15,
    (index) => normalizeObjection(generatedObjection(index, context), index, context),
  );
  const pillars = ensureArrayLength(
    uniqueBySignature(
      asArray(core?.content_pillars || merged.content_pillars).map((item, index) => normalizePillar(item, index, context)),
      item => item.pillar,
    ),
    8,
    (index) => normalizePillar(generatedPillar(index, context), index, context),
  );
  const personas = ensureArrayLength(
    asArray(core?.target_personas || merged.target_personas),
    4,
    index => fallback.target_personas[index % fallback.target_personas.length],
  ).map((item, index) => {
    const focus = businessFacingFocus(context, offerFocus(context, index), index);
    const name = clean(item.name || item.label || item.who_they_are, `Customer type ${index + 1}`);
    const hesitation = strengthenCustomerDoubt(
      item.hesitation || item.what_may_stop_them || objections[index % objections.length].objection,
      context,
      focus,
    );
    const brief = agencyBrief(context, index, {
      focus,
      objection: { objection: hesitation },
      persona: { name },
      proof: objections[index % objections.length].proof,
      platform: clean(item.best_channel, context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram"),
    });
    return {
      name,
      need: clean(item.need || item.what_they_want, `A clear reason to choose ${context.businessName}.`),
      motivation: clean(item.motivation, `${name} wants the result without guessing what happens next.`),
      fear: hesitation,
      buying_trigger: clean(item.buying_trigger, `${brief.proof_to_show} plus a clear ${brief.cta} step.`),
      objection: hesitation,
      hesitation,
      how_to_sell: personaSellInstruction(context, name, hesitation, brief),
      exact_action: personaSellInstruction(context, name, hesitation, brief),
      best_message: clean(item.best_message || item.message_to_use, `${brief.cta}. We will show ${brief.proof_to_show} before you decide.`),
      best_channel: brief.cta.includes("DEMO") ? "Website / LinkedIn" : clean(item.best_channel, context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram"),
      customer_doubt_solved: brief.customer_doubt_solved,
      expected_result: strengthenExpectedResult(brief.expected_result, context),
    };
  });
  const psychology = ensureArrayLength(
    asArray(core?.psychology || merged.psychology),
    6,
    index => fallback.psychology[index % Math.max(1, fallback.psychology.length)] || {
      principle: detectPsychology(objections[index % Math.max(1, objections.length)]?.objection || context.businessProblem)[0],
      use_it_by: `Use this to make ${context.businessName} feel easier to trust.`,
    },
  ).map((item, index) => ({
    principle: clean(item?.principle || item?.name, detectPsychology(objections[index % Math.max(1, objections.length)]?.objection || context.businessProblem)[0]),
    use_it_by: clean(item?.use_it_by || item?.application, `Use this to make ${context.businessName} feel easier to trust.`),
  }));
  const offers = ensureArrayLength(
    asArray(core?.offers || merged.offers),
    4,
    index => fallback.offers[index % fallback.offers.length],
  ).map((item, index) => ({
    offer: businessFacingFocus(context, item.offer || item.name || item.title, index),
    why: clean(item.why || item.reason, `It gives ${context.audience} a simpler first step.`),
    next_step: clean(item.next_step || item.cta, actionPhrase(context)),
  }));

  const growthSteps = priorities.map((item, index) => {
    const objection = objections[index % objections.length];
    const persona = personas[index % personas.length];
    const focus = businessFacingFocus(context, offerFocus(context, index), index);
    const brief = agencyBrief(context, index, {
      focus,
      objection,
      persona,
      proof: objection.proof,
      platform: context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram",
      title: item.priority,
    });
    const actionSteps = ensureArrayLength([
      brief.owner_instruction,
      ...brief.how_to_execute,
      ...asArray(item.how).slice(0, 2),
    ], 5, n => brief.how_to_execute[n % brief.how_to_execute.length]);
    return {
      step: index + 1,
      title: brief.title,
      diagnosis: item.why,
      exact_action: brief.exact_action,
      why_this_matters: brief.why_it_matters,
      reason: brief.why_it_matters,
      when_to_do_this: brief.when_to_do_this,
      who_should_do_it: brief.who_should_do_it,
      recommended_format: brief.recommended_format,
      campaign_type: brief.campaign_type,
      how_to_execute: actionSteps,
      steps: actionSteps,
      action_steps: actionSteps,
      customer_doubt_solved: brief.customer_doubt_solved,
      business_result: strengthenExpectedResult(brief.expected_result, context),
      expected_result: strengthenExpectedResult(brief.expected_result, context),
      example_for_this_business: `${context.businessName} should use this around ${focus} for ${context.audience}.`,
      copy_ready_text: `${brief.cta}`,
      track_this: item.expected_result || brief.expected_result,
      what_to_check: item.expected_result || brief.expected_result,
      founder_check: brief.founder_check,
      priority: index < 3 ? "Do this first" : index < 7 ? "Do this this week" : "Do this this month",
      effort: index < 5 ? "Simple task" : "Needs owner attention",
      timeline: index < 3 ? "Today" : index < 7 ? "This week" : "This month",
    };
  });

  const painPoints = objections.map((item, index) => {
    const focus = businessFacingFocus(context, offerFocus(context, index), index);
    const brief = agencyBrief(context, index, {
      focus,
      objection: item,
      persona: personas[index % personas.length],
      proof: item.proof,
      platform: context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram",
    });
    const painAction = painPointAction(context, item.objection, brief);
    const painTitle = painPointContentTitle(context, item.objection, index);
    const painCopy = sanitizeGeneratedText(`${context.businessName}: ${item.answer} ${brief.cta}`, context);
    return {
      problem: item.objection,
      customer_problem: item.objection,
      why_they_feel_this: item.reason,
      your_solution: item.answer,
      exact_action: painAction,
      why_it_matters: brief.why_it_matters,
      when_to_do_this: brief.when_to_do_this,
      who_should_do_it: brief.who_should_do_it,
      recommended_format: brief.recommended_format,
      campaign_type: brief.campaign_type,
      how_to_execute: brief.how_to_execute,
      customer_doubt_solved: brief.customer_doubt_solved,
      expected_result: strengthenExpectedResult(brief.expected_result, context),
      text_to_use: painCopy,
      content_idea: painTitle,
      what_to_do: painAction,
      what_to_say: `${painCopy} Then ask: ${brief.cta}`,
      post_idea: painTitle,
      trust_factor: item.proof,
    };
  });

  const calendar = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const pillar = pillars[index % pillars.length];
    const objection = objections[index % objections.length];
    const persona = personas[index % personas.length];
    const psych = psychology[index % psychology.length];
    const offer = offers[index % offers.length];
    const focus = businessFacingFocus(context, offerFocus(context, index), index);
    const mix = contentMixForIndex(context, index);
    const platform = mix.platform || context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram";
    const format = mix.postType;
    const creative = calendarCreative(context, index, {
      pillar,
      objection,
      persona,
      psych,
      offer,
      focus,
      platform,
      format,
    });
    const brief = agencyBrief(context, index, {
      focus,
      objection,
      persona,
      proof: pillar.proof_needed,
      platform,
      title: creative.title,
    });
    return {
      day,
      platform,
      postType: format,
      post_type: format,
      campaign_type: mix.campaign_type,
      when_to_do_this: brief.when_to_do_this,
      who_should_do_it: brief.who_should_do_it,
      title: creative.title,
      topic: creative.title,
      objective: `Make ${focus} easier to trust by answering: ${brief.customer_doubt_solved}`,
      target_customer: persona.name,
      customer_objection: objection.objection,
      marketing_psychology: psych.principle,
      hook: creative.hook || brief.hook,
      content_format: format,
      exact_content_idea: calendarExecutionLine(context, { format, platform, creative, brief }),
      recommended_format: brief.recommended_format,
      visual_direction: creative.visual_direction,
      shot_list: brief.how_to_execute,
      script: `${brief.hook}. ${creative.script}`,
      caption: creative.caption,
      ready_caption: creative.caption,
      full_caption: `${creative.caption}\n\nNext step: ${creative.customer_action}.`,
      customerAction: creative.customer_action,
      customer_action: creative.customer_action,
      cta: creative.customer_action,
      expected_outcome: strengthenExpectedResult(brief.expected_result, context),
      expected_result: strengthenExpectedResult(brief.expected_result, context),
      why_this_works: creative.why_this_works,
      why_this_helps: creative.why_this_works,
      how_to_create: [
        calendarExecutionLine(context, { format, platform, creative, brief }),
        ...brief.how_to_execute,
      ],
      customer_doubt_solved: brief.customer_doubt_solved,
      business_result: strengthenExpectedResult(brief.expected_result, context),
      offer_used: creative.offer_used,
    };
  });

  const growthIdeas = ensureArrayLength(
    [
      ...priorities.map(item => ({
        title: item.priority,
        detail: item.why,
        action: asArray(item.how)[0],
        expected_result: item.expected_result,
      })),
      ...pillars.map(item => ({
        title: item.pillar,
        detail: item.purpose,
        action: `Create one proof piece using ${item.proof_needed}.`,
        expected_result: baseMetric(context),
      })),
      ...offers.map(item => ({
        title: item.offer,
        detail: item.why,
        action: `Test this offer with ${context.audience}.`,
        expected_result: actionPhrase(context),
      })),
    ],
    20,
    index => ({
      title: `${context.businessName} growth test ${index + 1}`,
      detail: `Use one repeated customer question to create a better action path.`,
      action: `Post the answer and track ${baseMetric(context)}.`,
      expected_result: baseMetric(context),
    }),
  ).map((item, index) => {
    const brief = agencyBrief(context, index + 3, {
      focus: businessFacingFocus(context, offerFocus(context, index), index),
      objection: objections[index % objections.length],
      persona: personas[index % personas.length],
      proof: pillars[index % pillars.length].proof_needed,
      platform: context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram",
      title: item.title,
    });
    const experiment = growthIdeaExperiment(context, brief, index);
    return {
      category: index < 8 ? "sales" : index < 14 ? "content" : "trust",
      title: experiment.title,
      exact_action: experiment.exactAction,
      why: clean(item.detail || item.why, brief.why_it_matters),
      why_it_matters: brief.why_it_matters,
      when_to_do_this: brief.when_to_do_this,
      who_should_do_it: brief.who_should_do_it,
      recommended_format: brief.recommended_format,
      campaign_type: brief.campaign_type,
      how_to_execute: brief.how_to_execute,
      steps: [
        experiment.exactAction,
        ...brief.how_to_execute.slice(0, 3),
        `Track ${clean(item.expected_result, brief.expected_result)}.`,
      ],
      customer_doubt_solved: brief.customer_doubt_solved,
      expected_result: strengthenExpectedResult(item.expected_result || brief.expected_result, context),
      effort: index < 10 ? "Small test" : "Needs follow-up",
    };
  });

  const messageTemplates = objections.slice(0, 8).map((item, index) => messageTemplateForContext(context, index, {
    objection: item,
    persona: personas[index % personas.length],
    focus: businessFacingFocus(context, offerFocus(context, index), index),
  }));

  const captions = calendar.slice(0, 12).map(day => day.caption);
  const competitorIntelligence = {
    basis: "Common options customers may compare before deciding.",
    archetypes: ensureArrayLength(asArray(core?.competitors || merged.competitors), 4, index => fallback.competitors[index % fallback.competitors.length]).map((item, index) => {
      const brief = agencyBrief(context, index + 5, {
        focus: businessFacingFocus(context, offerFocus(context, index), index),
        objection: objections[index % objections.length],
        persona: personas[index % personas.length],
        proof: pillars[index % pillars.length].proof_needed,
        platform: context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram",
      });
      const alternative = clean(item.alternative || item.label, `Alternative ${index + 1}`);
      const whyChoose = strengthenCompetitorReason(item.why_people_choose_it || asArray(item.strengths)[0], alternative, context);
      const weakness = clean(item.weakness_to_use || asArray(item.weaknesses)[0], "The next step may not be clear.");
      const counterMove = competitorCounterMove(context, { alternative, weakness, brief });
      const competitorContent = competitorContentMove(context, { alternative, weakness, brief });
      return {
        label: alternative,
        alternative,
        basis: "Market pattern",
        why_customers_choose_it: whyChoose,
        strengths: [whyChoose],
        weakness_to_use: weakness,
        weaknesses: [weakness],
        exact_counter_move: counterMove,
        how_to_beat_them: clean(item.how_to_win || item.how_to_beat_them, `${context.businessName} should make ${brief.proof_to_show}, price/process, and action clearer than ${alternative}.`),
        content_to_make: competitorContent,
        how_to_execute: brief.how_to_execute,
        when_to_do_this: brief.when_to_do_this,
        who_should_do_it: brief.who_should_do_it,
        recommended_format: brief.recommended_format,
        campaign_type: brief.campaign_type,
        customer_doubt_solved: brief.customer_doubt_solved,
        expected_result: strengthenExpectedResult(brief.expected_result, context),
        message_to_use: `${brief.cta}. We will show the proof and the next step before you decide.`,
      };
    }),
    platform_plan: context.platforms.slice(0, 3).map(platform => ({
      platform,
      move: `Use ${platform} to answer one customer doubt and move people toward ${actionPhrase(context)}.`,
    })),
  };

  // Shared across every section so a title/line used in one part of the report
  // (Marketing Plan, Growth Moves, Calendar, etc.) can never reappear verbatim
  // in another part. Previously each section deduped only against itself,
  // which let Growth Moves silently reuse the same items as Marketing Plan
  // (both are seeded from `priorities`), producing identical cards.
  const usedRecommendationSignatures = new Set();
  const uniquePillars = ensureUniqueRecommendationItems(pillars, ["pillar", "title"], context, "pillar", usedRecommendationSignatures);
  const uniquePriorities = ensureUniqueRecommendationItems(priorities, ["priority", "title"], context, "priority", usedRecommendationSignatures);
  const uniqueGrowthSteps = ensureUniqueRecommendationItems(growthSteps, ["title"], context, "strategy", usedRecommendationSignatures);
  const uniquePainPoints = ensureUniqueRecommendationItems(painPoints, ["problem", "customer_problem"], context, "pain", usedRecommendationSignatures);
  const uniqueCalendar = ensureUniqueRecommendationItems(calendar, ["title"], context, "calendar", usedRecommendationSignatures);
  const uniqueGrowthIdeas = ensureUniqueRecommendationItems(growthIdeas, ["title"], context, "idea", usedRecommendationSignatures);

  const expandedMaster = {
    ...merged,
    messaging: {
      ...(merged.messaging || {}),
      words_to_avoid: sanitizeAvoidList(merged.messaging?.words_to_avoid),
    },
    target_personas: personas,
    customer_objections: objections,
    psychology,
    offers,
    content_pillars: uniquePillars,
    marketing_priorities: uniquePriorities,
    growth_strategy_10_steps: uniqueGrowthSteps,
    customer_pain_points_15: uniquePainPoints,
    consumer_psychology: {
      core_truth: `${context.audience} need proof, clarity, and an easy first step before choosing ${context.businessName}.`,
      customer_thoughts: psychology.map((item, index) => ({
        customer_thought: objections[index % objections.length].objection,
        what_it_means: objections[index % objections.length].reason,
        what_to_show: uniquePillars[index % uniquePillars.length].proof_needed,
        what_to_say: objections[index % objections.length].answer,
        why_this_works: item.use_it_by,
      })),
      decision_drivers: psychology.map(item => item.principle),
    },
    competitor_intelligence: competitorIntelligence,
    content_calendar_30_days: uniqueCalendar,
    growth_ideas_20: uniqueGrowthIdeas,
    execution_checklist: {
      today: uniqueGrowthSteps.slice(0, 3).map(step => step.title),
      this_week: uniqueGrowthSteps.slice(3, 7).map(step => step.title),
      this_month: uniqueGrowthSteps.slice(7, 10).map(step => step.title),
      tracking: baseMetric(context),
    },
    captions,
    message_templates: messageTemplates,
    brand_style: {
      tone: merged.messaging?.tone || "simple, specific, proof-first, and direct",
      voice: "Speak like a sharp owner explaining the offer to a serious buyer, not like a marketing brochure.",
      words_to_use: merged.messaging?.words_to_use || [],
      words_to_avoid: sanitizeAvoidList(merged.messaging?.words_to_avoid),
      visual_rules: uniquePillars.slice(0, 4).map(item => `Show ${item.proof_needed}.`),
      sample_lines: [
        `${agencyBrief(context, 0, { focus: businessFacingFocus(context, offerFocus(context, 0), 0), objection: objections[0], persona: personas[0], proof: uniquePillars[0]?.proof_needed }).cta}`,
        `${context.businessName} shows ${uniquePillars[0]?.proof_needed || "real proof"} before asking people to decide.`,
        `If you are unsure, send the detail that matters most: ${businessFacingFocus(context, offerFocus(context, 0), 0)}.`,
      ],
      use_this_style: [
        "Name the customer doubt first.",
        "Show the real proof before the promise.",
        context.parentCategory === "software"
          ? "End with one clear demo, early-access, or workflow-check step."
          : "End with one clear message, booking, order, or visit step.",
      ],
      avoid_this_style: sanitizeAvoidList(merged.messaging?.words_to_avoid),
    },
    advanced_growth_plan: {
      headline: `${context.businessName} should turn proof into a repeatable sales loop.`,
      moves: uniqueGrowthIdeas.slice(0, 6).map((idea, index) => {
        const roadmap = advancedRoadmapMove(context, idea, index);
        return {
          week: index + 1,
          title: roadmap.title,
          exact_action: roadmap.exactAction,
          why_it_matters: `This turns a useful idea into an operating routine instead of leaving it as one post.`,
          when_to_do_this: idea.when_to_do_this,
          who_should_do_it: idea.who_should_do_it,
          recommended_format: idea.recommended_format,
          campaign_type: idea.campaign_type,
          how_to_execute: [
            `Pick the strongest proof asset from week ${index + 1}.`,
            `Use the matching message template after people reply.`,
            `Record the result, repeated question, and next adjustment before the week ends.`,
          ],
          customer_doubt_solved: idea.customer_doubt_solved,
          expected_result: idea.expected_result,
          owner_check: `End week ${index + 1} by checking whether this created ${idea.expected_result}.`,
        };
      }),
      main_metric: baseMetric(context),
    },
    kpis: ensureArrayLength(merged.kpis, 6, index => ["useful messages", "qualified enquiries", "saved posts", "repeat questions", "proof assets", "customer actions"][index]),
  };

  return sanitizeGeneratedValue(diversifyExpandedMaster(expandedMaster, context), context);
}

function buildMasterPrompt({ intelligence, ruleDraft }) {
  const context = intelligence.context;
  const ownWebsite = compactSnapshot(intelligence?.rawBiz?.own_website_snapshot);
  const competitor = compactSnapshot(intelligence?.rawBiz?.competitor_website_snapshot);
  const system = [
    "You are a senior marketing strategist for small businesses.",
    "Explain concepts so simply that a 15-year-old kid can understand them. Do NOT use marketing jargon, synergy, or corporate speak.",
    "Think before writing. Diagnose the business first, then create the master strategy.",
    "Use simple English. No jargon. No vague lines. No fake research.",
    "Use only supplied website and competitor facts. If facts are missing, say what proof is needed.",
    "Do not write final calendar days. Create the strategy brain that all pages can use.",
    "Keep JSON compact. Each string should be short, specific, and under 120 characters where possible.",
    "Do not include markdown, comments, trailing commas, or text outside the JSON object.",
    `Never use these phrases: ${BANNED_GENERIC_PHRASES.join(", ")}.`,
    "Return valid JSON only. No markdown. No explanation.",
  ].join(" ");
  const user = {
    task: "Create the Master Marketing Strategy JSON. It must be specific enough to generate every report tab later.",
    business: {
      name: context.businessName,
      industry: context.businessType,
      parent_category: context.parentCategory,
      location: context.location,
      audience: context.audience,
      offer: context.productsOrServices,
      goal: context.selectedGoal,
      platforms: context.platforms,
      launch_stage: context.launchStage,
    },
    website_facts: ownWebsite,
    competitor_facts: competitor,
    retrieved_marketing_knowledge: intelligence.units.slice(0, 24).map(unit => ({
      id: unit.id,
      source: unit.source,
      type: unit.type,
      problem: unit.problem,
      psychology: unit.psychology,
      proof_method: unit.proof_method,
      principle: unit.principle,
      raw_hint: unit.raw_hint,
    })),
    fallback_strategy_read: {
      business_summary: ruleDraft.business_summary,
      top_problems: ruleDraft.business_diagnosis?.top_problems?.slice(0, 5),
      first_priorities: ruleDraft.marketing_priorities?.slice(0, 5),
    },
    required_json_shape: {
      market_read: "",
      top_problems: [],
      root_causes: [],
      opportunities: [],
      positioning: "",
      proof_to_show: [],
      personas: [{ name: "", need: "", hesitation: "", message: "", channel: "" }],
      customer_doubts: [{ doubt: "", reason: "", answer: "", proof: "" }],
      content_angles: [{ angle: "", purpose: "", proof: "" }],
      priority_angles: [{ action: "", why: "", steps: [], expected_result: "" }],
      kpis: [],
    },
    output_rules: [
      "Return only the keys shown in required_json_shape. CAC expands this overlay into the full report.",
      "Use strings and small arrays only. Keep the JSON short.",
      "Return 4 personas, 6 customer_doubts, 6 content_angles, and 10 priority_angles.",
      "content_angles must be concrete proof assets or content ideas, not category labels.",
      "Bad content angle examples: Product explanation, Trust building, Brand awareness, Customer engagement.",
      "Good SaaS angle example: Show the buyer's messy workflow beside the cleaner product workflow.",
      "Good local angle example: Show the exact dish, service result, booking step, price range, or proof moment.",
      "Do not start multiple ideas with Record a 15-second video or Record a short video.",
      "Captions must sound like ready-to-post customer copy, not report notes.",
      "Avoid the formula: business name plus offer plus generic action plus CTA.",
      "Message templates must sound like real replies for that industry, not one reusable sentence.",
      "Each priority_angle needs action, why, steps, and expected_result.",
      "Every priority_angle must mention the business, offer, audience, platform, website fact, competitor fact, or buyer hesitation.",
      "Never use broad labels. Write concrete actions a founder can do today.",
      "Strict constraint: The content MUST NOT contain jargon. Explain it to a 15-year-old kid.",
      "Strict constraint: Pay extremely close attention to the specific industry. If it's a D2C brand, DO NOT write about generic gifts unless it's a gifting brand. If it's B2B solar, DO NOT write about local foot traffic. If it's a nonprofit, don't treat it as a tuition service.",
      "For SaaS/software, do not mention walk-ins, local visits, orders, menu, patients, or appointments.",
      "For local businesses, use location only where it helps the buyer decide.",
      "Make the strategy sound researched, not templated.",
    ],
  };
  const skeleton = JSON.stringify(user.required_json_shape);
  const knowledgeLines = intelligence.units.slice(0, 14).map(unit =>
    `- ${unit.type}: ${compactText(unit.problem || unit.raw_hint || unit.principle, "", 140)} | proof: ${compactText(unit.proof_method, "", 60)}`,
  ).join("\n");
  const userText = [
    "Create the CAC strategy insight overlay.",
    "Return JSON only. Do not include task, business, rules, required_json_shape, or markdown.",
    "Return exactly this top-level shape, filled with content:",
    skeleton,
    "",
    "Business:",
    `Name: ${context.businessName}`,
    `Industry: ${context.businessType}`,
    `Category: ${context.parentCategory}`,
    `Location: ${context.location}`,
    `Audience: ${context.audience}`,
    `Offer: ${context.productsOrServices}`,
    `Goal: ${context.selectedGoal}`,
    `Platforms: ${context.platforms.join(", ")}`,
    "",
    "Useful knowledge:",
    knowledgeLines || "- Use buyer doubts, proof, and clear next steps.",
    "",
    "Rules:",
    ...user.output_rules,
  ].join("\n");

  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    input: user,
  };
}

function buildCompactMasterRetryPrompt({ intelligence, ruleDraft, issues = [] }) {
  const context = intelligence.context;
  const compactDraft = {
    market_read: ruleDraft.business_summary?.read,
    top_problems: asArray(ruleDraft.business_diagnosis?.top_problems).slice(0, 5),
    root_causes: asArray(ruleDraft.business_diagnosis?.root_causes).slice(0, 3),
    opportunities: asArray(ruleDraft.business_diagnosis?.opportunities).slice(0, 4),
    positioning: ruleDraft.positioning?.statement,
    proof_to_show: asArray(ruleDraft.positioning?.proof_to_show).slice(0, 5),
    personas: asArray(ruleDraft.target_personas).slice(0, 4).map(item => ({
      name: item.name,
      need: item.need,
      hesitation: item.hesitation,
      message: item.best_message,
      channel: item.best_channel,
    })),
    customer_doubts: asArray(ruleDraft.customer_objections).slice(0, 6).map(item => ({
      doubt: item.objection,
      reason: item.reason,
      answer: item.answer,
      proof: item.proof,
    })),
    content_angles: asArray(ruleDraft.content_pillars).slice(0, 6).map(item => ({
      angle: item.pillar,
      purpose: item.purpose,
      proof: item.proof_needed,
    })),
    priority_angles: asArray(ruleDraft.marketing_priorities).slice(0, 10).map(item => ({
      action: item.priority,
      why: item.why,
      steps: asArray(item.how).slice(0, 3),
      expected_result: item.expected_result,
    })),
    kpis: asArray(ruleDraft.kpis).slice(0, 6),
  };
  const system = [
    "Return one valid compact JSON object only.",
    "No markdown. No code fence. No comments. No text before or after JSON.",
    "Use simple English and keep strings short.",
  ].join(" ");
  const user = {
    task: "Repair this safe master strategy into valid JSON. Keep the same shape and make wording specific.",
    failed_checks: issues,
    business: {
      name: context.businessName,
      industry: context.businessType,
      location: context.location,
      audience: context.audience,
      offer: context.productsOrServices,
      goal: context.selectedGoal,
      platforms: context.platforms,
    },
    safe_draft: compactDraft,
    rules: [
      "Do not add markdown.",
      "Do not use generic labels.",
      "Return only the same top-level keys as safe_draft.",
      "Every priority needs why, how, expected_result.",
      "Use actual offer words in titles and examples.",
    ],
  };
  const userText = [
    "Repair this into valid compact JSON.",
    "Return JSON only. Do not include task, business, rules, safe_draft, or markdown.",
    "Use this exact top-level shape and improve wording where useful:",
    JSON.stringify(compactDraft),
    "",
    "Business:",
    `Name: ${context.businessName}`,
    `Industry: ${context.businessType}`,
    `Location: ${context.location}`,
    `Audience: ${context.audience}`,
    `Offer: ${context.productsOrServices}`,
    `Goal: ${context.selectedGoal}`,
    `Platforms: ${context.platforms.join(", ")}`,
    "",
    `Failed checks: ${issues.join("; ") || "invalid JSON"}`,
    "Rules:",
    ...user.rules,
  ].join("\n");
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    input: user,
  };
}

function buildTinyMasterRetryPrompt({ intelligence, ruleDraft, issues = [] }) {
  const context = intelligence.context;
  const doubts = asArray(ruleDraft.customer_objections).slice(0, 3).map(item => clean(item.objection)).filter(Boolean);
  const proof = asArray(ruleDraft.positioning?.proof_to_show).slice(0, 3).map(item => clean(item)).filter(Boolean);
  const system = [
    "Return valid JSON only.",
    "No markdown, no code fence, no explanation.",
    "Keep every value short.",
  ].join(" ");
  const shape = {
    market_read: "",
    top_problems: [],
    root_causes: [],
    opportunities: [],
    positioning: "",
    proof_to_show: [],
    customer_doubts: [],
    content_angles: [],
    priority_angles: [],
    kpis: [],
  };
  const user = {
    task: "Return a tiny AI overlay for this marketing strategy. CAC will expand it safely after parsing.",
    failed_checks: issues,
    business: {
      name: context.businessName,
      industry: context.businessType,
      location: context.location,
      audience: context.audience,
      offer: context.productsOrServices,
      goal: context.selectedGoal,
      platforms: context.platforms,
      known_doubts: doubts,
      useful_proof: proof,
    },
    required_json_shape: shape,
  };
  const userText = [
    "Create a tiny JSON object using exactly these keys:",
    JSON.stringify(Object.keys(shape)),
    "",
    "Business:",
    `Name: ${context.businessName}`,
    `Industry: ${context.businessType}`,
    `Location: ${context.location}`,
    `Audience: ${context.audience}`,
    `Offer: ${context.productsOrServices}`,
    `Goal: ${context.selectedGoal}`,
    `Platforms: ${context.platforms.join(", ")}`,
    `Known doubts: ${doubts.join(" | ") || "customer hesitation"}`,
    `Useful proof: ${proof.join(" | ") || "real proof"}`,
    "",
    `Failed checks: ${issues.join("; ") || "invalid JSON"}`,
    "",
    "Rules:",
    "- JSON only.",
    "- No markdown.",
    "- market_read and positioning are strings under 120 characters.",
    "- top_problems, root_causes, opportunities, proof_to_show, kpis are short string arrays.",
    "- customer_doubts is an array of objects with doubt, reason, answer, proof.",
    "- content_angles is an array of objects with angle, purpose, proof.",
    "- priority_angles is an array of objects with action, why, steps, expected_result.",
    "- Use the business offer and audience in the wording.",
  ].join("\n");
  return {
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
    input: user,
  };
}

function validateMasterStrategy(master, context) {
  const text = lower(flattenText(master));
  const issues = [];
  for (const phrase of BANNED_GENERIC_PHRASES) {
    if (text.includes(phrase)) issues.push(`Generic phrase found: ${phrase}`);
  }
  if (!text.includes(lower(context.businessName))) {
    issues.push("Master strategy does not mention the business name enough.");
  }
  if (asArray(master?.priority_angles).length < 10) issues.push("Missing 10 priority angles.");
  if (asArray(master?.customer_doubts).length < 6) issues.push("Missing 6 customer doubts.");
  if (asArray(master?.content_angles).length < 6) issues.push("Missing 6 content angles.");
  if (asArray(master?.personas).length < 4) issues.push("Missing 4 personas.");
  if (context.parentCategory === "software" && /\bwalk[- ]?ins?|nearby customers?|menu|patients?|appointments?|local shop|orders?\b/.test(text)) {
    issues.push("Software strategy contains local shop, clinic, or order language.");
  }
  if (context.parentCategory === "software" && /\b(pretty posts?|page audit|content package|retainer conversation|site visit)\b/.test(text)) {
    issues.push("Software strategy contains agency or local-service language.");
  }
  const semanticAlignment = validateSemanticAlignment(master, context);
  issues.push(...semanticAlignment.issues);
  const metrics = scoreMasterStrategy(master, context, { units: [] });
  issues.push(...qualityIssueMessages(metrics));
  return {
    passed: issues.length === 0,
    issues,
    qualityScore: Math.min(metrics.master_strategy_quality_score, Math.max(0, 100 - issues.length * 10)),
    metrics,
    semanticAlignment,
  };
}

function overlayToMasterCore(data, context) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  const hasOverlayShape = data.market_read
    || data.top_problems
    || data.priority_angles
    || data.content_angles
    || data.customer_doubts
    || data.personas;
  if (!hasOverlayShape && data.required_json_shape && typeof data.required_json_shape === "object") {
    return overlayToMasterCore(data.required_json_shape, context);
  }
  if (!hasOverlayShape && data.safe_draft && typeof data.safe_draft === "object") {
    return overlayToMasterCore(data.safe_draft, context);
  }
  if (!hasOverlayShape) return data;
  return {
    business_summary: {
      read: clean(data.market_read || data.business_read, `${context.businessName} needs a clearer path to ${actionPhrase(context)}.`),
      market_read: clean(data.market_read, ""),
    },
    business_diagnosis: {
      top_problems: asArray(data.top_problems).map(item => clean(item)).filter(Boolean),
      root_causes: asArray(data.root_causes).map(item => clean(item)).filter(Boolean),
      opportunities: asArray(data.opportunities).map(item => clean(item)).filter(Boolean),
      competitive_gaps: asArray(data.competitive_gaps).map(item => clean(item)).filter(Boolean),
      risk_warnings: asArray(data.risk_warnings).map(item => clean(item)).filter(Boolean),
    },
    positioning: {
      statement: clean(data.positioning, ""),
      one_liner: clean(data.one_liner, ""),
      proof_to_show: asArray(data.proof_to_show).map(item => clean(item)).filter(Boolean),
      category_enemy: clean(data.category_enemy, ""),
    },
    target_personas: asArray(data.personas).map((item, index) => {
      const focus = businessFacingFocus(context, offerFocus(context, index), index);
      if (typeof item === "string") {
        return {
          name: item,
          need: `A clear reason to choose ${context.businessName}.`,
          hesitation: `They need proof about ${focus}.`,
          best_message: `${context.businessName} can guide the next step clearly.`,
          best_channel: context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram",
        };
      }
      return {
        name: clean(item.name || item.label, `Customer type ${index + 1}`),
        need: clean(item.need || item.what_they_want, `A clear reason to choose ${context.businessName}.`),
        hesitation: clean(item.hesitation || item.doubt || item.what_may_stop_them, `They need proof about ${focus}.`),
        best_message: clean(item.message || item.best_message, `${context.businessName} can guide the next step clearly.`),
        best_channel: clean(item.channel || item.best_channel, context.platforms[index % Math.max(1, context.platforms.length)] || "Instagram"),
      };
    }),
    customer_objections: asArray(data.customer_doubts || data.objections).map((item, index) => {
      const focus = businessFacingFocus(context, offerFocus(context, index), index);
      if (typeof item === "string") {
        return {
          objection: item,
          reason: `This can stop ${context.audience} before they ask about ${focus}.`,
          answer: `Show proof for ${focus} and make the next step clear.`,
          proof: "real proof",
        };
      }
      return {
        objection: clean(item.doubt || item.objection || item.problem, `Customer doubt ${index + 1}`),
        reason: clean(item.reason || item.why, `This can slow down ${actionPhrase(context)}.`),
        answer: clean(item.answer || item.solution, `Show proof for ${focus} and make the next step clear.`),
        proof: clean(item.proof || item.proof_needed, "real proof"),
      };
    }),
    content_pillars: asArray(data.content_angles || data.pillars).map((item, index) => {
      const focus = businessFacingFocus(context, offerFocus(context, index), index);
      if (typeof item === "string") {
        return {
          pillar: item,
          purpose: `Help ${context.audience} understand ${focus}.`,
          proof_needed: "real proof",
        };
      }
      return {
        pillar: clean(item.angle || item.pillar || item.title, `Content angle ${index + 1}`),
        purpose: clean(item.purpose || item.why, `Help ${context.audience} understand ${focus}.`),
        proof_needed: clean(item.proof || item.proof_needed, "real proof"),
      };
    }),
    marketing_priorities: asArray(data.priority_angles || data.priorities).map((item, index) => {
      const focus = businessFacingFocus(context, offerFocus(context, index), index);
      if (typeof item === "string") {
        return {
          priority: item,
          why: `This helps ${context.businessName} move ${context.audience} closer to ${actionPhrase(context)}.`,
          how: [`Use ${focus} as the proof point.`, `Publish it on ${context.platforms[index % Math.max(1, context.platforms.length)] || "the main channel"}.`],
          expected_result: baseMetric(context),
        };
      }
      return {
        priority: clean(item.action || item.priority || item.title, `Priority ${index + 1}`),
        why: clean(item.why || item.reason, `This helps ${context.businessName} move ${context.audience} closer to ${actionPhrase(context)}.`),
        how: asArray(item.steps || item.how || item.action_steps).map(step => clean(step)).filter(Boolean).slice(0, 3),
        expected_result: clean(item.expected_result || item.metric, baseMetric(context)),
      };
    }),
    kpis: asArray(data.kpis).map(item => clean(item)).filter(Boolean),
  };
}

async function callAiForMaster(requestContext, { sessionUserId, businessProfile, intelligence, ruleDraft, issues = [], sectionName }) {
  const prompt = sectionName?.includes(":tiny_json_retry")
    ? buildTinyMasterRetryPrompt({ intelligence, ruleDraft, issues })
    : sectionName?.includes(":json_retry")
    ? buildCompactMasterRetryPrompt({ intelligence, ruleDraft, issues })
    : buildMasterPrompt({ intelligence, ruleDraft });
  const messages = issues.length && !sectionName?.includes(":json_retry")
    ? [
        prompt.messages[0],
        {
          role: "user",
          content: `${prompt.messages[1].content}\n\nPrevious output failed these checks. Rewrite the master strategy JSON and fix only these problems:\n${JSON.stringify(issues)}`,
        },
      ]
    : prompt.messages;

  return callControlledAi(requestContext, {
    userId: sessionUserId,
    featureType: "master_strategy",
    sectionName,
    promptVersion: PROMPT_VERSION,
    businessProfile,
    input: {
      ...prompt.input,
      rewrite_issues: issues,
    },
    messages,
    temperature: sectionName?.includes("retry") ? 0.12 : 0.32,
    maxTokens: sectionName?.includes(":tiny_json_retry") ? 900 : 2000,
    responseFormat: "json",
    fallback: null,
  });
}

export async function createMasterStrategy(requestContext, {
  sessionUserId,
  businessProfile,
  rawBiz,
  lineage = [],
  internetSignals = null,
  forceRuleBased = false,
  forceAiFailure = false,
}) {
  const db = requestContext?.env?.DB || requestContext?.DB || null;
  const intelligence = await retrieveMarketingIntelligence({
    db,
    businessProfile,
    rawBiz,
    lineage,
    internetSignals,
  });
  intelligence.rawBiz = rawBiz;
  const ruleDraft = expandMasterStrategy(null, {
    marketingOS: intelligence.marketingOS,
    intelligence,
  });
  const beforeValidation = validateMasterStrategy(ruleDraft, intelligence.context);
  const beforeMetrics = scoreMasterStrategy(ruleDraft, intelligence.context, intelligence);
  beforeValidation.qualityScore = Math.min(beforeValidation.qualityScore, beforeMetrics.master_strategy_quality_score);

  if (forceRuleBased || forceAiFailure) {
    const fallbackReason = forceAiFailure
      ? "Forced AI failure test. CAC used the structured offline master strategy fallback."
      : "Rule-based fallback requested. CAC used the structured offline master strategy fallback.";
    const fallback = {
      ...ruleDraft,
      _meta: {
        prompt_version: PROMPT_VERSION,
        generation_source: "offline_master_strategy",
        ai_calls_count: 0,
        ai_enhanced: false,
        fallback_used: true,
        fallback_reason: fallbackReason,
        knowledge_units_used: intelligence.units.length,
        strategy_blocks_used_as_output: 0,
        strategy_blocks_repurposed_as_knowledge: intelligence.stats.strategy_blocks_repurposed,
        quality_score_before_ai: beforeValidation.qualityScore,
        quality_score_after_ai: beforeValidation.qualityScore,
        master_strategy_quality_score: beforeMetrics.master_strategy_quality_score,
        knowledge_categories_used: beforeMetrics.knowledge_categories_used,
        duplicate_recommendation_score: beforeMetrics.duplicate_recommendation_score,
        generic_language_score: beforeMetrics.generic_language_score,
        business_specificity_score: beforeMetrics.business_specificity_score,
        why_how_impact_score: beforeMetrics.why_how_impact_score,
        template_likeness_score: beforeMetrics.template_likeness_score,
        template_likeness_hits: beforeMetrics.template_likeness_hits,
        human_agency_review_score: beforeMetrics.human_agency_review_score,
        caption_ready_ratio: beforeMetrics.caption_ready_ratio,
        message_ready_ratio: beforeMetrics.message_ready_ratio,
        execution_ready_ratio: beforeMetrics.execution_ready_ratio,
        page_execution_score: beforeMetrics.page_execution_score,
        page_execution_failures: beforeMetrics.page_execution_failures,
        verb_diversity_score: beforeMetrics.verb_diversity_score,
        verb_diversity_failures: beforeMetrics.verb_diversity_failures,
        dominant_action_verb: beforeMetrics.dominant_action_verb,
        content_mix_score: beforeMetrics.content_mix_score,
        content_mix_failures: beforeMetrics.content_mix_failures,
        content_mix_unique_categories: beforeMetrics.content_mix_unique_categories,
        content_mix_largest_category_count: beforeMetrics.content_mix_largest_category_count,
        cross_page_distinctness_score: beforeMetrics.cross_page_distinctness_score,
        cross_page_distinctness_failures: beforeMetrics.cross_page_distinctness_failures,
        reviewer_quality_scores: beforeMetrics.reviewer_quality_scores,
        reviewer_min_score: beforeMetrics.reviewer_min_score,
        reviewer_failures: beforeMetrics.reviewer_failures,
        schema_valid: beforeValidation.passed,
        retrieved_pack_ids: intelligence.retrievedPackIds,
      },
    };
    return {
      masterStrategy: fallback,
      intelligence,
      telemetry: fallback._meta,
    };
  }

  const sectionName = `${intelligence.context.parentCategory}:${intelligence.context.selectedGoal}:master`;
  let first = await callAiForMaster(requestContext, {
    sessionUserId,
    businessProfile,
    intelligence,
    ruleDraft,
    sectionName,
  });

  if (!first.ok && /invalid json/i.test(first.error || first.reason || "")) {
    first = await callAiForMaster(requestContext, {
      sessionUserId,
      businessProfile,
      intelligence,
      ruleDraft,
      sectionName: `${sectionName}:json_retry`,
      issues: [
        "The previous response was not valid JSON.",
        "Return one compact JSON object only.",
        "No markdown, no code fence, no comments, no text before or after JSON.",
      ],
    });
  }

  if (!first.ok && /invalid json/i.test(first.error || first.reason || "")) {
    first = await callAiForMaster(requestContext, {
      sessionUserId,
      businessProfile,
      intelligence,
      ruleDraft,
      sectionName: `${sectionName}:json_retry_2`,
      issues: [
        "The previous retry still failed JSON parsing.",
        "Return only minified JSON that starts with { and ends with }.",
        "Use double quotes for every key and string.",
        "Do not include markdown, prose, code fences, comments, or trailing commas.",
      ],
    });
  }

  if (!first.ok && /invalid json/i.test(first.error || first.reason || "")) {
    first = await callAiForMaster(requestContext, {
      sessionUserId,
      businessProfile,
      intelligence,
      ruleDraft,
      sectionName: `${sectionName}:tiny_json_retry`,
      issues: [
        "Previous JSON attempts failed.",
        "Return a tiny JSON overlay only.",
        "Keep arrays short and strings brief.",
      ],
    });
  }

  if (!first.ok && /fetch failed|network|timeout|temporar/i.test(first.error || first.reason || first.message || "")) {
    first = await callAiForMaster(requestContext, {
      sessionUserId,
      businessProfile,
      intelligence,
      ruleDraft,
      sectionName: `${sectionName}:network_retry`,
      issues: [
        "The previous provider request failed before returning content.",
        "Return one compact JSON object only.",
      ],
    });
  }

  if (!first.ok || !first.data) {
    const fallbackReason = first.reason || first.error || first.message || "AI unavailable. CAC used the structured offline master strategy fallback.";
    const fallback = {
      ...ruleDraft,
      _meta: {
        prompt_version: PROMPT_VERSION,
        generation_source: "offline_master_strategy",
        ai_calls_count: 0,
        ai_enhanced: false,
        ai_provider: first.provider || "none",
        fallback_used: true,
        fallback_reason: fallbackReason,
        knowledge_units_used: intelligence.units.length,
        strategy_blocks_used_as_output: 0,
        strategy_blocks_repurposed_as_knowledge: intelligence.stats.strategy_blocks_repurposed,
        quality_score_before_ai: beforeValidation.qualityScore,
        quality_score_after_ai: beforeValidation.qualityScore,
        master_strategy_quality_score: beforeMetrics.master_strategy_quality_score,
        knowledge_categories_used: beforeMetrics.knowledge_categories_used,
        duplicate_recommendation_score: beforeMetrics.duplicate_recommendation_score,
        generic_language_score: beforeMetrics.generic_language_score,
        business_specificity_score: beforeMetrics.business_specificity_score,
        why_how_impact_score: beforeMetrics.why_how_impact_score,
        template_likeness_score: beforeMetrics.template_likeness_score,
        template_likeness_hits: beforeMetrics.template_likeness_hits,
        human_agency_review_score: beforeMetrics.human_agency_review_score,
        caption_ready_ratio: beforeMetrics.caption_ready_ratio,
        message_ready_ratio: beforeMetrics.message_ready_ratio,
        execution_ready_ratio: beforeMetrics.execution_ready_ratio,
        page_execution_score: beforeMetrics.page_execution_score,
        page_execution_failures: beforeMetrics.page_execution_failures,
        verb_diversity_score: beforeMetrics.verb_diversity_score,
        verb_diversity_failures: beforeMetrics.verb_diversity_failures,
        dominant_action_verb: beforeMetrics.dominant_action_verb,
        content_mix_score: beforeMetrics.content_mix_score,
        content_mix_failures: beforeMetrics.content_mix_failures,
        content_mix_unique_categories: beforeMetrics.content_mix_unique_categories,
        content_mix_largest_category_count: beforeMetrics.content_mix_largest_category_count,
        cross_page_distinctness_score: beforeMetrics.cross_page_distinctness_score,
        cross_page_distinctness_failures: beforeMetrics.cross_page_distinctness_failures,
        reviewer_quality_scores: beforeMetrics.reviewer_quality_scores,
        reviewer_min_score: beforeMetrics.reviewer_min_score,
        reviewer_failures: beforeMetrics.reviewer_failures,
        schema_valid: beforeValidation.passed,
        retrieved_pack_ids: intelligence.retrievedPackIds,
      },
    };
    return {
      masterStrategy: fallback,
      intelligence,
      telemetry: fallback._meta,
    };
  }

  let aiCalls = first.cached ? 0 : 1;
  let semanticFallbackUsed = false;
  let candidate = expandMasterStrategy(overlayToMasterCore(first.data, intelligence.context), {
    marketingOS: intelligence.marketingOS,
    intelligence,
  });
  let afterValidation = validateMasterStrategy(candidate, intelligence.context);
  let afterMetrics = scoreMasterStrategy(candidate, intelligence.context, intelligence);
  afterValidation.qualityScore = Math.min(afterValidation.qualityScore, afterMetrics.master_strategy_quality_score);

  if (!afterValidation.passed) {
    const rewrite = await callAiForMaster(requestContext, {
      sessionUserId,
      businessProfile,
      intelligence,
      ruleDraft: candidate,
      sectionName: `${sectionName}:rewrite`,
      issues: afterValidation.issues,
    });
    if (rewrite.ok && rewrite.data) {
      aiCalls += rewrite.cached ? 0 : 1;
      candidate = expandMasterStrategy(overlayToMasterCore(rewrite.data, intelligence.context), {
        marketingOS: intelligence.marketingOS,
        intelligence,
      });
      afterValidation = validateMasterStrategy(candidate, intelligence.context);
      afterMetrics = scoreMasterStrategy(candidate, intelligence.context, intelligence);
      afterValidation.qualityScore = Math.min(afterValidation.qualityScore, afterMetrics.master_strategy_quality_score);
    }
  }

  if (!afterValidation.passed) {
    candidate = expandMasterStrategy(mergeWeakAiWithFallback({
      ...ruleDraft,
      ...candidate,
      marketing_priorities: afterValidation.issues.some(issue => /priorit/i.test(issue)) ? ruleDraft.marketing_priorities : candidate.marketing_priorities,
      customer_objections: afterValidation.issues.some(issue => /objection/i.test(issue)) ? ruleDraft.customer_objections : candidate.customer_objections,
      content_pillars: afterValidation.issues.some(issue => /pillar/i.test(issue)) ? ruleDraft.content_pillars : candidate.content_pillars,
    }, ruleDraft, afterMetrics, afterValidation.issues), {
      marketingOS: intelligence.marketingOS,
      intelligence,
    });
    afterValidation = validateMasterStrategy(candidate, intelligence.context);
    afterMetrics = scoreMasterStrategy(candidate, intelligence.context, intelligence);
    afterValidation.qualityScore = Math.min(afterValidation.qualityScore, afterMetrics.master_strategy_quality_score);
  }

  if (intelligence.context.briefSubtype && afterValidation.semanticAlignment?.passed === false) {
    candidate = ruleDraft;
    semanticFallbackUsed = true;
    afterValidation = validateMasterStrategy(candidate, intelligence.context);
    afterMetrics = scoreMasterStrategy(candidate, intelligence.context, intelligence);
    afterValidation.qualityScore = Math.min(afterValidation.qualityScore, afterMetrics.master_strategy_quality_score);
  }

  candidate._meta = {
    prompt_version: PROMPT_VERSION,
    generation_source: semanticFallbackUsed ? "offline_master_strategy" : "master_strategy_ai",
    ai_calls_count: aiCalls,
    ai_enhanced: !semanticFallbackUsed,
    ai_provider: first.provider || "configured_api_provider",
    ai_model: first.model || null,
    ai_cached: Boolean(first.cached),
    fallback_used: semanticFallbackUsed || !afterValidation.passed,
    fallback_reason: semanticFallbackUsed
      ? "AI master strategy failed brief semantic checks, so CAC used the validated offline strategy."
      : afterValidation.passed ? "" : "AI master strategy failed some checks, so CAC filled weak parts from offline knowledge.",
    quality_score_before_ai: beforeValidation.qualityScore,
    quality_score_after_ai: afterValidation.qualityScore,
    master_strategy_quality_score: afterMetrics.master_strategy_quality_score,
    knowledge_categories_used: afterMetrics.knowledge_categories_used,
    duplicate_recommendation_score: afterMetrics.duplicate_recommendation_score,
    duplicate_recommendation_examples: afterMetrics.duplicate_recommendation_examples,
    generic_language_score: afterMetrics.generic_language_score,
    generic_language_hits: afterMetrics.generic_language_hits,
    business_specificity_score: afterMetrics.business_specificity_score,
    why_how_impact_score: afterMetrics.why_how_impact_score,
    template_likeness_score: afterMetrics.template_likeness_score,
    template_likeness_hits: afterMetrics.template_likeness_hits,
    human_agency_review_score: afterMetrics.human_agency_review_score,
    caption_ready_ratio: afterMetrics.caption_ready_ratio,
    message_ready_ratio: afterMetrics.message_ready_ratio,
    execution_ready_ratio: afterMetrics.execution_ready_ratio,
    page_execution_score: afterMetrics.page_execution_score,
    page_execution_failures: afterMetrics.page_execution_failures,
    verb_diversity_score: afterMetrics.verb_diversity_score,
    verb_diversity_failures: afterMetrics.verb_diversity_failures,
    dominant_action_verb: afterMetrics.dominant_action_verb,
    content_mix_score: afterMetrics.content_mix_score,
    content_mix_failures: afterMetrics.content_mix_failures,
    content_mix_unique_categories: afterMetrics.content_mix_unique_categories,
    content_mix_largest_category_count: afterMetrics.content_mix_largest_category_count,
    cross_page_distinctness_score: afterMetrics.cross_page_distinctness_score,
    cross_page_distinctness_failures: afterMetrics.cross_page_distinctness_failures,
    reviewer_quality_scores: afterMetrics.reviewer_quality_scores,
    reviewer_min_score: afterMetrics.reviewer_min_score,
    reviewer_failures: afterMetrics.reviewer_failures,
    quality_issues_after_ai: afterValidation.issues,
    schema_valid: afterValidation.passed,
    knowledge_units_used: intelligence.units.length,
    knowledge_object_ids: intelligence.units.filter(unit => unit.source === "knowledge_object").map(unit => unit.id),
    retrieved_pack_ids: intelligence.retrievedPackIds,
    strategy_blocks_used_as_output: 0,
    strategy_blocks_repurposed_as_knowledge: intelligence.stats.strategy_blocks_repurposed,
    strategy_block_candidate_count: intelligence.stats.strategy_block_candidates,
  };

  return {
    masterStrategy: candidate,
    intelligence,
    telemetry: candidate._meta,
  };
}
