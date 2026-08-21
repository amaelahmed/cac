/**
 * Run: npm run test:plan
 *
 * Guards the rule that a paying customer never waits on the AI when the AI can
 * be run after the response instead.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// These are ESM files under a CommonJS package, so mirror them into a temp dir
// that declares {"type":"module"}, as the other engine tests do.
const root = mkdtempSync(join(tmpdir(), "cac-plan-"));
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const { planGeneration } = await import(
  pathToFileURL(join(root, "utils", "generation-plan.js")).href
);

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

console.log("\n=== the normal case: nobody waits for the AI ===");
const normal = planGeneration({ forceRuleBased: false, forceAiFailure: false, env: {}, canDeferWork: true });
check("AI still runs", normal.wantsAi);
check("it runs after the response", normal.background);
check("the customer is not made to wait", !normal.blocking);
check("the first report says more is coming", normal.initialStatus === "running", normal.initialStatus);

console.log("\n=== no way to defer: do the work rather than lose it ===");
const noDefer = planGeneration({ forceRuleBased: false, forceAiFailure: false, env: {}, canDeferWork: false });
check("falls back to waiting", noDefer.blocking);
check("nothing is scheduled for later", !noDefer.background);
check("the report does not promise an update", noDefer.initialStatus === "skipped", noDefer.initialStatus);

console.log("\n=== rules-only and the AI kill switch ===");
for (const [label, plan] of [
  ["rules_only", planGeneration({ forceRuleBased: true, forceAiFailure: false, env: {}, canDeferWork: true })],
  ["forced AI failure", planGeneration({ forceRuleBased: false, forceAiFailure: true, env: {}, canDeferWork: true })],
]) {
  check(`${label}: no AI at all`, !plan.wantsAi);
  check(`${label}: nothing scheduled`, !plan.background);
  check(`${label}: no wait`, !plan.blocking);
  check(`${label}: no update promised`, plan.initialStatus === "skipped");
}

console.log("\n=== the escape hatch ===");
// If deferring ever misbehaves on the platform, this turns it off without a deploy.
const off = planGeneration({
  forceRuleBased: false, forceAiFailure: false,
  env: { BACKGROUND_AI_ENRICHMENT: "false" }, canDeferWork: true,
});
check("BACKGROUND_AI_ENRICHMENT=false restores blocking AI", off.blocking && !off.background);

rmSync(root, { recursive: true, force: true });

if (failures) {
  console.log(`\n${failures} GENERATION PLAN CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL GENERATION PLAN CHECKS PASSED\n");
