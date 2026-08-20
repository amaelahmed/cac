/**
 * Print a real CAC report for any business, with no server, no auth and no DB.
 *
 * Usage:
 *   npm run preview:report -- --name "Lumen Gifts" --industry "gift retail" \
 *     --location "Dubai, UAE" --audience "office gifting managers" --stage running
 *
 *   npm run preview:report -- --days 5          # show only the first 5 days
 *   npm run preview:report -- --json            # raw JSON instead of prose
 *
 * This runs the same engine the API runs, then applies the same field trim the
 * API applies before responding, so what you read here is what the workspace
 * receives.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const flag = (name, fallback = "") => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};
const has = name => argv.includes(`--${name}`);

const name = flag("name", "Lumen Gifts");
const industry = flag("industry", "custom personalised gifts");
const location = flag("location", "Dubai, UAE");
const audience = flag("audience", "office gifting managers");
const usp = flag("usp", "engraved in 24 hours or it ships free");
const stage = flag("stage", "running");
const website = flag("website", "");
const dayLimit = Number(flag("days", "30"));

// Mirror the engine into a temp ESM package (these are ESM files under a
// CommonJS package, so Node will not import them in place).
const root = mkdtempSync(join(tmpdir(), "cac-preview-"));
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const load = f => import(pathToFileURL(join(root, "engine", f)).href);

const { createMasterStrategy } = await load("masterStrategyEngine.js");
const { assembleReport } = await load("reportAssembler.js");

const businessProfile = {
  identity: { name },
  market: { industry, city: location, location },
  offering: { coreOffer: industry, usp },
  customers: { audience },
  stage,
};
const rawBiz = {
  biz_name: name, biz_industry: industry, biz_offer: industry, biz_usp: usp,
  biz_location: location, biz_audience: audience, biz_stage: stage,
  platforms: ["instagram"], biz_website: website,
};

const { masterStrategy } = await createMasterStrategy({ env: {} }, {
  sessionUserId: "preview", businessProfile, rawBiz, forceRuleBased: true,
});
const report = assembleReport({
  hydratedStrategy: null, businessProfile, rawBiz, confidence: 0.5, masterStrategy,
});
rmSync(root, { recursive: true, force: true });

// Same whitelist the API applies before responding.
const KEEP = new Set(["day", "platform", "post_type", "theme", "topic", "hook", "post",
  "what_to_show", "how_to_create", "caption", "ready_caption", "full_caption",
  "hashtags", "customer_action", "why_this_helps", "why_this_works"]);
const days = (report.tabs?.calendar?.days || [])
  .map(d => Object.fromEntries(Object.entries(d).filter(([k]) => KEEP.has(k))));

if (has("json")) {
  console.log(JSON.stringify({ scores: report.scores, diagnostics: report.diagnostics, days }, null, 2));
  process.exit(0);
}

const rule = char => console.log(char.repeat(78));
const wrap = (text, indent = 6) => String(text || "").replace(/\s+/g, " ").trim()
  .replace(new RegExp(`(.{1,${76 - indent}})(\\s|$)`, "g"), `${" ".repeat(indent)}$1\n`).trimEnd();

rule("=");
console.log(`  ${name} — ${industry}`);
console.log(`  ${location} · ${stage} · audience: ${audience}`);
rule("=");

console.log("\nHEADLINE SCORES\n");
for (const s of report.scores || []) {
  const score = s.score === null ? " n/a" : String(s.score).padStart(4);
  console.log(`  ${score}  ${s.label}`);
  if (s.caveat) console.log(wrap(`caveat: ${s.caveat}`, 8));
  if (s.not_checked?.length) console.log(`        not checked: ${s.not_checked.length} item(s)`);
}

const steps = report["10-Step Growth Strategy"] || [];
if (steps.length) {
  console.log("\nGROWTH STEPS\n");
  for (const [i, s] of steps.slice(0, 5).entries()) {
    console.log(`  ${i + 1}. ${s.title || s.step || s.priority || ""}`);
    if (s.action || s.why) console.log(wrap(s.action || s.why, 6));
  }
  if (steps.length > 5) console.log(`\n  … ${steps.length - 5} more`);
}

console.log(`\n30-DAY CALENDAR — showing ${Math.min(dayLimit, days.length)} of ${days.length}\n`);
for (const d of days.slice(0, dayLimit)) {
  rule("-");
  console.log(`  DAY ${d.day}  ·  ${d.platform || "—"}  ·  ${d.post_type || d.theme || "—"}`);
  if (d.topic) console.log(`\n  TOPIC   ${d.topic}`);
  if (d.hook) console.log(wrap(`HOOK    ${d.hook}`, 2));
  if (d.what_to_show) console.log(wrap(`SHOW    ${d.what_to_show}`, 2));
  if (d.caption || d.ready_caption) console.log(wrap(`CAPTION ${d.caption || d.ready_caption}`, 2));
  if (d.customer_action) console.log(wrap(`ACTION  ${d.customer_action}`, 2));
  if (d.why_this_helps || d.why_this_works) console.log(wrap(`WHY     ${d.why_this_helps || d.why_this_works}`, 2));
  console.log();
}

// The question that actually matters: does this read like one plan, or thirty
// copies of the same sentence?
const strings = days.flatMap(d => Object.values(d).filter(v => typeof v === "string" && v.length > 40));
const distinct = new Set(strings).size;
rule("=");
console.log(`  Repetition check: ${strings.length} long strings, ${distinct} distinct` +
  ` (${(100 - distinct / strings.length * 100).toFixed(0)}% repeated)`);
rule("=");
