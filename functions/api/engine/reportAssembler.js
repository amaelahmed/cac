import { buildMarketingOSReport, validateMarketingOutput, validateSemanticAlignment } from "./marketingIntelligence.js";
import { runDiagnostics, rankRecommendations, headlineAction } from "./diagnostics.js";

const REQUIRED_SECTIONS = [
  "Business Health Snapshot",
  "Business DNA / Profile",
  "Customer Psychology",
  "Competitor Intelligence",
  "Positioning Strategy",
  "10-Step Growth Strategy",
  "30-Day Content Calendar",
  "20 Growth Experiments",
  "Implementation Checklist",
  "30/60/90-Day Plan",
  "Export / Save",
];

const REQUIRED_TABS = [
  "calendar",
  "strategy",
  "psychology",
  "clientPersona",
  "painPoints",
  "competitors",
  "ideas",
  "captions",
  "templates",
  "brandKit",
  "roiTool",
  "premiumGrowth",
  "fullReport",
];

const BANNED_TEXT_REPLACEMENTS = [
  [/\bheuristic\b/gi, "quick estimate"],
  [/\bpersonas?\b/gi, "example customer type"],
  [/\bobjections?\b/gi, "questions customers may ask"],
  [/\btrust builders?\b/gi, "things that build trust"],
  [/\bmessaging angles?\b/gi, "ways to talk about it"],
  [/\bCTA\b/g, "next step"],
  [/\bfunnel\b/gi, "buying path"],
  [/\bconversion\b/gi, "buying"],
  [/\bpositioning\b/gi, "clear market place"],
  [/\bleverage\b/gi, "use"],
  [/\bscalable\b/gi, "repeatable"],
  [/\bretention engine\b/gi, "repeat customer habit"],
  [/\bproof assets?\b/gi, "real proof"],
  [/\boutcome first\b/gi, "show the result first"],
  [/\blow friction\b/gi, "easy"],
  [/\baudience clarity\b/gi, "knowing who you serve"],
  [/\bB2C\b/g, "direct customer"],
  [/\bB2B\b/g, "business customer"],
];

function clean(value, fallback = "Not provided") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function lower(value, fallback = "not provided") {
  return clean(value, fallback).toLowerCase();
}

function flattenText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).filter(Boolean).join(" ");
  return "";
}

function firstText(...values) {
  for (const value of values) {
    const text = flattenText(value);
    if (text) return text;
  }
  return "";
}

function getSection(raw, name) {
  const value = raw?.[name];
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function getList(value, fallback = []) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return fallback;
}

function ticketNumber(ticket) {
  const value = clean(ticket, "");
  if (value.includes("50,000")) return 50000;
  if (value.includes("10,000")) return 10000;
  if (value.includes("2,000")) return 2000;
  if (value.includes("500")) return 500;
  if (value.includes("200")) return 200;
  return 1000;
}

function cityFrom(rawBiz, profile) {
  const insight = rawBiz?.location_insight;
  if (insight?.city) return insight.city;
  const raw = clean(profile?.market?.location || rawBiz?.biz_location, "your market");
  return raw.split(",")[0].trim() || raw;
}

function businessMode(profile, rawBiz) {
  const text = lower([
    profile?.market?.industry,
    profile?.identity?.type,
    profile?.customers?.model,
    rawBiz?.biz_industry,
    rawBiz?.biz_type,
  ].filter(Boolean).join(" "), "");

  if (/creator|media|newsletter|publication|podcast|youtube/.test(text)) return "creator";
  if (/software|saas|\bapp\b|\bai\b|developer|vibe/.test(text)) return "digital";
  if (/offline|physical|local|hybrid|shop|store|cafe|restaurant|clinic|salon|gym/.test(text)) return "local";
  return "general";
}

function businessText(profile, rawBiz) {
  return lower([
    profile?.identity?.name,
    profile?.identity?.type,
    profile?.market?.industry,
    profile?.offering?.coreOffer,
    profile?.offering?.usp,
    profile?.customers?.challenge,
    rawBiz?.biz_name,
    rawBiz?.biz_industry,
    rawBiz?.biz_type,
    rawBiz?.biz_offer,
    rawBiz?.biz_usp,
    rawBiz?.biz_challenge,
    rawBiz?.biz_extra,
  ].filter(Boolean).join(" "), "");
}

function isSalonBusiness(profile, rawBiz) {
  return /\b(salon|beauty|barber|spa|makeup|nail|hair|facial|grooming|bridal)\b/.test(businessText(profile, rawBiz));
}

function isServiceBusiness(profile, rawBiz) {
  return /service|appointment|booking|repair|maintenance|technician|cleaning|laundry|consult|coaching|training|agency|photography|videography|event|clinic|doctor|dental|salon|beauty|barber|spa|makeup|home visit|customer location/.test(businessText(profile, rawBiz));
}

function isClinicBusiness(profile, rawBiz) {
  const text = businessText(profile, rawBiz)
    .replace(/\b(?:no|without)\s+medical\s+claims?\b/g, "");
  return /\b(clinic|doctor|dental|dentist|healthcare|health care|medical|patient|treatment|consultation)\b/.test(text);
}

function isLeadServiceBusiness(profile, rawBiz) {
  const text = businessText(profile, rawBiz);
  return /agency|consult|consulting|coaching|studio|professional service|freelancer|marketing|design|development|strategy/.test(text)
    && !/home visit|customer location|clinic|doctor|dental|salon|beauty|barber|spa|repair|cleaning|laundry|restaurant|cafe|shop|store/.test(text);
}

function isEcommerceBusiness(profile, rawBiz) {
  return /\b(ecommerce|e-commerce|d2c|online store|online shop|online only|shopify|product page|checkout|cart|online shoppers?)\b/.test(businessText(profile, rawBiz));
}

function isFoodBusiness(profile, rawBiz) {
  return /\b(cafe|restaurant|food|bakery|cloud kitchen|coffee|tea|dish|menu|takeaway)\b/.test(businessText(profile, rawBiz));
}

function isHomeServiceBusiness(profile, rawBiz) {
  return /\b(cleaning|home service|deep clean|housekeeping|laundry|repair|maintenance|pest control|plumber|electrician)\b/.test(businessText(profile, rawBiz));
}

function isPreLaunch(profile, rawBiz) {
  const text = lower([
    profile?.identity?.stage,
    rawBiz?.biz_stage,
    rawBiz?.biz_age,
    profile?.identity?.age,
  ].filter(Boolean).join(" "), "");

  return /not launched|pre[-\s]?launch|prelaunch|before launch|idea stage|launching soon|yet to launch/.test(text);
}

function isCustomProduct(profile, rawBiz) {
  const text = lower([
    profile?.identity?.name,
    profile?.market?.industry,
    profile?.offering?.coreOffer,
    profile?.offering?.usp,
    profile?.customers?.challenge,
    rawBiz?.biz_name,
    rawBiz?.biz_industry,
    rawBiz?.biz_offer,
    rawBiz?.biz_usp,
    rawBiz?.biz_extra,
  ].filter(Boolean).join(" "), "");

  const customWords = "(custom|customis|customiz|personalised|personalized|made[-\\s]?to[-\\s]?order|printing|printed|name print|photo gift|custom gift)";
  const directNegation = new RegExp(`\\b(no|not|without|never)\\s+(a\\s+|an\\s+|any\\s+)?${customWords}\\b`);
  const instructionNegation = new RegExp(`\\b(do not|dont|don't)\\s+(give|use|sell|offer|provide|include|make|do|suggest)\\b.{0,30}\\b${customWords}\\b`);
  if (directNegation.test(text) || instructionNegation.test(text)) {
    return false;
  }

  return /\bcustom\b|customis|customiz|personalised|personalized|made[-\s]?to[-\s]?order|name print|photo gift|photo print|printed gift|custom gift|personalised gift|personalized gift|portrait gift|caricature gift|cartoon gift|custom hamper|printed t[-\s]?shirt|custom t[-\s]?shirt|custom phone case|photo frame/.test(text);
}

function plainText(value) {
  if (typeof value !== "string") return value;
  return BANNED_TEXT_REPLACEMENTS.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function cleanPlainValue(value) {
  if (Array.isArray(value)) return value.map(cleanPlainValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, cleanPlainValue(child)]));
  }
  return plainText(value);
}

const DIGITAL_CONTEXT_REPLACEMENTS = [
  [/\bOther Shops Customers May Choose\b/g, "Alternatives Customers May Use"],
  [/\bmenu items?\b/gi, "product screen"],
  [/\bmenus\b/gi, "demo screens"],
  [/\bnearby customers\b/gi, "target users"],
  [/\bpeople nearby\b/gi, "target users"],
  [/\bnearby buyers\b/gi, "target users"],
  [/\blocal customers\b/gi, "target users"],
  [/\blocal area\b/gi, "online market"],
  [/\blocal plan\b/gi, "product growth plan"],
  [/\blocal awareness\b/gi, "online discovery"],
  [/\blocal use cases\b/gi, "product use cases"],
  [/\blocal relevance\b/gi, "use-case relevance"],
  [/\blocal context\b/gi, "product context"],
  [/\blocal groups\b/gi, "online communities"],
  [/\blocal proof\b/gi, "user proof"],
  [/\blocal pushes\b/gi, "online pushes"],
  [/\bclear ordering\b/gi, "clear signup path"],
  [/\beasiest first order\b/gi, "easiest first use case"],
  [/\btest orders\b/gi, "beta users"],
  [/\bfirst 10 customer plan\b/gi, "first 10 beta users plan"],
  [/\border process\b/gi, "signup/use process"],
  [/\bordering method\b/gi, "signup path"],
  [/\bordering\b/gi, "signup/use"],
  [/\bfirst orders\b/gi, "first signups"],
  [/\bfirst order\b/gi, "first use"],
  [/\border numbers\b/gi, "signup numbers"],
  [/\borders or bookings\b/gi, "signups or demo requests"],
  [/\borders, bookings\b/gi, "signups, demo requests"],
  [/\borders\b/gi, "signups"],
  [/\bwalk-in\b/gi, "signup"],
  [/\bvisiting\b/gi, "opening"],
  [/\bvisitors\b/gi, "users"],
  [/\bvisit\b/gi, "try it"],
  [/\bdelivery zone\b/gi, "target user segment"],
  [/\bdelivery\b/gi, "onboarding"],
  [/\bother shops\b/gi, "other alternatives"],
  [/\bshops\b/gi, "alternatives"],
  [/\bshop\b/gi, "product"],
  [/\bstores\b/gi, "products"],
  [/\bstore\b/gi, "product"],
  [/\bGoogle Business\b/g, "Search/profile"],
  [/\bGoogle profile\b/gi, "website/profile"],
  [/\bGoogle details\b/gi, "website details"],
  [/\bGoogle\/Search\b/g, "Search"],
];

const CLINIC_CONTEXT_REPLACEMENTS = [
  [/\bservice person\b/gi, "clinic team"],
  [/\bservice steps\b/gi, "appointment steps"],
  [/\bservice helped\b/gi, "appointment helped"],
  [/\bthe service\b/gi, "the appointment"],
  [/\bdelivery\b/gi, "appointment"],
  [/\bfirst-order\b/gi, "first-appointment"],
  [/\bfirst order\b/gi, "first appointment"],
  [/\bfirst purchase\b/gi, "first appointment"],
  [/\border-style\b/gi, "booking-style"],
  [/\border process\b/gi, "booking process"],
  [/\bordering\b/gi, "booking"],
  [/\border\b/gi, "booking"],
  [/\byour area in [^,.]+, and when you want it done\b/gi, "your preferred appointment slot and clinic timing"],
  [/\bwhen you want it done\b/gi, "preferred appointment slot"],
  [/\barea covered\b/gi, "clinic location and timing"],
  [/\bcover my area\b/gi, "have a suitable appointment slot"],
  [/\btechnician details\b/gi, "doctor or clinic team details"],
];

const ECOMMERCE_CONTEXT_REPLACEMENTS = [
  [/\bnearby customers\b/gi, "online shoppers"],
  [/\bpeople nearby\b/gi, "online shoppers"],
  [/\bnearby buyers\b/gi, "online shoppers"],
  [/\blocal customers\b/gi, "online shoppers"],
  [/\blocal area\b/gi, "online market"],
  [/\blocal plan\b/gi, "product growth plan"],
  [/\blocal awareness\b/gi, "product discovery"],
  [/\blocal use cases\b/gi, "product use cases"],
  [/\blocal relevance\b/gi, "product relevance"],
  [/\blocal groups\b/gi, "buyer communities"],
  [/\blocal proof\b/gi, "product proof"],
  [/\blocal pushes\b/gi, "product discovery pushes"],
  [/\bGoogle profile updates\b/gi, "product page updates"],
  [/\bGoogle profile\b/gi, "product profile"],
  [/\bGoogle details\b/gi, "product page details"],
  [/\bCan online shoppers find you on Google\?/gi, "Can shoppers find and trust your product online?"],
];

const LEAD_SERVICE_CONTEXT_REPLACEMENTS = [
  [/\bnearby customers\b/gi, "ideal clients"],
  [/\bpeople nearby\b/gi, "ideal clients"],
  [/\blocal customers\b/gi, "ideal clients"],
  [/\blocal area\b/gi, "target market"],
  [/\blocal plan\b/gi, "lead plan"],
  [/\blocal awareness\b/gi, "client discovery"],
  [/\blocal use cases\b/gi, "client use cases"],
  [/\blocal relevance\b/gi, "client relevance"],
  [/\blocal groups\b/gi, "founder and business communities"],
  [/\blocal proof\b/gi, "portfolio proof"],
  [/\blocal pushes\b/gi, "lead pushes"],
  [/\btest orders\b/gi, "first client conversations"],
  [/\beasiest first order\b/gi, "easiest first enquiry"],
  [/\bfirst order\b/gi, "first enquiry"],
  [/\borders or bookings\b/gi, "leads or proposal calls"],
  [/\borders, bookings\b/gi, "leads, proposal calls"],
  [/\borders\b/gi, "client enquiries"],
  [/\bwalk-in\b/gi, "discovery call"],
  [/\bGoogle profile\b/gi, "website/profile"],
  [/\bGoogle details\b/gi, "website details"],
  [/\bGoogle Business\b/g, "Search/profile"],
  [/\bother shops\b/gi, "other alternatives"],
  [/\bshops\b/gi, "alternatives"],
];

const FOOD_CONTEXT_REPLACEMENTS = [
  [/\bbeta users?\b/gi, "first customers"],
  [/\bbeta access\b/gi, "first visit offer"],
  [/\bwaitlist\b/gi, "visit list"],
  [/\bonboarding\b/gi, "ordering or visit step"],
  [/\bactivation\b/gi, "repeat visit"],
  [/\bdemo request\b/gi, "menu question"],
  [/\bdemo\b/gi, "menu preview"],
  [/\bsignup\b/gi, "order or visit"],
  [/\bsign up\b/gi, "order or visit"],
  [/\bworkflow\b/gi, "daily routine"],
  [/\bproduct screen\b/gi, "menu item"],
];

const HOME_SERVICE_CONTEXT_REPLACEMENTS = [
  [/\btechnician\b/gi, "cleaning team"],
  [/\bshop visit\b/gi, "home visit"],
  [/\bstore visit\b/gi, "home visit"],
  [/\bcheckout\b/gi, "booking"],
  [/\badd to cart\b/gi, "book the service"],
  [/\bmenu\b/gi, "service list"],
  [/\bfirst order\b/gi, "first booking"],
  [/\border\b/gi, "booking"],
];

function applyContextLanguage(value, profile, rawBiz) {
  const mode = businessMode(profile, rawBiz);
  const replacements = mode === "digital" || mode === "creator"
    ? DIGITAL_CONTEXT_REPLACEMENTS
    : isEcommerceBusiness(profile, rawBiz) ? ECOMMERCE_CONTEXT_REPLACEMENTS
    : isClinicBusiness(profile, rawBiz) ? CLINIC_CONTEXT_REPLACEMENTS
    : isFoodBusiness(profile, rawBiz) ? FOOD_CONTEXT_REPLACEMENTS
    : isHomeServiceBusiness(profile, rawBiz) ? HOME_SERVICE_CONTEXT_REPLACEMENTS
    : isLeadServiceBusiness(profile, rawBiz) ? LEAD_SERVICE_CONTEXT_REPLACEMENTS : null;
  if (!replacements) return value;
  if (Array.isArray(value)) return value.map(item => applyContextLanguage(item, profile, rawBiz));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, applyContextLanguage(child, profile, rawBiz)])
    );
  }
  if (typeof value !== "string") return value;
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function modelLabel(profile, rawBiz) {
  const model = clean(profile?.customers?.model || rawBiz?.biz_customer_model, "Direct customers");
  if (/b2c/i.test(model)) return "Direct customers";
  if (/b2b/i.test(model)) return "Business customers";
  if (/d2c/i.test(model)) return "Direct online buyers";
  return model;
}

function targetLabel(profile, rawBiz) {
  return clean(profile?.customers?.audience || rawBiz?.biz_audience, "your best customers");
}

function offerLabel(profile, rawBiz) {
  return clean(profile?.offering?.coreOffer || rawBiz?.biz_offer, "your product or service");
}

function bestChannels(rawBiz, profile, city) {
  const selected = Array.isArray(rawBiz?.platforms)
    ? rawBiz.platforms.filter(platform => platform && platform !== "None yet")
    : [];
  if (selected.length) return selected;

  const mode = businessMode(profile, rawBiz);
  if (mode === "digital") return ["Instagram", "Product Hunt", "LinkedIn", "Website"];
  if (mode === "creator") return ["Instagram", "YouTube", "Newsletter", "WhatsApp"];
  return ["Instagram", "WhatsApp", "Google Business", `${city} local groups`];
}

function categoryContext(profile, city, rawBiz) {
  const industry = lower(profile?.market?.industry || rawBiz?.biz_industry, "business");
  const audience = targetLabel(profile, rawBiz);
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const custom = isCustomProduct(profile, rawBiz);

  if (custom) {
    return {
      customerTruth: `${audience} buy custom products when they can clearly imagine the final look, know the price and time, and trust ${name} will confirm the design before making it.`,
      buyingTrigger: `The trigger is usually a birthday, college moment, friendship gift, event, couple gift, or last-minute need in ${city}.`,
      pains: [
        "They worry the final product may not look like what they imagined.",
        "They worry the name, photo, size, colour, or design may come wrong.",
        "They want to know the price, making time, delivery area, and payment rules before ordering.",
      ],
      questions: [
        "Can I see a preview before you make it?",
        "How many days will it take?",
        "What if the name, photo, size, or design is wrong?",
        "Can I ask for changes before confirming?",
        "Do I need to pay advance?",
        `Do you deliver in ${city}, or should I pick it up?`,
        "What materials do you use?",
        "Is it good enough for gifting?",
      ],
      proof: [
        "Short making videos",
        "Before-and-after customisation posts",
        "Customer delivery photos",
        "Sample designs with prices",
        "Step-by-step order process",
        "Clear delivery time and design confirmation",
        "Mistake policy explained simply",
        "Privacy-safe WhatsApp screenshots",
        "Packaging and final product videos",
      ],
      waysToTalk: [
        "Show the final product first.",
        "Show real videos, customer photos, packing, and delivery.",
        "Tell people exactly how to order on WhatsApp.",
        "Talk about one common worry in each post.",
        "Show price, making time, and delivery clearly.",
      ],
      competitorPattern: `Customers may also compare ${name} with nearby gift shops, Instagram custom product pages, and cheaper online sellers.`,
    };
  }

  if (/software|saas|\bapp\b|\bai\b|developer|vibe/.test(industry)) {
    return {
      customerTruth: `${audience} will try a new app only when the use case is clear in seconds and the first useful result feels close.`,
      buyingTrigger: "The trigger is a repeated task, a confusing workflow, or the feeling that the old way wastes too much time.",
      pains: [
        "They do not understand what the product does fast enough.",
        "They worry setup will take effort and the product may not be reliable.",
        "They need to see a short demo or real user example before trying it.",
      ],
      questions: ["What does it do for me?", "How fast can I try it?", "Why should I use this instead of my current method?"],
      proof: ["Short demo clips", "Real screen recordings", "Beta user quotes", "Founder build notes"],
      waysToTalk: ["Show the before-and-after screen.", "Use one use case per post.", "Invite people to try a small beta.", "Explain the first useful result."],
      competitorPattern: "Most app competitors explain too many features before showing one useful result.",
    };
  }

  if (/cafe|restaurant|food|bakery|kitchen/.test(industry)) {
    return {
      customerTruth: `${audience} choose food brands through craving, convenience, hygiene, reviews, and habit.`,
      buyingTrigger: `The trigger is a daily routine, group plan, craving moment, or local recommendation in ${city}.`,
      pains: [
        "They forget the brand when there is no repeat reason to come back.",
        "They compare reviews, photos, price, and convenience before visiting.",
        "They need a simple reason to choose this place today.",
      ],
      questions: ["What should I try first?", "Is it worth the price?", "Is it convenient right now?"],
      proof: ["Fresh food videos", "Hero item photos", "Customer table moments", "Google review screenshots"],
      waysToTalk: ["Show the best item first.", "Attach posts to lunch, evening, and weekend plans.", "Use local references.", "Make the first order easy."],
      competitorPattern: "Food competitors often post attractive items but forget to create a repeat habit.",
    };
  }

  if (isSalonBusiness(profile, rawBiz)) {
    return {
      customerTruth: `${audience} choose a salon when they can see real results, feel the place is clean, and know booking will be simple.`,
      buyingTrigger: `The trigger is usually an event, regular grooming need, bad hair day, wedding plan, or local recommendation in ${city}.`,
      pains: [
        "They worry the final look may not match what they asked for.",
        "They want to know price, timing, hygiene, and stylist skill before booking.",
        "They need proof before trusting someone with their hair, skin, or event look.",
      ],
      questions: ["Can I see real results?", "How much will it cost?", "Can I book a slot easily?", "Is the place clean and professional?"],
      proof: ["Before-and-after service photos", "Google reviews", "Clean studio videos", "Service menu with prices", "Booking slot screenshots", "Stylist or team credibility"],
      waysToTalk: ["Show the result first.", "Mention service time and starting price.", "Show hygiene and tools.", "Make booking easy.", "Use client-safe before-and-after proof."],
      competitorPattern: "Salon competitors often post looks but forget to make price, booking, and trust clear.",
    };
  }

  if (isClinicBusiness(profile, rawBiz)) {
    return {
      customerTruth: `${audience} choose a clinic when they feel the doctor or team is trustworthy, the appointment process is clear, and the treatment explanation feels calm.`,
      buyingTrigger: `The trigger is pain, discomfort, family concern, a delayed checkup, or a trusted recommendation in ${city}.`,
      pains: [
        "They worry the treatment may be painful, expensive, or unclear.",
        "They want to know clinic timing, consultation process, safety, and doctor credibility before booking.",
        "They need trust before booking an appointment.",
      ],
      questions: ["Can I trust this doctor or clinic?", "How do I book an appointment?", "What treatment do I need?", "Will the process be explained clearly?", "What will it cost?"],
      proof: ["Doctor explanation videos", "Clinic safety process", "Patient-safe reviews", "Treatment guidance posts", "Appointment timing clarity", "Before-and-after only where appropriate"],
      waysToTalk: ["Explain one treatment worry calmly.", "Show the appointment step.", "Show doctor or clinic team credibility.", "Mention timing clearly.", "Make booking simple."],
      competitorPattern: "Clinic competitors lose trust when they hide timing, treatment process, doctor proof, or appointment clarity.",
    };
  }

  if (isServiceBusiness(profile, rawBiz)) {
    return {
      customerTruth: `${audience} choose a local service when the business feels reachable, trustworthy, clear on price, and easy to book.`,
      buyingTrigger: `The trigger is a problem they want fixed soon, a recommendation, a nearby search, or a clear local proof point in ${city}.`,
      pains: [
        "They worry the service person may not be reliable.",
        "They want to know price, timing, area covered, and what happens after enquiry.",
        "They need proof that the business has handled similar work before.",
      ],
      questions: ["Can I trust this service?", "How fast can I get help?", "What will it cost?", "Do you cover my area?", "What happens after I message?"],
      proof: ["Local reviews", "Before-and-after work photos", "Team or staff details", "Clear service steps", "Visit charge or starting price", "Area coverage"],
      waysToTalk: ["Show the problem and fix.", "Explain the booking step.", "Show local proof.", "Mention timing clearly.", "Make enquiry simple."],
      competitorPattern: "Local service competitors lose trust when they hide price, timing, team details, or proof.",
    };
  }

  if (/retail|e-commerce|ecommerce|d2c|fashion|jewellery|grocery|electronics|decor|shop|store|boutique/.test(industry)) {
    return {
      customerTruth: `${audience} buy when the product is easy to understand, easy to compare, and safe to trust.`,
      buyingTrigger: "The trigger is need, occasion, gifting, social proof, or a clear value comparison.",
      pains: [
        "They hesitate when product differences are unclear.",
        "They need trust before paying.",
        "They may choose a marketplace unless the shop gives a stronger reason.",
      ],
      questions: ["Is the quality real?", "Can I return or exchange it?", "Why not buy cheaper elsewhere?"],
      proof: ["Real product videos", "Customer photos", "Comparison posts", "Guarantee and delivery clarity"],
      waysToTalk: ["Show the product in use.", "Explain price and quality simply.", "Use customer photos.", "Make ordering easy."],
      competitorPattern: "Retail competitors usually compete on price when they have not made product value visible enough.",
    };
  }

  return {
    customerTruth: `${audience} will act when the offer feels specific, trusted, and easy to start.`,
    buyingTrigger: "The trigger is when the problem becomes more annoying than the effort of taking action.",
    pains: [
      `They do not immediately understand why ${name} is different.`,
      "They compare visible proof before enquiring.",
      "They need a small first step before buying.",
    ],
    questions: ["Is this worth the money?", "Can I trust this business?", "What should I do first?"],
    proof: ["Reviews", "Real work examples", "Clear process", "Founder or team credibility"],
    waysToTalk: ["Say the promise simply.", "Show real proof.", "Explain the next step.", "Use words customers already use."],
    competitorPattern: "Most competitors can still be beaten with clearer proof, sharper product examples, and faster replies.",
  };
}

function buildHashtags(profile, rawBiz) {
  const city = cityFrom(rawBiz, profile).replace(/[^a-z0-9]/gi, "");
  const industry = clean(profile?.market?.industry || rawBiz?.biz_industry, "business")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4);
  const offer = offerLabel(profile, rawBiz)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4);

  const tags = [
    city && `#${city}`,
    city && `#${city}Business`,
    ...industry.map(word => `#${city}${word[0].toUpperCase()}${word.slice(1)}`),
    ...offer.map(word => `#${word}`),
    "#supportlocal",
    "#smallbusinessindia",
    "#whatsapporders",
    "#madeinindia",
  ].filter(Boolean);

  return Array.from(new Set(tags)).slice(0, 18);
}

function calendarSeed(profile, rawBiz) {
  const preLaunch = isPreLaunch(profile, rawBiz);
  const custom = isCustomProduct(profile, rawBiz);
  const mode = businessMode(profile, rawBiz);

  if (custom && preLaunch) {
    return [
      ["Launch teaser", "First look at the product style", "Show 3 finished sample products on a clean table.", "Custom gifts are coming to {city}. Send us a name or photo idea and we will show what can be made.", "People quickly understand what you make.", "Message on WhatsApp with a gift idea."],
      ["Making video", "How one custom piece is made", "Film the hand/desk process from blank material to final product.", "From a simple idea to a gift someone can actually keep.", "Making videos build trust before launch.", "Ask for the making time."],
      ["Student use case", "Gift idea for college friends", "Show a product with a college bag, notebook, or campus-style setup.", "For the friend who says they do not want gifts but still keeps the cute ones.", "Local students can imagine when to use it.", "Tag a friend who would like this."],
      ["Order process", "How to order on WhatsApp", "Show step 1 photo, step 2 design preview, step 3 confirmation, step 4 delivery.", "Ordering is simple: send idea, get preview, confirm, then we make it.", "Removes confusion before the first order.", "Send a photo or name to start."],
      ["Preview promise", "Design preview before making", "Show a mock preview beside the final product.", "We confirm the look before making, so you do not have to guess.", "This answers the biggest fear in custom orders.", "Ask for a preview."],
      ["Price clarity", "Simple starting price post", "Show 3 product types with starting prices.", "No awkward price guessing. Here are the starting prices before launch.", "Price clarity brings serious enquiries.", "Save this before ordering."],
      ["Delivery clarity", "Kozhikode delivery and pickup", "Show a map-style post with local delivery/pickup words.", "Kozhikode orders can choose local delivery or pickup. We will confirm timing before payment.", "People need to know if they can receive it easily.", "Ask if your area is covered."],
      ["Gift occasion", "Birthday gift idea", "Show packaging, name customisation, and a small card.", "A birthday gift feels better when it has their name, photo, or inside joke on it.", "Occasions create buying reasons.", "Message the date you need it."],
      ["Material trust", "What the product is made of", "Show close-up material shots and durability details.", "Here is what goes into the product before it reaches your hand.", "Material proof reduces quality doubts.", "Ask which material fits your idea."],
      ["Mistake policy", "What happens if something is wrong", "Show a calm text post with design confirmation rules.", "We confirm the design before making it. If our side makes a mistake, we fix it clearly.", "Policy clarity makes advance payment easier.", "Read this before confirming."],
      ["Customer-style chat", "Privacy-safe WhatsApp example", "Blur a sample enquiry and show how you reply.", "This is how a normal custom order conversation looks.", "People see that ordering is not complicated.", "Send your own idea."],
      ["Packaging video", "Pack one finished order", "Film packing, label, and final product reveal.", "The gift should look good when it reaches them, not only in photos.", "Packaging helps gift buyers trust the shop.", "Ask for gift packing."],
      ["Friend referral", "Bring one friend offer", "Show two products together with a launch-week friend offer.", "Launch week idea: order with a friend and both get a small add-on.", "Friend referrals fit student and gift buying.", "Share this with your friend."],
      ["Malayalam-English post", "Simple local caption", "Show a product with text in mixed Malayalam and English if the brand suits it.", "Gift venam, but basic aakaruthu. Make it personal.", "Local language makes the brand feel close.", "Reply with the name to customise."],
      ["First 10 orders", "Founding customer callout", "Show a clean number card: first 10 orders get careful founder checking.", "We are taking the first 10 test orders slowly so every detail is checked.", "Scarcity helps early orders without fake pressure.", "Reserve one early slot."],
      ["Before-after", "From photo to finished product", "Show original reference on left and final product on right.", "One photo can become a gift when the details are handled properly.", "Before-after content proves skill.", "Send your reference photo."],
      ["Campus table", "Products on a college desk", "Shoot products beside books, ID card, headphones, or tote bag.", "Small gifts that fit campus life, birthdays, farewells, and friendship days.", "Audience sees themselves in the post.", "Save for the next gift moment."],
      ["Founder note", "Why the shop is starting", "Show founder hands or workspace, not a corporate photo.", "We are starting this because gifts should feel personal without becoming confusing to order.", "Founder story makes a new shop less unknown.", "Follow for launch date."],
      ["FAQ", "Top 5 questions before ordering", "Create a carousel: price, time, preview, delivery, advance.", "Before you order, here are the five things most people ask.", "Answers reduce repeated DMs.", "Send the question we missed."],
      ["Launch date", "Opening day announcement", "Show product wall or launch date card with real products around it.", "{business} opens for test orders soon in {city}.", "A clear date turns interest into action.", "Turn on reminders or DM to book."],
      ["Use case", "Farewell gift idea", "Show a product with a short farewell message.", "For the batchmate, colleague, or friend who deserves something more personal.", "Specific moments sell better than generic products.", "Message the occasion."],
      ["Behind the scenes", "Design checking before making", "Show checklist: spelling, photo, colour, size, delivery date.", "We check the small details because custom gifts can go wrong when people rush.", "Shows care and reduces fear.", "Confirm your details carefully."],
      ["Social proof setup", "Ask early testers for feedback", "Show a feedback form screenshot or simple review request.", "Early orders help us improve the product, packaging, and delivery.", "Makes testing feel honest.", "Join the tester list."],
      ["Best seller prediction", "Which sample should launch first?", "Show 3 sample products and ask people to vote.", "Help us choose what to launch first.", "Votes create early engagement and product learning.", "Comment 1, 2, or 3."],
      ["Delivery day", "How the final handover looks", "Film a sample handover or doorstep package shot.", "From preview to packed product to delivery, this is the full path.", "People trust a process they can see.", "Ask about pickup or delivery."],
      ["Price reason", "Why custom costs more than readymade", "Show time, materials, design checking, packing.", "Custom work is not just the item. It is the detail, checking, and making time.", "Educates buyers without sounding defensive.", "Ask what fits your budget."],
      ["Launch week offer", "Small add-on for first orders", "Show the add-on clearly, not a vague discount.", "Launch week: first orders get a small gift-packing add-on.", "Simple launch offers are easy to understand.", "Book before slots close."],
      ["Review request", "What early customers can tell you", "Show review prompts: look, quality, delivery, ordering.", "After your order, tell us what felt good and what should improve.", "Builds a feedback habit early.", "Become an early customer."],
      ["Local collaboration", "College club or creator collab", "Show a mock collab idea with a local student creator or club.", "We want to make a few campus-style gifts with local creators.", "Partnerships create trust without big ad spend.", "Suggest a creator or club."],
      ["Launch recap", "What the first month will focus on", "Show 4 boxes: better samples, faster replies, clearer prices, real reviews.", "Our first month is about getting the basics right, not pretending to be huge.", "Honesty makes a new shop feel human.", "Follow the launch journey."],
    ];
  }

  if (preLaunch) {
    return [
      ["Launch teaser", "Show what is coming", "Show a real sample, prototype, product item, service setup, or first draft.", "{business} is getting ready in {city}. Here is the first look.", "People need something real to remember before launch.", "Follow for the launch date."],
      ["Problem post", "Name the customer problem", "Use one simple line that says what problem you solve.", "If this problem feels familiar, this is being built for you.", "People pay attention when they feel understood.", "Reply with your situation."],
      ["First offer", "Explain the easiest first order", "Show the starter product, service, or beta access.", "Start small. Try the easiest option first.", "A simple first step gets early customers.", "Ask for the starter option."],
      ["Behind the scenes", "Show preparation", "Show setup, sourcing, testing, packing, training, or product building.", "Before opening, the small details matter.", "Preparation builds confidence.", "Save this for launch."],
      ["Founder note", "Why this business is starting", "Show the founder or workspace with a short honest note.", "We are starting this because {audience} need a simpler option.", "People trust people before they trust a new brand.", "Follow the journey."],
      ["Question post", "Ask what customers want first", "Poll 2-3 options customers can choose from.", "Help us choose what should launch first.", "Early input shapes the launch.", "Comment your choice."],
      ["Location post", "Show the local area or market", "Show the street, area, delivery zone, or local context.", "{city}, this is being built for you.", "Local context makes the launch feel close.", "Share with someone nearby."],
      ["Trust post", "Show how quality will be checked", "Show a checklist, sample test, or process proof.", "Here is how we will check quality before customers pay.", "Trust matters most before launch.", "Ask anything before ordering."],
      ["Launch offer", "First 10 or 20 customer plan", "Show a clear early customer benefit.", "The first test customers will get extra care and early feedback support.", "Early customers need a reason to act.", "Reserve an early slot."],
      ["FAQ", "Answer 5 pre-launch questions", "Make a simple carousel with price, date, process, delivery, support.", "Before we open, here are the basics.", "Answers reduce hesitation.", "Send the question we missed."],
      ["Sample result", "Show the final result customers can expect", "Use the clearest real sample.", "This is the kind of result we are preparing for.", "Result posts are easier to understand.", "Ask if this fits you."],
      ["Soft launch", "Invite testers", "Create a small tester invite with limited slots.", "We are taking a small batch first so we can improve fast.", "Soft launches create learning without overpromising.", "Join the tester list."],
      ["Price post", "Show starting price or range", "Share a simple price range if possible.", "No guessing. Here is the expected starting price.", "Clear price brings serious enquiries.", "Ask what fits your need."],
      ["How it works", "Explain the buying steps", "Show step 1, 2, 3, 4 in a carousel.", "Here is how to order when we open.", "People act faster when the process is visible.", "Save this."],
      ["Launch countdown", "7 days to launch", "Use real product/service visuals around the countdown.", "7 days left. We are checking the final details.", "Countdown creates memory.", "Turn on reminders."],
      ["Customer story", "Example customer situation", "Describe one example customer and their need.", "This is the kind of situation we want to help with.", "Specific examples feel less generic.", "Share if this is you."],
      ["Team post", "Show who is behind it", "Show founder/team/workstation.", "The people behind the business matter.", "A new brand needs a human face.", "Say hi or ask a question."],
      ["Proof of preparation", "Show real setup work", "Show receipts, inventory, testing, sample board, product shelf.", "This is not just an idea. The setup is happening.", "Visible work makes launch believable.", "Follow for updates."],
      ["First week plan", "What opening week will include", "List 3-4 things happening in week one.", "Opening week will focus on simple orders, fast replies, and honest feedback.", "Customers know what to expect.", "Book opening-week interest."],
      ["Channel post", "Where to contact", "Show Instagram, WhatsApp, Google profile, or website details.", "When we open, this is the easiest way to contact us.", "Clear contact points reduce lost enquiries.", "Save the number/link."],
      ["Comparison", "Why choose this instead of the usual option", "Compare in a simple table without attacking anyone.", "Choose us if you want this specific difference.", "Comparison helps people decide.", "Ask which option fits you."],
      ["Launch reminder", "Opening day is near", "Show a product/service close-up with launch date.", "We are almost ready.", "Repeated reminders help people remember.", "Share with someone who needs this."],
      ["Customer promise", "One promise in simple words", "Put the promise as a large text post.", "Our promise: make this easier, clearer, and more trustworthy for {audience}.", "A simple promise is memorable.", "Hold us to it."],
      ["Local group", "Invite local awareness", "Use a local reference, area name, or community use case.", "{city} people, this may be useful for you or someone nearby.", "Local posts travel through local shares.", "Share in your group."],
      ["Opening checklist", "What is ready now", "Check off product/service, price, process, contact, delivery/support.", "Here is what is ready before launch.", "Readiness reduces doubt.", "Ask what else you need to know."],
      ["Launch day", "We are open for test orders", "Show the strongest real visual and the ordering method.", "{business} is now open for test customers.", "Clear opening posts create first orders.", "Message to start."],
      ["First feedback", "Ask first customers what to improve", "Show a feedback request and early learning.", "Your first feedback will shape what we improve next.", "Feedback turns testers into supporters.", "Try it and tell us."],
      ["First customer thank-you", "Thank early supporters", "Show a careful thank-you post.", "Thank you for helping a new business start properly.", "Gratitude builds community.", "Share your experience."],
      ["Week one recap", "What we learned", "List what people asked, liked, and wanted clearer.", "Week one taught us what customers really care about.", "Learning posts show honesty.", "Tell us what to improve."],
      ["Next 30 days", "What improves next", "Show next improvements and content themes.", "Next: clearer examples, faster replies, and better proof.", "Customers see progress.", "Follow the next update."],
    ];
  }

  if (mode === "digital") {
    return [
      ["Problem", "Show the annoying task", "Record the manual task or old way.", "This is the small task that quietly wastes too much time.", "People understand the app through the problem.", "Ask for beta access."],
      ["Demo", "Show the first useful result", "Record a 10-second screen demo.", "In a few seconds, this is what the product helps you do.", "Demo beats feature lists.", "Try the beta."],
      ["Use case", "One user, one job", "Show a specific user example.", "Built for {audience} who need this one thing done faster.", "Specific users understand faster.", "Reply with your use case."],
      ["Founder note", "Why it was built", "Show the founder screen or build note.", "I built this because the old way felt too messy.", "Founder voice makes early apps trustworthy.", "Follow the build."],
      ["Before-after", "Old way vs new way", "Show both screens side by side.", "Before: too many steps. After: one clear path.", "Comparison creates interest.", "Ask for the demo."],
      ["FAQ", "Answer setup doubts", "Show price, setup, data, support, who it is for.", "Before you try it, here are the basics.", "Answers reduce hesitation.", "Save this."],
    ];
  }

  return [
    ["Problem", "Show the problem you solve", "Use a real photo, customer line, or simple example.", "{audience} usually struggle with this before choosing.", "People pay attention when the problem feels familiar.", "Ask what to try first."],
    ["Proof", "Show one real proof point", "Use a review, photo, result, or process clip.", "Here is one reason customers can trust {business}.", "Real proof beats broad claims.", "Ask for the same result."],
    ["Offer", "Explain the easiest first purchase", "Show the starter product, service, or package.", "Start with this if you are unsure.", "A simple first step reduces delay.", "Ask for the starter option."],
    ["Education", "Teach one buying tip", "Share one decision rule customers should know.", "Before choosing, check this one thing.", "Helpful posts build trust.", "Save this."],
    ["Comparison", "Compare with the usual option", "Use a clean side-by-side comparison.", "Choose based on value, not only price.", "Comparison helps unsure buyers.", "Ask which option fits you."],
    ["Follow-up", "Answer a common question", "Use a common DM question and answer it.", "A lot of people ask this before buying.", "Questions answered publicly reduce hesitation.", "Send your question."],
  ];
}

function buildContentCalendar(profile, rawBiz, city) {
  const channels = bestChannels(rawBiz, profile, city);
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "your business");
  const audience = lower(targetLabel(profile, rawBiz), "your customers");
  const seed = calendarSeed(profile, rawBiz);

  return Array.from({ length: 30 }, (_, index) => {
    const item = seed[index % seed.length];
    const replacements = {
      "{business}": name,
      "{city}": city,
      "{audience}": audience,
    };
    const apply = text => Object.entries(replacements).reduce((value, [key, replacement]) => value.replaceAll(key, replacement), text);

    const topic = apply(item[1]);

    return {
      day: index + 1,
      platform: channels[index % channels.length],
      post_type: item[0],
      topic: varyCalendarTopic(topic, index),
      what_to_show: apply(item[2]),
      caption: apply(item[3]),
      why_this_helps: apply(item[4]),
      customer_action: apply(item[5]),
    };
  });
}

function varyCalendarTopic(topic, index) {
  const cycle = Math.floor(index / 6);
  const variants = {
    "Show the problem you solve": ["Name the real problem", "Show the before moment", "Call out one customer frustration", "Show what goes wrong", "Point to the hidden cost"],
    "Show one real proof point": ["Show one trust signal", "Share one result people can believe", "Show process proof", "Show proof before the claim", "Share one customer-safe example"],
    "Explain the easiest first purchase": ["Explain the simplest first step", "Show the starter option", "Make the first decision easy", "Explain how to start", "Show the low-risk first move"],
    "Teach one buying tip": ["Teach one decision tip", "Share one thing to check", "Teach how to choose better", "Explain one common mistake", "Give one useful buying rule"],
    "Compare with the usual option": ["Compare the old way", "Show why this option is different", "Compare price and value", "Show the better-fit choice", "Make the decision easier"],
    "Answer a common question": ["Answer one real DM question", "Clear one common doubt", "Reply to a buying worry", "Answer what people ask first", "Remove one hesitation"],
  };
  const list = variants[topic];
  return list ? list[cycle % list.length] : topic;
}

function buildTenSteps(profile, rawBiz, city) {
  const preLaunch = isPreLaunch(profile, rawBiz);
  const custom = isCustomProduct(profile, rawBiz);
  const mode = businessMode(profile, rawBiz);
  const clinic = isClinicBusiness(profile, rawBiz);
  const ecommerce = isEcommerceBusiness(profile, rawBiz);
  const leadService = isLeadServiceBusiness(profile, rawBiz);
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const audience = lower(targetLabel(profile, rawBiz), "your customers");
  const offer = lower(offerLabel(profile, rawBiz), "your product");

  if (preLaunch) {
    return [
      ["Tell people why they should choose you in one sentence", `Write one sentence for ${name}: who it helps, what it sells, and why it is worth noticing in ${city}.`],
      [custom ? "Prepare 5 real sample products" : "Prepare 5 real samples or examples", custom ? "Shoot clear photos and short videos of finished samples before taking many orders." : mode === "digital" ? "Show product screens, demo clips, workflow examples, and one first useful result before launch." : "Show real samples, mockups, demos, product screens, or service examples before launch."],
      ["Set up Instagram, WhatsApp, and Google basics", mode === "digital" ? `Make it easy for ${audience} to understand the demo, join beta, and request access.` : `Make it easy for ${audience} to find the business, ask price, and know how to order.`],
      [mode === "digital" ? "Explain the signup path simply" : "Explain the order process simply", custom ? "Show: send idea, get preview, confirm details, pay advance if needed, then receive the product." : mode === "digital" ? "Show the steps from first use case to demo request, beta access, onboarding, and first useful result." : "Show the steps from first enquiry to visit, booking, product use, or support."],
      ["Create a first 10 customer plan", "Take the first few customers slowly, collect feedback, and use their questions to improve the plan."],
      ["Build a launch-week offer", "Use a simple add-on, early slot, or tester benefit instead of a confusing discount."],
      mode === "digital"
        ? ["Post product proof before launch", "Show the input, the output, the use case, and the exact kind of user who should care."]
        : ["Post local content before opening", `Mention ${city}, local use cases, nearby buyers, and the exact kind of customer who should care.`],
      ["Ask friends and early followers to share", "Give them one clean message or post to share, not a long explanation."],
      ["Track every message and question", mode === "digital" ? "Write down what people ask about setup, use case, price, trust, and beta access." : clinic ? "Write down what patients ask about consultation, timing, treatment, price, and trust." : "Write down what people ask about price, time, quality, and trust."],
      ["Review the first 30 days", "Keep the posts and offers that brought real enquiries, then remove what only looked busy."],
    ].map(([title, action], index) => ({ step: index + 1, title, action }));
  }

  return [
    ["Tell people why they should choose you in one sentence", `Write one sentence that explains why ${name} is a better choice for ${audience}.`],
    ["Make the easiest first purchase clear", `Turn ${offer} into one simple starter option people can understand quickly.`],
    ["Show more real proof", "Collect reviews, product videos, customer photos, screenshots, or process clips every week."],
    ["Make the next step the same everywhere", "Use one clear action across Instagram bio, WhatsApp, website, and Google profile."],
    ["Post around proof, process, price, and questions", "Stop random posting. Each post should answer one customer doubt or show one reason to trust you."],
    mode === "digital" || mode === "creator"
      ? ["Make the product easy to evaluate", "Show demos, sample outputs, user proof, pricing clarity, and one clear trial or demo step."]
      : ecommerce
        ? ["Help shoppers trust your product online", "Use product page updates, reviews, UGC, delivery clarity, and checkout trust posts."]
        : leadService
          ? ["Help ideal clients trust you online", "Use website proof, portfolio examples, proposal clarity, and client case-study posts."]
          : ["Make nearby customers find you", `Use ${city}, local use cases, Google profile updates, and review requests.`],
    ["Reply faster with saved messages", mode === "digital"
      ? "Use saved replies for setup, pricing, use case, trial, demo, and onboarding questions."
      : clinic
        ? "Use saved replies for consultation, appointment timing, treatment guidance, price clarity, and trust questions."
        : ecommerce
          ? "Use saved replies for product size, price, checkout, delivery trust, reviews, and first purchase questions."
          : leadService
            ? "Use saved replies for project fit, pricing, timeline, proof, proposal, and discovery-call questions."
            : "Use saved replies for price, delivery, timeline, trust, and first-order questions."],
    ["Ask happy customers for reviews and referrals", "Ask within 24 hours while the good experience is still fresh."],
    ["Track where enquiries come from", "Track source, question, order, lost reason, and review every week."],
    ["Repeat what brings real orders", "Spend more effort on the posts and channels that create enquiries, orders, or bookings."],
  ].map(([title, action], index) => ({ step: index + 1, title, action }));
}

function buildExperiments(profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const audience = lower(targetLabel(profile, rawBiz), "your customers");
  const offer = lower(offerLabel(profile, rawBiz), "your offer");
  const custom = isCustomProduct(profile, rawBiz);
  const preLaunch = isPreLaunch(profile, rawBiz);
  const mode = businessMode(profile, rawBiz);
  const base = [
    ["One sentence test", `Try 3 simple one-line descriptions for ${name}.`, "Which line gets more replies or profile clicks?"],
    ["Proof-first post series", `Publish 5 posts showing real examples for ${audience}.`, "Which post gets saves, replies, or enquiries?"],
    ["Starter offer", `Package ${offer} into one easy first order.`, "How many people ask price or order?"],
    mode === "digital" || mode === "creator"
      ? ["Use-case search post", `Create one post titled around the exact problem ${offer} solves.`, "Do the right users reply, save, or ask for a demo?"]
      : [`${city} search post`, `Create one post titled around ${offer} in ${city}.`, "Do local people reply or save it?"],
    ["Question-answer post", "Answer the biggest customer worry in one short post.", "Do people ask fewer repeated questions?"],
    ["Referral ask", `Ask 20 warm contacts to share ${name} with one person.`, "How many new enquiries come from sharing?"],
    ["Review request", "Ask every happy customer or tester for one clear review.", "How many reviews or feedback messages arrive?"],
    ["Comparison post", "Compare your product with the usual cheaper or slower option.", "Do people ask more serious questions?"],
    ["WhatsApp follow-up", "Follow up every open enquiry after 2 hours and 24 hours.", "How many conversations restart?"],
    ["Price clarity post", "Show starting price, range, or what changes the price.", "Do enquiries become more serious?"],
    ["Founder trust post", "Tell why the business exists and show one real detail.", "Do more people reply or follow?"],
    ["Making/process video", custom ? "Show a custom order being made." : "Show the real work behind the product or service.", "How long do people watch?"],
    ["FAQ carousel", "Turn 7 common questions into one carousel.", "How many people save it?"],
    ["Customer words", "Collect 10 exact customer phrases and use them in posts.", "Do captions sound closer to real customers?"],
    ["Bundle test", "Pair the main offer with one useful add-on.", "Does average order value improve?"],
    ["Inactive lead message", preLaunch ? "Message interested people again before launch day." : "Message inactive leads with one useful reason to return.", "How many respond?"],
    mode === "digital"
      ? ["Audience partner post", `Partner with one founder, newsletter, or community page reaching ${audience}.`, "How many new people discover the demo?"]
      : ["Local partner post", `Partner with one non-competing local page reaching ${audience}.`, "How many new people discover you?"],
    ["Profile action test", "Try WhatsApp, call, DM, and form as the main profile action.", "Which gets the most real enquiries?"],
    ["Format focus", "Use only the best post format for 14 days.", "Do replies or saves increase?"],
    ["Manual first-customer help", "Personally guide 10 early customers before making anything automatic.", "What do you learn from real conversations?"],
  ];

  return base.map(([title, whatToDo, whatToCheck], index) => ({
    idea: index + 1,
    title,
    what_to_do: whatToDo,
    what_to_check: whatToCheck,
  }));
}

function buildCaptionBank(profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const audience = lower(targetLabel(profile, rawBiz), "your customers");
  const offer = lower(offerLabel(profile, rawBiz), "the offer");
  const usp = lower(profile?.offering?.usp || rawBiz?.biz_usp, "a clearer experience");
  const custom = isCustomProduct(profile, rawBiz);
  const mode = businessMode(profile, rawBiz);
  const salon = isSalonBusiness(profile, rawBiz);
  const service = isServiceBusiness(profile, rawBiz);

  if (custom) {
    return [
      `${city}, custom gifts do not have to be confusing. Send the idea, see the preview, then confirm before we make it.`,
      `For students, friends, birthdays, and small surprises: make the gift personal without making the order process hard.`,
      `A name, photo, date, or inside joke can turn a simple product into something they will actually keep.`,
      `Before we make a custom order, we check the design details so the final product does not become a guess.`,
      `${name} is for people who want a personal gift, clear price, and simple WhatsApp ordering in ${city}.`,
    ];
  }

  if (mode === "digital") {
    return [
      `${name} should be easy to judge: paste one real problem, see the output, then decide if it is useful.`,
      `For ${audience}: stop guessing what the tool does. Ask for one small demo using your own work.`,
      `A good product demo shows the input, the output, and the time it removes. That is what ${name} needs to prove.`,
      `Before paying for another tool, test whether it solves one daily task in under two minutes.`,
      `Want to test ${offer}? Send one real use case and ask for the sample result first.`,
    ];
  }

  if (salon) {
    return [
      `${city}, choosing a salon should feel clear. See the result, check the service, then book the slot that fits you.`,
      `${name} is for ${audience} who want ${usp} without guessing what the final look or experience will be.`,
      `Before booking, look for real results, clean setup, clear price, and an easy way to confirm your appointment.`,
      `A good salon post should show the result first, then explain the service time, price range, and booking step.`,
      `Need ${offer}? Message ${name} with the service you want and the date you are planning for.`,
    ];
  }

  if (service) {
    return [
      `${city}, getting ${offer} should be simple: explain the issue, see the next step, and book with clear timing.`,
      `${name} helps ${audience} get ${usp} without chasing vague replies.`,
      `Before choosing a local service, check reviews, work photos, visit details, and how quickly they respond.`,
      `One clear enquiry is better than ten confused messages. Tell us the issue, area, and preferred time.`,
      `Good service marketing shows the problem, the fix, the proof, and the booking step in plain words.`,
    ];
  }

  return [
    `${city} does not need another confusing option. ${name} makes ${offer} easier to understand and easier to start.`,
    `Before choosing, ask this: can you see real proof, clear price, and the next step?`,
    `${name} is for ${audience} who want ${usp} without confusion.`,
    `If this problem has been sitting in the background, start with the smallest useful step.`,
    `Good businesses are easy to understand, easy to trust, and easy to contact. That is the goal here.`,
  ];
}

function ownWebsiteSignal(internetSignals) {
  return internetSignals?.own_website?.available ? internetSignals.own_website : null;
}

function competitorWebsiteSignal(internetSignals) {
  return internetSignals?.competitor?.available ? internetSignals.competitor : null;
}

function signalList(values, fallback = []) {
  const seen = new Set();
  const out = [];
  for (const value of [...(Array.isArray(values) ? values : []), ...fallback]) {
    const text = clean(value);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= 6) break;
  }
  return out;
}

function buildWebsiteRoast(rawBiz, profile, internetSignals) {
  if (!rawBiz?.biz_website) return null;
  const snapshot = rawBiz.own_website_snapshot;
  const signal = ownWebsiteSignal(internetSignals);
  const gaps = Array.isArray(snapshot?.detectedGaps) ? snapshot.detectedGaps : [];
  const actions = Array.isArray(snapshot?.callsToAction) ? snapshot.callsToAction.slice(0, 6) : [];
  const recommendations = signalList(signal?.simple_recommendations, [
    "Make the main promise visible at the top.",
    "Make the action button or WhatsApp link easy to find.",
    "Show proof close to the product or service, not hidden at the bottom.",
  ]);

  return {
    url: rawBiz.biz_website,
    scan_status: signal ? "Used your website details to make this more specific." : "Website URL supplied, but the scan did not return enough public page text",
    visible_title: snapshot?.title || "Not available from scan",
    gaps_found: recommendations,
    actions_found: actions.length ? actions : ["No clear action found from public first-page text."],
    customer_hesitations: signalList(signal?.customer_hesitations, [
      "Customers may hesitate if the proof, process, or first action is not obvious.",
    ]).slice(0, 4),
    fix_first: recommendations[0] || gaps[0] || `Rewrite the top section around ${offerLabel(profile, rawBiz)} and one action visitors should take.`,
  };
}

function buildCompetitor(rawBiz, profile, city, internetSignals) {
  const competitor = rawBiz?.competitor_website_snapshot;
  const signal = competitorWebsiteSignal(internetSignals);
  const category = categoryContext(profile, city, rawBiz);
  const industry = clean(profile?.market?.industry || rawBiz?.biz_industry, "business");
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");

  if (competitor) {
    const advantages = signalList(signal?.competitor_advantages, ["They may be easier to understand at first glance."]);
    const gaps = signalList(signal?.positioning_gaps, [
      "Win with clearer examples, clearer price or process, and faster replies.",
    ]);
    return {
      basis: "Competitor URL was checked. Notes only use visible public page signals.",
      scanned_url: competitor.url,
      visible_title: competitor.title || "No title detected",
      what_they_make_clear: advantages,
      visible_gaps: gaps,
      category_gap: `${industry} buyers still need clearer proof, better examples, and a simpler way to ask questions.`,
      counter_move: signal?.simple_recommendations?.[0] || `Make ${name} easier to understand, easier to trust, and easier to contact than the visible competitor.`,
    };
  }

  return {
    basis: "No competitor URL supplied. This is a practical market comparison, not a claim about a named business.",
    likely_choices: [
      category.competitorPattern,
      "Customers may also choose the business that replies fastest and shows the clearest proof.",
      `Local trust matters in ${city}, especially when people are paying before they fully know the business.`,
    ],
    category_gap: `Beat average ${industry} competitors with clearer examples, faster replies, and simple ordering.`,
    counter_move: `Own one clear reason for ${lower(targetLabel(profile, rawBiz), "your customers")} to choose ${name}.`,
  };
}

function buildChecklist(profile, rawBiz, city) {
  const preLaunch = isPreLaunch(profile, rawBiz);
  const custom = isCustomProduct(profile, rawBiz);
  if (preLaunch) {
    return {
      today: [
        "Write the one-sentence promise.",
        custom ? "Prepare sample product photos and videos." : "Prepare sample product, service, or demo proof.",
        "Set up Instagram bio, WhatsApp contact, and Google profile basics.",
        "Write the first 10 customer plan.",
      ],
      this_week: [
        "Post launch teaser, process, price, and FAQ posts.",
        custom ? "Explain design preview, making time, payment, and delivery." : "Explain how customers can order, book, or join.",
        `Use ${city} and local customer examples in posts.`,
        "Collect tester interest in a simple list.",
      ],
      this_month: [
        "Take early orders or testers slowly.",
        "Collect feedback and questions.",
        "Turn the best questions into posts.",
        "Repeat the posts that created real enquiries.",
      ],
    };
  }

  return {
    today: [
      "Write the one-sentence promise.",
      "Choose one clear next action for customers.",
      "Collect 5 real proof examples.",
      "Create a simple enquiry tracker.",
    ],
    this_week: [
      "Publish 3 proof-led posts.",
      "Make profile, website, WhatsApp, and Google details match.",
      "Ask recent customers for reviews.",
      "Follow up every open enquiry.",
    ],
    this_month: [
      "Run 3 ideas from this plan.",
      "Create one repeat or referral offer.",
      "Review which channel brought real enquiries.",
      "Update the plan after new customer proof is collected.",
    ],
  };
}

function buildPlan(profile, rawBiz, city) {
  const preLaunch = isPreLaunch(profile, rawBiz);
  if (preLaunch) {
    return {
      "Before launch": {
        focus: "Get ready to be trusted",
        actions: ["Prepare samples or demos.", "Make WhatsApp ordering clear.", "Post price, process, and FAQ basics."],
        target: "People understand what you sell and how to order before opening.",
      },
      "Launch week": {
        focus: "Get the first customers carefully",
        actions: ["Invite the first 10-20 testers or customers.", "Reply fast.", "Collect feedback after every order or enquiry."],
        target: "Learn what customers ask before they pay.",
      },
      "Days 8-30": {
        focus: "Turn early learning into better posts",
        actions: [`Use ${city} examples.`, "Post real proof.", "Repeat the offer that creates real enquiries."],
        target: "Build a simple repeatable path from post to message to order.",
      },
    };
  }

  return {
    "0-30 days": {
      focus: "Clear promise and real proof",
      actions: ["Fix the main message.", "Publish the 30-day post plan.", "Collect reviews, proof, and lost-enquiry reasons."],
      target: "Know which message and channel creates enquiries.",
    },
    "31-60 days": {
      focus: "Better replies and repeat orders",
      actions: ["Use saved replies for common questions.", "Ask for referrals and reviews.", "Turn winning posts into simple ads or local pushes."],
      target: "Waste fewer enquiries and win more serious buyers.",
    },
    "61-90 days": {
      focus: "Repeat what worked",
      actions: ["Spend only behind proven posts or offers.", "Track weekly numbers.", "Refresh examples and proof."],
      target: "Move from random marketing to a working routine.",
    },
  };
}

function followerScore(value) {
  const raw = lower(value, "");
  if (/50,000/.test(raw)) return 82;
  if (/10,000/.test(raw)) return 72;
  if (/2,000/.test(raw)) return 58;
  if (/500/.test(raw)) return 44;
  if (/not active|not on|none/.test(raw)) return 28;
  return 38;
}

function budgetScore(value) {
  const raw = lower(value, "");
  if (/2 lakh|50,000/.test(raw)) return 74;
  if (/15,000/.test(raw)) return 62;
  if (/5,000/.test(raw)) return 48;
  if (/zero|organic|under/.test(raw)) return 36;
  return 44;
}

function clampScore(value) {
  return Math.max(12, Math.min(94, Math.round(value)));
}

function buildScores(profile, rawBiz, internetSignals) {
  const city = cityFrom(rawBiz, profile);
  const mode = businessMode(profile, rawBiz);
  const leadService = isLeadServiceBusiness(profile, rawBiz);
  const ecommerce = isEcommerceBusiness(profile, rawBiz);
  const platforms = Array.isArray(rawBiz?.platforms) ? rawBiz.platforms.filter(item => item && item !== "None yet") : [];
  const hasWebsite = Boolean(rawBiz?.biz_website || rawBiz?.own_website_snapshot);
  const websiteSignal = ownWebsiteSignal(internetSignals);
  const followers = followerScore(profile?.channels?.instagramFollowers || rawBiz?.biz_followers);
  const budget = budgetScore(profile?.economics?.marketingBudget || rawBiz?.biz_budget);
  const profileDepth = [profile?.offering?.usp, profile?.customers?.audience, profile?.customers?.challenge, profile?.offering?.coreOffer].filter(Boolean).length * 7;
  const websiteClarityBoost = websiteSignal
    ? (websiteSignal.cta_visible ? 4 : -3) + (websiteSignal.proof_visible ? 4 : -3) + (websiteSignal.pricing_or_process_visible ? 3 : -2)
    : 0;
  const online = clampScore(28 + platforms.length * 9 + (hasWebsite ? 13 : 0) + Math.min(18, followers / 5) + websiteClarityBoost);
  const content = clampScore(32 + profileDepth + Math.min(16, followers / 6) + (websiteSignal?.offer_clarity === "clear" ? 4 : 0));
  const local = clampScore(online + (/online|global/i.test(clean(profile?.market?.location || rawBiz?.biz_location, "")) ? -2 : 6));
  const remember = clampScore(28 + (platforms.includes("WhatsApp") ? 14 : 0) + Math.min(16, budget / 7) + (isCustomProduct(profile, rawBiz) ? 8 : 0));
  const preLaunch = isPreLaunch(profile, rawBiz);

  return [
    { label: "Can people find you online?", score: online, reason: websiteSignal ? "Based on selected channels plus whether the website shows proof, process, and one clear action." : `Based on your selected channels, website details, and current social base in ${city}.` },
    { label: "Are your posts clear?", score: content, reason: websiteSignal ? "Based on your brief and whether the website explains the offer in simple words." : "Based on how clearly the offer, customer, problem, and advantage were described." },
    mode === "digital"
        ? { label: "Can users find and understand you online?", score: local, reason: websiteSignal ? "Based on website clarity, demo or signup visibility, proof, and product explanation." : "Based on website clarity, demo visibility, social proof, waitlist/trial path, and product proof." }
      : ecommerce
        ? { label: "Can shoppers find and trust your product online?", score: local, reason: "Based on product page clarity, checkout trust, reviews, delivery confidence, and product proof." }
      : leadService
        ? { label: "Can ideal clients find and trust you online?", score: local, reason: "Based on website clarity, portfolio proof, case studies, proposal path, and lead quality signals." }
        : { label: "Can nearby customers find you on Google?", score: local, reason: "Based on location, local intent, Google/website readiness, and review potential." },
    { label: preLaunch ? "Will people remember you after seeing you once?" : "Will customers come back?", score: remember, reason: preLaunch ? "Based on WhatsApp, launch reminders, product proof, and how memorable the first offer is." : "Based on WhatsApp, follow-up, reviews, referrals, and repeat purchase reasons." },
  ];
}

function buildCalendarWorkspace(report, hashtags) {
  const days = Array.isArray(report["30-Day Content Calendar"]) ? report["30-Day Content Calendar"] : [];
  return days.map(day => ({
    ...day,
    theme: day.post_type,
    hook: day.topic,
    post: day.what_to_show,
    full_caption: `${day.caption}\n\nWhat the customer should do next: ${day.customer_action}`,
    hashtags: hashtags.slice(0, 10),
    how_to_create: [
      day.what_to_show,
      "Keep the first frame or first line clear.",
      "End by telling the customer what to do next.",
    ],
    why_this_works: day.why_this_helps,
  }));
}

function applyInternetCalendarHints(calendar, internetSignals, profile, rawBiz) {
  const signal = ownWebsiteSignal(internetSignals);
  if (!signal || !Array.isArray(calendar) || calendar.length === 0) return calendar;

  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const recommendation = signal.simple_recommendations?.[0] || "Make the first action clearer.";
  const hesitation = signal.customer_hesitations?.[0] || "Customers need proof before taking action.";

  return calendar.map((day, index) => {
    if (index > 2) return day;
    if (index === 0) {
      return {
        ...day,
        what_to_show: `Show the website promise, then fix this: ${recommendation}`,
        post: `Show the website promise, then fix this: ${recommendation}`,
        how_to_create: [
          "Take a screenshot or short clip of the current top section.",
          `Add one simple note: ${recommendation}`,
          "End with the exact next step customers should take.",
        ],
        why_this_helps: hesitation,
        why_this_works: hesitation,
      };
    }
    if (index === 1) {
      return {
        ...day,
        what_to_show: `Show one proof point from ${name}: result, example, review, screen, product, or process.`,
        post: `Show one proof point from ${name}: result, example, review, screen, product, or process.`,
        why_this_helps: "People trust faster when proof appears before the sales pitch.",
        why_this_works: "People trust faster when proof appears before the sales pitch.",
      };
    }
    return {
      ...day,
      what_to_show: "Answer the biggest website question customers may still have.",
      post: "Answer the biggest website question customers may still have.",
      why_this_helps: "Customers delay less when one doubt is answered before they ask.",
      why_this_works: "Customers delay less when one doubt is answered before they ask.",
    };
  });
}

function buildStrategyWorkspace(report, profile, rawBiz, city) {
  const steps = Array.isArray(report["10-Step Growth Strategy"]) ? report["10-Step Growth Strategy"] : [];
  const preLaunch = isPreLaunch(profile, rawBiz);
  return steps.map((step, index) => ({
    ...step,
    priority: index < 4 ? "Important" : index < 8 ? "Useful" : "Do after the basics",
    effort: index < 5 ? "Simple task" : "Needs some work",
    timeline: index < 3 ? "Do this within 2 days" : index < 7 ? "Do this within 7 days" : "Do this within 30 days",
    reason: preLaunch
      ? `This matters because ${clean(profile?.identity?.name || rawBiz?.biz_name, "the business")} needs people in ${city} to understand and trust it before launch.`
      : `This matters because people should quickly understand, trust, and contact ${clean(profile?.identity?.name || rawBiz?.biz_name, "the business")}.`,
    action_steps: buildStepActionSteps(step, index, profile, rawBiz, city),
    what_to_check: whatToCheckForStep(index, profile, rawBiz, preLaunch),
    expected_result: index < 3 ? "People understand the business faster." : "Marketing feels less random and easier to repeat.",
  }));
}

function buildStepActionSteps(step, index, profile, rawBiz, city) {
  const mode = businessMode(profile, rawBiz);
  const clinic = isClinicBusiness(profile, rawBiz);
  const ecommerce = isEcommerceBusiness(profile, rawBiz);
  const leadService = isLeadServiceBusiness(profile, rawBiz);
  const preLaunch = isPreLaunch(profile, rawBiz);
  const base = clean(step.action, "Turn this into one visible public action.");

  const digital = [
    ["Put the one-line promise on the website hero, LinkedIn bio, and launch post.", "Ask three target users if they understand the use case.", "Track waitlist clicks, demo requests, and beta replies this week."],
    ["Record one short screen flow from problem to first useful result.", "Use the clip on the launch page and first post.", "Track demo views and beta access requests."],
    ["Add one clear waitlist, trial, or demo request button.", "Show what happens after signup.", "Review signup path drop-offs at the end of the week."],
    ["Show before-and-after workflow with the manual way beside the product.", "Use one use case per post.", "Collect objections from comments and DMs."],
    ["Manually onboard the first users before automating support.", "Write down where they get confused.", "Turn the common confusion into the next post."],
  ];
  const clinicSteps = [
    ["Use the line in bio, Google profile, and reception WhatsApp reply.", "Make the next appointment step clear.", "Review patient enquiries and booking questions this week."],
    ["Show one treatment or consultation process in simple words.", "Add doctor/team proof where it builds trust.", "Track appointment enquiries and repeated patient doubts."],
    ["Make booking, clinic timing, and consultation next step visible.", "Keep the patient message calm and clear.", "Review which post made people ask for an appointment."],
    ["Answer one patient worry about safety, pain, timing, or treatment clarity.", "Use doctor-led wording, not sales pressure.", "Save repeated questions for future clinic posts."],
    ["Ask happy patients for reviews after the appointment.", "Keep screenshots or review links organized.", "Check trust signals before increasing ad spend."],
  ];
  const ecommerceSteps = [
    ["Put the product promise on the product page, Instagram bio, and pinned post.", "Show size, material, and delivery clarity beside the product.", "Track product page clicks and first-purchase questions this week."],
    ["Record one product-in-use video with size or variant details.", "Add checkout trust, delivery trust, and review proof.", "Review cart, WhatsApp, and size-help messages."],
    ["Make the first purchase path clear from post to checkout.", "Show return/exchange or support clarity if available.", "Track which product gets saves and checkout clicks."],
    ["Collect real product photos, UGC, reviews, and packaging proof.", "Use one proof point per post.", "Check which proof reduces repeated questions."],
    ["Follow up warm shoppers with one useful product detail.", "Ask what stopped them before purchase.", "Turn the answer into the next product post."],
  ];
  const leadServiceSteps = [
    ["Put the line in LinkedIn bio, website hero, and first DM reply.", "Show one portfolio or case-study proof point.", "Track leads, discovery calls, and proposal requests this week."],
    ["Explain who the service is for and who it is not for.", "Add one example project or client result.", "Review which enquiry source brought serious leads."],
    ["Make the discovery-call or proposal path clear.", "Show what happens after a client messages.", "Track objections before the proposal stage."],
    ["Turn one client question into a useful post.", "Attach proof from portfolio, process, or case study.", "Save the question for future sales replies."],
    ["Follow up warm leads with one specific reason to reply.", "Keep proposal feedback in one list.", "Review lead quality before adding more channels."],
  ];
  const localSteps = [
    ["Put the line in bio, Google profile, and WhatsApp reply.", "Use a real photo or customer question with it.", "Review messages, visits, orders, bookings, and reviews this week."],
    ["Show one clear product, service, dish, result, or process example.", "Add price, timing, or location clarity where useful.", "Track which post made people message or visit."],
    ["Make the next step visible in every profile and post.", "Use the same WhatsApp/call/visit action everywhere.", "Review repeated questions and answer them publicly."],
    ["Ask one happy customer for a review or referral.", "Save the review as future proof.", "Check which proof creates more enquiries."],
    ["Repeat the post type that created real action.", "Drop posts that only got empty likes.", "Review the week before planning the next one."],
  ];

  const set = mode === "digital"
    ? digital
    : clinic ? clinicSteps
    : ecommerce ? ecommerceSteps
    : leadService ? leadServiceSteps
    : localSteps;
  const extras = set[index % set.length];
  return [
    base,
    ...extras,
  ];
}

function whatToCheckForStep(index, profile, rawBiz, preLaunch) {
  const mode = businessMode(profile, rawBiz);
  if (mode === "digital") return "Signups, demo requests, beta replies, activation questions, and product feedback.";
  if (isClinicBusiness(profile, rawBiz)) return "Patient enquiries, appointment bookings, treatment questions, reviews, and trust signals.";
  if (isEcommerceBusiness(profile, rawBiz)) return "Product page clicks, checkout questions, size doubts, reviews, UGC, and first purchases.";
  if (isLeadServiceBusiness(profile, rawBiz)) return "Leads, discovery calls, proposal requests, client questions, and portfolio clicks.";
  return preLaunch ? "Messages, tester interest, questions, and early order requests." : "Messages, orders, bookings, reviews, and repeat enquiries.";
}

function buildPersonas(profile, rawBiz, category, city) {
  const audience = clean(targetLabel(profile, rawBiz), "best-fit customer");
  const offer = lower(offerLabel(profile, rawBiz), "the offer");
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "This business");
  const custom = isCustomProduct(profile, rawBiz);
  const channels = custom ? "Instagram Reels and WhatsApp" : bestChannels(rawBiz, profile, city).slice(0, 3).join(", ");

  if (custom) {
    return [
      {
        label: "College gift buyer",
        note: "This is an example based on your business details, not a real person.",
        who_they_are: `${audience} in or around ${city} looking for a personal gift for a friend, partner, classmate, or event.`,
        what_they_want: "A gift that looks personal, arrives on time, and does not feel common.",
        what_may_stop_them: "They worry the final look may be wrong, the price may change, or delivery may be late.",
        how_to_convince_them: "Show final products, design previews, making videos, price range, and delivery timing.",
        message_to_use: `Send your idea on WhatsApp. ${name} will show the preview before making it.`,
        best_channel: channels,
      },
      {
        label: "Last-minute occasion buyer",
        note: "This is an example based on your business details, not a real person.",
        who_they_are: `Someone in ${city} who suddenly needs a birthday, farewell, or small surprise gift.`,
        what_they_want: "A clear option that can be ordered without too much back-and-forth.",
        what_may_stop_them: "They need to know if the shop can finish and deliver on time.",
        how_to_convince_them: "Show ready sample designs, fast reply, delivery area, and clear making time.",
        message_to_use: "Tell us the occasion and date. We will suggest the safest custom option.",
        best_channel: channels,
      },
    ];
  }

  return [
    {
      label: "Careful buyer",
      note: "This is an example based on your business details, not a real person.",
      who_they_are: `${audience} comparing options before choosing in ${city}.`,
      what_they_want: `A trustworthy way to get ${offer} without wasting time or money.`,
      what_may_stop_them: category.questions[0] || "They are unsure if this is worth it.",
      how_to_convince_them: "Use proof, simple price/process clarity, and one easy first step.",
      message_to_use: `${name} makes the choice easier with clear examples and a simple next step.`,
      best_channel: channels,
    },
    {
      label: "Ready buyer",
      note: "This is an example based on your business details, not a real person.",
      who_they_are: `${audience} with a live need and little patience for vague posts.`,
      what_they_want: "Understand the offer fast and know exactly how to contact you.",
      what_may_stop_them: category.questions[1] || "They do not know what happens after they enquire.",
      how_to_convince_them: "Show result, price/process, proof, and contact method in the same place.",
      message_to_use: "Start with the simplest option. We will guide you from there.",
      best_channel: channels,
    },
  ];
}

function buildPainPointWorkspace(profile, rawBiz, category) {
  const offer = clean(offerLabel(profile, rawBiz), "the offer");
  return category.pains.map((problem, index) => ({
    problem,
    what_to_do: index === 0 ? `Show how ${offer} solves this with one real example.` : "Answer this doubt before customers have to ask.",
    post_idea: index === 0 ? "Make a before-and-after post." : "Make a short question-answer post.",
    what_to_say: category.questions[index % category.questions.length],
    what_makes_them_trust: category.proof[index % category.proof.length],
  }));
}

function problemTextSignature(value) {
  return lower(value, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 9)
    .join(" ");
}

function expandPainPointWorkspace(items, profile, rawBiz, category, city) {
  const existing = Array.isArray(items) ? items.filter(Boolean) : [];
  const signatures = new Set(existing.map(item => problemTextSignature(item.problem || item.customer_problem || item.pain)));
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const offer = lower(offerLabel(profile, rawBiz), "the offer");
  const audience = lower(targetLabel(profile, rawBiz), "customers");
  const mode = businessMode(profile, rawBiz);
  const preLaunch = isPreLaunch(profile, rawBiz);
  const custom = isCustomProduct(profile, rawBiz);
  const customerAction = mode === "digital"
    ? "Start a demo or trial."
    : isServiceBusiness(profile, rawBiz)
      ? "Message to book or ask the next step."
      : "Message to order or ask a question.";

  const themes = custom ? [
    ["They cannot imagine the final product.", "Show finished samples from different angles.", "Post a final-product video with the exact custom detail visible."],
    ["They worry the name, photo, or design may come wrong.", "Promise a preview before making.", "Make a post showing preview, correction, and final confirmation."],
    ["They do not know the starting price.", "Show 3 simple starting-price examples.", "Create a price clarity post with product type and making time."],
    ["They worry delivery may be late.", `Explain making time and ${city} delivery or pickup clearly.`, "Post the order timeline from message to delivery."],
    ["They are scared to pay before seeing proof.", "Show real samples, packaging, and payment rule in one place.", "Make a trust post with sample, preview, advance, and final photo."],
    ["They do not know what gift to choose.", "Give occasion-based options.", "Post birthday, farewell, best friend, and couple gift ideas."],
    ["They think custom ordering will be too much work.", "Show the WhatsApp ordering steps.", "Make a four-step order process carousel."],
    ["They may compare with cheaper online sellers.", `Show local support, preview help, and faster reply in ${city}.`, "Post why local custom support is safer for urgent gifts."],
    ["They do not trust a new page yet.", "Show the founder, workspace, samples, and first customer proof.", "Post behind-the-scenes making and packing videos."],
    ["They may wait until the last minute.", "Tell them the safest order-before date.", "Make a post about deadline for birthdays and events."],
    ["They worry the product will look cheap.", "Show material, finish, packaging, and close-up details.", "Post a close-up quality check reel."],
    ["They do not know if changes are allowed.", "Explain the preview correction rule.", "Post what can be changed before confirmation."],
  ] : mode === "digital" ? [
    ["They do not understand what the product does fast enough.", "Show one use case in the first screen.", "Post a before-and-after demo of the main workflow."],
    ["They worry setup will take too long.", "Show the first useful result in under one minute.", "Record a short setup walkthrough."],
    ["They do not know if the product is for them.", `Show how ${audience} would use it.`, "Make one post for one specific user type."],
    ["They may not trust a new software product.", "Show founder proof, product screenshots, and beta feedback.", "Post a build note with one real product screen."],
    ["They compare with doing it manually.", "Show the time or effort saved.", "Make a post showing manual work versus the app result."],
    ["They do not see the reason to try now.", "Offer a small beta action.", "Invite users to try one feature and send feedback."],
    ["They fear the output may be generic.", "Show one specific result created from real input.", "Post a sample input and output pair."],
    ["They worry it will not fit their workflow.", "Explain where it fits before and after their current step.", "Create a simple workflow diagram post."],
    ["They need proof before paying.", "Show screenshots, testimonials, and trial limits clearly.", "Post a proof thread with real product evidence."],
    ["They do not know what happens after signing up.", "Explain the first 3 steps after login.", "Make a first-login walkthrough."],
    ["They may forget after visiting the site once.", "Collect email or WhatsApp interest with a clear promise.", "Post a waitlist or beta invite with one benefit."],
    ["They do not know how success will be measured.", "Tell them what result to check after using it.", "Post the metric users should watch after trying it."],
  ] : [
    ["They do not know why this business is different.", "Say the simple reason to choose it.", "Make one post comparing the clear benefit with the usual confusing option."],
    ["They need proof before taking action.", "Show real reviews, work examples, or product proof.", "Post one proof card with the next step."],
    ["They worry the price may change later.", "Explain starting price, package, or quote process.", "Create a price/process clarity post."],
    ["They do not know what happens after they message.", "Show the reply and next-step process.", "Post a WhatsApp screenshot-style explainer without private details."],
    ["They may choose a better-known competitor.", "Show what is easier, clearer, or more personal here.", "Create a competitor-safe comparison post."],
    ["They do not know if the business serves their area.", `Mention ${city} and the service area clearly.`, "Post a local area/service coverage card."],
    ["They are not sure the result is worth the effort.", "Show the before and after.", "Make a post around the visible improvement."],
    ["They may forget the business after one post.", "Repeat the same promise in different proof formats.", "Turn the main promise into reel, carousel, and story."],
    ["They do not trust vague claims.", "Replace claims with numbers, photos, reviews, or examples.", "Make a proof-before-promise post."],
    ["They need a smaller first step.", "Offer a simple enquiry, booking, visit, or starter option.", "Post the easiest first action customers can take today."],
    ["They may not know what to ask.", "Give them a ready question or checklist.", "Post send-these-details instructions."],
    ["They worry support will be slow.", "Set reply timing and follow-up expectations.", "Post when and how customers get a reply."],
  ];

  const expanded = [...existing];
  for (const [problem, solution, contentIdea] of themes) {
    if (expanded.length >= 15) break;
    const signature = problemTextSignature(problem);
    if (signatures.has(signature)) continue;
    signatures.add(signature);
    expanded.push({
      problem,
      customer_problem: problem,
      why_they_feel_this: preLaunch
        ? `They have not seen enough proof from ${name} yet.`
        : "They want a clear reason before they spend time or money.",
      your_solution: solution,
      text_to_use: `${name} makes this simple: ${solution.replace(/\.$/, "").toLowerCase()}.`,
      content_idea: contentIdea,
      what_to_do: solution,
      what_to_say: `${name} helps ${audience} with ${offer} without confusion.`,
      post_idea: contentIdea,
      what_makes_them_trust: category.proof[expanded.length % category.proof.length] || "real proof",
      customer_action: customerAction,
    });
  }

  return expanded.slice(0, 15);
}

function buildCompetitorWorkspace(report, profile, rawBiz, category, city) {
  const comp = report["Competitor Intelligence"] || {};
  const custom = isCustomProduct(profile, rawBiz);
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const archetypes = custom
    ? [
        {
          label: "Nearby gift shops customers may choose",
          basis: "Market pattern",
          strengths: ["Easy to visit", "Ready-made items", "Known locally"],
          weaknesses: ["Less personal", "Limited custom preview", "May not show making process"],
          how_to_beat_them: "Show custom previews, final videos, clear price, and WhatsApp ordering.",
        },
        {
          label: "Instagram custom product pages",
          basis: "Market pattern",
          strengths: ["Good visuals", "Easy to message", "Trend-friendly"],
          weaknesses: ["Unclear delivery time", "Weak policy clarity", "Hard to know quality"],
          how_to_beat_them: "Show real making, delivery, packaging, and mistake policy simply.",
        },
        {
          label: "Cheap online sellers",
          basis: "Market pattern",
          strengths: ["Looks cheaper", "Lots of options"],
          weaknesses: ["Less local support", "Harder to change details", "Delivery uncertainty"],
          how_to_beat_them: `Win with local ${city} support, preview confirmation, and faster conversation.`,
        },
      ]
    : [
        {
          label: "More visible businesses",
          basis: "Market pattern",
          strengths: ["More reviews", "More known", "Easier to find"],
          weaknesses: [category.competitorPattern, "Often slow or unclear in replies"],
          how_to_beat_them: `Make ${name} easier to understand and contact.`,
        },
        {
          label: "Cheaper alternatives",
          basis: "Market pattern",
          strengths: ["Looks affordable", "Easy choice for unsure buyers"],
          weaknesses: ["Weak proof", "Less care", "Unclear experience"],
          how_to_beat_them: "Show why the better choice saves confusion, time, or repeat problems.",
        },
      ];

  return {
    basis: comp.basis || "Practical market comparison.",
    archetypes,
    platform_plan: [
      { platform: "Google/Search", move: `Answer price, location, reviews, and ${city} questions better than others.` },
      { platform: "Instagram/Reels", move: "Show product examples, process, customer questions, and real proof." },
      { platform: "WhatsApp/DM", move: "Reply fast with saved answers for price, time, trust, and next step." },
      { platform: "Website/Profile", move: "Put product, proof, price/process, and contact method near the top." },
    ],
  };
}

function buildIdeasWorkspace(report, profile, rawBiz) {
  const ideas = Array.isArray(report["20 Growth Experiments"]) ? report["20 Growth Experiments"] : [];
  return ideas.map((item, index) => ({
    ...item,
    difficulty: index < 7 ? "Easy" : index < 14 ? "Medium" : "Needs patience",
    expected_help: index < 5 ? "Fast learning and clearer enquiries" : index < 14 ? "More steady demand and proof" : "Long-term advantage",
    cost: index % 3 === 0 ? "Low cost" : index % 3 === 1 ? "Some budget may help" : "Mostly time and consistency",
    when_to_try: index < 5 ? "This week" : index < 14 ? "This month" : "After the basics work",
    how_to_try: [
      clean(item.what_to_do, "Run this in the smallest useful way."),
      "Choose what you will check before starting.",
      "Keep screenshots, replies, or feedback as future proof.",
    ],
    why_it_can_work: `It fits because ${clean(profile?.identity?.name || rawBiz?.biz_name, "the business")} needs practical learning from real customer reactions.`,
  }));
}

function buildTemplates(profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const offer = clean(offerLabel(profile, rawBiz), "the offer");
  const custom = isCustomProduct(profile, rawBiz);
  const salon = isSalonBusiness(profile, rawBiz);
  const clinic = isClinicBusiness(profile, rawBiz);
  const leadService = isLeadServiceBusiness(profile, rawBiz);
  const service = isServiceBusiness(profile, rawBiz);

  if (custom) {
    return [
      { type: "First WhatsApp reply", channel: "WhatsApp", template: `Hi, this is ${name}. Send the name/photo/idea, the date you need it, and your area in ${city}. We will suggest the safest custom option.` },
      { type: "Price reply", channel: "WhatsApp", template: `Price depends on product type, size, and detail. Send your idea and we will share the starting price before you confirm.` },
      { type: "Preview confirmation", channel: "WhatsApp", template: `We will show the design preview before making it. Please check spelling, photo, colour, size, and delivery date carefully before confirming.` },
      { type: "Delivery time reply", channel: "WhatsApp", template: `Making time depends on the product and current slots. Tell us the date you need it and your area, and we will confirm if it is possible.` },
      { type: "Advance payment", channel: "WhatsApp", template: `For custom work, we may ask for advance after confirming the design and timing. This helps us start the order safely.` },
      { type: "Review request", channel: "WhatsApp", template: `Thank you for ordering from ${name}. If the gift reached well, please send a quick review or photo. It helps a new local business grow.` },
    ];
  }

  if (salon) {
    return [
      { type: "First booking reply", channel: "WhatsApp / DM", template: `Hi, this is ${name}. Tell us the service you want, preferred date, and hair/skin/event need. We will share the best slot and starting price.` },
      { type: "Price and time reply", channel: "WhatsApp / DM", template: `This service usually takes a set amount of time and starts from a clear price range. We will confirm the final details before booking your slot.` },
      { type: "Proof reply", channel: "WhatsApp / DM", template: `You can check our recent results, reviews, and clean studio setup before booking. We want you to feel clear before you visit.` },
      { type: "Reminder", channel: "WhatsApp", template: `Your appointment with ${name} is coming up. Please reach on time, and message us if you need to change the slot.` },
      { type: "Review request", channel: "WhatsApp", template: `Thank you for visiting ${name}. If you liked the result, a short review helps more local customers choose us confidently.` },
    ];
  }

  if (clinic) {
    return [
      { type: "First appointment reply", channel: "WhatsApp / DM", template: `Hi, this is ${name}. Tell us the concern, preferred appointment slot, and whether this is a first consultation or follow-up. We will guide the next step clearly.` },
      { type: "Consultation reply", channel: "WhatsApp / DM", template: `The dentist or clinic team will explain the consultation, treatment options, timing, and expected cost before you decide.` },
      { type: "Trust reply", channel: "WhatsApp / DM", template: `You can check our clinic process, doctor explanation, and patient-safe reviews before booking. We want you to feel clear before the appointment.` },
      { type: "Appointment reminder", channel: "WhatsApp", template: `Your appointment with ${name} is coming up. Please reach on time and message us if you need to change the slot.` },
      { type: "Review request", channel: "WhatsApp", template: `Thank you for visiting ${name}. If the appointment helped, a short review helps more patients trust the clinic.` },
    ];
  }

  if (leadService) {
    return [
      { type: "First enquiry reply", channel: "WhatsApp / DM", template: `Hi, this is ${name}. Tell us your business type, goal, and timeline. We will suggest whether a discovery call or proposal makes sense.` },
      { type: "Proof reply", channel: "WhatsApp / DM", template: `You can check our portfolio, process, and relevant examples before deciding. We want the next step to feel clear, not pushy.` },
      { type: "Discovery call reply", channel: "WhatsApp / DM", template: `For a useful discovery call, send your current problem, budget range, and what result you want. We will keep the call focused.` },
      { type: "Follow-up", channel: "WhatsApp / DM", template: `Just checking if this is still a priority. If yes, send the goal and timeline, and we can suggest the cleanest next step.` },
      { type: "Review request", channel: "WhatsApp / DM", template: `Thanks for working with ${name}. If the project helped, a short review or testimonial helps future clients trust the process.` },
    ];
  }

  if (service) {
    return [
      { type: "First enquiry reply", channel: "WhatsApp / DM", template: `Hi, this is ${name}. Tell us what help you need, your area in ${city}, and when you want it done. We will share the next step clearly.` },
      { type: "Price and timing reply", channel: "WhatsApp / DM", template: `We will confirm the starting charge, timing, and what is included before you book. No unclear surprise steps.` },
      { type: "Trust reply", channel: "WhatsApp / DM", template: `You can check our reviews, recent work, and service steps before booking. We want the process to feel clear and safe.` },
      { type: "Follow-up", channel: "WhatsApp / DM", template: `Just checking if you still need help with this. Send the issue and area, and we can guide the next step.` },
      { type: "Review request", channel: "WhatsApp / DM", template: `Thanks for choosing ${name}. If the service helped, please leave a short review so more local customers can trust us.` },
    ];
  }

  return [
    { type: "First reply", channel: "WhatsApp / DM", template: `Hi, this is ${name}. Tell us what you need from ${offer}, and we will suggest the easiest first option.` },
    { type: "Price reply", channel: "WhatsApp / DM", template: `Here is the starting price/range. The final option depends on what you need, so we can guide you before you decide.` },
    { type: "Follow-up", channel: "WhatsApp / DM", template: `Just checking if you still need help with this. Happy to answer price, time, or process questions.` },
    { type: "Review request", channel: "WhatsApp / DM", template: `Thanks for choosing ${name}. If the experience was good, please leave a short review or send feedback so we can improve.` },
  ];
}

function applyInternetTemplates(templates, internetSignals, profile, rawBiz) {
  const signal = ownWebsiteSignal(internetSignals);
  if (!signal) return templates;
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const recommendation = signal.simple_recommendations?.[0] || "we will make the next step clear";
  const hesitation = signal.customer_hesitations?.[0] || "you may want proof before deciding";
  const websiteReply = {
    type: "Website question reply",
    channel: "WhatsApp / DM",
    template: `Hi, this is ${name}. If ${hesitation.toLowerCase()}, send your question. We will show the clearest example and next step before you decide.`,
    why_suggested: recommendation,
  };
  return [websiteReply, ...(Array.isArray(templates) ? templates : [])].slice(0, 10);
}

function buildInternetPainPoints(internetSignals, profile, rawBiz) {
  const signal = ownWebsiteSignal(internetSignals);
  if (!signal) return [];
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const hesitations = signal.customer_hesitations?.length
    ? signal.customer_hesitations
    : ["They may hesitate because the next step is unclear."];
  const recommendations = signal.simple_recommendations?.length
    ? signal.simple_recommendations
    : ["Make one next step clear."];

  return hesitations.slice(0, 3).map((problem, index) => {
    const solution = recommendations[index] || recommendations[0];
    return {
      problem,
      customer_problem: problem,
      why_they_feel_this: "They want to understand the value, proof, and next step before spending time or money.",
      your_solution: solution,
      text_to_use: `${name} keeps this simple: ${solution.replace(/\.$/, "").toLowerCase()}.`,
      content_idea: "Turn this exact doubt into one simple post, story, or website section.",
      what_to_do: solution,
      what_to_say: `${name} explains the next step before asking customers to decide.`,
      post_idea: "Make a customer doubt post with the clear answer.",
      what_makes_them_trust: "clear proof and a simple next step",
      customer_action: "Ask the first question or take the next step.",
      internet_signal: true,
    };
  });
}

function buildPsychologyDrivers(profile, rawBiz, category, city, internetSignals) {
  const mode = businessMode(profile, rawBiz);
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const offer = lower(offerLabel(profile, rawBiz), "the offer");
  const audience = lower(targetLabel(profile, rawBiz), "customers");
  const signal = ownWebsiteSignal(internetSignals);
  const signalHesitation = signal?.customer_hesitations?.[0];
  const signalFix = signal?.simple_recommendations?.[0];

  const byMode = mode === "digital" || mode === "creator"
    ? [
        ["I do not understand what happens after signup.", "New software feels risky when the first useful result is invisible.", "Show a 20-second screen recording from input to result.", "Here is what happens in the first minute."],
        ["Will this fit my workflow?", "People resist changing habits unless the new step feels smaller than the old pain.", "Show one before-and-after workflow.", "Use this when the old way feels too slow."],
        ["Is this real or just another tool?", "Founders and teams compare proof before trying a new product.", "Show product screens, beta feedback, and one honest use case.", `${name} shows the result before asking you to commit.`],
      ]
    : isClinicBusiness(profile, rawBiz)
      ? [
          ["Will this be painful, expensive, or confusing?", "Patients delay when the appointment process feels unknown.", "Explain the first consultation step calmly.", "We explain the treatment options before you decide."],
          ["Can I trust the doctor or clinic team?", "Medical choices need trust before action.", "Show doctor/team proof and patient-safe reviews.", "Meet the clinic team and understand the next step."],
          ["What will happen when I visit?", "Predictability reduces nervous-patient fear.", "Show timing, booking, and consultation process.", "Here is what happens in your first appointment."],
        ]
      : isEcommerceBusiness(profile, rawBiz)
        ? [
            ["Will the product look like this when it arrives?", "First-time shoppers fear wasting money on unclear quality.", "Show UGC, reviews, size/fit, and delivery clarity.", "See the product clearly before you buy."],
            ["What if the size, delivery, or return goes wrong?", "Risk feels bigger online because the shopper cannot touch the product.", "Show size chart, delivery time, support, and return clarity.", "Check fit, delivery, and support before checkout."],
            ["Why not buy cheaper elsewhere?", "Shoppers compare price unless value is visible.", "Show material, use, review, and reason to choose this product.", "Here is what makes this worth choosing."],
          ]
        : isLeadServiceBusiness(profile, rawBiz)
          ? [
              ["Can they actually do this for my business?", "Service buyers need proof of thinking before they book a call.", "Show one case study: problem, process, result, lesson.", "See how the thinking works before booking a call."],
              ["Will the call waste my time?", "Busy owners avoid vague discovery calls.", "Explain who the service is for and what happens after enquiry.", "Send your goal and timeline; we will suggest the clean next step."],
              ["Is this worth the budget?", "Price anxiety reduces when scope and proof are clear.", "Show packages, process, and portfolio proof.", "Understand the fit before you ask for a proposal."],
            ]
          : [
              ["Can I trust this business?", "People avoid buying when proof is weaker than the risk.", "Show one real review, result, product, or process.", "See the proof before you decide."],
              ["What should I do first?", "An unclear next step makes people delay even when interested.", "Put one action everywhere: message, book, visit, order, or ask.", "Start with this one simple step."],
              ["Is this worth the money?", "Price anxiety drops when people understand value, process, and proof.", "Show starting price or what affects price.", "Ask for the best option for your need and budget."],
            ];

  const base = [
    ...(signalHesitation ? [[signalHesitation, "The website details suggest this doubt may appear before customers take action.", signalFix || "Make the proof and next step clearer.", signalFix || "Here is the clearest next step."]] : []),
    ...byMode,
    ["There are too many choices.", "Decision overload makes people postpone even simple purchases.", "Recommend one starter option for one customer type.", `If you are unsure, start with the simplest ${offer} option.`],
    ["I might forget this later.", "Memory improves when the same promise appears through proof, story, and repeat cues.", "Repeat the same promise in a reel, carousel, story, and saved reply.", `${name} should be remembered for one clear reason.`],
    ["Maybe I should compare more.", "Known alternatives feel safer unless the difference is simple.", "Show the difference without attacking competitors.", `${name} is easier to choose when the proof and next step are clear.`],
  ];

  return base.slice(0, 8).map(([customerThought, why, show, say]) => ({
    customer_thought: customerThought,
    why_it_happens: why,
    what_to_show: show,
    what_to_say: say,
    ethical_rule: "Reduce confusion and risk. Do not fake urgency, reviews, scarcity, or guarantees.",
    customer_action: mode === "digital" ? "Try the demo, beta, waitlist, or first use case." : `Ask the next question or take the clearest step in ${city}.`,
    audience,
  }));
}

function buildBrandKit(profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const audience = lower(targetLabel(profile, rawBiz), "your customers");
  const offer = lower(offerLabel(profile, rawBiz), "the offer");
  const usp = lower(profile?.offering?.usp || rawBiz?.biz_usp, "a better experience");
  const custom = isCustomProduct(profile, rawBiz);
  const salon = isSalonBusiness(profile, rawBiz);
  const service = isServiceBusiness(profile, rawBiz);
  const messagesToRepeat = custom
    ? ["Show the final product first", "Preview before making", `Simple WhatsApp ordering in ${city}`, "Clear price and making time"]
    : salon
      ? ["Show real results", "Make booking easy", "Show clean setup", "Clear service price and time"]
      : service
        ? ["Show the problem and fix", "Make enquiry easy", "Show local proof", "Clear price and timing"]
        : ["Clear promise", "Real proof", "Simple first step", `${city} or customer relevance`];
  const wordsToUse = custom
    ? ["Clear", "real", "simple", "today", "preview", "proof", "easy"]
    : salon
      ? ["Result", "clean", "book", "slot", "review", "style", "simple"]
      : service
        ? ["Book", "nearby", "clear", "trusted", "review", "timing", "easy"]
        : ["Clear", "real", "simple", "today", "proof", "easy", "helpful"];
  const customerActions = custom
    ? ["Send your idea on WhatsApp", "Ask for a preview", "Check delivery time", "Confirm the design"]
    : salon
      ? ["Book a slot", "Ask for the service list", "Check recent results", "Read reviews"]
      : service
        ? ["Send the issue", "Share your area", "Ask for timing", "Book the service"]
        : ["Ask for the demo workflow", "Share the manual task", "Check the first setup step", "See the proof screen"];

  return {
    brand_voice: clean(profile?.brand?.personality || rawBiz?.biz_personality, "Simple, warm, direct, and proof-led"),
    messages_to_repeat: messagesToRepeat,
    words_to_use: wordsToUse,
    words_to_avoid: ["Best ever", "guaranteed huge results", "premium without proof", "limited offer every day"],
    short_bio: `${name} helps ${audience} get ${usp} through ${offer}.`,
    simple_offer_line: `${offer} for ${audience} who want ${usp} without confusion.`,
    customer_actions: customerActions,
  };
}

function buildPremiumGrowth(profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const offer = clean(offerLabel(profile, rawBiz), "the offer");
  const custom = isCustomProduct(profile, rawBiz);
  const preLaunch = isPreLaunch(profile, rawBiz);
  const base = [
    ["Better offer ladder", `Turn ${offer} into a starter option, main option, and bigger option.`, "Customers can choose without confusion."],
    [preLaunch ? "Launch feedback habit" : "Repeat customer habit", preLaunch ? "Ask early customers what confused them before and after ordering." : "Give every first-time customer a reason to come back or refer someone.", "The business stops depending only on new attention."],
    ["Referral script", `Give happy customers one simple sentence to share ${name}.`, "Good customers can bring similar customers."],
    ["First reply cleanup", "Fix the first reply, proof placement, and follow-up message before spending more money.", "Many enquiries are lost because replies are unclear."],
    [custom ? "Custom proof library" : "Proof library", custom ? "Collect product videos, previews, delivery photos, and packaging clips every week." : "Collect reviews, screenshots, result photos, and process clips every week.", "Every future post becomes easier to believe."],
    [`${city} local plan`, `Own specific ${city} use cases before trying broad awareness.`, "Local relevance makes the business easier to remember."],
    ["Partner post", "Partner with one nearby non-competing business, creator, club, or community.", "Borrowed trust helps without heavy ad spend."],
    [custom ? "WhatsApp order cleanup" : "Warm lead cleanup", custom ? "Create saved replies for price, preview, payment, delivery, and changes." : "Message warm leads with one useful reason to act now.", "Direct conversations teach faster than guessing."],
  ];

  return base.map(([title, action, why], index) => ({
    module: index + 1,
    title,
    action,
    why,
    timeline: index < 3 ? "This week" : index < 6 ? "This month" : "After the basics work",
    output: "One visible post, script, page, product example, or offer improvement.",
  }));
}

function customPreLaunchCalendar(profile, rawBiz, city, hashtags, existingCalendar = []) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const base = [
    {
      day: 1,
      post_type: "Reel",
      hook: `Custom gifts are coming to ${city}.`,
      caption: `${name} is opening soon. Send your idea, see a preview, confirm it, and get your customised product made.`,
      how_to_create: ["Show 3 sample products on a table.", "Record close-up shots.", "Add text: Send idea -> See preview -> Confirm -> Get it made."],
      customer_action: "Message preview on WhatsApp.",
      why_this_works: "People understand what you sell when they see real sample products.",
    },
    {
      day: 2,
      post_type: "Story poll",
      hook: "Which design should we launch first?",
      caption: `Help us choose ${name}'s first design.`,
      how_to_create: ["Show two sample designs.", "Add a poll sticker.", "Share the winning design the next day."],
      customer_action: "Vote on the poll.",
      why_this_works: "Students remember the brand better when they help choose something.",
    },
    {
      day: 3,
      post_type: "Carousel",
      hook: `Ordering from ${name} is simple.`,
      caption: `Send your idea. See a preview. Confirm the design. Get it made and delivered in ${city}.`,
      how_to_create: ["Make 4 slides.", "Slide 1: send idea.", "Slide 2: see preview.", "Slide 3: confirm.", "Slide 4: get it made and delivered."],
      customer_action: "Save the post or message on WhatsApp.",
      why_this_works: "A clear order process removes fear before the first message.",
    },
    {
      day: 4,
      post_type: "Reel",
      hook: "We make only after you confirm.",
      caption: "Before we make your custom product, we show you a preview. You can check name, photo, colour, size, and spelling.",
      how_to_create: ["Show a sample preview on screen.", "Then show the final product.", "Keep the video short and clear."],
      customer_action: "Message preview.",
      why_this_works: "Preview confirmation makes custom orders feel safer.",
    },
    {
      day: 5,
      post_type: "Post",
      hook: "No guessing about price.",
      caption: `${name} prices depend on product type, size, design detail, and delivery. Send your idea and we will guide you.`,
      how_to_create: ["Show 3 sample products.", "Add starting from price placeholders.", "Mention that final price depends on details."],
      customer_action: "Message your budget.",
      why_this_works: "Students may avoid messaging if they think it will be too expensive.",
    },
    {
      day: 6,
      post_type: "Reel",
      hook: "From idea to gift.",
      caption: "A simple idea can become a personal gift when every detail is checked properly.",
      how_to_create: ["Record hands making, cutting, packing, or arranging the product.", "Show the final look at the end."],
      customer_action: "Ask how many days your idea will take.",
      why_this_works: "Making videos show that the product is real and handled with care.",
    },
    {
      day: 7,
      post_type: "Story",
      hook: "Which area should we deliver to first?",
      caption: `${name} is preparing delivery and pickup around ${city}. Reply with your area or college.`,
      how_to_create: ["Use a question sticker.", "Ask for area or college name.", "Save the answers in a simple list."],
      customer_action: "Reply with area name.",
      why_this_works: "Local delivery clarity reduces doubt before ordering.",
    },
    {
      day: 8,
      post_type: "Reel",
      hook: "For the friend who says no gifts.",
      caption: "Some gifts are kept because they feel personal. Send us a name, photo, or idea.",
      how_to_create: ["Show one sample birthday gift.", "Use simple packing.", "End with the order step."],
      customer_action: "Tag a friend.",
      why_this_works: "Occasion-based posts help buyers imagine who the gift is for.",
    },
    {
      day: 9,
      post_type: "Carousel",
      hook: "Custom orders need careful checking.",
      caption: "Before making, we check name, spelling, photo, colour, size, and delivery date.",
      how_to_create: ["Create a checklist-style carousel.", "Use one detail per slide.", "End with preview confirmation."],
      customer_action: "Save before ordering.",
      why_this_works: "Mistake-prevention content builds trust before payment.",
    },
    {
      day: 10,
      post_type: "Reel",
      hook: "First 10 test orders are opening.",
      caption: `${name} is starting slowly so every custom detail is checked properly. Message slot to reserve one.`,
      how_to_create: ["Show sample products.", "Show WhatsApp order steps.", "Show the launch offer clearly."],
      customer_action: "Message slot.",
      why_this_works: "A small first batch helps the owner learn without taking too many orders.",
    },
  ];

  const fixed = base.map(day => ({
    ...day,
    platform: "Instagram / WhatsApp",
    topic: day.hook,
    ready_caption: day.caption,
    what_to_show: day.how_to_create.join(" "),
    full_caption: `${day.caption}\n\nCustomer action: ${day.customer_action}`,
    hashtags: hashtags.slice(0, 10),
    why_this_helps: day.why_this_works,
    why_suggested: day.why_this_works,
    theme: day.post_type,
    post: day.how_to_create.join(" "),
  }));

  const remaining = existingCalendar
    .filter(day => Number(day.day) > 10)
    .map(day => ({
      ...day,
      hook: day.hook || day.topic,
      how_to_create: asCleanList(day.how_to_create || day.what_to_show),
      why_this_works: day.why_this_works || day.why_this_helps,
    }));

  return [...fixed, ...remaining].slice(0, 30);
}

function asCleanList(value) {
  const list = getList(value);
  return list.length ? list : [clean(value, "Do this in the smallest useful way.")];
}

function customPreLaunchStrategy(profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  return [
    ["Make 5 Sample Products First", "People will not trust a new custom product store without seeing real products.", ["Make 5 sample products.", "Record videos.", "Post them on Instagram.", "Share them on WhatsApp status.", "Ask people which one they like."], `${name} can make samples for birthdays, farewell, best friends, couples, and college gifts.`, "Price questions, WhatsApp messages, and story replies.", "Which sample should we launch first? Reply with your favourite."],
    ["Set Up WhatsApp Ordering", "Custom orders need clear steps.", ["Create WhatsApp Business profile.", "Add business name and logo.", "Add quick replies.", "Add product photos.", "Pin the order process."], `${name} can pin: Send your idea, see a preview, confirm, then we make it.`, "More complete first messages.", "Send your idea, see a preview, confirm, then we make it."],
    ["Create Instagram Highlights", "New visitors should understand the shop in 10 seconds.", ["Create highlights: How to Order, Samples, Prices, Delivery, FAQ, Offers.", "Add one clear story to each highlight.", "Update them when customers ask repeat questions."], `${name} can keep the order steps visible even when posts move down the feed.`, "Profile visits turning into messages.", "New here? Check How to Order before messaging us."],
    ["Run a 7-Day Launch Countdown", "People need to see you more than once before they remember you.", ["Day 1: teaser.", "Day 2: sample product.", "Day 3: how to order.", "Day 4: price clarity.", "Day 5: delivery area.", "Day 6: launch offer.", "Day 7: test orders open."], `${name} can repeat the same launch story in different simple formats.`, "Story replies, saves, shares, and preview messages.", "Test orders open soon. Follow today so you do not miss the first slots."],
    ["Show Preview Before Making", "This is the biggest trust step for custom products.", ["Ask for name, photo, colour, size, and date.", "Send preview.", "Ask customer to confirm.", "Start making only after confirmation."], `${name} can show a sample preview beside a final product.`, "Fewer doubts before payment.", "We make only after you confirm the preview."],
    ["Start With First 10 Orders", "Do not try to take too many orders at the start.", ["Open only 10 test order slots.", "Handle every order carefully.", "Take photos and feedback.", "Improve the process.", "Then open more slots."], `${name} can say: First 10 test orders are opening soon in ${city}.`, "Slot messages and completed first orders.", "Message slot to reserve one."],
    ["Make One Clear Price Post", "Students may avoid messaging if they think it is expensive.", ["Show starting price range.", "Explain what changes price.", "Mention delivery separately.", "Ask people to send budget."], `${name} can show three product examples with starting prices.`, "Price questions from serious buyers.", "Send your idea and budget. We will suggest the best option."],
    ["Use Local Language Lightly", `${name} should feel local, not like a random online page.`, ["Use simple Malayalam-English in some posts.", "Keep order details in clear English.", "Test one local-style caption each week."], "Gift venam, but basic aakaruthu. Send your idea. We'll show a preview.", "Shares and replies from local students.", "Gift venam, but basic aakaruthu. Send your idea. We'll show a preview."],
    ["Collect First Proof", "After first orders, proof becomes your strongest marketing.", ["Send final product photo.", "Ask customer for review.", "Ask permission to post.", "Share packaging or delivery photo."], `${name} can turn each first order into a future trust post.`, "Reviews, customer photos, and permission to post.", "Your review helps a new local business grow."],
    ["Review Every Sunday", "Do not guess what is working.", ["Check which post got messages.", "Check which product got price questions.", "Check which story got replies.", "Check which caption people shared.", "Write the repeated question for next week's content."], `${name} can choose next week's posts from real replies, not random ideas.`, "A clear list of what to repeat next week.", "This week we learned what people ask most. Next week we will answer it better."],
  ].map(([title, why, steps, example, track, copy], index) => ({
    step: index + 1,
    title,
    why_this_matters: why,
    reason: why,
    why_suggested: why,
    steps,
    action_steps: steps,
    example_for_this_business: example,
    track_this: track,
    what_to_check: track,
    copy_ready_text: copy,
    priority: index < 3 ? "Do this first" : index < 7 ? "Do this this week" : "Do after the basics",
    effort: "Simple task",
    timeline: index < 3 ? "Do this today" : index < 7 ? "Do this within 7 days" : "Do this within 30 days",
  }));
}

function customPainPoints(city) {
  return [
    ["Will the final product look good?", "Customers worry the product may not look like the sample.", "Send preview before making.", "We make only after you confirm the preview.", "Show a sample preview beside the final product."],
    ["How much will it cost?", "People may not message if price is unclear.", "Show starting price range.", "Price depends on size, detail, and delivery. Send your idea and budget.", "Make a simple starting price post."],
    ["Will it reach on time?", "Gift buyers usually need the product before a date.", "Ask the needed date first.", "Tell us the date first. We will confirm timing before taking the order.", "Post a timing chart for normal and urgent orders."],
    ["What if spelling is wrong?", "Custom names and text can go wrong.", "Check spelling before making.", "Please check the spelling in the preview. We start only after confirmation.", "Make a spelling-check carousel."],
    ["Do I need to pay advance?", "Advance payment can feel risky.", "Explain it calmly.", "Advance is taken only after preview confirmation so we can reserve material.", "Make a simple payment rules story."],
    ["Can I change the design?", "Customers may want edits.", "Allow changes before final confirmation.", "You can ask for changes before confirming the preview.", "Show before-confirmation edit examples."],
    ["Is delivery available?", "Local buyers need delivery clarity.", "Mention delivery and pickup areas.", `Delivery and pickup available around ${city}. Send your area to confirm.`, "Ask followers to reply with their area."],
    ["Is the quality good?", "A new business has no trust yet.", "Post material close-ups and making videos.", "Here is the material and finish before it becomes a gift.", "Post a material close-up Reel."],
    ["I do not know what to order.", "Some customers want a gift but have no idea.", "Ask occasion and budget.", "Tell us the occasion and budget. We will suggest 2-3 ideas.", "Make gift idea posts by budget and occasion."],
    ["Can I gift this to someone?", "Customers need to imagine use cases.", "Show birthday, farewell, best friend, couple, and college gift examples.", "Made for birthdays, farewell, best friends, couples, and college memories.", "Show one gift use case per post."],
  ].map(([problem, why, solution, text, idea]) => ({
    problem,
    customer_problem: problem,
    why_they_feel_this: why,
    your_solution: solution,
    text_to_use: text,
    content_idea: idea,
    what_to_do: solution,
    what_to_say: text,
    post_idea: idea,
  }));
}

function customCompetitors(name) {
  return [
    ["Normal gift shops", "Easy to visit and buy quickly.", "Custom gifts feel more personal.", "Normal gifts are easy. Personal gifts are remembered.", "Compare a normal gift with a personalised one."],
    ["Instagram gift pages", "They show many product photos.", "Show clearer order steps and preview before making.", "Know exactly how your order works before paying.", "Post the full WhatsApp order process."],
    ["Cheap online sellers", "Low price.", "Local support, preview, and faster communication.", "Talk to a real person before your gift is made.", "Show local reply speed and preview steps."],
    ["Amazon / Flipkart", "Fast delivery and many options.", "More personal designs and local help.", "Not just delivered. Made for your person.", "Show why a custom gift feels more personal."],
    ["Local printing shops", "They can print quickly.", "Better gifting style, packaging, and Instagram-friendly designs.", "Custom product + gift feel + clear preview.", "Show packaging and final gift feel."],
    ["College sellers", "They know students personally.", "Look more organised with WhatsApp steps, previews, and delivery clarity.", "Easy to order. Easy to confirm. Easy to gift.", "Show highlight tabs and order steps."],
    ["Big gift stores", "They look established.", "Personal attention and flexible customisation.", "Your idea gets personal attention, not just a shelf product.", "Show a one-idea-to-final-product story."],
    ["Cheaper custom pages", "They attract price-sensitive buyers.", "Show quality, material, and mistake-prevention process.", "Cheap is not useful if the name, photo, or date goes wrong.", "Post the mistake-prevention checklist."],
    ["Trendy product pages", "They follow trends.", "Turn trends into local custom gift ideas.", "Trending style, made personal for your friend.", "Post a trend as a local gift idea."],
    ["No competitor given", "Customers still compare with common choices.", `${name} can compare against normal gifts, online sellers, printing shops, Instagram pages, and cheap sellers.`, `${name} is safer and easier to order from.`, "Make a simple comparison carousel."],
  ].map(([label, strengths, win, message, post]) => ({
    label,
    other_option: label,
    strengths: [strengths],
    what_they_do_well: strengths,
    where_this_business_can_win: win,
    message_to_use: message,
    post_idea: post,
    how_to_beat_them: win,
  }));
}

function customGrowthIdeas(city) {
  const postIdeas = [
    ["Preview Challenge", "Instagram Reels", "Show one design preview and ask people to guess the final product.", "Guess what this becomes.", "Comment your guess."],
    ["₹500 Gift Ideas", "Instagram carousel", "Show 3 personal gift ideas under ₹500.", "Need a gift without spending too much? Start here.", "Save this post."],
    ["Best Friend Gift Reel", "Instagram Reels", "Show a funny best-friend gift idea.", "For the friend who deserves drama and love.", "Tag your best friend."],
    ["Farewell Gift Carousel", "Instagram carousel", "Show 5 farewell gift ideas.", "Farewell gift ideas that are not boring.", "Share with your class group."],
    ["Mistake Check Reel", "Instagram Reels", "Show spelling and photo check before making.", "Custom gifts need careful checking.", "Message preview."],
    ["Packing ASMR Video", "Instagram Reels / WhatsApp Status", "Record packing sounds and close-ups.", "Packing your gift like it matters.", "Ask for gift packing."],
    ["Poll: Name or Photo?", "Instagram Story", "Ask which custom style people like.", "Name design or photo design?", "Vote on the story."],
    ["Design Battle", "Instagram Story / Reel", "Show two sample designs.", "Which one should launch first?", "Vote A or B."],
    ["Local Delivery Post", "Instagram post / WhatsApp Status", `Ask which area in ${city} needs delivery.`, `Which ${city} area should we deliver to first?`, "Reply with area."],
    ["Gift Reminder Story", "Instagram Story", "Remind people to order early before birthdays.", "Birthday next week? Do not wait until the last day.", "Message early."],
  ];

  const growthOpportunities = [
    ["First 10 Test Orders", "Instagram and WhatsApp", "Post: First 10 test orders opening soon.", "First 10 test orders opening soon.", "Slot messages."],
    ["Friend Referral", "WhatsApp Status and Instagram Story", "Give a small add-on when two friends order.", "Order with a friend and both get free gift packing.", "Referral messages."],
    ["College Gift Packs", "Instagram Reels and carousel", "Create 3 sample packs.", "Gift ideas for your college gang.", "Pack enquiries."],
    ["Design of the Week", "Instagram and WhatsApp", "Post one design every week.", "This week's design is open for custom orders.", "Votes and custom order messages."],
    ["WhatsApp Status Selling", "WhatsApp Status", "Post one product, one order step, and one offer every day.", "Reply preview to see how this order works.", "Replies to status."],
    ["Google Business Trust", "Google Business and Instagram", "Add product photos, hours, and WhatsApp number.", "Find Cartroid on Google soon.", "Profile views and WhatsApp taps."],
    ["Gift Reminder Content", "Instagram Story and WhatsApp Status", "Post reminders for birthdays, farewell, anniversaries, and college events.", "Need a gift by Friday? Message early.", "Date-based messages."],
    ["Packaging Upgrade", "Instagram Reels", "Show gift packing as an add-on.", "Make it ready to gift.", "Gift-packing requests."],
    ["Customer Idea Polls", "Instagram Story", "Ask: What should Cartroid make next?", "What should Cartroid make next?", "Poll votes and replies."],
    ["Early Buyer Proof", "Instagram and WhatsApp", "Ask for photo, review, or simple feedback.", "Your review helps a new local business grow.", "Reviews and customer photos."],
  ];

  return [...postIdeas, ...growthOpportunities].map(([title, where, show, text, action], index) => ({
    idea: index + 1,
    title,
    idea_title: title,
    opportunity: title,
    where_to_post: where,
    why_it_can_work: index < 10 ? "This gives people a clear reason to react, save, share, or message." : "This turns attention into a small practical business result.",
    expected_help: index < 10 ? "More replies, saves, shares, and clear product interest." : "More useful enquiries, proof, and ordering confidence.",
    what_to_do: show,
    what_to_show: show,
    copy_ready_text: text,
    caption: text,
    customer_action: action,
    track_this: index < 10 ? "Replies, saves, shares, votes, and WhatsApp messages." : action,
    what_to_check: index < 10 ? "Replies, saves, shares, votes, and WhatsApp messages." : action,
    difficulty: "Easy",
    cost: "Low cost",
    when_to_try: index < 10 ? "This week" : "This month",
    how_to_try: [show],
  }));
}

function customPsychology(city) {
  return [
    ["People trust what they can see", "Do not only say good quality.", "Show real videos, close-ups, and final product photos.", "Here is the material and finish before it becomes a gift.", "Seeing feels safer than reading."],
    ["People fear custom mistakes", "Custom orders can go wrong.", "Show preview confirmation.", "We make only after you confirm the preview.", "Customers feel safe when they approve before making."],
    ["Students avoid unknown prices", "Many students will not message if they think it is costly.", "Show starting prices.", "Send your idea and budget. We will suggest the best option.", "Clear price brings serious enquiries."],
    ["People need a simple next step", "Do not make them think too much.", "End posts with one action.", "Message preview on WhatsApp.", "One clear action gets more messages."],
    ["People like feeling involved", "Before launch, involve followers.", "Use polls and design voting.", "Which design should we launch first?", "People remember what they helped choose."],
    ["People buy gifts for moments", "They buy for birthdays, farewell, and memories.", "Post occasion-based gift ideas.", "Made for birthdays, farewell, best friends, couples, and college memories.", "Occasions create urgency."],
    ["People trust local clarity", "Local buyers want to know delivery and pickup.", `Mention ${city} delivery areas.`, `Delivery and pickup available around ${city}. Send your area to confirm.`, "Local clarity reduces doubt."],
    ["People like proof from others", "Early reviews matter.", "Post customer feedback after first orders.", "Your review helps a new local business grow.", "People trust other buyers more than brand claims."],
    ["People share simple ideas", "Simple content spreads faster.", "Use natural local captions.", "Gift venam, but basic aakaruthu.", "It feels natural and shareable."],
    ["People need repeated reminders", "One post is not enough.", "Repeat the order process in different formats.", "Send idea -> See preview -> Confirm -> Get it made.", "People understand after seeing it more than once."],
  ].map(([thought, meaning, show, say, why]) => ({
    customer_thought: thought,
    what_it_means: meaning,
    what_to_show: show,
    what_to_say: say,
    why_this_works: why,
  }));
}

function customPremiumGrowth() {
  return [
    ["First 30 Customers Plan", "A step-by-step plan to get the first 30 buyers.", "Start with 10 test orders, then 10 referral orders, then 10 occasion-based orders.", "The owner gets a clear target instead of random posting.", "Unlock the full first 30 customers plan."],
    ["WhatsApp Follow-Up System", "Messages for people who asked price but did not order.", "Hi, just checking. Do you want us to suggest a design based on your budget?", "Many people need one reminder before buying.", "Unlock the follow-up message set."],
    ["College Ambassador Plan", "A simple way to make students promote the business.", "Give one student free gift packing or commission for bringing orders.", "Students trust other students.", "Unlock the college ambassador plan."],
    ["Launch Week Command Plan", "A daily launch checklist.", "Day 1 samples, Day 2 order steps, Day 3 price post, Day 4 launch offer, Day 5 test orders.", "The owner knows exactly what to do each day.", "Unlock the launch week command plan."],
    ["Product Drop System", "A weekly design launch plan.", "Every Friday, release one Design of the Week.", "People get a reason to return.", "Unlock the weekly product drop system."],
    ["Review Collection System", "Review request messages and posting plan.", "Thank you for ordering. Can you send a small review or photo? It helps our new business build trust.", "Reviews make a new store feel real.", "Unlock the review collection system."],
    ["Price Ladder Plan", "A simple way to show low, medium, and premium options.", "Basic gift, better gift, special gift.", "Customers can choose based on budget.", "Unlock the price ladder plan."],
    ["Local Google Trust Plan", "A checklist to make Google Business look active.", "Add photos, hours, WhatsApp, products, launch post, and first reviews.", "Local buyers trust businesses they can find on Google.", "Unlock the local Google trust plan."],
    ["Repeat Buyer Plan", "A plan to bring customers back after first order.", "Send occasion reminders and new design updates.", "Gift buyers may buy again for another friend.", "Unlock the repeat buyer plan."],
    ["Monthly Growth Review", "A simple monthly checkup.", "Which post got messages? Which product got price questions? Which offer worked? Which area asked for delivery?", "The business improves every month.", "Unlock the monthly growth review."],
  ].map(([title, gets, preview, why, unlock], index) => ({
    module: index + 1,
    title,
    what_user_gets: gets,
    small_preview: preview,
    why_this_helps: why,
    why,
    unlock_message: unlock,
    timeline: index < 4 ? "This month" : "After the basics work",
  }));
}

function buildPlainFullPlan({ report, profile, rawBiz, category, city, calendar, strategy, personas, templates, internetSignals }) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const preLaunch = isPreLaunch(profile, rawBiz);
  const custom = isCustomProduct(profile, rawBiz);
  const audience = targetLabel(profile, rawBiz);
  const offer = offerLabel(profile, rawBiz);
  const channels = bestChannels(rawBiz, profile, city).join(", ");
  const base = {
    "Quick Summary": {
      business: name,
      location: city,
      category: clean(profile?.market?.industry || rawBiz?.biz_industry, "Business"),
      customer: audience,
      product: offer,
      best_channels: channels,
      simple_read: preLaunch
        ? `${name} should focus on launch readiness, first customers, real examples, and clear ordering before talking about sales growth.`
        : `${name} should make the offer easier to understand, easier to trust, and easier to contact.`,
    },
    [preLaunch ? "Launch Readiness" : "What To Fix First"]: preLaunch
      ? {
          prepare: custom ? "Samples, design preview rules, price range, making time, delivery area, and WhatsApp ordering." : "Samples, first offer, contact method, price/process clarity, and a soft launch list.",
          first_goal: "Get the first 10-20 real conversations or test orders.",
          avoid: "Do not talk about monthly sales, repeat customers, or big claims before real orders exist.",
        }
      : {
          first_goal: "Make the promise, proof, and customer action clear everywhere.",
          fix_now: "Profile bio, WhatsApp reply, Google details, and the first few posts.",
          avoid: "Do not post randomly without answering customer questions.",
        },
    [preLaunch ? "First Customer Plan" : "Customer Plan"]: {
      who_to_start_with: custom ? `Students, friends buying gifts, college crowd, and local buyers in ${city}.` : audience,
      what_to_offer_first: preLaunch ? "A small tester or launch-week order with extra care." : "A simple starter option.",
      where_to_find_them: channels,
      what_to_say: category.waysToTalk,
    },
    "Do This First": strategy.slice(0, 5).map(step => ({
      title: step.title,
      simple_explanation: step.why_this_matters || step.reason || step.why_suggested,
      do_this: step.steps || step.action_steps || [step.action],
      copy_ready_text: step.copy_ready_text,
      how_to_know_it_worked: step.track_this || step.what_to_check,
    })),
    [preLaunch ? "Top 5 Posts Before Opening" : "Top 5 Posts To Try"]: calendar.slice(0, 5).map(day => ({
      title: `Day ${day.day} - ${day.hook || day.topic}`,
      post_type: day.post_type,
      show: day.how_to_create || day.what_to_show,
      caption: day.caption || day.ready_caption,
      customer_action: day.customer_action,
      why_this_helps: day.why_this_works || day.why_this_helps,
    })),
    "Example Customer Types": personas,
    "Top Customer Worries": category.questions,
    "Top WhatsApp Messages": templates.slice(0, 5),
    "Numbers To Watch": preLaunch
      ? ["People who ask for price", "People who ask delivery or timing", "People who join tester list", "First orders", "Questions repeated often"]
      : ["Enquiries", "Orders or bookings", "Reviews", "Repeat orders", "Questions repeated often"],
  };

  if (report["Website Roast"]) {
    base["Website Check"] = report["Website Roast"];
  }

  if (internetSignals?.internet_enrichment === "used") {
    base["Website Details Used"] = {
      note: "Used your website details to make this more specific.",
      what_changed: signalList(internetSignals.own_website?.simple_recommendations, internetSignals.competitor?.positioning_gaps).slice(0, 4),
    };
  }

  return base;
}

function hydrateLibraryText(value, profile, rawBiz, city) {
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "the business");
  const location = clean(profile?.market?.location || rawBiz?.biz_location, city);
  const product = clean(profile?.offering?.coreOffer || rawBiz?.biz_offer, "the product");
  const audience = clean(targetLabel(profile, rawBiz), "the right customers");
  const platforms = bestChannels(rawBiz, profile, city).join(" and ");
  const priceRange = clean(profile?.offering?.averageTicket || rawBiz?.biz_ticket, "the right price range");
  const offer = clean(profile?.offering?.usp || rawBiz?.biz_usp, "a clear first offer");

  return String(value || "")
    .replace(/\{\{businessName\}\}/g, name)
    .replace(/\{\{location\}\}/g, location.split(",")[0].trim() || location)
    .replace(/\{\{category\}\}/g, clean(profile?.market?.industry || rawBiz?.biz_industry, "business"))
    .replace(/\{\{product\}\}/g, product)
    .replace(/\{\{audience\}\}/g, audience)
    .replace(/\{\{platform\}\}/g, platforms)
    .replace(/\{\{priceRange\}\}/g, priceRange)
    .replace(/\{\{offer\}\}/g, offer)
    .replace(/\{\{deliveryArea\}\}/g, `${city} and nearby areas`);
}

function hydrateLibraryValue(value, profile, rawBiz, city) {
  if (Array.isArray(value)) return value.map(item => hydrateLibraryValue(item, profile, rawBiz, city));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, hydrateLibraryValue(child, profile, rawBiz, city)]));
  }
  if (typeof value === "string") return hydrateLibraryText(value, profile, rawBiz, city);
  return value;
}

function libraryBlocksBySection(strategyBlocks) {
  return (Array.isArray(strategyBlocks) ? strategyBlocks : []).reduce((acc, block) => {
    const key = block.section_type || "other";
    acc[key] = acc[key] || [];
    acc[key].push(block);
    return acc;
  }, {});
}

function sortLibraryBlocks(blocks) {
  const priority = { urgent: 0, important: 1, optional: 2 };
  return [...blocks].sort((a, b) => {
    const dayA = Number(a.content_json?.day_hint || 999);
    const dayB = Number(b.content_json?.day_hint || 999);
    if (dayA !== dayB) return dayA - dayB;
    const priorityA = priority[a.priority] ?? 9;
    const priorityB = priority[b.priority] ?? 9;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return Number(b.retrieval_score || 0) - Number(a.retrieval_score || 0);
  });
}

function libraryBlockToStep(block, index, profile, rawBiz, city) {
  const content = hydrateLibraryValue(block.content_json || {}, profile, rawBiz, city);
  const actionSteps = getList(content.what_to_do);

  return {
    step: index + 1,
    title: clean(content.title || block.title, "Recommended action"),
    action: actionSteps.join(" "),
    priority: index < 3 ? "Do this first" : index < 7 ? "Do this this week" : "Do after the basics",
    effort: block.difficulty === "medium" ? "Needs some work" : "Simple task",
    timeline: block.timeframe === "today" ? "Do this today" : block.timeframe === "first_7_days" ? "Do this within 7 days" : "Do this within 30 days",
    reason: hydrateLibraryText(block.why_suggested || content.why_this_helps, profile, rawBiz, city),
    why_suggested: hydrateLibraryText(block.why_suggested || content.why_this_helps, profile, rawBiz, city),
    action_steps: actionSteps,
    example_for_this_business: content.example,
    what_to_check: content.how_to_check,
    expected_result: content.why_this_helps,
    source_id: block.id,
  };
}

function buildLibraryCalendar(strategyBlocks, profile, rawBiz, city, hashtags) {
  return sortLibraryBlocks(strategyBlocks.filter(block => block.section_type === "thirty_day_calendar"))
    .slice(0, 30)
    .map((block, index) => {
      const content = hydrateLibraryValue(block.content_json || {}, profile, rawBiz, city);
      const caption = clean(content.ready_caption || content.example, "");
      const action = clean(content.customer_action, "Message for the next step.");

      return {
        day: Number(content.day_hint || index + 1),
        platform: "Instagram / WhatsApp",
        post_type: clean(content.post_type, "Post"),
        topic: clean(content.topic || content.title || block.title, "Post idea"),
        what_to_show: clean(content.what_to_show || getList(content.what_to_do).join(" "), "Show one real example."),
        caption,
        ready_caption: caption,
        why_this_helps: clean(content.why_this_helps, "This makes the next step clearer for customers."),
        why_suggested: hydrateLibraryText(block.why_suggested || content.why_this_helps, profile, rawBiz, city),
        customer_action: action,
        theme: clean(content.post_type, "Post"),
        hook: clean(content.topic || content.title || block.title, "Post idea"),
        post: clean(content.what_to_show, ""),
        full_caption: `${caption}\n\nWhat the customer should do next: ${action}`,
        hashtags: hashtags.slice(0, 10),
        how_to_create: [
          clean(content.what_to_show || getList(content.what_to_do).join(" "), "Show one real example."),
          "Keep the first frame or first line clear.",
          "End by telling the customer what to do next.",
        ],
        why_this_works: clean(content.why_this_helps, ""),
        source_id: block.id,
      };
    });
}

function buildLibraryWorkspacePieces(strategyBlocks, profile, rawBiz, city, hashtags) {
  const blocks = Array.isArray(strategyBlocks) ? strategyBlocks : [];
  const bySection = libraryBlocksBySection(blocks);
  const actionSections = [
    "first_priority",
    "simple_summary",
    "confidence_step",
    "customer_question",
    "whatsapp_message",
    "instagram_action",
    "google_business_action",
    "offer_idea",
    "local_action",
    "measurement",
    "seven_day_plan",
  ];
  const actionBlocks = sortLibraryBlocks(actionSections.flatMap(section => bySection[section] || []));
  const strategy = actionBlocks.slice(0, 10).map((block, index) => libraryBlockToStep(block, index, profile, rawBiz, city));
  const calendar = buildLibraryCalendar(blocks, profile, rawBiz, city, hashtags);
  const captionBank = [
    ...calendar.map(day => day.ready_caption || day.caption).filter(Boolean),
    ...sortLibraryBlocks(bySection.caption || []).map(block => hydrateLibraryText(block.content_json?.example || block.content_json?.title || block.title, profile, rawBiz, city)),
  ].slice(0, 12);
  const templates = sortLibraryBlocks(bySection.whatsapp_message || []).map(block => {
    const content = hydrateLibraryValue(block.content_json || {}, profile, rawBiz, city);
    return {
      type: clean(content.title || block.title, "WhatsApp message"),
      channel: "WhatsApp",
      template: clean(content.example || getList(content.what_to_do).join(" "), ""),
      why_suggested: hydrateLibraryText(block.why_suggested || content.why_this_helps, profile, rawBiz, city),
    };
  });
  const confidenceIdeas = sortLibraryBlocks([
    ...(bySection.confidence_step || []),
    ...(bySection.customer_question || []),
    ...(bySection.google_business_action || []),
  ]).map(block => {
    const content = hydrateLibraryValue(block.content_json || {}, profile, rawBiz, city);
    return `${clean(content.title || block.title, "Action")}: ${hydrateLibraryText(block.why_suggested || content.why_this_helps, profile, rawBiz, city)}`;
  });

  return {
    enabled: blocks.length > 0,
    strategy,
    calendar,
    captionBank,
    templates,
    confidenceIdeas,
    blocksUsed: blocks.length,
  };
}

function buildWorkspace({ report, profile, rawBiz, category, city, hashtags, telemetry, strategyBlocks, internetSignals }) {
  const business = {
    name: clean(profile?.identity?.name || rawBiz?.biz_name, "Your Business"),
    category: clean(profile?.market?.industry || rawBiz?.biz_industry, "Business"),
    location: clean(profile?.market?.location || rawBiz?.biz_location, city),
    tag: `${clean(profile?.market?.industry || rawBiz?.biz_industry, "Business")} · ${clean(profile?.market?.location || rawBiz?.biz_location, city)}`,
    positioning_summary: report["Business Health Snapshot"]?.diagnosis,
    customer_model: modelLabel(profile, rawBiz),
    operating_model: clean(profile?.identity?.type || rawBiz?.biz_type, "Not provided"),
  };
  const library = buildLibraryWorkspacePieces(strategyBlocks, profile, rawBiz, city, hashtags);
  const customPreLaunch = isCustomProduct(profile, rawBiz) && isPreLaunch(profile, rawBiz);
  const strategy = customPreLaunch
    ? customPreLaunchStrategy(profile, rawBiz, city)
    : library.strategy.length >= 10 ? library.strategy : buildStrategyWorkspace(report, profile, rawBiz, city);
  const baseCalendar = library.calendar.length >= 30 ? library.calendar : buildCalendarWorkspace(report, hashtags);
  const calendarBeforeSignals = customPreLaunch ? customPreLaunchCalendar(profile, rawBiz, city, hashtags, baseCalendar) : baseCalendar;
  const calendar = applyInternetCalendarHints(calendarBeforeSignals, internetSignals, profile, rawBiz);
  const ideas = customPreLaunch ? customGrowthIdeas(city) : buildIdeasWorkspace(report, profile, rawBiz);
  const personas = buildPersonas(profile, rawBiz, category, city);
  const templates = applyInternetTemplates(library.templates.length ? library.templates : buildTemplates(profile, rawBiz, city), internetSignals, profile, rawBiz);
  const premiumGrowth = customPreLaunch ? customPremiumGrowth() : buildPremiumGrowth(profile, rawBiz, city);
  const internetPainPoints = buildInternetPainPoints(internetSignals, profile, rawBiz);
  const basePainPoints = customPreLaunch ? customPainPoints(city) : buildPainPointWorkspace(profile, rawBiz, category);
  const painPointItems = expandPainPointWorkspace(
    [...internetPainPoints, ...basePainPoints],
    profile,
    rawBiz,
    category,
    city,
  );
  const competitorItems = customPreLaunch
    ? {
        basis: "Common choices a customer may compare before ordering.",
        archetypes: customCompetitors(business.name),
        platform_plan: [
          { platform: "Instagram", move: "Show samples, order steps, preview rules, and price clarity." },
          { platform: "WhatsApp", move: "Reply with saved messages for idea, price, preview, timing, and delivery." },
          { platform: "Google", move: "Add photos, hours, WhatsApp number, products, and first reviews." },
        ],
      }
    : buildCompetitorWorkspace(report, profile, rawBiz, category, city);
  const psychologyTab = customPreLaunch
    ? {
        customer_thoughts: customPsychology(city),
      }
    : {
        core_truth: report["Customer Psychology"]?.core_truth,
        customer_thoughts: buildPsychologyDrivers(profile, rawBiz, category, city, internetSignals),
        what_customers_feel: [category.customerTruth, "They want clarity, proof, price/process comfort, and an easy next step."],
        why_they_buy: [report["Customer Psychology"]?.buying_trigger],
        questions_before_buying: report["Customer Psychology"]?.questions || category.questions,
        things_that_build_trust: library.confidenceIdeas.length ? library.confidenceIdeas : category.proof,
        ways_to_talk_about_it: category.waysToTalk,
      };
  const fullReport = buildPlainFullPlan({ report, profile, rawBiz, category, city, calendar, strategy, personas, templates, internetSignals });
  const tabs = cleanPlainValue({
    calendar: { days: calendar },
    strategy: { steps: strategy },
    psychology: psychologyTab,
    clientPersona: { personas },
    painPoints: { items: painPointItems },
    competitors: competitorItems,
    ideas: { experiments: ideas },
    captions: {
      caption_bank: library.captionBank.length ? library.captionBank : report["Caption Bank"] || buildCaptionBank(profile, rawBiz, city),
      hashtag_bank: hashtags,
      suggested_topics: calendar.slice(0, 6).map(day => day.topic),
    },
    templates: { templates },
    brandKit: buildBrandKit(profile, rawBiz, city),
    roiTool: {
      average_transaction: report["ROI Calculator"]?.average_transaction,
      assumptions: report["ROI Calculator"],
      adjustable_inputs: {
        extra_customers: 10,
        people_who_buy_after_seeing_ad_percent: 8,
        monthly_budget: isPreLaunch(profile, rawBiz) ? "Not needed before launch" : clean(profile?.economics?.marketingBudget || rawBiz?.biz_budget, "Not provided"),
      },
      note: "Use this only as a rough planning helper. Replace it with real order numbers later.",
    },
    premiumGrowth: { modules: premiumGrowth },
    fullReport,
  });

  return {
    business,
    meta: {
      generation_source: telemetry?.generation_source || "knowledge_engine",
      ai_calls_count: telemetry?.ai_calls_count || 0,
      knowledge_objects_used: telemetry?.knowledge_objects_used || 0,
      strategy_blocks_used: library.blocksUsed || telemetry?.strategy_blocks_used || 0,
      strategy_library_preview: library.enabled,
      fallback_used: Boolean(telemetry?.fallback_used),
      estimated_cost_saved: telemetry?.estimated_cost_saved || null,
      schema_valid: true,
      modules_generated: Object.keys(tabs).length,
      missing_sections_filled: [],
      internet_enrichment: internetSignals?.internet_enrichment || telemetry?.internet_enrichment || "unavailable",
      internet_sources_used: telemetry?.internet_sources_used || [],
      website_details_note: internetSignals?.user_note || "",
      quality_checks: {
        passed: true,
        voice: "plain business assistant",
        prelaunch_rules_applied: isPreLaunch(profile, rawBiz),
        custom_product_rules_applied: isCustomProduct(profile, rawBiz),
      },
    },
    scores: buildScores(profile, rawBiz, internetSignals),
    tabs,
  };
}

function reportHasContent(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every(reportHasContent);
  if (typeof value === "object") return Object.keys(value).length > 0 && Object.values(value).some(reportHasContent);
  return true;
}

function hasAnyContent(value, keys) {
  return Boolean(value) && keys.some(key => reportHasContent(value[key]));
}

function validateFlatSections(report) {
  const missing = REQUIRED_SECTIONS.filter(section => !reportHasContent(report?.[section]));
  if (report?.Website_Roast) missing.push("Website Roast uses invalid key");
  return {
    valid: missing.length === 0,
    missing,
  };
}

export function validateReportSchema(report) {
  const missing = [...validateFlatSections(report).missing];
  const tabs = report?.tabs && typeof report.tabs === "object" ? report.tabs : null;

  if (!tabs) {
    missing.push("tabs");
  } else {
    for (const tab of REQUIRED_TABS) {
      if (!reportHasContent(tabs[tab])) missing.push(`tabs.${tab}`);
    }

    const calendarDays = Array.isArray(tabs.calendar?.days) ? tabs.calendar.days.length : 0;
    const strategySteps = Array.isArray(tabs.strategy?.steps) ? tabs.strategy.steps.length : 0;
    const experiments = Array.isArray(tabs.ideas?.experiments) ? tabs.ideas.experiments.length : 0;
    const premiumModules = Array.isArray(tabs.premiumGrowth?.modules) ? tabs.premiumGrowth.modules.length : 0;
    const painPoints = Array.isArray(tabs.painPoints?.items) ? tabs.painPoints.items.length : 0;
    const ideaItems = Array.isArray(tabs.ideas?.experiments) ? tabs.ideas.experiments : [];
    const laterItems = Array.isArray(tabs.premiumGrowth?.modules) ? tabs.premiumGrowth.modules : [];
    const fullReport = tabs.fullReport && typeof tabs.fullReport === "object" ? tabs.fullReport : {};

    if (calendarDays < 30) missing.push("tabs.calendar.days must contain 30 days");
    if (strategySteps < 10) missing.push("tabs.strategy.steps must contain 10 steps");
    if (painPoints < 15) missing.push("tabs.painPoints.items must contain 15 customer problems");
    if (experiments < 20) missing.push("tabs.ideas.experiments must contain 20 ideas");
    if (premiumModules < 1) missing.push("tabs.premiumGrowth.modules must not be empty");
    if (!reportHasContent(fullReport["Quick Summary"])) missing.push("tabs.fullReport.Quick Summary");
    if (!hasAnyContent(fullReport, ["Launch Readiness", "What To Fix First"])) missing.push("tabs.fullReport readiness summary");
    if (!hasAnyContent(fullReport, ["First Customer Plan", "Customer Plan"])) missing.push("tabs.fullReport customer plan");
    if (!reportHasContent(fullReport["Numbers To Watch"])) missing.push("tabs.fullReport.Numbers To Watch");
    if (ideaItems.some(item => !hasAnyContent(item, ["exact_action", "what_to_show", "what_to_do", "test"])
      || !hasAnyContent(item, ["why_it_matters", "why", "expected_help", "why_it_can_work", "why_it_fits"])
      || !hasAnyContent(item, ["how_to_execute", "how_to_try", "steps"])
      || !hasAnyContent(item, ["expected_result", "expected_help", "what_to_check", "metric"]))) {
      missing.push("tabs.ideas.experiments must contain renderable action, reason, steps, and result");
    }
    if (laterItems.some(item => !hasAnyContent(item, ["exact_action", "action", "what_user_gets"])
      || !hasAnyContent(item, ["why_it_matters", "why", "why_this_helps"])
      || !hasAnyContent(item, ["how_to_execute", "small_preview", "output"])
      || !hasAnyContent(item, ["expected_result", "unlock_message", "output"]))) {
      missing.push("tabs.premiumGrowth.modules must contain renderable action, reason, steps, and result");
    }
  }

  const os = report?.marketing_os && typeof report.marketing_os === "object" ? report.marketing_os : null;
  if (!os) {
    missing.push("marketing_os");
  } else {
    const requiredMarketingOsKeys = [
      "business_diagnosis",
      "positioning",
      "growth_strategy_10_steps",
      "customer_pain_points_15",
      "consumer_psychology",
      "competitor_intelligence",
      "content_calendar_30_days",
      "growth_ideas_20",
      "execution_checklist",
      "exportable_report_data",
    ];
    for (const key of requiredMarketingOsKeys) {
      if (!reportHasContent(os[key])) missing.push(`marketing_os.${key}`);
    }
    if (Array.isArray(os.growth_strategy_10_steps) && os.growth_strategy_10_steps.length < 10) {
      missing.push("marketing_os.growth_strategy_10_steps must contain 10 steps");
    }
    if (Array.isArray(os.customer_pain_points_15) && os.customer_pain_points_15.length < 15) {
      missing.push("marketing_os.customer_pain_points_15 must contain 15 items");
    }
    if (Array.isArray(os.content_calendar_30_days) && os.content_calendar_30_days.length < 30) {
      missing.push("marketing_os.content_calendar_30_days must contain 30 days");
    }
    if (Array.isArray(os.growth_ideas_20) && os.growth_ideas_20.length < 20) {
      missing.push("marketing_os.growth_ideas_20 must contain 20 ideas");
    }
  }

  if (!Array.isArray(report?.scores) || report.scores.length !== 4) {
    missing.push("scores must contain 4 quick business checks");
  }

  return {
    valid: missing.length === 0,
    missing: Array.from(new Set(missing)),
  };
}

function sanitizeSnapshotForOutput(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  return {
    url: snapshot.url,
    title: snapshot.title,
    description: snapshot.description,
    headings: Array.isArray(snapshot.headings) ? snapshot.headings.slice(0, 6) : [],
    callsToAction: Array.isArray(snapshot.callsToAction) ? snapshot.callsToAction.slice(0, 6) : [],
    detectedGaps: Array.isArray(snapshot.detectedGaps) ? snapshot.detectedGaps.slice(0, 6) : [],
    wordCount: snapshot.wordCount,
  };
}

function sanitizeRawBusinessInput(rawBiz) {
  if (!rawBiz || typeof rawBiz !== "object") return rawBiz;
  return {
    ...rawBiz,
    own_website_snapshot: sanitizeSnapshotForOutput(rawBiz.own_website_snapshot),
    competitor_website_snapshot: sanitizeSnapshotForOutput(rawBiz.competitor_website_snapshot),
  };
}

function masterArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function masterText(...values) {
  for (const value of values) {
    const text = flattenText(value);
    if (text) return text;
  }
  return "";
}

function masterStep(step, index, profile, rawBiz, city) {
  const title = masterText(step.title, step.priority, step.name, `Growth step ${index + 1}`);
  const why = masterText(step.why_this_matters, step.reason, step.why, `This helps ${clean(profile?.identity?.name || rawBiz?.biz_name, "the business")} earn more useful customer action.`);
  const actions = masterArray(step.how_to_execute || step.steps || step.action_steps || step.how)
    .map(item => masterText(item))
    .filter(Boolean)
    .slice(0, 6);
  return {
    ...step,
    step: Number(step.step || index + 1),
    title,
    exact_action: masterText(step.exact_action, title),
    diagnosis: masterText(step.diagnosis, why),
    why_this_matters: why,
    reason: why,
    when_to_do_this: masterText(step.when_to_do_this, step.timeline, index < 3 ? "Today" : index < 7 ? "This week" : "This month"),
    who_should_do_it: masterText(step.who_should_do_it, "Owner or the person handling marketing"),
    recommended_format: masterText(step.recommended_format, step.post_type, step.postType, "Post or message"),
    campaign_type: masterText(step.campaign_type, "execution"),
    steps: actions.length ? actions : [`Apply this to the main offer in ${city}.`, "Use one clear proof point.", "Track real customer action."],
    action_steps: actions.length ? actions : [`Apply this to the main offer in ${city}.`, "Use one clear proof point.", "Track real customer action."],
    how_to_execute: actions.length ? actions : [`Apply this to the main offer in ${city}.`, "Use one clear proof point.", "Track real customer action."],
    customer_doubt_solved: masterText(step.customer_doubt_solved, "Customers need proof before they act."),
    example_for_this_business: masterText(step.example_for_this_business, `${clean(profile?.identity?.name || rawBiz?.biz_name, "This business")} can use this for ${clean(profile?.offering?.coreOffer || rawBiz?.biz_offer, "the main offer")}.`),
    copy_ready_text: masterText(step.copy_ready_text, `${title}. ${clean(profile?.identity?.name || rawBiz?.biz_name, "We")} can guide the next step clearly.`),
    track_this: masterText(step.track_this, step.what_to_check, step.expected_result, "Useful messages, saves, calls, bookings, orders, or qualified replies."),
    what_to_check: masterText(step.what_to_check, step.track_this, step.expected_result, "Useful messages, saves, calls, bookings, orders, or qualified replies."),
    business_result: masterText(step.business_result, step.expected_result, step.track_this, "More useful customer action."),
    expected_result: masterText(step.expected_result, step.business_result, step.track_this, "More useful customer action."),
    founder_check: masterText(step.founder_check, "Check whether a stranger can understand the offer, proof, and next step."),
    timeline: masterText(step.timeline, index < 3 ? "Today" : index < 7 ? "This week" : "This month"),
    effort: masterText(step.effort, index < 5 ? "Simple task" : "Needs follow-up"),
  };
}

function masterCalendarDay(day, index, profile, rawBiz, city, hashtags) {
  const title = masterText(day.title, day.topic, day.hook, `Day ${index + 1} action`);
  const postType = masterText(day.post_type, day.postType, day.content_format, "Post");
  const action = masterText(day.customer_action, day.customerAction, day.cta, "Message for the next step");
  const caption = masterText(day.caption, day.ready_caption, `${title}. ${action}.`);
  const whatToShow = masterText(day.whatToShow, day.what_to_show, day.visual_direction, day.post, day.script, `Show one real proof point from ${city}.`);
  return {
    ...day,
    day: Number(day.day || index + 1),
    platform: masterText(day.platform, "Instagram"),
    postType,
    post_type: postType,
    campaign_type: masterText(day.campaign_type, postType),
    when_to_do_this: masterText(day.when_to_do_this, "Use this on the planned day when the proof is ready."),
    who_should_do_it: masterText(day.who_should_do_it, "Owner or the person handling marketing"),
    recommended_format: masterText(day.recommended_format, postType),
    title,
    topic: title,
    hook: masterText(day.hook, title),
    objective: masterText(day.objective, day.goalIntent, "Move the customer one step closer to action."),
    target_customer: masterText(day.target_customer, targetLabel(profile, rawBiz)),
    customer_objection: masterText(day.customer_objection, "They need more clarity before acting."),
    marketing_psychology: masterText(day.marketing_psychology, "clarity and proof"),
    content_format: masterText(day.content_format, postType),
    visual_direction: whatToShow,
    whatToShow,
    what_to_show: whatToShow,
    post: whatToShow,
    shot_list: masterArray(day.shot_list).length ? masterArray(day.shot_list) : [
      "Open with the result or customer doubt.",
      "Show one real proof point.",
      `End with: ${action}.`,
    ],
    script: masterText(day.script, whatToShow, title),
    caption,
    ready_caption: caption,
    full_caption: masterText(day.full_caption, `${caption}\n\nNext step: ${action}`),
    customerAction: action,
    customer_action: action,
    cta: action,
    expected_outcome: masterText(day.expected_outcome, day.why_this_works, "More useful customer action."),
    why_this_works: masterText(day.why_this_works, day.why_this_helps, "This connects proof, customer doubt, and the next step."),
    why_this_helps: masterText(day.why_this_helps, day.why_this_works, "This connects proof, customer doubt, and the next step."),
    how_to_create: masterArray(day.how_to_create).length ? masterArray(day.how_to_create) : [
      masterText(day.visual_direction, "Show one real proof point."),
      masterText(day.script, "Use simple words customers understand."),
      `End with: ${action}.`,
    ],
    hashtags: masterArray(day.hashtags).length ? masterArray(day.hashtags).slice(0, 10) : hashtags.slice(0, 10),
  };
}

function masterPainPoint(item, index, profile, rawBiz) {
  const problem = masterText(item.problem, item.customer_problem, item.objection, `Customer doubt ${index + 1}`);
  const solution = masterText(item.your_solution, item.answer, item.what_to_do, "Give a clear answer with real proof.");
  return {
    ...item,
    problem,
    customer_problem: problem,
    why_they_feel_this: masterText(item.why_they_feel_this, item.reason, "They need proof before they act."),
    your_solution: solution,
    exact_action: masterText(item.exact_action, solution),
    when_to_do_this: masterText(item.when_to_do_this, "Use this before asking the customer to decide."),
    who_should_do_it: masterText(item.who_should_do_it, "Owner or the person handling marketing"),
    recommended_format: masterText(item.recommended_format, "Post, reply, or website section"),
    campaign_type: masterText(item.campaign_type, "customer problem"),
    how_to_execute: masterArray(item.how_to_execute).length ? masterArray(item.how_to_execute) : [
      solution,
      "Use one real proof point.",
      "End with one clear next step.",
    ],
    customer_doubt_solved: masterText(item.customer_doubt_solved, problem),
    expected_result: masterText(item.expected_result, "Fewer repeated doubts and more qualified customer action."),
    text_to_use: masterText(item.text_to_use, item.what_to_say, `${clean(profile?.identity?.name || rawBiz?.biz_name, "We")} can guide this clearly.`),
    content_idea: masterText(item.content_idea, item.post_idea, `Create a post answering: ${problem}`),
    what_to_do: solution,
    what_to_say: masterText(item.what_to_say, item.text_to_use, solution),
    post_idea: masterText(item.post_idea, item.content_idea, `Use proof to answer: ${problem}`),
    trust_factor: masterText(item.trust_factor, item.proof, "real proof"),
  };
}

function masterPersona(item, index, profile, rawBiz, city) {
  const name = masterText(item.name, item.label, `Customer type ${index + 1}`);
  return {
    label: name,
    note: "Created from the master strategy.",
    who_they_are: masterText(item.who_they_are, `${name} in ${city} who may need ${clean(profile?.offering?.coreOffer || rawBiz?.biz_offer, "the offer")}.`),
    what_they_want: masterText(item.need, item.what_they_want, "A clear reason to act."),
    motivation: masterText(item.motivation, item.need, "They want the result without confusion."),
    fear: masterText(item.fear, item.hesitation, item.what_may_stop_them, "They need more proof."),
    buying_trigger: masterText(item.buying_trigger, item.best_message, "A clear proof point and one easy next step."),
    objection: masterText(item.objection, item.hesitation, item.what_may_stop_them, "They need more proof."),
    what_may_stop_them: masterText(item.hesitation, item.what_may_stop_them, "They need more proof."),
    how_to_convince_them: masterText(item.how_to_sell, item.how_to_convince_them, item.best_message, "Use simple proof and a clear next step."),
    how_to_sell: masterText(item.how_to_sell, item.how_to_convince_them, item.best_message, "Use simple proof and a clear next step."),
    exact_action: masterText(item.exact_action, item.how_to_sell, "Show proof and guide the next step."),
    message_to_use: masterText(item.best_message, item.message_to_use, "Ask one clear question and guide the next step."),
    best_channel: masterText(item.best_channel, "Instagram"),
    customer_doubt_solved: masterText(item.customer_doubt_solved, item.hesitation, "They need more proof."),
    expected_result: masterText(item.expected_result, "More qualified customer action."),
  };
}

function masterCompetitors(masterStrategy, existingCompetitors) {
  const intelligence = masterStrategy?.competitor_intelligence;
  if (intelligence && typeof intelligence === "object" && !Array.isArray(intelligence)) {
    return intelligence;
  }
  const competitors = masterArray(masterStrategy?.competitors);
  if (!competitors.length) return existingCompetitors;
  return {
    basis: "Common options customers may compare before deciding.",
    archetypes: competitors.map((item, index) => ({
      label: masterText(item.alternative, item.label, `Alternative ${index + 1}`),
      basis: "Master strategy",
      strengths: [masterText(item.why_people_choose_it, "It may feel familiar.")],
      weaknesses: [masterText(item.weakness_to_use, "The next step may not be clear.")],
      how_to_beat_them: masterText(item.how_to_win, item.how_to_beat_them, "Win with clearer proof and a simpler next step."),
      message_to_use: masterText(item.message_to_use, "Make the offer easier to compare and act on."),
    })),
    platform_plan: masterArray(existingCompetitors?.platform_plan),
  };
}

function masterIdea(item, index) {
  return {
    ...item,
    category: masterText(item.category, index < 8 ? "sales" : index < 14 ? "content" : "trust"),
    title: masterText(item.title, item.idea, `Growth idea ${index + 1}`),
    exact_action: masterText(item.exact_action, item.title, item.idea, `Growth idea ${index + 1}`),
    why: masterText(item.why_it_matters, item.why, item.detail, item.expected_result, "This creates more useful customer action."),
    why_it_matters: masterText(item.why_it_matters, item.why, item.detail, "This creates more useful customer action."),
    when_to_do_this: masterText(item.when_to_do_this, item.when_to_try, index < 5 ? "This week" : index < 14 ? "This month" : "After the basics work"),
    who_should_do_it: masterText(item.who_should_do_it, "Owner or the person handling marketing"),
    recommended_format: masterText(item.recommended_format, "Small test"),
    campaign_type: masterText(item.campaign_type, item.category, "growth experiment"),
    how_to_execute: masterArray(item.how_to_execute).length ? masterArray(item.how_to_execute) : masterArray(item.steps),
    steps: masterArray(item.steps).length ? masterArray(item.steps) : [
      masterText(item.action, "Create one small test."),
      "Use the strongest channel.",
      masterText(item.expected_result, "Track useful customer action."),
    ],
    customer_doubt_solved: masterText(item.customer_doubt_solved, "Customers need a clearer reason to act."),
    expected_result: masterText(item.expected_result, "More useful customer action."),
    effort: masterText(item.effort, index < 10 ? "Small test" : "Needs follow-up"),
  };
}

function compactMasterStrategy(masterStrategy) {
  if (!masterStrategy || typeof masterStrategy !== "object") return null;
  return cleanPlainValue(masterStrategy);
}

function applyMasterStrategyToReport(finalReport, masterStrategy, profile, rawBiz, city, hashtags, category, internetSignals) {
  if (!masterStrategy || typeof masterStrategy !== "object") return finalReport;

  const strategySteps = masterArray(masterStrategy.growth_strategy_10_steps).map((step, index) => masterStep(step, index, profile, rawBiz, city));
  const calendarDays = masterArray(masterStrategy.content_calendar_30_days).map((day, index) => masterCalendarDay(day, index, profile, rawBiz, city, hashtags));
  const painPoints = masterArray(masterStrategy.customer_pain_points_15).map((item, index) => masterPainPoint(item, index, profile, rawBiz));
  const personas = masterArray(masterStrategy.target_personas).map((item, index) => masterPersona(item, index, profile, rawBiz, city));
  const growthIdeas = masterArray(masterStrategy.growth_ideas_20).map((item, index) => masterIdea(item, index));
  const captions = masterArray(masterStrategy.captions).map(item => masterText(item)).filter(Boolean);
  const templates = masterArray(masterStrategy.message_templates).map((item, index) => ({
    type: masterText(item.type, item.title, `Message ${index + 1}`),
    channel: masterText(item.channel, "WhatsApp"),
    template: masterText(item.template, item.message, "Hi, tell us what you need and we will guide the next step clearly."),
    why_suggested: masterText(item.why_suggested, item.why_this_works, "This keeps the reply clear and easy."),
  }));
  const psychology = masterStrategy.consumer_psychology && typeof masterStrategy.consumer_psychology === "object"
    ? masterStrategy.consumer_psychology
    : {
        core_truth: masterText(masterStrategy.business_diagnosis?.root_causes?.[0], "Customers need proof, clarity, and an easy next step."),
        customer_thoughts: masterArray(masterStrategy.psychology).map((item, index) => ({
          customer_thought: painPoints[index % Math.max(1, painPoints.length)]?.problem || `Customer thought ${index + 1}`,
          what_it_means: masterText(item.use_it_by, "Use this to reduce hesitation."),
          what_to_show: masterStrategy.content_pillars?.[index % Math.max(1, masterArray(masterStrategy.content_pillars).length)]?.proof_needed || "real proof",
          what_to_say: painPoints[index % Math.max(1, painPoints.length)]?.what_to_say || "Use a clear answer.",
          why_this_works: masterText(item.use_it_by, "This makes the decision easier."),
        })),
        decision_drivers: masterArray(masterStrategy.psychology).map(item => masterText(item.principle, item.name)).filter(Boolean),
      };

  finalReport.master_strategy = compactMasterStrategy(masterStrategy);
  finalReport.meta = {
    ...(finalReport.meta || {}),
    master_strategy_enabled: true,
    master_strategy_source: masterStrategy._meta?.generation_source || "master_strategy",
    generation_source: masterStrategy._meta?.generation_source || finalReport.meta?.generation_source || "master_strategy",
    ai_calls_count: Number(masterStrategy._meta?.ai_calls_count || finalReport.meta?.ai_calls_count || 0),
    ai_enhanced: Boolean(masterStrategy._meta?.ai_enhanced),
    ai_provider: masterStrategy._meta?.ai_provider || finalReport.meta?.ai_provider || null,
    ai_model: masterStrategy._meta?.ai_model || finalReport.meta?.ai_model || null,
    fallback_used: Boolean(masterStrategy._meta?.fallback_used || finalReport.meta?.fallback_used),
    fallback_reason: masterStrategy._meta?.fallback_reason || finalReport.meta?.fallback_reason || "",
    retrieved_pack_ids: masterStrategy._meta?.retrieved_pack_ids || finalReport.meta?.retrieved_pack_ids || [],
    knowledge_units_used: masterStrategy._meta?.knowledge_units_used || 0,
    strategy_blocks_used_as_output: masterStrategy._meta?.strategy_blocks_used_as_output || 0,
    strategy_blocks_repurposed_as_knowledge: masterStrategy._meta?.strategy_blocks_repurposed_as_knowledge || 0,
    quality_score_before_ai: masterStrategy._meta?.quality_score_before_ai,
    quality_score_after_ai: masterStrategy._meta?.quality_score_after_ai,
    master_strategy_quality_score: masterStrategy._meta?.master_strategy_quality_score,
    knowledge_categories_used: masterStrategy._meta?.knowledge_categories_used || {},
    duplicate_recommendation_score: masterStrategy._meta?.duplicate_recommendation_score ?? finalReport.meta?.duplicate_recommendation_score,
    generic_language_score: masterStrategy._meta?.generic_language_score ?? finalReport.meta?.generic_language_score,
    business_specificity_score: masterStrategy._meta?.business_specificity_score ?? finalReport.meta?.business_specificity_score,
    why_how_impact_score: masterStrategy._meta?.why_how_impact_score ?? finalReport.meta?.why_how_impact_score,
    template_likeness_score: masterStrategy._meta?.template_likeness_score ?? finalReport.meta?.template_likeness_score,
    template_likeness_hits: masterStrategy._meta?.template_likeness_hits ?? finalReport.meta?.template_likeness_hits,
    human_agency_review_score: masterStrategy._meta?.human_agency_review_score ?? finalReport.meta?.human_agency_review_score,
    caption_ready_ratio: masterStrategy._meta?.caption_ready_ratio ?? finalReport.meta?.caption_ready_ratio,
    message_ready_ratio: masterStrategy._meta?.message_ready_ratio ?? finalReport.meta?.message_ready_ratio,
    execution_ready_ratio: masterStrategy._meta?.execution_ready_ratio ?? finalReport.meta?.execution_ready_ratio,
    page_execution_score: masterStrategy._meta?.page_execution_score ?? finalReport.meta?.page_execution_score,
    page_execution_failures: masterStrategy._meta?.page_execution_failures ?? finalReport.meta?.page_execution_failures,
    verb_diversity_score: masterStrategy._meta?.verb_diversity_score ?? finalReport.meta?.verb_diversity_score,
    verb_diversity_failures: masterStrategy._meta?.verb_diversity_failures ?? finalReport.meta?.verb_diversity_failures,
    dominant_action_verb: masterStrategy._meta?.dominant_action_verb ?? finalReport.meta?.dominant_action_verb,
    content_mix_score: masterStrategy._meta?.content_mix_score ?? finalReport.meta?.content_mix_score,
    content_mix_failures: masterStrategy._meta?.content_mix_failures ?? finalReport.meta?.content_mix_failures,
    content_mix_unique_categories: masterStrategy._meta?.content_mix_unique_categories ?? finalReport.meta?.content_mix_unique_categories,
    content_mix_largest_category_count: masterStrategy._meta?.content_mix_largest_category_count ?? finalReport.meta?.content_mix_largest_category_count,
    cross_page_distinctness_score: masterStrategy._meta?.cross_page_distinctness_score ?? finalReport.meta?.cross_page_distinctness_score,
    cross_page_distinctness_failures: masterStrategy._meta?.cross_page_distinctness_failures ?? finalReport.meta?.cross_page_distinctness_failures,
    reviewer_quality_scores: masterStrategy._meta?.reviewer_quality_scores ?? finalReport.meta?.reviewer_quality_scores,
    reviewer_min_score: masterStrategy._meta?.reviewer_min_score ?? finalReport.meta?.reviewer_min_score,
    reviewer_failures: masterStrategy._meta?.reviewer_failures ?? finalReport.meta?.reviewer_failures,
  };

  finalReport.business = {
    ...(finalReport.business || {}),
    positioning_summary: masterText(masterStrategy.positioning?.statement, masterStrategy.business_summary?.read, finalReport.business?.positioning_summary),
  };
  finalReport.tabs = finalReport.tabs || {};
  if (calendarDays.length >= 30) finalReport.tabs.calendar = { ...(finalReport.tabs.calendar || {}), days: calendarDays.slice(0, 30) };
  if (strategySteps.length >= 10) finalReport.tabs.strategy = { ...(finalReport.tabs.strategy || {}), steps: strategySteps.slice(0, 10) };
  if (psychology && reportHasContent(psychology)) finalReport.tabs.psychology = psychology;
  if (personas.length) finalReport.tabs.clientPersona = { personas };
  if (painPoints.length >= 15) finalReport.tabs.painPoints = { items: painPoints.slice(0, 15) };
  finalReport.tabs.competitors = masterCompetitors(masterStrategy, finalReport.tabs.competitors);
  if (growthIdeas.length >= 20) finalReport.tabs.ideas = { experiments: growthIdeas.slice(0, 20) };
  finalReport.tabs.captions = {
    ...(finalReport.tabs.captions || {}),
    caption_bank: captions.length ? captions.slice(0, 12) : calendarDays.slice(0, 12).map(day => day.caption).filter(Boolean),
    hashtag_bank: finalReport.tabs.captions?.hashtag_bank || hashtags,
    suggested_topics: calendarDays.slice(0, 6).map(day => day.topic || day.title),
  };
  if (templates.length) finalReport.tabs.templates = { templates };
  if (masterStrategy.brand_style) {
    finalReport.tabs.brandKit = {
      ...(finalReport.tabs.brandKit || {}),
      tone: masterText(masterStrategy.brand_style.tone, finalReport.tabs.brandKit?.tone),
      voice: masterText(masterStrategy.brand_style.voice, finalReport.tabs.brandKit?.voice),
      words_to_use: masterArray(masterStrategy.brand_style.words_to_use),
      words_to_avoid: masterArray(masterStrategy.brand_style.words_to_avoid),
      visual_rules: masterArray(masterStrategy.brand_style.visual_rules),
      sample_lines: masterArray(masterStrategy.brand_style.sample_lines),
      use_this_style: masterArray(masterStrategy.brand_style.use_this_style),
      avoid_this_style: masterArray(masterStrategy.brand_style.avoid_this_style),
    };
  }
  if (masterStrategy.advanced_growth_plan) {
    finalReport.tabs.premiumGrowth = {
      modules: masterArray(masterStrategy.advanced_growth_plan.moves).length
        ? masterArray(masterStrategy.advanced_growth_plan.moves)
        : masterArray(finalReport.tabs.premiumGrowth?.modules),
      headline: masterText(masterStrategy.advanced_growth_plan.headline),
      main_metric: masterText(masterStrategy.advanced_growth_plan.main_metric),
    };
  }
  const simpleFullPlan = buildPlainFullPlan({
    report: finalReport,
    profile,
    rawBiz,
    category: category || categoryContext(profile, city, rawBiz),
    city,
    calendar: finalReport.tabs.calendar?.days || calendarDays,
    strategy: finalReport.tabs.strategy?.steps || strategySteps,
    personas: finalReport.tabs.clientPersona?.personas || personas,
    templates: finalReport.tabs.templates?.templates || templates,
    internetSignals,
  });
  finalReport.tabs.fullReport = {
    ...simpleFullPlan,
    source: "master_strategy",
    business_diagnosis: masterStrategy.business_diagnosis || finalReport["Business Health Snapshot"],
    positioning: masterStrategy.positioning || finalReport["Positioning Strategy"],
    unique_value_proposition: masterStrategy.unique_value_proposition || {},
    marketing_priorities: masterArray(masterStrategy.marketing_priorities).slice(0, 10),
    growth_strategy_10_steps: strategySteps.slice(0, 10),
    customer_pain_points_15: painPoints.slice(0, 15),
    customer_types: personas,
    competitor_intelligence: finalReport.tabs.competitors,
    content_calendar_30_days: calendarDays.slice(0, 30),
    captions: finalReport.tabs.captions.caption_bank,
    message_templates: finalReport.tabs.templates?.templates || [],
    growth_ideas_20: growthIdeas.slice(0, 20),
    execution_checklist: masterStrategy.execution_checklist || {},
    advanced_growth_plan: masterStrategy.advanced_growth_plan || {},
  };

  finalReport["Business Health Snapshot"] = {
    ...(finalReport["Business Health Snapshot"] || {}),
    diagnosis: masterText(masterStrategy.business_summary?.read, masterStrategy.business_diagnosis?.root_causes?.[0], finalReport["Business Health Snapshot"]?.diagnosis),
    biggest_leak: masterText(masterStrategy.business_diagnosis?.risk_warnings?.[0], finalReport["Business Health Snapshot"]?.biggest_leak),
    next_priority: masterText(masterStrategy.marketing_priorities?.[0]?.priority, finalReport["Business Health Snapshot"]?.next_priority),
  };
  finalReport["Customer Psychology"] = psychology;
  finalReport["Competitor Intelligence"] = finalReport.tabs.competitors;
  finalReport["Positioning Strategy"] = {
    ...(finalReport["Positioning Strategy"] || {}),
    simple_market_place: masterText(masterStrategy.positioning?.statement, finalReport["Positioning Strategy"]?.simple_market_place),
    proof_to_show: masterArray(masterStrategy.positioning?.proof_to_show).length ? masterArray(masterStrategy.positioning.proof_to_show) : finalReport["Positioning Strategy"]?.proof_to_show,
    offer_angle: masterText(masterStrategy.unique_value_proposition?.promise, finalReport["Positioning Strategy"]?.offer_angle),
    message_rule: masterText(masterStrategy.messaging?.tone, finalReport["Positioning Strategy"]?.message_rule),
  };
  finalReport["10-Step Growth Strategy"] = strategySteps.slice(0, 10);
  finalReport["30-Day Content Calendar"] = calendarDays.slice(0, 30);
  finalReport["20 Growth Experiments"] = growthIdeas.slice(0, 20);
  finalReport["Caption Bank"] = finalReport.tabs.captions.caption_bank;
  finalReport["Implementation Checklist"] = masterStrategy.execution_checklist || finalReport["Implementation Checklist"];

  return finalReport;
}

export function sanitizeBusinessProfileForOutput(profile) {
  if (!profile || typeof profile !== "object") return profile;
  const safe = JSON.parse(JSON.stringify(profile));
  if (safe.channels && typeof safe.channels === "object") {
    safe.channels.ownWebsiteSnapshot = sanitizeSnapshotForOutput(safe.channels.ownWebsiteSnapshot);
    safe.channels.competitorWebsiteSnapshot = sanitizeSnapshotForOutput(safe.channels.competitorWebsiteSnapshot);
    safe.channels.own_website_snapshot = sanitizeSnapshotForOutput(safe.channels.own_website_snapshot);
    safe.channels.competitor_website_snapshot = sanitizeSnapshotForOutput(safe.channels.competitor_website_snapshot);
  }
  return safe;
}

function buildMarketingOSEnvelope(finalReport, report, businessProfile, rawBiz, internetSignals) {
  const tabs = finalReport.tabs || {};
  const contentCalendar = Array.isArray(tabs.calendar?.days) ? tabs.calendar.days : [];
  const growthStrategy = Array.isArray(tabs.strategy?.steps) ? tabs.strategy.steps : [];
  const painPoints = Array.isArray(tabs.painPoints?.items) ? tabs.painPoints.items : [];
  const growthIdeas = Array.isArray(tabs.ideas?.experiments) ? tabs.ideas.experiments : [];
  const exportableReportData = {
    source: "saved_marketing_os_json",
    pdf_source: "same_saved_json",
    business: finalReport.business || {},
    scores: finalReport.scores || [],
    tabs,
    flat_sections: {
      business_health_snapshot: finalReport["Business Health Snapshot"],
      business_profile: finalReport["Business DNA / Profile"],
      positioning_strategy: finalReport["Positioning Strategy"],
      implementation_checklist: finalReport["Implementation Checklist"],
      plan_30_60_90: finalReport["30/60/90-Day Plan"],
    },
  };

  return cleanPlainValue({
    master_strategy: finalReport.master_strategy || null,
    business_profile: sanitizeBusinessProfileForOutput(businessProfile),
    raw_business_input: sanitizeRawBusinessInput(rawBiz),
    internet_enrichment: internetSignals?.internet_enrichment || "unavailable",
    website_details_note: internetSignals?.user_note || "",
    business_diagnosis: finalReport.master_strategy?.business_diagnosis || finalReport["Business Health Snapshot"]?.diagnosis || report["Business Health Snapshot"]?.diagnosis,
    positioning: finalReport["Positioning Strategy"] || report["Positioning Strategy"],
    growth_strategy_10_steps: growthStrategy.slice(0, 10),
    customer_pain_points_15: painPoints.slice(0, 15),
    consumer_psychology: tabs.psychology || finalReport["Customer Psychology"],
    competitor_intelligence: tabs.competitors || finalReport["Competitor Intelligence"],
    website_roast: finalReport["Website Roast"] || null,
    content_calendar_30_days: contentCalendar.slice(0, 30),
    growth_ideas_20: growthIdeas.slice(0, 20),
    execution_checklist: finalReport.master_strategy?.execution_checklist || finalReport["Implementation Checklist"],
    exportable_report_data: exportableReportData,
  });
}

export function assembleReport({ hydratedStrategy, businessProfile, rawBiz, confidence, telemetry, strategyBlocks = [], internetSignals = null, masterStrategy = null }) {
  const raw = hydratedStrategy || {};
  const profile = businessProfile || {};
  const city = cityFrom(rawBiz, profile);
  const consumer = getSection(raw, "Consumer Psychology");
  const pain = getSection(raw, "Pain Points");
  const questions = getSection(raw, "Common Objections");
  const positioning = getSection(raw, "Positioning");
  const offerStrategy = getSection(raw, "Offer Strategy");
  const industry = clean(profile?.market?.industry || rawBiz?.biz_industry, "business");
  const name = clean(profile?.identity?.name || rawBiz?.biz_name, "Your Business");
  const audience = clean(targetLabel(profile, rawBiz), "your best customers");
  const challenge = lower(profile?.customers?.challenge || rawBiz?.biz_challenge, "unclear demand");
  const ticket = clean(profile?.offering?.averageTicket || rawBiz?.biz_ticket, "Not provided");
  const category = categoryContext(profile, city, rawBiz);
  const ticketAmount = ticketNumber(ticket);
  const websiteRoast = buildWebsiteRoast(rawBiz, profile, internetSignals);
  const hashtags = buildHashtags(profile, rawBiz);
  const preLaunch = isPreLaunch(profile, rawBiz);
  const mode = businessMode(profile, rawBiz);
  const leadsNeeded = Math.max(10, ticketAmount >= 10000 ? 8 : 30);
  const report = {
    "Business Health Snapshot": {
      diagnosis: preLaunch
        ? `${name} is a ${industry} preparing to launch in ${city}. The plan should focus on launch readiness, first customers, real proof, and clear ordering.`
        : `${name} is a ${modelLabel(profile, rawBiz)} ${industry} in ${city}. The biggest issue is ${challenge}, so the plan should make the offer easier to understand, trust, and act on.`,
      strongest_asset: clean(profile?.offering?.usp || rawBiz?.biz_usp, "The strongest asset is still unclear from the brief."),
      biggest_leak: preLaunch
        ? "If people cannot understand what is launching, what it costs, and how to order, early interest will disappear."
        : `If ${audience} cannot explain why ${name} is different in one sentence, marketing will feel busy but weak.`,
      next_priority: preLaunch ? "Prepare samples, order steps, local awareness, and first-customer feedback." : "Make the promise, proof, offer, and follow-up simple.",
      confidence: confidence ? `${confidence.score}% ${confidence.status}` : "Knowledge Engine match",
    },
    "Business DNA / Profile": {
      business_name: name,
      industry,
      location: clean(profile?.market?.location || rawBiz?.biz_location, city),
      customer_model: modelLabel(profile, rawBiz),
      operating_model: clean(profile?.identity?.type || rawBiz?.biz_type, "Not provided"),
      stage: clean(profile?.identity?.stage || rawBiz?.biz_stage, "Not provided"),
      offer: clean(profile?.offering?.coreOffer || rawBiz?.biz_offer, "Not provided"),
      best_customer: audience,
      average_transaction: ticket,
      marketing_budget: clean(profile?.economics?.marketingBudget || rawBiz?.biz_budget, "Not provided"),
      prelaunch_note: preLaunch ? "The plan uses launch readiness, first-customer interest, and ordering clarity because the business has not launched yet." : "Use real sales numbers later to improve this plan.",
    },
    "Customer Psychology": {
      core_truth: firstText(
        consumer.core_truth,
        consumer.insight,
        category.customerTruth
      ),
      buying_trigger: firstText(
        consumer.buying_trigger,
        consumer.implication,
        category.buyingTrigger
      ),
      pains: getList(
        pain.patient_pain_points || pain.pain_points,
        category.pains
      ),
      questions: getList(
        questions.objections,
        category.questions
      ),
      decision_drivers: buildPsychologyDrivers(profile, rawBiz, category, city, internetSignals).slice(0, 5),
    },
    "Competitor Intelligence": buildCompetitor(rawBiz, profile, city, internetSignals),
    "Positioning Strategy": {
      simple_market_place: firstText(
        positioning.statement,
        `${name} should be known as the ${industry} choice for ${lower(audience)} who want ${lower(profile?.offering?.usp || rawBiz?.biz_usp, "a better result")} without confusion.`
      ),
      proof_to_show: getList(
        positioning.differentiators,
        category.proof
      ),
      offer_angle: firstText(
        offerStrategy.offer_name,
        offerStrategy.hook,
        offerStrategy.solution,
        `Create one starter offer for ${lower(audience)} that makes the first order feel easy.`
      ),
      message_rule: "Every public touchpoint should answer: what is it, why trust it, and what should I do next?",
    },
    "10-Step Growth Strategy": buildTenSteps(profile, rawBiz, city),
    "30-Day Content Calendar": buildContentCalendar(profile, rawBiz, city),
    "20 Growth Experiments": buildExperiments(profile, rawBiz, city),
    "Caption Bank": buildCaptionBank(profile, rawBiz, city),
    "Hashtag Generator": hashtags,
    "ROI Calculator": {
      average_transaction: ticket,
      simple_target: mode === "digital"
        ? `${leadsNeeded} qualified demo or trial leads`
        : preLaunch ? "First 10-20 serious enquiries or test orders" : `${leadsNeeded} extra customers or orders`,
      possible_revenue: preLaunch ? "Not needed before launch" : `₹${(ticketAmount * leadsNeeded).toLocaleString("en-IN")}`,
      break_even_logic: mode === "digital"
        ? `If one qualified lead is worth around ₹${ticketAmount.toLocaleString("en-IN")}, focus first on channels that create demo requests and trial starts.`
        : preLaunch
        ? "Before launch, track interest, questions, and first orders instead of revenue targets."
        : `If one customer or order is worth around ₹${ticketAmount.toLocaleString("en-IN")}, focus first on channels that create measurable enquiries.`,
      track_weekly: mode === "digital"
        ? ["Demo requests", "Trial starts", "Qualified leads", "Activation questions", "Repeated objections"]
        : preLaunch
        ? ["Enquiries", "Tester list", "Price questions", "First orders", "Repeated doubts"]
        : ["Enquiries", "Orders or bookings", "People who buy after seeing the ad", "Reviews", "Repeat orders"],
    },
    "Implementation Checklist": buildChecklist(profile, rawBiz, city),
    "30/60/90-Day Plan": buildPlan(profile, rawBiz, city),
    "Export / Save": {
      saved_report_ready: true,
      export_formats: ["Print/PDF"],
      report_contract: "Structured plan object with simple sections.",
      generation_source: telemetry?.generation_source || "knowledge_engine",
      knowledge_objects_used: telemetry?.knowledge_objects_used || 0,
      ai_calls_count: telemetry?.ai_calls_count || 0,
      fallback_used: Boolean(telemetry?.fallback_used),
    },
  };

  if (websiteRoast) {
    report["Website Roast"] = websiteRoast;
  }

  const validation = validateFlatSections(report);
  const missingSectionsFilled = [];
  if (!validation.valid) {
    for (const section of validation.missing) {
      if (section === "Website Roast") continue;
      report[section] = {
        note: `${section} was filled from the submitted business details because a matching knowledge object was missing.`,
        action: `Use ${name}, ${city}, ${industry}, ${audience}, and ${offerLabel(profile, rawBiz)} to create a sharper section.`,
      };
      missingSectionsFilled.push(section);
    }
  }

  const workspace = buildWorkspace({ report, profile, rawBiz, category, city, hashtags, telemetry, strategyBlocks, internetSignals });
  const marketingOS = buildMarketingOSReport({ businessProfile: profile, rawBiz, telemetry });
  const semanticPainItems = marketingOS.workspace?.tabs?.painPoints?.items || [];
  const semanticPainPoints = semanticPainItems.length
    ? Array.from({ length: 15 }, (_, index) => cleanPlainValue(semanticPainItems[index % semanticPainItems.length]))
    : [];
  const semanticFullReport = {
    ...(marketingOS.workspace?.tabs?.fullReport || {}),
    "What To Fix First": marketingOS.workspace?.tabs?.strategy?.steps?.slice(0, 3) || [],
    "Customer Plan": marketingOS.workspace?.tabs?.clientPersona?.personas || [],
  };
  const semanticMarketingOSFallback = cleanPlainValue({
    ...marketingOS.workspace,
    tabs: {
      ...(marketingOS.workspace?.tabs || {}),
      painPoints: { items: semanticPainPoints },
      fullReport: semanticFullReport,
    },
    ...marketingOS.sections,
  });
  let finalReport = cleanPlainValue({
    ...marketingOS.workspace,
    ...workspace,
    ...report,
    ...marketingOS.sections,
  });
  if (marketingOS.context.briefSubtype) {
    finalReport.tabs = cleanPlainValue({
      ...(finalReport.tabs || {}),
      ...(semanticMarketingOSFallback.tabs || {}),
    });
    finalReport.scores = cleanPlainValue(semanticMarketingOSFallback.scores || finalReport.scores);
  }
  if (marketingOS.context.briefSubtype === "nonprofit_education") {
    finalReport["ROI Calculator"] = {
      ...(finalReport["ROI Calculator"] || {}),
      simple_target: "Eligible learner applications and useful supporter responses",
      possible_revenue: "Not applicable to this nonprofit program goal",
      break_even_logic: "Track program reach and delivery capacity rather than customer revenue.",
      track_weekly: ["Eligible applications", "Learner referrals", "Volunteer interest", "Partnership enquiries", "Safeguarding questions"],
    };
  }
  const preMasterReport = applyContextLanguage(cleanPlainValue(finalReport), profile, rawBiz);
  finalReport = applyMasterStrategyToReport(cleanPlainValue(preMasterReport), masterStrategy, profile, rawBiz, city, hashtags, category, internetSignals);
  finalReport = cleanPlainValue(finalReport);
  finalReport = applyContextLanguage(finalReport, profile, rawBiz);
  const masterOverlaySemanticValidation = validateSemanticAlignment(finalReport, marketingOS.context);
  const masterOverlayFallbackUsed = Boolean(
    marketingOS.context.briefSubtype
    && masterStrategy
    && !masterOverlaySemanticValidation.passed
  );
  if (masterOverlayFallbackUsed) {
    finalReport = cleanPlainValue(preMasterReport);
    delete finalReport.master_strategy;
    finalReport.meta = {
      ...(finalReport.meta || {}),
      master_strategy_enabled: false,
      master_strategy_source: "semantic_marketing_os_fallback",
      generation_source: "marketing_os_rules",
      ai_enhanced: false,
      fallback_used: true,
      fallback_reason: "The master strategy did not match the submitted brief, so CAC kept the validated Marketing OS report.",
    };
  }
  const finalMarketingValidation = validateMarketingOutput(
    finalReport,
    marketingOS.context,
    marketingOS.industryPack,
    marketingOS.goalStrategy,
  );
  // --- Evidence-based diagnostics -----------------------------------------
  // Replaces the old buildScores() output, which scored form completeness.
  // Everything below is derived from checks we can point at, and anything we
  // could not check is reported as unchecked rather than folded into a number.
  const diagnostics = runDiagnostics({ businessProfile: profile, rawBiz, internetSignals });
  const existingSteps = Array.isArray(finalReport.tabs?.strategy?.steps) ? finalReport.tabs.strategy.steps : [];
  const rankedSteps = rankRecommendations(existingSteps, diagnostics, { rawBiz, profile });
  const headline = headlineAction(rankedSteps, diagnostics);

  finalReport.scores = cleanPlainValue(diagnostics.scores);
  finalReport.diagnostics = cleanPlainValue({
    coverage: diagnostics.coverage,
    checks: diagnostics.checks,
    headline_action: headline,
  });

  if (rankedSteps.length) {
    finalReport.tabs = finalReport.tabs || {};
    finalReport.tabs.strategy = { ...(finalReport.tabs.strategy || {}), steps: cleanPlainValue(rankedSteps) };
    finalReport.tabs.fullReport = cleanPlainValue({
      ...(finalReport.tabs.fullReport || {}),
      "If You Only Do One Thing": headline,
      "Do This First": rankedSteps.slice(0, 5).map(step => ({
        rank: step.rank,
        title: step.title,
        when: step.when,
        time_needed: step.effort,
        cost: step.money,
        impact: step.impact_label,
        why_this_one: step.because,
        do_this: step.steps || step.action_steps || [step.action],
        copy_ready_text: step.copy_ready_text,
        how_to_know_it_worked: step.target?.watch,
        good_sign: step.target?.good_sign,
        bad_sign: step.target?.bad_sign,
      })),
      "What We Checked": {
        note: `We ran ${diagnostics.coverage.checks_run} of ${diagnostics.coverage.checks_total} checks${diagnostics.coverage.checks_verified ? `, ${diagnostics.coverage.checks_verified} of them by opening your website` : " using only what you typed in"}.`,
        confidence: diagnostics.coverage.confidence,
        to_get_a_sharper_report: diagnostics.coverage.how_to_improve || "",
        not_checked: diagnostics.scores.flatMap(score => (score.not_checked || []).map(item => item.question)),
      },
    });
  }

  finalReport.marketing_os = buildMarketingOSEnvelope(finalReport, report, profile, rawBiz, internetSignals);
  finalReport.exportable_report_data = finalReport.marketing_os.exportable_report_data;
  const finalValidation = validateReportSchema(finalReport);

  finalReport.meta.modules_generated = Object.keys(finalReport.tabs).length;
  finalReport.meta.missing_sections_filled = missingSectionsFilled;
  finalReport.meta.schema_valid = finalValidation.valid;
  finalReport.meta.quality_checks = {
    ...(finalReport.meta.quality_checks || {}),
    passed: Boolean(
      finalValidation.valid
      && marketingOS.validation.passed
      && (marketingOS.context.briefSubtype
        ? finalMarketingValidation.passed
        : finalMarketingValidation.semanticAlignment.passed)
    ),
    marketing_os_validation: marketingOS.validation,
    master_overlay_semantic_validation: masterOverlaySemanticValidation,
    final_semantic_validation: finalMarketingValidation.semanticAlignment,
    final_marketing_validation: finalMarketingValidation,
    master_overlay_fallback_used: masterOverlayFallbackUsed,
  };

  return finalReport;
}
