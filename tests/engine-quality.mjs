/**
 * Engine quality regression tests.
 *
 * Run: npm run test:engine
 *
 * These modules are ESM but live under a CommonJS package, so Node will not
 * import them directly. Rather than add functions/package.json (which risks
 * confusing the Cloudflare Pages build), mirror the tree into a temp dir that
 * declares {"type":"module"} and import from there.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "cac-engine-"));
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
try { cpSync("shared", join(root, "..", "shared"), { recursive: true }); } catch { /* optional */ }
writeFileSync(join(root, "package.json"), '{"type":"module"}');

const load = name => import(pathToFileURL(join(root, "engine", name)).href);
const { assembleReport } = await load("reportAssembler.js");
const { createMasterStrategy } = await load("masterStrategyEngine.js");
const { runDiagnostics } = await load("diagnostics.js");

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const profileFor = (industry, location, stage = "running") => ({
  businessProfile: {
    identity: { name: "Testco" },
    market: { industry, city: location, location },
    offering: { coreOffer: industry, usp: "a specific measurable promise" },
    customers: { audience: "operations managers who need this weekly" },
    stage,
  },
  rawBiz: {
    biz_name: "Testco", biz_industry: industry, biz_offer: industry,
    biz_usp: "a specific measurable promise", biz_location: location,
    biz_audience: "operations managers who need this weekly",
    biz_stage: stage, platforms: ["instagram"], biz_website: "",
  },
});

// Places, languages and currencies that must never appear unless the business
// is actually there. Kozhikode/Malayalam shipped to every matching business
// before this test existed.
const FORBIDDEN = [
  [/kozhikode|calicut/i, "Kerala city"],
  [/malayalam|venam|aakaruthu/i, "Malayalam"],
  [/₹/, "rupee symbol"],
];

console.log("\n=== location coherence: no locale may leak into a foreign market ===");
const markets = [
  ["custom personalised gifts", "Dubai, UAE"],
  ["dental clinic", "London, UK"],
  ["SaaS analytics platform", "Austin, USA"],
  ["yoga studio", "Berlin, Germany"],
  ["custom personalised gifts", "Dubai, UAE", "pre-launch"],
];
for (const [industry, location, stage] of markets) {
  const { businessProfile, rawBiz } = profileFor(industry, location, stage);
  const { masterStrategy } = await createMasterStrategy({ env: {} }, {
    sessionUserId: "test", businessProfile, rawBiz, forceRuleBased: true,
  });
  const blob = JSON.stringify(assembleReport({
    hydratedStrategy: null, businessProfile, rawBiz, confidence: 0.5, masterStrategy,
  }));
  const hits = FORBIDDEN.filter(([re]) => re.test(blob)).map(([, label]) => label);
  check(`${industry} in ${location}${stage ? ` (${stage})` : ""}`, hits.length === 0,
    hits.length ? `leaked: ${hits.join(", ")}` : "clean");
}

console.log("\n=== currency follows the business location ===");
for (const [location, symbol] of [["Dubai, UAE", "AED"], ["Mumbai, India", "₹"], ["London, UK", "£"], ["Austin, USA", "$"]]) {
  const { businessProfile, rawBiz } = profileFor("gift retail", location);
  const roi = assembleReport({ hydratedStrategy: null, businessProfile, rawBiz, confidence: 0.5 })["ROI Calculator"];
  const text = JSON.stringify(roi);
  check(`${location} shows ${symbol}`, text.includes(symbol), text.slice(0, 70));
}

console.log("\n=== scores respond to evidence, not to typing volume ===");
const base = { biz_type: "bakery", biz_location: "Pune", platforms: [] };
const filler = "We are passionate about quality and customer delight. ".repeat(80);
const lean = runDiagnostics({ rawBiz: base, businessProfile: { coreOffer: "cakes" } });
const padded = runDiagnostics({
  rawBiz: { ...base, biz_usp: filler, biz_audience: filler },
  businessProfile: { coreOffer: `cakes ${filler}`, usp: filler, audience: filler },
});
for (const group of lean.scores) {
  const after = padded.scores.find(s => s.id === group.id);
  check(`${group.id} unchanged by 200x more text`, group.score === after.score,
    `${group.score} -> ${after.score}`);
}

console.log("\n=== unknown checks are excluded from the denominator ===");
for (const group of lean.scores) {
  const groupChecks = lean.checks.filter(c => c.group === group.id);
  const answerable = groupChecks.filter(c => c.status !== "unknown");
  const earned = answerable.filter(c => c.status === "pass").reduce((sum, c) => sum + c.weight, 0);
  const available = answerable.reduce((sum, c) => sum + c.weight, 0);
  const expected = available === 0 ? null : Math.round((earned / available) * 100);
  check(`${group.id} score is the weighted pass-rate of runnable checks`, group.score === expected);
}

rmSync(root, { recursive: true, force: true });
console.log(`\n${failures === 0 ? "ALL ENGINE QUALITY CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
