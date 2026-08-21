/**
 * Distinctness regression test.
 *
 * Run: npm run test:distinct
 *
 * The engine personalised by INDUSTRY, not by business. Two dental clinics in
 * London - one selling same-week appointments to families, one selling evening
 * slots to office workers - received reports that were 79% word-for-word
 * identical on the payload the workspace actually renders. A customer who ever
 * saw a competitor's report would see the product is a template.
 *
 * This test fails the build if that comes back. It measures only the fields the
 * API actually ships, and only the ones that are supposed to differ: the shared
 * diagnostic questions, the fixed disclaimers and the industry call-to-action
 * are all legitimately identical for everyone and are excluded below.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "cac-distinct-"));
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const load = name => import(pathToFileURL(join(root, "engine", name)).href);
const { createMasterStrategy } = await load("masterStrategyEngine.js");
const { assembleReport } = await load("reportAssembler.js");

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

// Mirror of buildWorkspaceResponseReport in functions/api/generate.js. Measuring
// the untrimmed report would score fields no customer ever reads.
const DAY_KEYS = new Set(["day", "platform", "post_type", "theme", "topic", "hook",
  "what_to_show", "how_to_create", "caption", "full_caption", "hashtags",
  "customer_action", "why_this_helps"]);
const FULL_KEYS = new Set(["If You Only Do One Thing", "Do This First", "What We Checked",
  "Quick Summary", "Launch Readiness", "What To Fix First", "First Customer Plan",
  "Customer Plan", "Numbers To Watch", "Website Check", "Website Details Used",
  "source", "unique_value_proposition", "customer_types"]);

function shipped(report) {
  const tabs = report?.tabs || {};
  const fullReport = Object.fromEntries(
    Object.entries(tabs.fullReport || {}).filter(([key]) => FULL_KEYS.has(key))
  );
  const calendar = tabs.calendar?.days
    ? {
        ...tabs.calendar,
        days: tabs.calendar.days.map(day =>
          Object.fromEntries(Object.entries(day).filter(([key]) => DAY_KEYS.has(key)))),
      }
    : tabs.calendar;
  return {
    business: report?.business || {},
    scores: report?.scores || [],
    diagnostics: report?.diagnostics || null,
    tabs: { ...tabs, ...(calendar ? { calendar } : {}), fullReport },
    meta: report?.meta || {},
  };
}

// Text that SHOULD read the same for every business: the checks we run, the
// "this is an example" disclaimers, the internal quality log, the timing advice
// and the industry's call to action. Counting these as filler would push the
// engine to vary things that are correct as they are.
const SHARED_BY_DESIGN = [
  /^diagnostics\b/,
  /^meta\b/,
  /^scores\[\d+\]\.(caveat|not_checked|failed)/,
  /What We Checked/,
  /\.note$/,
  /\.(customer_action|cta|copy_ready_text)$/,
  /\.when_to_do_this$/,
  /\.(priority|effort|timeline)$/,
];
const sharedByDesign = path => SHARED_BY_DESIGN.some(rule => rule.test(path));

function flatten(value, path = "", out = new Map()) {
  if (typeof value === "string") {
    // Short strings are labels ("Instagram Reel", "This week"), not copy.
    if (value.trim().length > 25 && !sharedByDesign(path)) out.set(path, value.trim());
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${path}[${index}]`, out));
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      flatten(item, path ? `${path}.${key}` : key, out);
    }
  }
  return out;
}

async function report(business) {
  const businessProfile = {
    identity: { name: business.name },
    market: { industry: business.industry, city: business.location, location: business.location },
    offering: { coreOffer: business.industry, usp: business.usp },
    customers: { audience: business.audience },
    stage: "running",
  };
  const rawBiz = {
    biz_name: business.name, biz_industry: business.industry, biz_offer: business.industry,
    biz_usp: business.usp, biz_location: business.location, biz_audience: business.audience,
    biz_stage: "running", platforms: ["instagram"], biz_website: "",
  };
  const { masterStrategy } = await createMasterStrategy({ env: {} }, {
    sessionUserId: `distinct-${business.name}`, businessProfile, rawBiz, forceRuleBased: true,
  });
  return shipped(assembleReport({
    hydratedStrategy: null, businessProfile, rawBiz, confidence: 0.5, masterStrategy,
  }));
}

const BUSINESSES = {
  dentalFamilies: { name: "Bright Smile Dental", industry: "dental clinic", location: "London, UK",
    audience: "families near the clinic", usp: "same-week appointments" },
  dentalCommuters: { name: "Riverside Dental Care", industry: "dental clinic", location: "London, UK",
    audience: "office workers in the city", usp: "evening slots after work" },
  bakery: { name: "Golden Crust Bakery", industry: "artisan bakery", location: "Manchester, UK",
    audience: "weekend shoppers", usp: "sourdough baked twice a day" },
  software: { name: "Trackly", industry: "project management software", location: "Bangalore, India",
    audience: "small agency owners", usp: "setup in ten minutes" },
};

const reports = {};
const flat = {};
for (const [key, business] of Object.entries(BUSINESSES)) {
  reports[key] = await report(business);
  flat[key] = flatten(reports[key]);
}
rmSync(root, { recursive: true, force: true });

function overlap(a, b) {
  const left = flat[a];
  const right = flat[b];
  const shared = [...left.keys()].filter(key => right.has(key));
  const identical = shared.filter(key => left.get(key) === right.get(key));
  return { pct: shared.length ? (identical.length / shared.length) * 100 : 0, identical, shared };
}

console.log("\n=== two businesses in the same trade must not get the same plan ===");
const sameTrade = overlap("dentalFamilies", "dentalCommuters");
// Two clinics genuinely share a lot - the same patient fears, the same city,
// the same platform. The bar is that a reader can tell the plans apart, not
// that they have nothing in common. This was 79% before the fix.
check(
  "same-industry overlap stays under 50%",
  sameTrade.pct < 50,
  `${sameTrade.pct.toFixed(0)}% of ${sameTrade.shared.length} shipped fields are word-for-word identical`
);

console.log("\n=== the owner's own promise has to reach the page ===");
for (const [key, business] of Object.entries(BUSINESSES)) {
  const body = [...flat[key].values()].join(" ").toLowerCase();
  const promise = business.usp.toLowerCase();
  check(`${business.name}: "${business.usp}" appears in the report`, body.includes(promise));
}

console.log("\n=== unrelated industries must stay far apart ===");
for (const [a, b] of [["dentalFamilies", "bakery"], ["dentalFamilies", "software"], ["bakery", "software"]]) {
  const cross = overlap(a, b);
  check(
    `${a} vs ${b} under 20%`,
    cross.pct < 20,
    `${cross.pct.toFixed(0)}% identical`
  );
}

console.log("\n=== no single sentence may carry a whole tab ===");
// A field repeated on every card inside ONE report is the same defect seen from
// the other side: expected_result was one industry sentence on all 20 ideas.
for (const [key, business] of Object.entries(BUSINESSES)) {
  const ideas = reports[key].tabs?.ideas?.experiments || [];
  const results = ideas.map(idea => idea.expected_result).filter(Boolean);
  const distinct = new Set(results).size;
  check(
    `${business.name}: growth ideas have varied expected results`,
    results.length === 0 || distinct >= Math.min(4, results.length),
    `${distinct} distinct across ${results.length} ideas`
  );
}

console.log("\n=== the audience the owner typed is the audience described ===");
// family_clinic was the default for every clinic, so a commuter clinic was told
// to film "the family appointment path".
const commuter = [...flat.dentalCommuters.values()].join(" ").toLowerCase();
const familyCopy = /\bfamily appointment path\b/.test(commuter);
check(
  "a clinic for office workers is not sold a family plan",
  !familyCopy,
  familyCopy ? "family-specific copy reached a commuter clinic's report" : ""
);

console.log("\n=== a shop must be described as the shop it is ===");
// A bakery was classed as a sit-down restaurant, so its plan talked about the
// seafood choice, dine-in versus pickup, and table-size ordering.
const bakeryCopy = [...flat.bakery.values()].join(" ").toLowerCase();
const WRONG_FOR_A_BAKERY = ["seafood", "dine-in", "table-size", "biryani", "headcount"];
const strays = WRONG_FOR_A_BAKERY.filter(word => bakeryCopy.includes(word));
check(
  "a bakery is not handed restaurant copy",
  strays.length === 0,
  strays.length ? `found: ${strays.join(", ")}` : ""
);
// The offer field is blank in this fixture, so intake copies the industry into
// it. "Fresh artisan bakery just came out" is what that used to produce.
const tradeNameSold = /\b(fresh|order|buy|try) (?:the )?artisan bakery\b/.test(bakeryCopy);
check(
  "the industry name is not used as if it were a product",
  !tradeNameSold,
  tradeNameSold ? "the trade name is being sold as a product" : ""
);

if (failures) {
  console.log(`\n${failures} DISTINCTNESS CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL DISTINCTNESS CHECKS PASSED\n");
