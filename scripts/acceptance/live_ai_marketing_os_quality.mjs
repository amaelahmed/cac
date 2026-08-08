import fs from "node:fs/promises";
import path from "node:path";
import { createMasterStrategy } from "../../functions/api/engine/masterStrategyEngine.js";
import { assembleReport } from "../../functions/api/engine/reportAssembler.js";

const ROOT = process.cwd();
const OUT_JSON = path.join(ROOT, "reports/live_ai_marketing_os_quality.json");
const OUT_MD = path.join(ROOT, "reports/live_ai_marketing_os_quality.md");
const RUN_ID = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const BANNED = [
  "show one trust signal",
  "build awareness",
  "increase engagement",
  "customers like quality",
  "name the problem",
  "post consistently",
  "take your business to the next level",
  "best quality service",
  "contact us for more details",
  "we are here to help",
  "product explanation",
  "brand awareness",
  "customer engagement",
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

const SEMANTIC_NONSENSE_PATTERNS = [
  { label: "broken_choice_grammar", pattern: /\bagainst the choice\b/i },
  { label: "broken_choice_grammar", pattern: /\bchoice\s+[^.!?]{2,80}\s+usually compare first\b/i },
  { label: "fake_persona_wording", pattern: /\bfor\s+[A-Z][a-z]+(?:[- ][A-Z][a-z]+){0,3}\s*$/ },
  { label: "random_platform_append", pattern: /\bfor\s+[a-z][a-z0-9 /&'-]{2,70}\s+on\s+(Instagram|WhatsApp|Google Business|LinkedIn|Website|Email)\.?$/i },
  { label: "business_name_as_object", pattern: /\b(ask|share|describe|tell|send)\s+[A-Z][A-Za-z0-9 .&'-]{2,50}\s+(the|a|an|what|which|how|for|with)\b/ },
  { label: "metadata_title", pattern: /\b(the proof that makes|the first [a-z0-9 /&'-]{2,50} path for|the buyer role that gets value from)\b/i },
  { label: "metadata_title", pattern: /\b(opening day tasting plate|first visit package|clearance bundle|checkup camp|matched property shortlist)\b/i },
  { label: "awkward_action_phrase", pattern: /\b(rank|qualify|localize|celebrate|prototype|price-check|audit|diagnose|rewrite)\s+the\s+(proof|first|buyer|manual|matched|guided|opening|clearance|checkup)\b/i },
  { label: "meaningless_platform_phrase", pattern: /\b(Instagram|WhatsApp|Google Business|LinkedIn|Website|Email)\s+(decision|proof|check|path|reply|helper)\b/i },
  { label: "dangling_business_focus", pattern: /\bfor\s+(accessories|brownies|grooming services|social media|performance marketing|site visits|dental cleaning|implants|employment contracts)\s+on\s+/i },
];

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
  "invite",
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

const CASES = [
  ["restaurant", "Paragon Restaurant", "Restaurant", "Kozhikode, Kerala", "Malabar biryani, seafood meals, family dining, takeaway", "families, food lovers, tourists, local diners", "Need a fresh launch-style push without sounding like a new unknown restaurant", ["Instagram", "WhatsApp", "Google Business"], ["biryani", "family", "dining", "takeaway"]],
  ["restaurant", "Urban Brew Kitchen", "Restaurant", "Kozhikode, Kerala", "shawarma, grilled chicken, juices, student dinner combos", "students, hostel crowd, office dinner buyers", "People compare it with cheaper food spots nearby", ["Instagram", "WhatsApp", "Google Business"], ["shawarma", "student", "combo", "dinner"]],
  ["cafe", "Third Wave Coffee", "Cafe / Coffee Shop", "Bengaluru, India", "specialty coffee, workspace seating, pastries, takeaway coffee", "young professionals, students, remote workers", "Need more weekday repeat visits and delivery orders", ["Instagram", "Google Business", "WhatsApp"], ["coffee", "workspace", "weekday", "pastry"]],
  ["cafe", "Bean Square Calicut", "Cafe", "Calicut, Kerala", "cold coffee, brownies, sandwiches, takeaway combos", "students and young professionals", "People do not know the combos or why to choose this cafe", ["Instagram", "WhatsApp", "Google Business"], ["cold coffee", "brownie", "combo", "students"]],
  ["salon", "Naturals Salon", "Salon / Beauty", "India", "haircut, facials, bridal makeup, grooming services", "women, event-ready customers, working professionals", "Need more appointment bookings and trust before visiting", ["Instagram", "WhatsApp", "Google Business"], ["salon", "appointment", "makeup", "facial"]],
  ["salon", "Glow Room Salon", "Salon", "Kozhikode, Kerala", "hair styling, facials, bridal makeup, party grooming", "college students and local women", "Customers ask prices but do not confirm slots", ["Instagram", "WhatsApp", "Google Business"], ["slot", "bridal", "hair", "price"]],
  ["gym", "Cult.fit", "Gym / Fitness", "India", "group workouts, strength training, fitness classes, app-led programs", "beginners, office workers, people restarting fitness", "People delay joining because they fear inconsistency", ["Instagram", "Website", "Google Business"], ["workout", "class", "beginner", "fitness"]],
  ["gym", "Iron Hour Gym", "Gym / Fitness Center", "Kozhikode, Kerala", "beginner training, weight-loss programs, strength training", "beginners and young professionals", "People are scared they will feel awkward in the gym", ["Instagram", "WhatsApp", "Google Business"], ["trainer", "trial", "beginner", "routine"]],
  ["saas", "HubSpot CRM", "SaaS / Software", "Online", "CRM software, lead management, sales pipeline, marketing platform", "business teams managing leads and customer data", "Need more qualified CRM leads without sounding like a complex enterprise tool", ["Website", "LinkedIn", "Email"], ["CRM", "lead", "demo", "workflow"]],
  ["saas", "QueuePilot", "SaaS / Software", "India", "queue management software for clinics and reception teams", "clinic owners and reception teams", "Clinics waste time managing queues manually", ["Website", "LinkedIn", "Email"], ["queue", "workflow", "demo", "setup"]],
  ["law", "CivicPoint Legal", "Law Firm", "Kozhikode, Kerala", "property documents, startup agreements, contract review, legal consultation", "families, founders, property buyers, small business owners", "People contact lawyers too late because legal help feels expensive", ["LinkedIn", "WhatsApp", "Google Business"], ["legal", "consultation", "document", "contract"]],
  ["law", "ClearCase Legal", "Law Firm", "Bengaluru, India", "startup compliance, employment contracts, founder agreements, legal advisory", "startup founders and small businesses", "Founders delay legal work until a problem becomes urgent", ["LinkedIn", "Website", "Email"], ["founder", "contract", "consultation", "legal"]],
  ["agency", "Schbang", "Marketing Agency", "India", "brand strategy, creative campaigns, social media, performance marketing", "growth teams, founders, brand managers", "Need to prove strategy quality before retainer conversations", ["LinkedIn", "Instagram", "Website"], ["strategy", "campaign", "audit", "creative"]],
  ["agency", "PixelProof Studio", "Marketing Agency", "Kozhikode, Kerala", "branding, reels, ad campaigns, business strategy audits", "small business owners and founders", "Owners think agencies only make pretty posts", ["Instagram", "WhatsApp", "LinkedIn"], ["audit", "strategy", "content", "proof"]],
  ["dental", "Clove Dental", "Dental Clinic", "India", "dental consultation, cleaning, braces, implants, treatment guidance", "families and adults who want safe dental care", "Patients delay treatment because they fear pain and cost", ["Instagram", "WhatsApp", "Google Business"], ["dental", "appointment", "doctor", "safety"]],
  ["dental", "SmileDock Dental", "Dental Clinic", "Kozhikode, Kerala", "dental cleaning, braces, implants, tooth pain consultation", "families and working adults", "Patients want trust before booking a dental visit", ["Instagram", "WhatsApp", "Google Business"], ["dental", "checkup", "appointment", "safe"]],
  ["real_estate", "Sobha Realty", "Real Estate Agency", "India", "apartments, villas, property consultation, site visits", "home buyers and investors", "Buyers need confidence before booking a site visit", ["Instagram", "WhatsApp", "Google Business"], ["property", "site visit", "budget", "area"]],
  ["real_estate", "Northline Properties", "Real Estate Agency", "Kozhikode, Kerala", "apartments, plots, rentals, site visit support", "home buyers, tenants, property owners", "Lead quality is inconsistent because buyers do not share budget clearly", ["Instagram", "WhatsApp", "Google Business"], ["property", "budget", "area", "site visit"]],
  ["retail", "Cartroid", "Retail / Customised Gifts", "Kozhikode, Kerala", "customised gifts, trendy products, student gift packs", "students and Gen-Z gift buyers", "People worry customised gifts will look cheap or arrive late", ["Instagram", "WhatsApp", "Google Business"], ["gift", "preview", "student", "custom"]],
  ["retail", "Nila Boutique", "Retail / Clothing Store", "Kozhikode, Kerala", "kurtis, ethnic outfits, accessories, college-friendly styling", "college students and young women", "Old stock is stuck and discounts may hurt brand value", ["Instagram", "WhatsApp", "Google Business"], ["size", "outfit", "stock", "style"]],
].map(([category, name, industry, location, offer, audience, challenge, platforms, expectedTerms]) => ({
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  category,
  biz: {
    biz_name: name,
    biz_industry: industry,
    biz_location: location,
    biz_goal: category === "salon" || category === "gym" || category === "dental" ? "get_more_bookings" : "get_leads",
    biz_offer: offer,
    biz_audience: audience,
    biz_problem: challenge,
    biz_channels: platforms,
    biz_budget: "Low to medium",
  },
  expectedTerms,
}));

async function loadEnvFile(file = ".env") {
  try {
    const text = await fs.readFile(path.join(ROOT, file), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Local CI may inject env vars instead of using .env.
  }
}

function profileFromBiz(biz) {
  return {
    identity: { name: biz.biz_name, type: biz.biz_industry, stage: "Production-like quality test" },
    market: { industry: biz.biz_industry, location: biz.biz_location, category: biz.biz_industry },
    customers: { target: biz.biz_audience, challenge: biz.biz_problem },
    offering: { coreOffer: biz.biz_offer, usp: biz.biz_offer },
    channels: { platforms: biz.biz_channels },
    economics: { marketingBudget: biz.biz_budget },
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function businessWordsFor(testCase = {}) {
  const fromCases = CASES.flatMap(item => item.biz.biz_name.toLowerCase().split(/[^a-z0-9]+/));
  const fromCase = [
    testCase.biz?.biz_name,
    testCase.biz?.biz_location,
  ].flatMap(value => clean(value).toLowerCase().split(/[^a-z0-9]+/));
  return new Set([...fromCases, ...fromCase].filter(word => word.length >= 2));
}

function stripLeadingBusinessWords(text, testCase = {}) {
  const businessWords = businessWordsFor(testCase);
  let source = clean(text)
    .toLowerCase()
    .replace(/^[^a-z0-9]+/g, "")
    .replace(/^[a-z0-9 .&'/-]{2,60}:\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const first = source.split(/\s+/)[0];
    if (!first || !businessWords.has(first)) break;
    source = source.split(/\s+/).slice(1).join(" ").trim();
  }
  return source;
}

function actualActionVerbStarter(text, testCase = {}) {
  const source = stripLeadingBusinessWords(text, testCase);
  for (const starter of ACTION_VERB_STARTERS) {
    const escaped = starter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`^${escaped}\\b`, "i").test(source)) return starter;
  }
  return "";
}

function actionVerbTextsFromReport(report) {
  const tabs = report?.tabs || {};
  return [
    ...asArray(tabs.strategy?.steps).flatMap(item => [item?.title, item?.exact_action]),
    ...asArray(tabs.calendar?.days).flatMap(item => [item?.title, item?.exact_content_idea]),
    ...asArray(tabs.ideas?.experiments).flatMap(item => [item?.title, item?.exact_action]),
    ...asArray(tabs.painPoints?.items).flatMap(item => [item?.content_idea, item?.exact_action]),
    ...asArray(tabs.premiumGrowth?.modules).flatMap(item => [item?.title, item?.exact_action]),
  ].map(clean).filter(Boolean);
}

function actionVerbTextsFromSample(sampleData = {}) {
  return [
    sampleData.day1,
    sampleData.day2,
    sampleData.day3,
    sampleData.strategy1,
    sampleData.caption1,
    sampleData.caption2,
    sampleData.caption3,
    sampleData.message1,
    sampleData.message2,
    sampleData.message3,
  ].map(clean).filter(Boolean);
}

function actionVerbReview(texts, testCase = {}, limit = 8) {
  const counts = new Map();
  for (const text of texts.map(clean).filter(Boolean)) {
    const starter = actualActionVerbStarter(text, testCase);
    if (!starter) continue;
    counts.set(starter, (counts.get(starter) || 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const dominant = entries[0] ? `${entries[0][0]}:${entries[0][1]}` : "";
  const failures = entries
    .filter(([, count]) => count > limit)
    .map(([verb, count]) => `actual_action_verb_over_${limit}:${verb}:${count}`);
  return {
    dominant,
    counts: Object.fromEntries(entries),
    failures,
  };
}

function flattenStrings(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach(item => flattenStrings(item, out));
  else if (typeof value === "object") Object.values(value).forEach(item => flattenStrings(item, out));
  return out;
}

function containsAny(strings, terms) {
  return terms.filter(term => strings.some(item => item.toLowerCase().includes(String(term).toLowerCase())));
}

function sentenceStem(text, length = 6) {
  const businessWords = CASES
    .flatMap(testCase => testCase.biz.biz_name.toLowerCase().split(/[^a-z0-9]+/))
    .filter(Boolean)
    .join("|");
  const businessPattern = businessWords ? new RegExp(`\\b(${businessWords})\\b`, "g") : null;
  let source = clean(text).toLowerCase().replace(/[^a-z0-9]+/g, " ");
  if (businessPattern) source = source.replace(businessPattern, " ");
  return source
    .replace(/\b(the|and|for|with|this|that|your|their|business|customer|customers|people|before|after)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, length)
    .join(" ");
}

function openingStem(text, length = 7) {
  return clean(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(paragon|urban|brew|third|wave|bean|square|calicut|naturals|glow|room|cult|iron|hour|hubspot|queuepilot|civicpoint|clearcase|schbang|pixelproof|clove|smiledock|sobha|northline|cartroid|nila|kozhikode|bengaluru|india)\b/g, " ")
    .replace(/\b(malabar|biryani|shawarma|coffee|cold|haircut|styling|crm|queue|dental|kurtis|customised|gifts)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, length)
    .join(" ");
}

function dayTitleStructure(text) {
  return clean(text)
    .toLowerCase()
    .replace(/[^a-z0-9:]+/g, " ")
    .replace(/\b(paragon|urban|brew|third|wave|bean|square|calicut|naturals|glow|room|cult|iron|hour|hubspot|queuepilot|civicpoint|clearcase|schbang|pixelproof|clove|smiledock|sobha|northline|cartroid|nila|kozhikode|bengaluru|india)\b/g, " ")
    .replace(/\b(malabar|biryani|shawarma|grilled|chicken|juices|specialty|coffee|workspace|pastries|cold|brownies|sandwiches|haircut|facials|bridal|makeup|grooming|hair|styling|workouts|strength|fitness|classes|crm|lead|sales|pipeline|queue|management|clinics|property|documents|startup|agreements|contract|review|branding|reels|campaigns|dental|consultation|cleaning|braces|implants|apartments|villas|plots|rentals|customised|gifts|trendy|student|kurtis|ethnic|outfits)\b/g, "x")
    .replace(/\b(they|will|what|how|is|are|does|do|can|i|my|their|this|that|not|know|worry|fear|need|want|trust|before|after)\b/g, "q")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 9)
    .join(" ");
}

function structuralSkeleton(text, length = 13) {
  return clean(text)
    .toLowerCase()
    .replace(/^[a-z0-9 /-]{2,48}:\s*/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(paragon|urban|brew|third|wave|bean|square|calicut|naturals|glow|room|cult|iron|hour|hubspot|queuepilot|civicpoint|clearcase|schbang|pixelproof|clove|smiledock|sobha|northline|cartroid|nila|kozhikode|bengaluru|india)\b/g, "x")
    .replace(/\b(family|meal|hostel|dinner|workday|after|class|cafe|event|look|college|styling|restart|fitness|first|gym|week|sales|pipeline|clinic|queue|founder|legal|brand|growth|local|owner|content|family|dental|visit|home|buyer|shortlist|property|search|custom|gift|outfit|student|students|gen|young|professional|professionals|remote|workers|office|families|food|lovers|tourists|diners|women|beginners|teams|patients|founders|managers|buyers|customers|people)\b/g, "x")
    .replace(/\b(malabar|biryani|shawarma|grilled|chicken|juices|specialty|coffee|workspace|pastries|cold|brownies|sandwiches|haircut|facials|bridal|makeup|grooming|hair|workouts|strength|classes|crm|lead|management|software|documents|startup|agreements|contract|review|branding|reels|campaigns|consultation|cleaning|braces|implants|apartments|villas|plots|rentals|customised|gifts|trendy|kurtis|ethnic|outfits|price|prices|budget|slot|appointment|demo|trial|menu|order|preview|photo|photos|issue|audit|shortlist|today|pick|beginner)\b/g, "x")
    .replace(/\b(the|a|an|and|or|to|for|with|your|you|we|us|our|they|their|this|that|is|are|be|being|been|will|would|should|can|could|before|after|about|from|into|when|what|how|why|where)\b/g, " ")
    .replace(/\bx(\s+x)+\b/g, "x")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, length)
    .join(" ");
}

function findRepeated(values, mapper, label) {
  const groups = new Map();
  for (const value of values.map(clean).filter(Boolean)) {
    const key = mapper(value);
    if (!key || key.split(" ").length < 4) continue;
    const list = groups.get(key) || [];
    list.push(value);
    groups.set(key, list);
  }
  return [...groups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({ label, key, count: list.length, examples: list.slice(0, 4) }));
}

function templateLikenessReview(texts) {
  const cleaned = texts.map(clean).filter(Boolean);
  if (!cleaned.length) return { score: 100, hits: ["No sample text found."] };
  const weakPatterns = [
    /record a 15[-\s]?second video/i,
    /record a short video/i,
    /showcase/i,
    /hi,?\s+thanks for asking/i,
    /tell us what you need/i,
    /we will guide the next step/i,
    /^.+:\s*.+:\s*/i,
    ...ROBOTIC_OUTPUT_PATTERNS,
  ];
  const weakHits = cleaned.filter(text => weakPatterns.some(pattern => pattern.test(text)));
  const stems = new Map();
  for (const text of cleaned) {
    const stem = sentenceStem(text);
    if (stem.split(" ").length < 4) continue;
    stems.set(stem, (stems.get(stem) || 0) + 1);
  }
  const repeated = [...stems.entries()].filter(([, count]) => count > 2);
  const repeatedCount = repeated.reduce((sum, [, count]) => sum + count - 2, 0);
  const score = Math.min(100, Math.round(
    (weakHits.length / cleaned.length) * 52
    + (repeatedCount / cleaned.length) * 48
  ));
  return {
    score,
    hits: [
      ...weakHits.slice(0, 8),
      ...repeated.slice(0, 8).map(([stem, count]) => `Repeated opening "${stem}" (${count}x)`),
    ],
  };
}

function humanReadabilityReview(results) {
  const fields = [];
  for (const result of results) {
    for (const [field, value] of Object.entries(result.sample || {})) {
      if (/^(day|caption|message)/.test(field)) {
        fields.push({ business: result.biz.biz_name, field, text: clean(value) });
      }
    }
  }
  const failures = [];
  for (const item of fields) {
    if (!item.text) continue;
    if (ROBOTIC_OUTPUT_PATTERNS.some(pattern => pattern.test(item.text))) {
      failures.push({ label: "robotic_phrase", ...item });
    }
    if (/^day/i.test(item.field) && /\b(Instagram|WhatsApp|Google Business|LinkedIn|Website|Search\/profile)\b.*\b(decision|proof|check)\b/i.test(item.text)) {
      failures.push({ label: "metadata_title", ...item });
    }
    if (/^caption/i.test(item.field) && /^[a-z]/.test(item.text)) {
      failures.push({ label: "caption_not_sentence_case", ...item });
    }
    if (/^message/i.test(item.field) && /^[a-z]/.test(item.text)) {
      failures.push({ label: "message_not_sentence_case", ...item });
    }
    if (/\b(should see|should make|should feel|should show|needs one believable reason|content should answer|doubts should be handled)\b/i.test(item.text)) {
      failures.push({ label: "internal_strategy_language", ...item });
    }
  }
  return {
    passed: failures.length === 0,
    failures,
  };
}

function semanticTextEntriesFromReport(testCase, report) {
  const tabs = report?.tabs || {};
  const biz = testCase?.biz || {};
  const entries = [];
  const push = (field, value) => {
    const text = clean(value);
    if (text) entries.push({ business: biz.biz_name || "unknown", field, text });
  };
  asArray(tabs.strategy?.steps).forEach((item, index) => {
    push(`strategy_title_${index + 1}`, item?.title);
    push(`strategy_action_${index + 1}`, item?.exact_action);
  });
  asArray(tabs.calendar?.days).forEach((item, index) => {
    push(`calendar_title_${index + 1}`, item?.title);
    push(`calendar_idea_${index + 1}`, item?.exact_content_idea);
    push(`calendar_caption_${index + 1}`, item?.caption || item?.ready_caption);
  });
  asArray(tabs.captions?.caption_bank).forEach((item, index) => push(`caption_${index + 1}`, item));
  asArray(tabs.templates?.templates).forEach((item, index) => push(`message_${index + 1}`, item?.template || item?.message));
  asArray(tabs.clientPersona?.personas).forEach((item, index) => {
    push(`persona_name_${index + 1}`, item?.name);
    push(`persona_sell_${index + 1}`, item?.how_to_sell);
  });
  asArray(tabs.painPoints?.items).forEach((item, index) => {
    push(`pain_problem_${index + 1}`, item?.problem || item?.customer_problem);
    push(`pain_action_${index + 1}`, item?.exact_action || item?.what_to_do);
    push(`pain_content_${index + 1}`, item?.content_idea || item?.post_idea);
  });
  asArray(tabs.ideas?.experiments).forEach((item, index) => {
    push(`idea_title_${index + 1}`, item?.title);
    push(`idea_action_${index + 1}`, item?.exact_action);
  });
  asArray(tabs.premiumGrowth?.modules).forEach((item, index) => {
    push(`advanced_title_${index + 1}`, item?.title);
    push(`advanced_action_${index + 1}`, item?.exact_action || item?.action);
  });
  return entries;
}

function semanticTextEntriesFromSample(result = {}) {
  const business = result.biz?.biz_name || "unknown";
  return Object.entries(result.sample || {})
    .filter(([, value]) => clean(value))
    .map(([field, value]) => ({ business, field, text: clean(value) }));
}

function semanticQualityReview(entries = []) {
  const failures = [];
  for (const item of asArray(entries)) {
    const text = clean(item.text);
    if (!text) continue;
    for (const rule of SEMANTIC_NONSENSE_PATTERNS) {
      if (rule.pattern.test(text)) {
        failures.push({ label: rule.label, business: item.business, field: item.field, text });
        break;
      }
    }
    if (/^calendar_title|^strategy_title|^idea_title|^advanced_title|^day|^strategy/.test(item.field)) {
      if (/\b(for|with)\s+[A-Z][a-z]+(?:[- ][A-Z][a-z]+){0,3}\b/.test(text) && !/\b(Gen-Z|Google Business|LinkedIn|Website|WhatsApp|Instagram)\b/.test(text)) {
        failures.push({ label: "fake_persona_title", business: item.business, field: item.field, text });
      }
      if (text.split(/\s+/).length > 14 && /\b(on|for)\s+(Instagram|WhatsApp|Google Business|LinkedIn|Website|Email)\b/i.test(text)) {
        failures.push({ label: "metadata_title_with_platform", business: item.business, field: item.field, text });
      }
    }
    if (/^message/.test(item.field) && /\b(ask|share|describe|tell|send)\s+[A-Z][A-Za-z0-9 .&'-]{2,50}\s+(the|a|an|what|which|how|for|with)\b/.test(text)) {
      failures.push({ label: "unnatural_message_object", business: item.business, field: item.field, text });
    }
  }
  return {
    passed: failures.length === 0,
    failures,
  };
}

function hardStructuralReview(results) {
  const captions = results.flatMap(result => [result.sample.caption1, result.sample.caption2, result.sample.caption3]);
  const messages = results.flatMap(result => [result.sample.message1, result.sample.message2, result.sample.message3]);
  const dayTitles = results.flatMap(result => [result.sample.day1, result.sample.day2, result.sample.day3]);
  const repeatedCaptionOpenings = findRepeated(captions, text => openingStem(text, 7), "caption_opening");
  const repeatedMessageOpenings = findRepeated(messages, text => openingStem(text, 7), "message_opening");
  const repeatedDayTitleStructures = findRepeated(dayTitles, dayTitleStructure, "day_title_structure");
  const repeatedCaptionSkeletons = findRepeated(captions, text => structuralSkeleton(text, 13), "caption_skeleton");
  const repeatedMessageSkeletons = findRepeated(messages, text => structuralSkeleton(text, 13), "message_skeleton");
  const repeatedDaySkeletons = findRepeated(dayTitles, text => structuralSkeleton(text, 10), "day_title_skeleton");
  const aboutTitles = dayTitles
    .map(clean)
    .filter(text => /\babout\s+(they|will|what|how|is|are|does|do|can|i\b|my\b)/i.test(text));
  const failures = [
    ...repeatedCaptionOpenings,
    ...repeatedMessageOpenings,
    ...repeatedDayTitleStructures,
    ...repeatedCaptionSkeletons,
    ...repeatedMessageSkeletons,
    ...repeatedDaySkeletons,
    ...aboutTitles.map(text => ({ label: "about_objection_title", key: text, count: 1, examples: [text] })),
  ];
  return {
    passed: failures.length === 0,
    failures,
    repeatedCaptionOpenings,
    repeatedMessageOpenings,
    repeatedDayTitleStructures,
    repeatedCaptionSkeletons,
    repeatedMessageSkeletons,
    repeatedDaySkeletons,
    aboutTitles,
  };
}

function customerCopyReady(sampleData) {
  const caption = clean(sampleData.caption1);
  const message = clean(sampleData.message1);
  const title = clean(sampleData.day1);
  const captionSource = caption.toLowerCase();
  const messageSource = message.toLowerCase();
  return {
    captionReady: caption.length >= 70
      && caption.length <= 260
      && !captionSource.startsWith(title.toLowerCase().slice(0, 30))
      && !/record a|create a|showcase| - /.test(captionSource)
      && !ROBOTIC_OUTPUT_PATTERNS.some(pattern => pattern.test(caption))
      && /message|reply|send|share|ask|book|demo|trial|visit|save|comment|order|preview|check|start|confirm/.test(captionSource),
    messageReady: message.length >= 70
      && message.length <= 300
      && !/thanks for asking|tell us what you need|guide the next step clearly|area\/date/.test(messageSource)
      && !ROBOTIC_OUTPUT_PATTERNS.some(pattern => pattern.test(message))
      && /send|share|message|ask|reply|book|demo|trial|visit|slot|budget|appointment|photo|menu|order|shortlist|consultation|tell|describe|write|confirm|check/.test(messageSource),
  };
}

function checkWhyHowImpact(report) {
  const steps = asArray(report?.tabs?.strategy?.steps);
  return steps.length >= 10 && steps.every(step =>
    clean(step.why_this_matters || step.reason).length >= 12
    && asArray(step.action_steps || step.steps).length >= 2
    && clean(step.track_this || step.what_to_check || step.expected_result).length >= 8
  );
}

function hasText(...values) {
  return values.some(value => clean(value).length >= 18);
}

function hasShortText(...values) {
  return values.some(value => clean(value).length >= 3);
}

function hasStepList(value, min = 3) {
  return asArray(value).filter(item => clean(item).length >= 12).length >= min;
}

function reviewList(label, list, checks, minCount) {
  const items = asArray(list);
  const failures = [];
  if (items.length < minCount) {
    failures.push({ label, item: "count", issue: `expected_${minCount}_got_${items.length}` });
  }
  items.slice(0, minCount).forEach((item, index) => {
    const missing = checks.filter(check => !check.test(item)).map(check => check.name);
    if (missing.length) failures.push({ label, item: index + 1, issue: missing.join(",") });
  });
  return failures;
}

function pageExecutionReview(report) {
  const tabs = report.tabs || {};
  const failures = [
    ...reviewList("marketing_plan", tabs.strategy?.steps, [
      { name: "exact_action", test: item => hasText(item.exact_action, item.title) },
      { name: "why", test: item => hasText(item.why_this_matters, item.reason, item.diagnosis) },
      { name: "when", test: item => hasShortText(item.when_to_do_this, item.timeline, item.week) },
      { name: "who", test: item => hasShortText(item.who_should_do_it, item.owner) },
      { name: "format", test: item => hasShortText(item.recommended_format, item.content_format, item.campaign_type) },
      { name: "how", test: item => hasStepList(item.how_to_execute || item.action_steps || item.steps, 3) },
      { name: "doubt", test: item => hasText(item.customer_doubt_solved) },
      { name: "result", test: item => hasText(item.expected_result, item.business_result, item.track_this, item.what_to_check) },
    ], 10),
    ...reviewList("customer_types", tabs.clientPersona?.personas, [
      { name: "motivation", test: item => hasText(item.motivation, item.what_they_want) },
      { name: "fear", test: item => hasText(item.fear, item.what_may_stop_them, item.objection) },
      { name: "buying_trigger", test: item => hasText(item.buying_trigger) },
      { name: "how_to_sell", test: item => hasText(item.how_to_sell, item.how_to_convince_them) },
    ], 4),
    ...reviewList("customer_problems", tabs.painPoints?.items, [
      { name: "problem", test: item => hasText(item.problem, item.customer_problem) },
      { name: "exact_action", test: item => hasText(item.exact_action, item.what_to_do) },
      { name: "when", test: item => hasShortText(item.when_to_do_this, item.timeline) },
      { name: "who", test: item => hasShortText(item.who_should_do_it, item.owner) },
      { name: "format", test: item => hasShortText(item.recommended_format, item.content_format, item.campaign_type) },
      { name: "how", test: item => hasStepList(item.how_to_execute, 3) },
      { name: "doubt", test: item => hasText(item.customer_doubt_solved, item.problem) },
      { name: "result", test: item => hasText(item.expected_result) },
    ], 15),
    ...reviewList("competitors", tabs.competitors?.archetypes, [
      { name: "why_customers_choose", test: item => hasText(item.why_customers_choose_it, asArray(item.strengths)[0]) },
      { name: "weakness", test: item => hasText(item.weakness_to_use, asArray(item.weaknesses)[0]) },
      { name: "counter_move", test: item => hasText(item.exact_counter_move, item.how_to_beat_them) },
      { name: "when", test: item => hasShortText(item.when_to_do_this, item.timeline) },
      { name: "who", test: item => hasShortText(item.who_should_do_it, item.owner) },
      { name: "content_to_make", test: item => hasText(item.content_to_make, item.message_to_use) },
    ], 4),
    ...reviewList("post_ideas", tabs.ideas?.experiments, [
      { name: "exact_action", test: item => hasText(item.exact_action, item.title) },
      { name: "why", test: item => hasText(item.why_it_matters, item.why) },
      { name: "when", test: item => hasShortText(item.when_to_do_this, item.when_to_try, item.timeline) },
      { name: "who", test: item => hasShortText(item.who_should_do_it, item.owner) },
      { name: "format", test: item => hasShortText(item.recommended_format, item.content_format, item.campaign_type) },
      { name: "how", test: item => hasStepList(item.how_to_execute || item.steps, 3) },
      { name: "doubt", test: item => hasText(item.customer_doubt_solved) },
      { name: "result", test: item => hasText(item.expected_result) },
    ], 20),
    ...reviewList("calendar", tabs.calendar?.days, [
      { name: "objective", test: item => hasText(item.objective) },
      { name: "exact_content_idea", test: item => hasText(item.exact_content_idea, item.title) },
      { name: "format", test: item => hasShortText(item.recommended_format, item.post_type, item.postType, item.content_format, item.campaign_type) },
      { name: "when", test: item => hasShortText(item.when_to_do_this, item.timeline) },
      { name: "who", test: item => hasShortText(item.who_should_do_it, item.owner) },
      { name: "hook", test: item => hasText(item.hook) },
      { name: "shot_list", test: item => hasStepList(item.shot_list, 3) },
      { name: "caption", test: item => hasText(item.caption, item.ready_caption) },
      { name: "cta", test: item => hasText(item.cta, item.customer_action) },
      { name: "why", test: item => hasText(item.why_this_works, item.why_this_helps) },
      { name: "result", test: item => hasText(item.expected_result, item.expected_outcome) },
    ], 30),
    ...reviewList("advanced_growth", tabs.premiumGrowth?.modules, [
      { name: "exact_action", test: item => hasText(item.exact_action, item.action, item.title) },
      { name: "why", test: item => hasText(item.why_it_matters, item.why) },
      { name: "when", test: item => hasShortText(item.when_to_do_this, item.timeline, item.week) },
      { name: "who", test: item => hasShortText(item.who_should_do_it, item.owner) },
      { name: "format", test: item => hasShortText(item.recommended_format, item.content_format, item.campaign_type) },
      { name: "how", test: item => hasStepList(item.how_to_execute || item.steps, 3) },
      { name: "result", test: item => hasText(item.expected_result, item.output) },
    ], Math.min(6, asArray(tabs.premiumGrowth?.modules).length || 6)),
  ];
  const brand = tabs.brandKit || {};
  if (!hasText(brand.voice, brand.tone, brand.brand_voice)) failures.push({ label: "brand_style", item: "voice", issue: "missing_voice" });
  if (asArray(brand.words_to_use).length < 4) failures.push({ label: "brand_style", item: "words_to_use", issue: "too_few" });
  if (asArray(brand.words_to_avoid).length < 4) failures.push({ label: "brand_style", item: "words_to_avoid", issue: "too_few" });
  if (asArray(brand.sample_lines).filter(line => clean(line).length >= 18).length < 2) failures.push({ label: "brand_style", item: "sample_lines", issue: "too_few" });
  const fullReport = tabs.fullReport || {};
  for (const key of ["business_diagnosis", "positioning", "growth_strategy_10_steps", "customer_pain_points_15", "content_calendar_30_days", "advanced_growth_plan"]) {
    if (!fullReport[key] || !clean(JSON.stringify(fullReport[key])).length) {
      failures.push({ label: "full_plan_pdf", item: key, issue: "missing" });
    }
  }
  return {
    passed: failures.length === 0,
    failures: failures.slice(0, 20),
  };
}

function dominantVerbCount(value) {
  const match = clean(value).match(/:([0-9]+)\b/);
  return match ? Number(match[1]) : 0;
}

function repeatedOpeningFailures(templateHits) {
  return asArray(templateHits)
    .map(clean)
    .filter(hit => {
      const match = hit.match(/Repeated opening\s+"[^"]+"\s+\(([0-9]+)x\)/i);
      return match && Number(match[1]) >= 3;
    });
}

function strictTemplateGate({ templateHits = [], templateScore = 100, dominantActionVerb = "", reviewerFailures = [] } = {}) {
  const hits = asArray(templateHits).map(clean).filter(Boolean);
  const repeatedOpenings = repeatedOpeningFailures(hits);
  const dominantCount = dominantVerbCount(dominantActionVerb);
  const failures = [];
  if (hits.length > 0) failures.push(`template_hits_present:${hits.slice(0, 4).join(" | ")}`);
  if (dominantCount > 8) failures.push(`dominant_verb_over_8:${dominantActionVerb}`);
  if (repeatedOpenings.length > 0) failures.push(`repeated_opening_3x:${repeatedOpenings.slice(0, 4).join(" | ")}`);
  if (Number(templateScore) > 2) failures.push(`template_score_over_2:${templateScore}`);
  if (hits.length > 0 && asArray(reviewerFailures).length === 0) failures.push("reviewer_passed_while_template_hits_exist");
  return {
    passed: failures.length === 0,
    failures,
  };
}

function strictAggregateTemplateGate(crossBusinessTemplateReview = {}) {
  const hits = asArray(crossBusinessTemplateReview.hits).map(clean).filter(Boolean);
  const repeatedOpenings = repeatedOpeningFailures(hits);
  const score = Number(crossBusinessTemplateReview.score || 0);
  const failures = [];
  if (hits.length > 0) failures.push(`cross_business_template_hits_present:${hits.slice(0, 4).join(" | ")}`);
  if (repeatedOpenings.length > 0) failures.push(`cross_business_repeated_opening_3x:${repeatedOpenings.slice(0, 4).join(" | ")}`);
  if (score > 2) failures.push(`cross_business_template_score_over_2:${score}`);
  return {
    passed: failures.length === 0,
    failures,
  };
}

function strictAggregateActionVerbGate(results = [], limit = 8) {
  const counts = new Map();
  for (const result of asArray(results)) {
    const testCase = { biz: result.biz || {} };
    const texts = actionVerbTextsFromSample(result.sample || {});
    for (const text of texts) {
      const starter = actualActionVerbStarter(text, testCase);
      if (!starter) continue;
      counts.set(starter, (counts.get(starter) || 0) + 1);
    }
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const failures = entries
    .filter(([, count]) => count > limit)
    .map(([verb, count]) => `aggregate_action_verb_over_${limit}:${verb}:${count}`);
  return {
    passed: failures.length === 0,
    failures,
    dominant: entries[0] ? `${entries[0][0]}:${entries[0][1]}` : "",
    counts: Object.fromEntries(entries),
  };
}

function evaluate(testCase, report) {
  const strings = flattenStrings(report);
  const tabs = report.tabs || {};
  const meta = report.meta || {};
  const expectedHits = containsAny(strings, testCase.expectedTerms);
  const bannedHits = containsAny(strings, BANNED);
  const strategyBlocksAsOutput = Number(meta.strategy_blocks_used_as_output || 0);
  const masterPowered = Boolean(report.master_strategy)
    && tabs.fullReport?.source === "master_strategy"
    && asArray(tabs.calendar?.days).length >= 30
    && asArray(tabs.strategy?.steps).length >= 10
    && asArray(tabs.ideas?.experiments).length >= 20;
  const aiUsed = meta.generation_source === "master_strategy_ai"
    && (Number(meta.ai_calls_count || 0) > 0 || Boolean(meta.ai_enhanced) || Boolean(meta.ai_cached));
  const scores = {
    master: Number(meta.master_strategy_quality_score || 0),
    generic: Number(meta.generic_language_score || 0),
    specificity: Number(meta.business_specificity_score || 0),
    duplicate: Number(meta.duplicate_recommendation_score ?? 100),
    whyHowImpact: Number(meta.why_how_impact_score || 0),
    templateLikeness: Number(meta.template_likeness_score ?? 100),
    humanAgency: Number(meta.human_agency_review_score || 0),
    captionReady: Number(meta.caption_ready_ratio || 0),
    messageReady: Number(meta.message_ready_ratio || 0),
    executionReady: Number(meta.execution_ready_ratio || 0),
    pageExecution: Number(meta.page_execution_score || 0),
    verbDiversity: Number(meta.verb_diversity_score || 0),
    contentMix: Number(meta.content_mix_score || 0),
    contentMixUnique: Number(meta.content_mix_unique_categories || 0),
    contentMixLargest: Number(meta.content_mix_largest_category_count || 0),
    crossPageDistinctness: Number(meta.cross_page_distinctness_score || 0),
    reviewerMin: Number(meta.reviewer_min_score || 0),
  };
  const copyReady = customerCopyReady(sample(report));
  const pageReview = pageExecutionReview(report);
  const templateLikenessHits = meta.template_likeness_hits || [];
  const actualActionVerbs = actionVerbReview(actionVerbTextsFromReport(report), testCase);
  const dominantActionVerb = actualActionVerbs.dominant || "";
  const reviewerFailures = meta.reviewer_failures || [];
  const strictGate = strictTemplateGate({
    templateHits: templateLikenessHits,
    templateScore: scores.templateLikeness,
    dominantActionVerb,
    reviewerFailures,
  });
  const semanticReview = semanticQualityReview(semanticTextEntriesFromReport(testCase, report));
  const pass = aiUsed
    && masterPowered
    && strategyBlocksAsOutput === 0
    && scores.master >= 90
    && scores.generic >= 92
    && scores.specificity >= 70
    && scores.duplicate <= 18
    && scores.whyHowImpact >= 90
    && scores.templateLikeness <= 24
    && scores.humanAgency >= 76
    && scores.captionReady >= 0.9
    && scores.messageReady >= 0.9
    && scores.executionReady >= 0.9
    && scores.pageExecution >= 92
    && scores.verbDiversity >= 90
    && scores.contentMix >= 95
    && scores.crossPageDistinctness >= 100
    && scores.reviewerMin >= 95
    && pageReview.passed
    && copyReady.captionReady
    && copyReady.messageReady
    && expectedHits.length >= Math.min(3, testCase.expectedTerms.length)
    && bannedHits.length === 0
    && checkWhyHowImpact(report)
    && strictGate.passed
    && semanticReview.passed;
  return {
    pass,
    aiUsed,
    masterPowered,
    strategyBlocksAsOutput,
    expectedHits,
    bannedHits,
    scores,
    provider: meta.ai_provider || "none",
    model: meta.ai_model || null,
    generationSource: meta.generation_source,
    aiCalls: Number(meta.ai_calls_count || 0),
    fallbackReason: meta.fallback_reason || "",
    knowledgeCategoriesUsed: meta.knowledge_categories_used || {},
    templateLikenessHits,
    strictTemplateGateFailures: strictGate.failures,
    semanticQuality: semanticReview,
    verbDiversityFailures: [...(meta.verb_diversity_failures || []), ...actualActionVerbs.failures],
    dominantActionVerb,
    actualActionVerbCounts: actualActionVerbs.counts,
    contentMixFailures: meta.content_mix_failures || [],
    crossPageFailures: meta.cross_page_distinctness_failures || [],
    reviewerScores: meta.reviewer_quality_scores || {},
    reviewerFailures,
    copyReady,
    pageReview,
  };
}

function sample(report) {
  return {
    day1: report.tabs?.calendar?.days?.[0]?.title,
    day2: report.tabs?.calendar?.days?.[1]?.title,
    day3: report.tabs?.calendar?.days?.[2]?.title,
    strategy1: report.tabs?.strategy?.steps?.[0]?.title,
    caption1: report.tabs?.captions?.caption_bank?.[0],
    caption2: report.tabs?.captions?.caption_bank?.[1],
    caption3: report.tabs?.captions?.caption_bank?.[2],
    message1: report.tabs?.templates?.templates?.[0]?.template,
    message2: report.tabs?.templates?.templates?.[1]?.template,
    message3: report.tabs?.templates?.templates?.[2]?.template,
    pain1: report.tabs?.painPoints?.items?.[0]?.problem,
  };
}

function markdown(results, crossBusinessTemplateReview, hardStructural, humanReadability, aggregateStrictGate = { passed: true, failures: [] }, aggregateActionVerbGate = { passed: true, failures: [] }, semanticQuality = { passed: true, failures: [] }) {
  const passed = results.filter(item => item.evaluation.pass).length;
  const lines = [
    "# Live AI Marketing OS Quality Run",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Provider: ${results[0]?.evaluation.provider || "unknown"}`,
    `Passed: ${passed}/${results.length}`,
    `Cross-business template-likeness score: ${crossBusinessTemplateReview.score}`,
    `Cross-business template hits: ${crossBusinessTemplateReview.hits.slice(0, 8).join(" | ") || "none"}`,
    `Strict template gate: ${aggregateStrictGate.passed ? "PASS" : "FAIL"}`,
    `Strict template failures: ${aggregateStrictGate.failures.slice(0, 8).join(" | ") || "none"}`,
    `Aggregate action verb gate: ${aggregateActionVerbGate.passed ? "PASS" : "FAIL"}`,
    `Aggregate action verb failures: ${aggregateActionVerbGate.failures.slice(0, 8).join(" | ") || "none"}`,
    `Hard structural review: ${hardStructural.passed ? "PASS" : "FAIL"}`,
    `Hard structural failures: ${hardStructural.failures.slice(0, 8).map(item => `${item.label}:${item.key} (${item.count}x)`).join(" | ") || "none"}`,
    `Human readability review: ${humanReadability.passed ? "PASS" : "FAIL"}`,
    `Human readability failures: ${humanReadability.failures.slice(0, 10).map(item => `${item.label}:${item.business}:${item.field}`).join(" | ") || "none"}`,
    `Semantic quality gate: ${semanticQuality.passed ? "PASS" : "FAIL"}`,
    `Semantic quality failures: ${semanticQuality.failures.slice(0, 10).map(item => `${item.label}:${item.business}:${item.field}`).join(" | ") || "none"}`,
    "",
  ];
  for (const result of results) {
    const evaluation = result.evaluation;
    lines.push(
      `## ${result.biz.biz_name} (${result.category})`,
      "",
      `Status: ${evaluation.pass ? "PASS" : "FAIL"}`,
      `AI: ${evaluation.aiUsed ? "yes" : "no"} | calls: ${evaluation.aiCalls} | source: ${evaluation.generationSource} | model: ${evaluation.model || "n/a"}`,
      `Scores: master=${evaluation.scores.master}, generic=${evaluation.scores.generic}, specificity=${evaluation.scores.specificity}, duplicate=${evaluation.scores.duplicate}, why/how/impact=${evaluation.scores.whyHowImpact}, template=${evaluation.scores.templateLikeness}, agency=${evaluation.scores.humanAgency}, captionReady=${evaluation.scores.captionReady}, messageReady=${evaluation.scores.messageReady}, executionReady=${evaluation.scores.executionReady}, pageExecution=${evaluation.scores.pageExecution}, verbDiversity=${evaluation.scores.verbDiversity}, contentMix=${evaluation.scores.contentMix}, crossPage=${evaluation.scores.crossPageDistinctness}, reviewerMin=${evaluation.scores.reviewerMin}`,
      `Mix: unique=${evaluation.scores.contentMixUnique}, largest=${evaluation.scores.contentMixLargest}, dominantVerb=${evaluation.dominantActionVerb || "none"}`,
      `Reviewer scores: ${JSON.stringify(evaluation.reviewerScores)}`,
      `Master powered: ${evaluation.masterPowered ? "yes" : "no"} | strategy_blocks_as_output: ${evaluation.strategyBlocksAsOutput}`,
      `Expected term hits: ${evaluation.expectedHits.join(", ") || "none"}`,
      `Banned hits: ${evaluation.bannedHits.join(", ") || "none"}`,
      `Copy ready: caption=${evaluation.copyReady.captionReady ? "yes" : "no"} | message=${evaluation.copyReady.messageReady ? "yes" : "no"}`,
      `Page execution: ${evaluation.pageReview.passed ? "yes" : "no"} | failures: ${evaluation.pageReview.failures.slice(0, 4).map(item => `${item.label}:${item.item}:${item.issue}`).join(" | ") || "none"}`,
      `Template hits: ${evaluation.templateLikenessHits.slice(0, 4).join(" | ") || "none"}`,
      `Strict template failures: ${evaluation.strictTemplateGateFailures?.slice(0, 4).join(" | ") || "none"}`,
      `Verb/mix/cross-page/reviewer failures: ${[...evaluation.verbDiversityFailures, ...evaluation.contentMixFailures, ...evaluation.crossPageFailures, ...evaluation.reviewerFailures, ...(evaluation.strictTemplateGateFailures || [])].slice(0, 4).join(" | ") || "none"}`,
      `Structural hits: ${evaluation.hardStructuralFailures?.slice(0, 4).map(item => `${item.label}:${item.key}`).join(" | ") || "none"}`,
      `Human readability hits: ${evaluation.humanReadabilityFailures?.slice(0, 4).map(item => `${item.label}:${item.field}`).join(" | ") || "none"}`,
      `Semantic hits: ${evaluation.semanticQuality?.failures?.slice(0, 4).map(item => `${item.label}:${item.field}`).join(" | ") || "none"}`,
      `Fallback reason: ${evaluation.fallbackReason || "none"}`,
      "",
      `Day 1: ${result.sample.day1}`,
      `Day 2: ${result.sample.day2}`,
      `Day 3: ${result.sample.day3}`,
      `Strategy 1: ${result.sample.strategy1}`,
      `Caption 1: ${result.sample.caption1}`,
      `Caption 2: ${result.sample.caption2}`,
      `Caption 3: ${result.sample.caption3}`,
      `Message 1: ${result.sample.message1}`,
      `Message 2: ${result.sample.message2}`,
      `Message 3: ${result.sample.message3}`,
      `Pain 1: ${result.sample.pain1}`,
      "",
    );
  }
  return `${lines.join("\n")}\n`;
}

async function validateExistingOutput() {
  const payload = JSON.parse(await fs.readFile(OUT_JSON, "utf8"));
  const results = asArray(payload.results).map(result => {
    const evaluation = { ...(result.evaluation || {}) };
    const scores = evaluation.scores || {};
    const testCase = { biz: result.biz || {} };
    const actualActionVerbs = actionVerbReview(actionVerbTextsFromSample(result.sample || {}), testCase);
    const strictGate = strictTemplateGate({
      templateHits: evaluation.templateLikenessHits || [],
      templateScore: scores.templateLikeness,
      dominantActionVerb: actualActionVerbs.dominant,
      reviewerFailures: evaluation.reviewerFailures || [],
    });
    const semanticReview = semanticQualityReview(semanticTextEntriesFromSample(result));
    evaluation.dominantActionVerb = actualActionVerbs.dominant;
    evaluation.actualActionVerbCounts = actualActionVerbs.counts;
    evaluation.verbDiversityFailures = [...asArray(evaluation.verbDiversityFailures), ...actualActionVerbs.failures];
    evaluation.strictTemplateGateFailures = strictGate.failures;
    evaluation.semanticQuality = semanticReview;
    if (!strictGate.passed || !semanticReview.passed) evaluation.pass = false;
    return {
      ...result,
      evaluation,
    };
  });
  const aggregateStrictGate = strictAggregateTemplateGate(payload.crossBusinessTemplate || {});
  const aggregateActionVerbGate = strictAggregateActionVerbGate(results);
  const semanticQuality = semanticQualityReview(results.flatMap(semanticTextEntriesFromSample));
  if (!aggregateStrictGate.passed) {
    for (const result of results) result.evaluation.pass = false;
  }
  if (!aggregateActionVerbGate.passed) {
    for (const result of results) result.evaluation.pass = false;
  }
  if (!semanticQuality.passed) {
    for (const result of results) result.evaluation.pass = false;
  }
  const failed = results
    .filter(result => !result.evaluation.pass)
    .slice(0, 20)
    .map(result => ({
      id: result.id,
      strictTemplateGateFailures: result.evaluation.strictTemplateGateFailures || [],
      templateScore: result.evaluation.scores?.templateLikeness,
      dominantActionVerb: result.evaluation.dominantActionVerb || "",
      actualActionVerbCounts: result.evaluation.actualActionVerbCounts || {},
      templateHits: asArray(result.evaluation.templateLikenessHits).slice(0, 4),
      semanticFailures: asArray(result.evaluation.semanticQuality?.failures).slice(0, 4),
    }));
  const summary = {
    mode: "validate_existing",
    source: OUT_JSON,
    total: results.length,
    passed: results.filter(result => result.evaluation.pass).length,
    aggregateStrictGate,
    aggregateActionVerbGate,
    semanticQuality,
    failed,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (summary.passed !== summary.total) process.exitCode = 1;
}

async function main() {
  if (process.argv.includes("--validate-existing")) {
    await validateExistingOutput();
    return;
  }

  await loadEnvFile();
  if (!process.env.NVIDIA_NIM_API_KEY && !process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
    throw new Error("No AI provider key found. Add NVIDIA_NIM_API_KEY or GEMINI_API_KEY before running live quality.");
  }

  const results = [];
  for (const testCase of CASES) {
    const businessProfile = profileFromBiz(testCase.biz);
    const requestContext = {
      env: process.env,
      request: new Request("https://local.test/api/generate"),
      waitUntil(promise) {
        promise?.catch?.(() => {});
      },
    };
    const masterResult = await createMasterStrategy(requestContext, {
      sessionUserId: `live-ai-quality-${RUN_ID}-${testCase.id}`,
      businessProfile,
      rawBiz: testCase.biz,
      lineage: null,
      internetSignals: null,
      forceRuleBased: false,
      forceAiFailure: false,
    });
    const report = assembleReport({
      hydratedStrategy: {},
      businessProfile,
      rawBiz: testCase.biz,
      confidence: { score: 90, status: "Live AI quality harness" },
      telemetry: { ...masterResult.telemetry },
      strategyBlocks: [],
      internetSignals: null,
      masterStrategy: masterResult.masterStrategy,
    });
    results.push({
      id: testCase.id,
      category: testCase.category,
      biz: testCase.biz,
      evaluation: evaluate(testCase, report),
      sample: sample(report),
      meta: report.meta,
    });
    const latest = results[results.length - 1];
    console.log(JSON.stringify({
      index: results.length,
      id: latest.id,
      pass: latest.evaluation.pass,
      aiCalls: latest.evaluation.aiCalls,
      scores: latest.evaluation.scores,
      day1: latest.sample.day1,
    }));
  }

  const categories = new Map();
  for (const result of results) {
    const titles = [result.sample.day1, result.sample.day2, result.sample.day3, result.sample.strategy1].map(clean).join(" ");
    categories.set(result.category, `${categories.get(result.category) || ""} ${titles}`);
  }
  const categoryFingerprints = [...categories.entries()].map(([category, text]) => ({
    category,
    uniqueWords: [...new Set(text.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(word => word.length > 4))].slice(0, 30),
  }));
  const crossBusinessTemplate = templateLikenessReview(results.flatMap(result => [
    result.sample.day1,
    result.sample.day2,
    result.sample.day3,
    result.sample.caption1,
    result.sample.caption2,
    result.sample.caption3,
    result.sample.message1,
    result.sample.message2,
    result.sample.message3,
    result.sample.strategy1,
  ]));
  const hardStructural = hardStructuralReview(results);
  const humanReadability = humanReadabilityReview(results);
  const aggregateStrictGate = strictAggregateTemplateGate(crossBusinessTemplate);
  const aggregateActionVerbGate = strictAggregateActionVerbGate(results);
  const semanticQuality = semanticQualityReview(results.flatMap(semanticTextEntriesFromSample));
  for (const result of results) {
    result.evaluation.crossBusinessTemplateScore = crossBusinessTemplate.score;
    result.evaluation.crossBusinessTemplateHits = crossBusinessTemplate.hits;
    result.evaluation.hardStructuralFailures = hardStructural.failures;
    result.evaluation.humanReadabilityFailures = humanReadability.failures.filter(item => item.business === result.biz.biz_name);
    if (!aggregateStrictGate.passed || !aggregateActionVerbGate.passed || crossBusinessTemplate.score > 2 || crossBusinessTemplate.hits.length > 0 || !hardStructural.passed || !humanReadability.passed || !semanticQuality.passed) {
      result.evaluation.pass = false;
    }
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter(item => item.evaluation.pass).length,
    categoryFingerprints,
    crossBusinessTemplate,
    aggregateStrictGate,
    aggregateActionVerbGate,
    hardStructural,
    humanReadability,
    semanticQuality,
    results,
  };
  await fs.mkdir(path.dirname(OUT_JSON), { recursive: true });
  await fs.writeFile(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile(OUT_MD, markdown(results, crossBusinessTemplate, hardStructural, humanReadability, aggregateStrictGate, aggregateActionVerbGate, semanticQuality));
  console.log(JSON.stringify({ total: payload.total, passed: payload.passed, outJson: OUT_JSON, outMd: OUT_MD }, null, 2));
  if (payload.passed !== payload.total) process.exitCode = 1;
}

main().catch(error => {
  console.error(error?.message || error);
  process.exit(1);
});
