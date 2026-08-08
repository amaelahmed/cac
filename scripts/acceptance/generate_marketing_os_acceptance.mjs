import fs from "node:fs/promises";

const BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:8788";

const BANNED_PHRASES = [
  "specific difference",
  "choose us",
  "this problem feels familiar",
  "being built for you",
  "show what is coming",
  "prototype",
  "first draft",
  "reply with your situation",
  "pain point",
  "solution for you",
  "unlock growth",
  "take your business to the next level",
  "best quality service",
  "contact us for more details",
  "we are here to help",
];

const NON_SOFTWARE_TERMS = [
  "mvp",
  "product-market fit",
  "roadmap",
  "beta",
  "feature launch",
];

const cases = [
  {
    id: "restaurant_launch_business",
    label: "Restaurant, goal: launch_business",
    expectedLanguage: ["restaurant", "dish", "menu", "kitchen", "table", "food", "location"],
    expectedCta: ["Follow for opening date", "Save the location", "WhatsApp to order", "Call to reserve", "Visit this weekend"],
    biz: {
      biz_name: "Malabar Meals",
      biz_industry: "Restaurant",
      biz_type: "Local physical business",
      biz_stage: "Not launched yet",
      biz_age: "Not launched yet",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "Malabar meals, lunch plates, and dinner items",
      biz_audience: "nearby families, students, and office lunch customers",
      biz_challenge: "Need awareness before opening",
      biz_usp: "fresh local meals with clear opening timing and clean preparation",
      biz_budget: "Under ₹5,000",
      biz_ticket: "₹200 - ₹500",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["launch_business"],
    },
  },
  {
    id: "salon_get_more_bookings",
    label: "Salon, goal: get_more_bookings",
    expectedLanguage: ["salon", "appointment", "slot", "service", "result", "hygiene"],
    expectedCta: ["WhatsApp for available slots", "DM to book", "Ask for price list", "Call for appointment"],
    biz: {
      biz_name: "Glow Room Salon",
      biz_industry: "Salon",
      biz_type: "Local physical business",
      biz_stage: "Running but bookings are inconsistent",
      biz_age: "1-3 years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "hair styling, facials, bridal makeup, and grooming services",
      biz_audience: "local women and event-ready customers",
      biz_challenge: "Need more appointment bookings",
      biz_usp: "clean setup, real results, and easy WhatsApp booking",
      biz_budget: "Under ₹10,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_more_bookings"],
    },
  },
  {
    id: "dental_clinic_build_trust",
    label: "Dental clinic, goal: build_trust",
    expectedLanguage: ["dental", "clinic", "appointment", "doctor", "checkup", "safety"],
    expectedCta: ["Book an appointment", "Call the clinic", "WhatsApp for timing", "Save this health tip"],
    biz: {
      biz_name: "Smile Care Dental",
      biz_industry: "Dental Clinic",
      biz_type: "Local physical business",
      biz_stage: "Established business",
      biz_age: "3+ years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "dental consultation, checkups, cleaning, and treatment guidance",
      biz_audience: "families and adults who want safe dental care",
      biz_challenge: "Need more patient trust before booking",
      biz_usp: "clear doctor explanation, safe process, and calm appointment experience",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["build_trust"],
    },
  },
  {
    id: "tuition_center_get_leads",
    label: "Tuition center, goal: get_leads",
    expectedLanguage: ["tuition", "demo class", "batch", "teacher", "subject", "parents"],
    expectedCta: ["Book a demo class", "Ask batch timing", "Message for admission details", "Save this exam tip"],
    biz: {
      biz_name: "BrightPath Tuition",
      biz_industry: "Tuition Center",
      biz_type: "Local physical business",
      biz_stage: "Running but needs more enquiries",
      biz_age: "1-3 years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "maths and science tuition classes for school students",
      biz_audience: "parents and students from classes 8 to 12",
      biz_challenge: "Need admission leads for new batches",
      biz_usp: "personal attention, demo class, and clear progress updates",
      biz_budget: "Under ₹5,000",
      biz_ticket: "₹2,000 - ₹10,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_leads"],
    },
  },
  {
    id: "boutique_clear_old_stock",
    label: "Boutique, goal: clear_old_stock",
    expectedLanguage: ["boutique", "size", "stock", "material", "outfit", "store"],
    expectedCta: ["DM for size", "WhatsApp to order", "Visit the store", "Reserve this piece"],
    biz: {
      biz_name: "Nila Boutique",
      biz_industry: "Boutique / Clothing Store",
      biz_type: "Local physical business",
      biz_stage: "Running but old stock is stuck",
      biz_age: "1-3 years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "women's ethnic outfits, tops, kurtis, and accessories",
      biz_audience: "college students and young women",
      biz_challenge: "Need to clear old stock without hurting brand value",
      biz_usp: "real photos, size clarity, and affordable styling",
      biz_budget: "Under ₹5,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["clear_old_stock"],
    },
  },
  {
    id: "mobile_repair_get_more_whatsapp_messages",
    label: "Mobile repair shop, goal: get_more_whatsapp_messages",
    expectedLanguage: ["repair", "phone", "technician", "estimate", "issue", "area"],
    expectedCta: ["WhatsApp a photo of the issue", "Ask for an estimate", "Share your area", "Book the service"],
    biz: {
      biz_name: "FixFast Mobiles",
      biz_industry: "Mobile Repair Shop",
      biz_type: "Local service business",
      biz_stage: "Running but WhatsApp enquiries are low",
      biz_age: "1-3 years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "phone screen repair, battery replacement, and software service",
      biz_audience: "people with damaged phones who need quick repair",
      biz_challenge: "Need more WhatsApp messages from serious repair customers",
      biz_usp: "clear estimate, careful handling, and repair process proof",
      biz_budget: "Under ₹5,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_more_whatsapp_messages"],
    },
  },
  {
    id: "cleaning_service_get_more_bookings",
    label: "Cleaning service, goal: get_more_bookings",
    expectedLanguage: ["cleaning", "service", "booking", "area", "before", "after"],
    expectedCta: ["Book the service", "Ask for an estimate", "Share your area", "Call for timing"],
    biz: {
      biz_name: "NeatNest Cleaning",
      biz_industry: "Cleaning Service",
      biz_type: "Service at customer location",
      biz_stage: "Running but bookings are inconsistent",
      biz_age: "1-3 years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C and B2B",
      biz_offer: "home deep cleaning, sofa cleaning, and office cleaning",
      biz_audience: "homes, apartments, and small offices",
      biz_challenge: "Need more confirmed bookings",
      biz_usp: "clear estimate, trained staff, and before-after cleaning proof",
      biz_budget: "Under ₹10,000",
      biz_ticket: "₹2,000 - ₹10,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_more_bookings"],
    },
  },
  {
    id: "real_estate_agent_get_leads",
    label: "Real estate agent, goal: get_leads",
    expectedLanguage: ["property", "real estate", "consultation", "site", "quote", "process"],
    expectedCta: ["Book a consultation", "Send your budget and preferred area", "Book a site visit", "Ask for available properties", "Schedule a quick call"],
    biz: {
      biz_name: "Kozhikode Homes",
      biz_industry: "Real Estate Agent",
      biz_type: "Professional service",
      biz_stage: "Running but lead quality is inconsistent",
      biz_age: "3+ years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "property buying, selling, rental, and site visit help",
      biz_audience: "home buyers, tenants, and property owners",
      biz_challenge: "Need serious property leads",
      biz_usp: "local area knowledge, clear site visit process, and honest property guidance",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹10,000 - ₹50,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_leads"],
    },
  },
  {
    id: "ecommerce_clothing_get_more_online_orders",
    label: "Ecommerce clothing brand, goal: get_more_online_orders",
    expectedLanguage: ["shop", "size", "delivery", "returns", "product", "order"],
    expectedCta: ["Shop now", "Use coupon", "Check size guide", "Add to cart", "WhatsApp for size help"],
    biz: {
      biz_name: "ThreadLoop",
      biz_industry: "Ecommerce Clothing Brand",
      biz_type: "Online only",
      biz_stage: "Running but orders are low",
      biz_age: "Less than 1 year",
      biz_location: "India",
      biz_customer_model: "D2C",
      biz_offer: "online casual shirts, tops, and everyday clothing",
      biz_audience: "young online shoppers",
      biz_challenge: "Need more online orders",
      biz_usp: "real product videos, size help, and clear delivery updates",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "Website", "WhatsApp"],
      goal: ["get_more_online_orders"],
    },
  },
  {
    id: "saas_launch_business",
    label: "SaaS product, goal: launch_business",
    expectedLanguage: ["software", "demo", "trial", "workflow", "setup", "product"],
    expectedCta: ["Sign up", "Book demo", "Start trial", "Watch demo", "Join early access"],
    allowSoftwareTerms: true,
    biz: {
      biz_name: "TaskMint",
      biz_industry: "SaaS Product",
      biz_type: "SaaS / Subscription app",
      biz_stage: "Not launched yet",
      biz_age: "Not launched yet",
      biz_location: "Online",
      biz_customer_model: "B2B",
      biz_offer: "task automation software for small business owners",
      biz_audience: "small business owners and busy teams",
      biz_challenge: "Need to launch properly and get first signups",
      biz_usp: "simple setup, one workflow first, and helpful support",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹2,000 - ₹10,000",
      platforms: ["Website", "LinkedIn", "Instagram"],
      goal: ["launch_business"],
    },
  },
];

function flatten(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (typeof value === "object") return Object.values(value).map(flatten).join(" ");
  return "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function includesAny(text, needles) {
  const lower = text.toLowerCase();
  return needles.filter(needle => lower.includes(String(needle).toLowerCase()));
}

function cardSummary(day) {
  return {
    day: day.day,
    platform: day.platform,
    post_type: day.post_type,
    title: day.title || day.topic || day.hook,
    what_to_show: day.what_to_show,
    caption: day.caption,
    customer_action: day.customer_action,
    why_this_helps: day.why_this_helps,
  };
}

function validateCase(testCase, report) {
  const text = flatten(report);
  const calendar = asArray(report?.tabs?.calendar?.days);
  const strategySteps = asArray(report?.tabs?.strategy?.steps);
  const captions = asArray(report?.tabs?.captions?.caption_bank);
  const templates = asArray(report?.tabs?.templates?.templates);
  const bannedHits = includesAny(text, BANNED_PHRASES);
  const wrongSoftwareHits = testCase.allowSoftwareTerms ? [] : includesAny(text, NON_SOFTWARE_TERMS);
  const languageHits = includesAny(text, testCase.expectedLanguage);
  const ctaHits = includesAny(text, testCase.expectedCta);
  const practicalCards = calendar.filter(day => /\b(record|photo|show|post|say|film|shoot|make|create|write|share|ask|display|capture)\b/i.test(day.what_to_show || ""));
  const titleCounts = new Map();
  for (const day of calendar) {
    const key = String(day.title || day.topic || day.hook || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).slice(0, 5).join(" ");
    titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
  }
  const repeated = Array.from(titleCounts.entries()).filter(([, count]) => count > 2).map(([key]) => key);

  return {
    passed: bannedHits.length === 0
      && wrongSoftwareHits.length === 0
      && languageHits.length >= Math.min(3, testCase.expectedLanguage.length)
      && ctaHits.length >= 1
      && practicalCards.length >= 25
      && calendar.length === 30
      && strategySteps.length >= 10
      && captions.length >= 5
      && templates.length >= 4
      && repeated.length === 0
      && Number(report?.meta?.ai_calls_count || 0) === 0,
    bannedHits,
    wrongSoftwareHits,
    languageHits,
    ctaHits,
    practicalCards: practicalCards.length,
    calendarCount: calendar.length,
    strategyCount: strategySteps.length,
    captionCount: captions.length,
    templateCount: templates.length,
    repeated,
    aiCallsCount: Number(report?.meta?.ai_calls_count || 0),
  };
}

async function postJson(path, body, cookie = "") {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { response, json, text };
}

function markdownForResult(result) {
  const report = result.report;
  const calendar = asArray(report?.tabs?.calendar?.days).slice(0, 3).map(cardSummary);
  const strategy = asArray(report?.tabs?.strategy?.steps).slice(0, 2);
  const captions = asArray(report?.tabs?.captions?.caption_bank).slice(0, 2);
  const templates = asArray(report?.tabs?.templates?.templates).slice(0, 2);
  const validation = result.validation;

  const lines = [
    `## ${result.label}`,
    "",
    `Status: ${validation.passed ? "PASS" : "FAIL"}`,
    `Quality checks: ai_calls=${validation.aiCallsCount}, banned=${validation.bannedHits.length}, wrongSoftware=${validation.wrongSoftwareHits.length}, languageHits=${validation.languageHits.join(", ")}, ctaHits=${validation.ctaHits.join(", ")}`,
    "",
    "### Calendar Sample",
    "",
    ...calendar.flatMap(day => [
      `**Day ${day.day}: ${day.title}**`,
      `Platform: ${day.platform} | Type: ${day.post_type}`,
      `What to show: ${day.what_to_show}`,
      `Caption: ${day.caption}`,
      `Customer action: ${day.customer_action}`,
      `Why this helps: ${day.why_this_helps}`,
      "",
    ]),
    "### Strategy Sample",
    "",
    ...strategy.flatMap(step => [
      `**${step.step}. ${step.title}**`,
      `Why: ${step.why_this_matters || step.reason}`,
      `Do this: ${asArray(step.action_steps).join(" ")}`,
      `Copy-ready text: ${step.copy_ready_text || ""}`,
      "",
    ]),
    "### Caption Sample",
    "",
    ...captions.map(item => `- ${item}`),
    "",
    "### Message Template Sample",
    "",
    ...templates.map(item => `- ${item.type}: ${item.template}`),
    "",
  ];

  if (!validation.passed) {
    lines.push("### Failure Details", "");
    lines.push(`- Banned hits: ${validation.bannedHits.join(", ") || "None"}`);
    lines.push(`- Wrong software terms: ${validation.wrongSoftwareHits.join(", ") || "None"}`);
    lines.push(`- Repeated ideas: ${validation.repeated.join(", ") || "None"}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const login = await postJson("/api/dev-login", {});
  if (!login.response.ok) {
    throw new Error(`Local tester login failed: ${login.response.status} ${login.text}`);
  }
  const cookie = login.response.headers.get("set-cookie")?.split(";")[0] || "";

  const results = [];
  for (const testCase of cases) {
    const generated = await postJson("/api/generate", { useHybrid: true, aiMode: "rules_only", biz: testCase.biz }, cookie);
    if (!generated.response.ok) {
      results.push({
        id: testCase.id,
        label: testCase.label,
        error: `${generated.response.status} ${generated.text}`,
        validation: { passed: false, bannedHits: [], wrongSoftwareHits: [], languageHits: [], ctaHits: [], repeated: [] },
      });
      continue;
    }
    const report = generated.json.report || generated.json.strategy;
    const validation = validateCase(testCase, report);
    results.push({
      id: testCase.id,
      label: testCase.label,
      business: testCase.biz.biz_name,
      goal: testCase.biz.goal[0],
      validation,
      report,
      calendarSample: asArray(report?.tabs?.calendar?.days).slice(0, 3).map(cardSummary),
      strategySample: asArray(report?.tabs?.strategy?.steps).slice(0, 2),
      captionSample: asArray(report?.tabs?.captions?.caption_bank).slice(0, 2),
      templateSample: asArray(report?.tabs?.templates?.templates).slice(0, 2),
    });
  }

  const allPassed = results.every(result => result.validation?.passed);
  await fs.writeFile("reports/marketing_os_acceptance_tests.json", `${JSON.stringify({ allPassed, generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
  const markdown = [
    "# Marketing OS Acceptance Tests",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Overall: ${allPassed ? "PASS" : "FAIL"}`,
    "",
    ...results.map(markdownForResult),
  ].join("\n");
  await fs.writeFile("reports/marketing_os_acceptance_tests.md", markdown);

  console.log(JSON.stringify({
    allPassed,
    results: results.map(result => ({
      id: result.id,
      label: result.label,
      passed: result.validation?.passed,
      bannedHits: result.validation?.bannedHits,
      wrongSoftwareHits: result.validation?.wrongSoftwareHits,
      languageHits: result.validation?.languageHits,
      ctaHits: result.validation?.ctaHits,
      calendarCount: result.validation?.calendarCount,
      strategyCount: result.validation?.strategyCount,
    })),
  }, null, 2));

  if (!allPassed) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
