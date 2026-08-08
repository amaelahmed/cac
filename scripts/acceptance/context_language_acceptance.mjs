import { buildMarketingOSReport, normalizeBusinessContext, validateSemanticAlignment } from "../../functions/api/engine/marketingIntelligence.js";
import { createMasterStrategy } from "../../functions/api/engine/masterStrategyEngine.js";
import { assembleReport } from "../../functions/api/engine/reportAssembler.js";

const baseUrl = process.env.CAC_ACCEPTANCE_BASE_URL || "http://127.0.0.1:8801";

const profiles = [
  {
    id: "saas-prelaunch",
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
      platforms: ["Instagram", "LinkedIn", "Website"],
      goal: ["launch_business", "get_leads"],
    },
    mustIncludeAny: ["signup", "beta", "waitlist", "trial", "demo", "onboarding", "activation", "use case", "workflow", "product proof", "manual alternative"],
    mustNotInclude: ["Other Shops Customers May Choose", "nearby customers", "local area", "local plan", "test orders", "easiest first order", "people nearby"],
  },
  {
    id: "local-cafe",
    biz: {
      biz_name: "Malabar Meals",
      biz_industry: "Restaurant / Cafe",
      biz_type: "Local physical business",
      biz_stage: "Running but needs more orders",
      biz_age: "1-3 years",
      biz_location: "Kozhikode, Kerala, India",
      biz_customer_model: "B2C",
      biz_offer: "Malabar meals, lunch plates, and evening snacks",
      biz_audience: "nearby families, students, and office lunch customers",
      biz_challenge: "Need more local awareness and repeat orders",
      biz_usp: "fresh local food, clean preparation, and fast WhatsApp ordering",
      biz_budget: "Under ₹10,000",
      biz_ticket: "₹200 - ₹500",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["get_more_orders"],
    },
    mustIncludeAny: ["local", "review", "order", "Google", "WhatsApp", "nearby"],
    mustNotInclude: ["activation", "trial starts", "beta users"],
  },
  {
    id: "dental-clinic",
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
      goal: ["build_trust", "get_more_bookings"],
    },
    mustIncludeAny: ["appointment", "patient", "trust", "local", "review", "booking"],
    mustNotInclude: ["beta users", "trial starts", "activation"],
  },
  {
    id: "agency-service",
    biz: {
      biz_name: "NorthStar Studio",
      biz_industry: "Marketing Agency",
      biz_type: "Professional service",
      biz_stage: "Running but lead quality is inconsistent",
      biz_age: "1-3 years",
      biz_location: "India",
      biz_customer_model: "B2B",
      biz_offer: "brand strategy, campaign planning, and monthly content support",
      biz_audience: "founders and small business owners who need better marketing decisions",
      biz_challenge: "Need better leads and clearer client trust",
      biz_usp: "portfolio proof, simple strategy, and founder-led support",
      biz_budget: "Under ₹15,000",
      biz_ticket: "₹10,000 - ₹50,000",
      platforms: ["LinkedIn", "Instagram", "Website"],
      goal: ["get_leads", "build_trust"],
    },
    mustIncludeAny: ["lead", "enquiry", "portfolio", "case study", "proposal", "client"],
    mustNotInclude: ["test orders", "walk-in", "nearby customers"],
  },
  {
    id: "ecommerce-d2c",
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
      goal: ["get_more_orders"],
    },
    mustIncludeAny: ["product", "checkout", "purchase", "reviews", "delivery", "UGC", "offer"],
    mustNotInclude: ["beta users", "activation", "onboarding"],
  },
  {
    id: "d2c-skincare",
    biz: {
      biz_name: "Nivara Skin",
      biz_industry: "E-commerce / D2C",
      biz_type: "Online only",
      biz_stage: "Growing steadily",
      biz_location: "Online / Global",
      biz_customer_model: "Direct online buyers",
      biz_offer: "E-commerce products",
      biz_audience: "women aged 20-35 in Indian cities",
      biz_challenge: "People ask but don't buy",
      biz_usp: "Better quality",
      biz_extra: "Mineral sunscreen SPF 50 for humid weather. Fragrance-free formula. No medical claims.",
      platforms: ["Instagram", "Website", "WhatsApp"],
      goal: ["online_sales"],
    },
    expectedParentCategory: "ecommerce",
    expectedSubtype: "d2c_skincare",
    expectedFallback: false,
    expectedConstraintIds: ["no_medical_or_cure_claims"],
    mustIncludeAny: ["sunscreen", "SPF", "formula", "ingredient", "delivery", "returns", "shop", "cart", "order"],
    mustIncludeGroups: [
      ["sunscreen", "SPF", "skincare"],
      ["formula", "ingredient", "mineral", "fragrance-free"],
      ["delivery", "returns", "review"],
      ["shop", "add to cart", "order", "checkout"],
    ],
    mustNotInclude: ["custom gift", "gifting occasion", "book an appointment", "appointment details", "available slots", "guaranteed cure", "treats acne"],
  },
  {
    id: "physiotherapy",
    biz: {
      biz_name: "StrideRight Physio",
      biz_industry: "Healthcare",
      biz_type: "Local physical business",
      biz_stage: "Running but sales are inconsistent",
      biz_location: "Bengaluru, Karnataka, India",
      biz_customer_model: "Individual customers",
      biz_offer: "Healthcare / Wellness",
      biz_audience: "runners, desk workers, and adults recovering from sports injuries",
      biz_challenge: "Not getting enough leads or enquiries",
      biz_usp: "Niche expertise",
      biz_extra: "Physiotherapy assessment, sports injury rehabilitation, mobility plans, guided exercise and pain management. Trust depends on physiotherapist credentials, assessment quality, exercise plans, safety and recovery evidence.",
      platforms: ["Instagram", "WhatsApp", "Google Business"],
      goal: ["credibility"],
    },
    expectedParentCategory: "healthcare",
    expectedSubtype: "physiotherapy",
    expectedFallback: false,
    expectedConstraintIds: ["assessment_led_recovery"],
    mustIncludeAny: ["physiotherapy", "physiotherapist", "assessment", "rehabilitation", "mobility", "guided exercise", "recovery"],
    mustIncludeGroups: [
      ["physiotherapy", "physiotherapist", "physio"],
      ["assessment", "mobility", "rehabilitation", "exercise"],
      ["injury", "recovery", "pain management"],
      ["book a physiotherapy assessment", "schedule a mobility consultation", "appointment"],
    ],
    mustNotInclude: ["dental appointment", "dentist", "tooth", "teeth", "braces", "implant", "haircut", "facial", "guaranteed recovery"],
  },
  {
    id: "b2b-solar",
    biz: {
      biz_name: "SunSaathi Energy",
      biz_industry: "Manufacturing / Business Supply",
      biz_type: "Service at customer location",
      biz_stage: "Growing steadily",
      biz_location: "Pune, Maharashtra, India",
      biz_customer_model: "Small business owners",
      biz_offer: "Professional service",
      biz_audience: "factory owners and operations heads with high daytime electricity use",
      biz_challenge: "Not getting enough leads or enquiries",
      biz_usp: "Niche expertise",
      biz_extra: "B2B rooftop solar surveys, system design, installation, net-metering and DISCOM approval. Buyers need generation estimates, EPC credentials, approvals, warranties, installation safety and ROI proposals.",
      platforms: ["LinkedIn", "Website", "WhatsApp"],
      goal: ["customers"],
    },
    expectedParentCategory: "professional_service",
    expectedSubtype: "b2b_solar",
    expectedFallback: false,
    expectedConstraintIds: ["estimate_not_guarantee"],
    mustIncludeAny: ["rooftop solar", "solar panels", "site survey", "electricity bill", "generation estimate", "EPC", "DISCOM", "warranty", "ROI proposal"],
    mustIncludeGroups: [
      ["solar", "rooftop", "panel"],
      ["energy", "generation", "electricity"],
      ["EPC", "DISCOM", "net-metering", "approval", "warranty"],
      ["site survey", "electricity bill", "ROI proposal", "commercial solar quote"],
    ],
    mustNotInclude: ["choice menu", "simple menu or service list", "walk-in", "book the service", "repair photo", "nearby service timing", "same-day repair", "guaranteed savings", "instant approval"],
  },
  {
    id: "nonprofit-education",
    biz: {
      biz_name: "CodeSakhi Foundation",
      biz_industry: "Education / Coaching Center",
      biz_type: "Online + physical",
      biz_stage: "Getting first customers",
      biz_location: "Hyderabad, Telangana, India",
      biz_customer_model: "Individual customers",
      biz_offer: "Course / Community",
      biz_audience: "young women from low-income communities seeking digital skills",
      biz_challenge: "Low brand awareness",
      biz_usp: "Niche expertise",
      biz_extra: "Nonprofit free digital-skills cohort with mentor-led learning, no fees, learner safeguarding and no job guarantee. Success means eligible applications, referrals, volunteers and partners.",
      platforms: ["Instagram", "WhatsApp", "LinkedIn"],
      goal: ["awareness"],
    },
    expectedParentCategory: "education",
    expectedSubtype: "nonprofit_education",
    expectedFallback: true,
    expectedConstraintIds: ["no_fee_access", "no_job_or_placement_guarantee"],
    mustIncludeAny: ["free cohort", "digital skills", "learner", "mentor", "safeguarding", "eligibility", "apply", "refer", "volunteer", "partnership"],
    mustIncludeGroups: [
      ["cohort", "digital skills", "learner"],
      ["mentor", "safeguarding"],
      ["nonprofit", "free", "no fee", "no-fee"],
      ["apply", "refer", "volunteer", "partner", "partnership"],
    ],
    mustNotInclude: [
      "hygiene", "grooming", "haircut", "facial", "price list", "demo class", "available slots",
      "price, timing, availability", "price or timing reply", "real job or order", "real order numbers",
      "ask for price, proof, and timing", "clear price/package proof", "price framing",
      "booking/order flow post", "cross-sell/upsell post", "reply with price clarity",
      "booking, order, or visit step", "customer or order is worth", "guaranteed job",
    ],
  },
];

function containsAny(text, terms) {
  const source = text.toLowerCase();
  return terms.filter(term => {
    const phrase = String(term || "")
      .toLowerCase()
      .trim()
      .split(/[-\s]+/)
      .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("[-\\s]+");
    if (!phrase) return false;
    return new RegExp(`(^|[^a-z0-9])${phrase}(?=$|[^a-z0-9])`, "i").test(source);
  });
}

function visibleReportText(report) {
  const visible = structuredClone(report || {});
  delete visible.meta;
  delete visible.marketing_os;
  delete visible.exportable_report_data;
  return JSON.stringify(visible);
}

function actionableReportText(report) {
  return JSON.stringify({
    calendar: report?.tabs?.calendar,
    strategy: report?.tabs?.strategy,
    psychology: report?.tabs?.psychology,
    painPoints: report?.tabs?.painPoints,
    competitors: report?.tabs?.competitors,
    ideas: report?.tabs?.ideas,
    captions: report?.tabs?.captions,
    templates: report?.tabs?.templates,
    premiumGrowth: report?.tabs?.premiumGrowth,
  });
}

function evaluateRoute(id, biz, expectedParentCategory, expectedSubtype) {
  const context = normalizeBusinessContext({}, biz);
  const offerPreserved = !biz.biz_offer || context.productsOrServices === biz.biz_offer;
  return {
    id,
    pass: context.parentCategory === expectedParentCategory && context.briefSubtype === expectedSubtype && offerPreserved,
    expectedParentCategory,
    actualParentCategory: context.parentCategory,
    expectedSubtype,
    actualSubtype: context.briefSubtype,
    submittedOffer: biz.biz_offer || "",
    normalizedOffer: context.productsOrServices,
    offerPreserved,
  };
}

const routeChecks = [
  evaluateRoute("ordinary-education-not-appointment", {
    biz_industry: "Education / Coaching Center",
    biz_type: "Local physical business",
    biz_offer: "Maths and science coaching",
    biz_audience: "school students",
  }, "education", ""),
  evaluateRoute("asking-not-skincare", {
    biz_industry: "Ecommerce Clothing",
    biz_type: "Online only",
    biz_offer: "shirts",
    biz_extra: "asking customers for size feedback",
  }, "ecommerce", ""),
  evaluateRoute("cosmetics-not-sunscreen", {
    biz_industry: "E-commerce / D2C",
    biz_type: "Online only",
    biz_offer: "lipstick and mascara cosmetics",
  }, "ecommerce", ""),
  evaluateRoute("physiological-not-physiotherapy", {
    biz_industry: "Healthcare",
    biz_offer: "physiological testing",
  }, "healthcare", ""),
  evaluateRoute("solaris-not-solar", {
    biz_industry: "Consulting",
    biz_offer: "Solaris ERP consulting",
  }, "professional_service", ""),
  evaluateRoute("paid-digital-skills-not-nonprofit", {
    biz_industry: "Education / Coaching Center",
    biz_offer: "paid digital-skills bootcamp",
  }, "education", ""),
  evaluateRoute("free-paid-course-teaser-not-nonprofit", {
    biz_industry: "Education / Coaching Center",
    biz_offer: "free cohort teaser for our paid course",
  }, "education", ""),
  evaluateRoute("explicit-d2c-skincare", {
    biz_industry: "D2C Skincare Brand",
    biz_type: "Online only",
    biz_offer: "moisturizer",
  }, "ecommerce", "d2c_skincare"),
  evaluateRoute("explicit-nonprofit-education", {
    biz_industry: "Nonprofit Education",
    biz_offer: "literacy program",
  }, "education", "nonprofit_education"),
  evaluateRoute("explicit-solar-installation", {
    biz_industry: "Solar Installation",
    biz_offer: "commercial projects",
  }, "professional_service", "b2b_solar"),
];

const guardedProfiles = Object.fromEntries(
  profiles.filter(profile => profile.expectedSubtype).map(profile => [profile.id, profile])
);

function semanticBaseline(id, bizOverride = null) {
  const profile = guardedProfiles[id];
  const biz = bizOverride || profile.biz;
  return buildMarketingOSReport({ businessProfile: {}, rawBiz: biz, telemetry: {} });
}

function negativeSemanticCheck(id, mutate, expectedEvidence) {
  const baseline = semanticBaseline(id);
  const output = structuredClone(baseline.workspace);
  mutate(output);
  const validation = validateSemanticAlignment(output, baseline.context);
  const evidence = JSON.stringify(validation).toLowerCase();
  return {
    id: `reject-${id}`,
    pass: !validation.passed && expectedEvidence.some(term => evidence.includes(term.toLowerCase())),
    expectedEvidence,
    issues: validation.issues,
  };
}

const semanticValidatorChecks = [
  negativeSemanticCheck("d2c-skincare", output => {
    output.tabs.calendar.days[0].caption += " Choose a custom birthday gift for the occasion.";
  }, ["gift", "occasion"]),
  negativeSemanticCheck("physiotherapy", output => {
    output.tabs.calendar.days[0].caption += " Book a dental appointment for a tooth implant.";
  }, ["dental", "tooth", "implant"]),
  negativeSemanticCheck("b2b-solar", output => {
    output.tabs.calendar.days[0].customerAction = "Walk-in and book the service.";
    output.tabs.calendar.days[0].customer_action = "Walk-in and book the service.";
  }, ["walk-in", "book the service"]),
  negativeSemanticCheck("nonprofit-education", output => {
    output.tabs.calendar.days[0].caption += " Book a demo class and ask for the price list.";
  }, ["demo class", "price list"]),
];

{
  const baseline = semanticBaseline("d2c-skincare");
  const brandKitOnly = { tabs: { brandKit: structuredClone(baseline.workspace.tabs.brandKit) } };
  const validation = validateSemanticAlignment(brandKitOnly, baseline.context);
  semanticValidatorChecks.push({
    id: "brand-kit-only-cannot-satisfy-semantics",
    pass: !validation.passed && validation.missingNounGroups.length > 0 && validation.missingCtaGroups.length > 0 && validation.missingTrustGroups.length > 0,
    issues: validation.issues,
  });

  const inputEchoOnly = { "Business DNA / Profile": { submitted_brief: baseline.context.briefText } };
  const echoValidation = validateSemanticAlignment(inputEchoOnly, baseline.context);
  semanticValidatorChecks.push({
    id: "submitted-brief-echo-cannot-satisfy-semantics",
    pass: !echoValidation.passed && echoValidation.missingNounGroups.length > 0,
    issues: echoValidation.issues,
  });

  const negatedOnly = {
    tabs: {
      calendar: { days: [{
        caption: "Do not discuss sunscreen, SPF, or skincare. Never show formula, ingredient, mineral, or fragrance-free. Do not mention delivery, returns, or reviews.",
        customerAction: "Do not shop, add to cart, order, or checkout.",
      }] },
      strategy: { steps: [] },
      captions: { caption_bank: [] },
      templates: { templates: [] },
      painPoints: { items: [{ trust_factor: "Never show formula, SPF, reviews, returns, delivery, or real application." }] },
    },
  };
  const negatedValidation = validateSemanticAlignment(negatedOnly, baseline.context);
  semanticValidatorChecks.push({
    id: "negated-required-language-cannot-pass",
    pass: !negatedValidation.passed && negatedValidation.missingNounGroups.length === 3 && negatedValidation.missingCtaGroups.length === 1 && negatedValidation.missingTrustGroups.length === 2,
    issues: negatedValidation.issues,
  });
}

{
  const baseBiz = guardedProfiles["d2c-skincare"].biz;
  const constrainedBiz = {
    ...baseBiz,
    biz_extra: `${baseBiz.biz_extra} Do not mention discounts or coupon codes.`,
  };
  const baseline = semanticBaseline("d2c-skincare", constrainedBiz);
  const output = structuredClone(baseline.workspace);
  output.tabs.calendar.days[0].caption += " Use a 50% discount today.";
  const validation = validateSemanticAlignment(output, baseline.context);
  const submittedTargets = validation.submittedConstraintsChecked
    .filter(item => item.id.startsWith("submitted_avoid_"))
    .flatMap(item => item.forbiddenTerms)
    .sort();
  semanticValidatorChecks.push({
    id: "submitted-discount-and-coupon-constraint",
    pass: !validation.passed && submittedTargets.join("|") === "coupon codes|discounts" && validation.constraintHits.includes("discounts"),
    submittedTargets,
    issues: validation.issues,
  });

  const terseNoBiz = {
    ...baseBiz,
    biz_extra: `${baseBiz.biz_extra} No discounts.`,
  };
  const terseNoBaseline = semanticBaseline("d2c-skincare", terseNoBiz);
  const terseNoOutput = structuredClone(terseNoBaseline.workspace);
  terseNoOutput.tabs.calendar.days[0].caption += " Use a 50% discount today.";
  const terseNoValidation = validateSemanticAlignment(terseNoOutput, terseNoBaseline.context);
  semanticValidatorChecks.push({
    id: "submitted-terse-no-discount-constraint",
    pass: !terseNoValidation.passed
      && terseNoValidation.submittedConstraintsChecked.some(item => item.forbiddenTerms.includes("discounts"))
      && terseNoValidation.constraintHits.includes("discounts"),
    issues: terseNoValidation.issues,
  });

  const avoidBiz = {
    ...baseBiz,
    biz_extra: `${baseBiz.biz_extra} Avoid discounts and giveaways.`,
  };
  const avoidBaseline = semanticBaseline("d2c-skincare", avoidBiz);
  const avoidOutput = structuredClone(avoidBaseline.workspace);
  avoidOutput.tabs.calendar.days[0].caption += " Add a giveaway to this post.";
  const avoidValidation = validateSemanticAlignment(avoidOutput, avoidBaseline.context);
  const avoidTargets = avoidValidation.submittedConstraintsChecked
    .filter(item => item.id.startsWith("submitted_avoid_"))
    .flatMap(item => item.forbiddenTerms)
    .sort();
  semanticValidatorChecks.push({
    id: "submitted-avoid-conjunction-constraint",
    pass: !avoidValidation.passed && avoidTargets.join("|") === "discounts|giveaways" && avoidValidation.constraintHits.includes("giveaways"),
    submittedTargets: avoidTargets,
    issues: avoidValidation.issues,
  });
}

{
  const baseline = semanticBaseline("b2b-solar");
  const output = structuredClone(baseline.workspace);
  output.tabs.calendar.days[0].caption += " Do not claim guaranteed savings.";
  const validation = validateSemanticAlignment(output, baseline.context);
  semanticValidatorChecks.push({
    id: "negated-solar-disclaimer-is-not-a-claim",
    pass: validation.passed && !validation.constraintHits.includes("guaranteed savings"),
    issues: validation.issues,
  });
}

{
  const baseline = semanticBaseline("d2c-skincare");
  const output = structuredClone(baseline.workspace);
  output.tabs.calendar.days[0].caption = "No medical claims, show SPF and formula clearly. Show delivery, returns, and reviews. Shop the sunscreen online.";
  output.tabs.calendar.days[0].customerAction = "Shop the sunscreen online.";
  output.tabs.calendar.days[0].customer_action = "Shop the sunscreen online.";
  const validation = validateSemanticAlignment(output, baseline.context);
  semanticValidatorChecks.push({
    id: "post-comma-positive-proof-remains-positive",
    pass: validation.passed,
    issues: validation.issues,
  });
}

{
  const baseBiz = guardedProfiles["d2c-skincare"].biz;
  const descriptorBiz = {
    ...baseBiz,
    biz_offer: "Mineral moisturizer",
    biz_extra: "Skincare moisturizer. No added fragrance. No white cast. No minimum order. No experience required.",
  };
  const baseline = semanticBaseline("d2c-skincare", descriptorBiz);
  const genericConstraints = baseline.validation.semanticAlignment.submittedConstraintsChecked.filter(item => item.id.startsWith("submitted_avoid_"));
  semanticValidatorChecks.push({
    id: "bare-no-descriptors-are-not-generic-bans",
    pass: genericConstraints.length === 0,
    genericConstraints,
  });
}

{
  const baseline = semanticBaseline("nonprofit-education");
  const output = structuredClone(baseline.workspace);
  output.tabs.calendar.days[0].caption += " A paid digital course feels safer only when its terms are clear.";
  const validation = validateSemanticAlignment(output, baseline.context);
  semanticValidatorChecks.push({
    id: "course-feels-does-not-match-course-fee",
    pass: validation.passed && !validation.constraintHits.includes("course fee"),
    issues: validation.issues,
  });
}

function businessProfileFromBiz(biz) {
  return {
    identity: { name: biz.biz_name, type: biz.biz_type, stage: biz.biz_stage, age: biz.biz_age },
    market: { industry: biz.biz_industry, category: biz.biz_industry, location: biz.biz_location },
    customers: { model: biz.biz_customer_model, audience: biz.biz_audience, target: biz.biz_audience, challenge: biz.biz_challenge },
    offering: { coreOffer: biz.biz_offer, usp: biz.biz_usp, averageTicket: biz.biz_ticket },
    channels: { platforms: biz.platforms },
    economics: { marketingBudget: biz.biz_budget },
    objectives: { goals: biz.goal },
  };
}

async function badMasterWebsitePreservationCheck() {
  const baseBiz = guardedProfiles["d2c-skincare"].biz;
  const biz = {
    ...baseBiz,
    biz_website: "https://nivara.example",
    own_website_snapshot: {
      title: "Nivara Mineral Sunscreen",
      detectedGaps: ["Returns information is hard to find."],
      callsToAction: ["Shop sunscreen"],
    },
  };
  const businessProfile = businessProfileFromBiz(biz);
  const requestContext = {
    env: {},
    request: new Request("https://local.test/api/generate"),
    waitUntil() {},
  };
  const masterResult = await createMasterStrategy(requestContext, {
    sessionUserId: "acceptance-bad-master-website-preservation",
    businessProfile,
    rawBiz: biz,
    lineage: [],
    internetSignals: null,
    forceRuleBased: true,
  });
  const badMaster = structuredClone(masterResult.masterStrategy);
  badMaster.content_calendar_30_days[0] = {
    ...badMaster.content_calendar_30_days[0],
    caption: "Choose a custom birthday gift for the occasion, then book an appointment.",
    customer_action: "Book an appointment slot.",
    cta: "Book an appointment slot.",
  };
  const report = assembleReport({
    hydratedStrategy: {},
    businessProfile,
    rawBiz: biz,
    confidence: { score: 90, status: "Acceptance fallback preservation" },
    telemetry: masterResult.telemetry,
    strategyBlocks: [],
    internetSignals: null,
    masterStrategy: badMaster,
  });
  const qualityChecks = report?.meta?.quality_checks || {};
  const websiteRoast = report?.["Website Roast"];
  const marketingWebsiteRoast = report?.marketing_os?.website_roast;
  return {
    id: "bad-master-preserves-website-roast",
    pass: qualityChecks.master_overlay_fallback_used === true
      && qualityChecks.master_overlay_semantic_validation?.passed === false
      && qualityChecks.final_semantic_validation?.passed === true
      && qualityChecks.final_semantic_validation?.subtype === "d2c_skincare"
      && qualityChecks.final_marketing_validation?.passed === true
      && qualityChecks.passed === true
      && report?.meta?.schema_valid === true
      && !report.master_strategy
      && report?.meta?.master_strategy_enabled === false
      && websiteRoast?.url === biz.biz_website
      && websiteRoast?.visible_title === biz.own_website_snapshot.title
      && marketingWebsiteRoast?.url === biz.biz_website
      && marketingWebsiteRoast?.visible_title === biz.own_website_snapshot.title
      && Object.keys(report?.tabs || {}).length >= 13,
    fallbackUsed: qualityChecks.master_overlay_fallback_used,
    rejectedMasterIssues: qualityChecks.master_overlay_semantic_validation?.issues || [],
    finalSemanticSubtype: qualityChecks.final_semantic_validation?.subtype,
    masterStrategyPresent: Boolean(report.master_strategy),
    websiteRoast,
    marketingWebsiteRoast,
    sectionCount: Object.keys(report?.tabs || {}).length,
    schemaValid: report?.meta?.schema_valid,
    finalMarketingValidationPassed: qualityChecks.final_marketing_validation?.passed,
    topQualityPassed: qualityChecks.passed,
  };
}

const fallbackPreservationChecks = [await badMasterWebsitePreservationCheck()];

async function postJson(path, body, cookie = "") {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { response, json, text };
}

const login = await fetch(`${baseUrl}/api/dev-login`, { method: "POST" });
const cookie = login.headers.get("set-cookie")?.split(";")[0] || "";
if (!cookie) {
  throw new Error("Local tester login failed. Run with DEV_AUTH_ENABLED=true.");
}

const results = [];
for (const profile of profiles) {
  const generated = await postJson("/api/generate", {
    useHybrid: true,
    aiMode: "rules_only",
    biz: profile.biz,
  }, cookie);

  if (!generated.response.ok) {
    results.push({
      id: profile.id,
      pass: false,
      status: generated.response.status,
      error: generated.json,
    });
    continue;
  }

  const report = generated.json.report || generated.json.strategy || generated.json;
  const inclusionText = actionableReportText(report);
  const auditText = visibleReportText(report);
  const included = containsAny(inclusionText, profile.mustIncludeAny);
  const forbidden = containsAny(auditText, profile.mustNotInclude);
  const missingGroups = (profile.mustIncludeGroups || []).filter(group => containsAny(inclusionText, group).length === 0);
  const sectionCount = report?.tabs ? Object.keys(report.tabs).length : 0;
  const context = normalizeBusinessContext({}, profile.biz);
  const semanticAlignment = profile.expectedSubtype ? validateSemanticAlignment(report, context) : null;
  const checkedConstraintIds = semanticAlignment?.submittedConstraintsChecked?.map(item => item.id) || [];
  const missingConstraintIds = (profile.expectedConstraintIds || []).filter(id => !checkedConstraintIds.includes(id));
  const qualityChecks = report?.meta?.quality_checks || {};
  const apiFinalSemanticSubtype = qualityChecks.final_semantic_validation?.subtype || "";
  const apiSemanticSubtypePassed = !profile.expectedSubtype || apiFinalSemanticSubtype === profile.expectedSubtype;
  const routePassed = !profile.expectedSubtype || (
    context.parentCategory === profile.expectedParentCategory
    && context.briefSubtype === profile.expectedSubtype
    && context.productsOrServices === profile.biz.biz_offer
  );
  const qualityPassed = report?.meta?.schema_valid === true && (
    !profile.expectedSubtype || (
      qualityChecks.passed === true
      && qualityChecks.final_marketing_validation?.passed === true
      && qualityChecks.final_semantic_validation?.passed === true
    )
  );
  const fallbackUsed = Boolean(qualityChecks.master_overlay_fallback_used);
  const fallbackPassed = profile.expectedFallback === undefined || (
    fallbackUsed === profile.expectedFallback
    && (!profile.expectedFallback || !report.master_strategy)
  );
  results.push({
    id: profile.id,
    pass: included.length > 0
      && forbidden.length === 0
      && missingGroups.length === 0
      && sectionCount >= 13
      && routePassed
      && (!semanticAlignment || semanticAlignment.passed)
      && apiSemanticSubtypePassed
      && missingConstraintIds.length === 0
      && qualityPassed
      && fallbackPassed,
    status: generated.response.status,
    included,
    forbidden,
    missingGroups,
    sectionCount,
    routePassed,
    expectedParentCategory: profile.expectedParentCategory,
    actualParentCategory: context.parentCategory,
    expectedSubtype: profile.expectedSubtype,
    actualSubtype: context.briefSubtype,
    submittedOffer: profile.biz.biz_offer,
    normalizedOffer: context.productsOrServices,
    semanticPassed: semanticAlignment?.passed,
    semanticIssues: semanticAlignment?.issues || [],
    apiFinalSemanticSubtype,
    apiSemanticSubtypePassed,
    checkedConstraintIds,
    missingConstraintIds,
    schemaValid: report?.meta?.schema_valid,
    topQualityPassed: qualityChecks.passed,
    finalMarketingValidationPassed: qualityChecks.final_marketing_validation?.passed,
    finalSemanticValidationPassed: qualityChecks.final_semantic_validation?.passed,
    expectedFallback: profile.expectedFallback,
    fallbackUsed,
    masterStrategyPresent: Boolean(report.master_strategy),
  });
}

const allPassed = results.every(result => result.pass)
  && routeChecks.every(result => result.pass)
  && semanticValidatorChecks.every(result => result.pass)
  && fallbackPreservationChecks.every(result => result.pass);
console.log(JSON.stringify({ allPassed, routeChecks, semanticValidatorChecks, fallbackPreservationChecks, results }, null, 2));
if (!allPassed) process.exit(1);
