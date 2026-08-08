import fs from "node:fs/promises";

const BASE_URL = process.env.LOCAL_BASE_URL || "http://localhost:8788";

const realCases = [
  {
    id: "paragon_launch",
    label: "Restaurant/cafe with website + competitor, goal: launch_business",
    ownUrl: "https://paragonrestaurant.in/",
    competitorUrl: "https://www.thirdwavecoffeeroasters.com/",
    biz: {
      biz_name: "Paragon Restaurant",
      biz_industry: "Restaurant",
      biz_type: "Local physical business",
      biz_stage: "Established business planning a new launch push",
      biz_age: "3+ years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "Malabar food, restaurant dining, takeaway, and signature dishes",
      biz_audience: "families, food lovers, tourists, and local diners",
      biz_challenge: "Need a launch-style campaign that makes the restaurant feel fresh again",
      biz_usp: "known Malabar taste, strong food identity, and restaurant experience",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["launch_business"],
    },
  },
  {
    id: "toni_guy_bookings",
    label: "Salon with website + competitor, goal: get_more_bookings",
    ownUrl: "https://www.toniguy.com/",
    competitorUrl: "https://naturals.in/",
    biz: {
      biz_name: "TONI&GUY",
      biz_industry: "Salon",
      biz_type: "Local physical business",
      biz_stage: "Established business",
      biz_age: "3+ years",
      biz_location: "India",
      biz_customer_model: "B2C",
      biz_offer: "hair salon services, styling, salon appointments, and academies",
      biz_audience: "style-conscious customers and people looking for salon appointments",
      biz_challenge: "Need more appointment bookings",
      biz_usp: "salon brand recognition, service range, and professional styling",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹500 - ₹2,000",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_more_bookings"],
    },
  },
  {
    id: "hubspot_leads",
    label: "SaaS with website + competitor, goal: get_leads",
    ownUrl: "https://www.hubspot.com/products/crm",
    competitorUrl: "https://www.pipedrive.com/",
    biz: {
      biz_name: "HubSpot CRM",
      biz_industry: "SaaS Product",
      biz_type: "SaaS / Subscription app",
      biz_stage: "Established product",
      biz_age: "3+ years",
      biz_location: "Online",
      biz_customer_model: "B2B",
      biz_offer: "CRM software, customer platform, marketing, sales, and service tools",
      biz_audience: "business teams that need to manage leads, sales, marketing, and customer data",
      biz_challenge: "Need more qualified CRM leads",
      biz_usp: "free CRM entry point and connected customer platform",
      biz_budget: "Under ₹50,000",
      biz_ticket: "₹10,000 - ₹50,000",
      platforms: ["Website", "LinkedIn", "Instagram"],
      goal: ["get_leads"],
    },
  },
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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

async function scanWebsite(cookie, url, kind) {
  const result = await postJson("/api/web-insights", { url, kind }, cookie);
  if (!result.response.ok) {
    throw new Error(`Website scan failed for ${url}: ${result.response.status} ${result.text}`);
  }
  return result.json.snapshot;
}

function daySummary(day) {
  return {
    day: day.day,
    title: day.title || day.topic || day.hook,
    platform: day.platform,
    post_type: day.post_type,
    what_to_show: day.what_to_show,
    caption: day.caption,
    customer_action: day.customer_action,
    why_this_helps: day.why_this_helps,
    ai_enhanced: Boolean(day.ai_enhanced),
  };
}

function pickReportSections(report) {
  const tabs = report.tabs || {};
  return {
    aiUsed: Number(report.meta?.ai_calls_count || 0) > 0 || Boolean(report.meta?.ai_enhanced),
    aiCallsCount: Number(report.meta?.ai_calls_count || 0),
    aiProvider: report.meta?.ai_provider || "none",
    aiModel: report.meta?.ai_model || null,
    aiStatus: report.meta?.ai_status || "",
    qualityScoreBeforeAi: report.meta?.quality_score_before_ai ?? null,
    qualityScoreAfterAi: report.meta?.quality_score_after_ai ?? null,
    failedItemsRewritten: asArray(report.meta?.failed_items_rewritten),
    websiteFactsUsed: asArray(report.meta?.website_facts_used),
    competitorFactsUsed: asArray(report.meta?.competitor_facts_used),
    day1to3: asArray(tabs.calendar?.days).slice(0, 3).map(daySummary),
    captions: asArray(tabs.captions?.caption_bank).slice(0, 3),
    messageTemplates: asArray(tabs.templates?.templates).slice(0, 3),
    customerProblems: asArray(tabs.painPoints?.items).slice(0, 3),
    customerThoughts: asArray(tabs.psychology?.customer_thoughts).slice(0, 3),
    advancedGrowthPlan: asArray(tabs.premiumGrowth?.modules).slice(0, 5),
  };
}

function markdownForResult(result) {
  const section = result.sections;
  const own = result.ownSnapshot;
  const comp = result.competitorSnapshot;
  return [
    `## ${result.label}`,
    "",
    `AI used: ${section.aiUsed ? "yes" : "no"} | calls: ${section.aiCallsCount} | provider: ${section.aiProvider} | model: ${section.aiModel || "n/a"}`,
    `Quality score before AI: ${section.qualityScoreBeforeAi}`,
    `Quality score after AI: ${section.qualityScoreAfterAi}`,
    `AI status: ${section.aiStatus}`,
    "",
    "### Website Facts Used",
    "",
    section.websiteFactsUsed.length
      ? section.websiteFactsUsed.map(item => `- ${item}`).join("\n")
      : [
          `- Title: ${clean(own.title)}`,
          `- Description: ${clean(own.description)}`,
          `- Headings: ${asArray(own.headings).slice(0, 4).join("; ")}`,
          `- CTAs: ${asArray(own.callsToAction).slice(0, 4).join("; ") || "None detected"}`,
        ].join("\n"),
    "",
    "### Competitor Facts Used",
    "",
    section.competitorFactsUsed.length
      ? section.competitorFactsUsed.map(item => `- ${item}`).join("\n")
      : [
          `- Title: ${clean(comp.title)}`,
          `- Headings: ${asArray(comp.headings).slice(0, 4).join("; ")}`,
          `- Gaps: ${asArray(comp.detectedGaps).slice(0, 4).join("; ") || "None detected"}`,
        ].join("\n"),
    "",
    "### Day 1, Day 2, Day 3",
    "",
    ...section.day1to3.flatMap(day => [
      `**Day ${day.day}: ${day.title}** ${day.ai_enhanced ? "(AI-enhanced)" : ""}`,
      `Platform: ${day.platform} | Type: ${day.post_type}`,
      `What to show: ${day.what_to_show}`,
      `Caption: ${day.caption}`,
      `Customer action: ${day.customer_action}`,
      `Why this helps: ${day.why_this_helps}`,
      "",
    ]),
    "### 3 Captions",
    "",
    ...section.captions.map(item => `- ${item}`),
    "",
    "### 3 Message Templates",
    "",
    ...section.messageTemplates.map(item => `- ${item.type}: ${item.template}`),
    "",
    "### 3 Customer Problems",
    "",
    ...section.customerProblems.map(item => `- ${item.problem || item.customer_problem}: ${item.your_solution || item.what_to_do}`),
    "",
    "### 3 Customer Thoughts",
    "",
    ...section.customerThoughts.map(item => `- ${item.customer_thought}: ${item.what_to_say}`),
    "",
    "### Advanced Growth Plan",
    "",
    ...section.advancedGrowthPlan.map(item => `- ${item.title}: ${item.action || item.small_preview || item.why}`),
    "",
    "### Failed Items Rewritten",
    "",
    section.failedItemsRewritten.length ? section.failedItemsRewritten.map(item => `- ${item}`).join("\n") : "- None",
    "",
  ].join("\n");
}

async function main() {
  const login = await postJson("/api/dev-login", {});
  if (!login.response.ok) throw new Error(`Local tester login failed: ${login.response.status}`);
  const cookie = login.response.headers.get("set-cookie")?.split(";")[0] || "";

  const results = [];
  for (const testCase of realCases) {
    const ownSnapshot = await scanWebsite(cookie, testCase.ownUrl, "own");
    const competitorSnapshot = await scanWebsite(cookie, testCase.competitorUrl, "competitor");
    const biz = {
      ...testCase.biz,
      biz_website: testCase.ownUrl,
      biz_comp_website: testCase.competitorUrl,
      own_website_snapshot: ownSnapshot,
      competitor_website_snapshot: competitorSnapshot,
    };
    const generated = await postJson("/api/generate", { useHybrid: true, biz }, cookie);
    if (!generated.response.ok) {
      throw new Error(`Generate failed for ${testCase.id}: ${generated.response.status} ${generated.text}`);
    }
    const report = generated.json.report || generated.json.strategy;
    results.push({
      id: testCase.id,
      label: testCase.label,
      ownUrl: testCase.ownUrl,
      competitorUrl: testCase.competitorUrl,
      ownSnapshot,
      competitorSnapshot,
      report,
      sections: pickReportSections(report),
    });
  }

  const allAiUsed = results.every(result => result.sections.aiCallsCount > 0);
  const allWebsiteAware = results.every(result => result.sections.websiteFactsUsed.length > 0 || clean(result.ownSnapshot.title));
  const payload = {
    allAiUsed,
    allWebsiteAware,
    generatedAt: new Date().toISOString(),
    results,
  };
  await fs.writeFile("reports/hybrid_ai_real_reports.json", `${JSON.stringify(payload, null, 2)}\n`);
  await fs.writeFile("reports/hybrid_ai_real_reports.md", [
    "# Hybrid AI Real Website Reports",
    "",
    `Generated: ${payload.generatedAt}`,
    `All AI used: ${allAiUsed ? "PASS" : "FAIL"}`,
    `All website-aware: ${allWebsiteAware ? "PASS" : "FAIL"}`,
    "",
    ...results.map(markdownForResult),
  ].join("\n"));

  console.log(JSON.stringify({
    allAiUsed,
    allWebsiteAware,
    results: results.map(result => ({
      id: result.id,
      aiCallsCount: result.sections.aiCallsCount,
      aiProvider: result.sections.aiProvider,
      aiStatus: result.sections.aiStatus,
      qualityScoreBeforeAi: result.sections.qualityScoreBeforeAi,
      qualityScoreAfterAi: result.sections.qualityScoreAfterAi,
      websiteFactsUsed: result.sections.websiteFactsUsed.slice(0, 3),
      competitorFactsUsed: result.sections.competitorFactsUsed.slice(0, 3),
      firstDayTitle: result.sections.day1to3[0]?.title,
    })),
  }, null, 2));

  if (!allAiUsed || !allWebsiteAware) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
