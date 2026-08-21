/**
 * Run: npm run test:classify
 *
 * The trade must come from what the owner ticked, not from a stray word that
 * happens to appear in another answer.
 *
 * A real report: a tuition centre ticked "Membership / subscription" as its
 * PAYMENT MODEL. The word "membership" alone was enough to classify it as a
 * gym, and the customer got thirty days of trainer and workout posts for a
 * business that teaches classes.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "cac-classify-"));
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const load = f => import(pathToFileURL(join(root, "engine", f)).href);
const { createMasterStrategy } = await load("masterStrategyEngine.js");
const { assembleReport } = await load("reportAssembler.js");

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

async function reportFor(rawBiz, businessProfile) {
  const { masterStrategy } = await createMasterStrategy({ env: {} }, {
    sessionUserId: "classify", businessProfile, rawBiz, forceRuleBased: true,
  });
  const report = assembleReport({
    hydratedStrategy: null, businessProfile, rawBiz, confidence: 0.5, masterStrategy,
  });
  return JSON.stringify(report).toLowerCase();
}

console.log("\n=== a tuition centre that sells memberships is still a tuition centre ===");
{
  const text = await reportFor(
    {
      biz_name: "floreo",
      biz_industry: "Professional Training / Education",
      biz_offer: "Consultation | class plan package",
      biz_customer_model: "Membership / subscription",
      biz_audience: "Parents & families | Young professionals",
      biz_usp: "Niche expertise",
      biz_location: "Kochi, India",
      platforms: ["instagram"],
    },
    {
      identity: { name: "floreo" },
      market: { industry: "Professional Training / Education" },
      offering: { coreOffer: "class plan package" },
      customers: { audience: "Parents & families", model: "Membership / subscription" },
    }
  );
  for (const gymWord of ["workout", "gym week", "trainer check", "beginner session"]) {
    check(`no "${gymWord}" anywhere in the report`, !text.includes(gymWord));
  }
  check("it talks about classes instead", /class|student|demo|batch|tuition/.test(text));
}

console.log("\n=== a real gym is still a gym ===");
{
  const text = await reportFor(
    {
      biz_name: "Iron Yard",
      biz_industry: "Gym / Fitness",
      biz_offer: "personal training",
      biz_customer_model: "Membership / subscription",
      biz_location: "Kochi, India",
      platforms: ["instagram"],
    },
    {
      identity: { name: "Iron Yard" },
      market: { industry: "Gym / Fitness" },
      offering: { coreOffer: "personal training" },
    }
  );
  check("fitness language is present", /gym|fitness|trainer|workout/.test(text));
}

console.log("\n=== software that sells subscriptions is not a shop ===");
{
  const text = await reportFor(
    {
      biz_name: "Ledgerly",
      biz_industry: "SaaS / Software",
      biz_offer: "invoicing app",
      biz_customer_model: "Membership / subscription",
      platforms: ["linkedin"],
    },
    {
      identity: { name: "Ledgerly" },
      market: { industry: "SaaS / Software" },
      offering: { coreOffer: "invoicing app" },
    }
  );
  check("no gym language", !/workout|trainer/.test(text));
  check("no walk-in shop language", !/walk-in counter|shelf stock/.test(text));
}

rmSync(root, { recursive: true, force: true });

if (failures) {
  console.log(`\n${failures} CLASSIFICATION CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL CLASSIFICATION CHECKS PASSED\n");
