/**
 * Run: npm run test:failover
 *
 * One provider going quiet used to take the whole product with it: a bad hour
 * at NVIDIA dropped every customer to the offline template at the same moment,
 * even with a working Gemini key sitting in the environment.
 *
 * These checks cover which providers get tried, and in what order.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "cac-failover-"));
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const { buildProviderOrder, callControlledAi } = await import(
  pathToFileURL(join(root, "utils", "controlled-ai.js")).href
);

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const BOTH_KEYS = { NVIDIA_NIM_API_KEY: "nv", GEMINI_API_KEY: "gm" };

console.log("\n=== both providers configured: the other one is the safety net ===");
check(
  "nvidia first, gemini second",
  same(buildProviderOrder("nvidia_nim", BOTH_KEYS), ["nvidia_nim", "gemini"]),
  JSON.stringify(buildProviderOrder("nvidia_nim", BOTH_KEYS))
);
check(
  "gemini first, nvidia second",
  same(buildProviderOrder("gemini", BOTH_KEYS), ["gemini", "nvidia_nim"]),
  JSON.stringify(buildProviderOrder("gemini", BOTH_KEYS))
);

console.log("\n=== only one key: never try a provider we cannot authenticate ===");
check(
  "no gemini key means no gemini attempt",
  same(buildProviderOrder("nvidia_nim", { NVIDIA_NIM_API_KEY: "nv" }), ["nvidia_nim"])
);
check(
  "no nvidia key means no nvidia attempt",
  same(buildProviderOrder("gemini", { GEMINI_API_KEY: "gm" }), ["gemini"])
);
check(
  "GOOGLE_API_KEY counts as a gemini key",
  same(buildProviderOrder("nvidia_nim", { NVIDIA_NIM_API_KEY: "nv", GOOGLE_API_KEY: "gm" }),
    ["nvidia_nim", "gemini"])
);

console.log("\n=== the escape hatch ===");
check(
  "AI_PROVIDER_FAILOVER=false goes back to one attempt",
  same(buildProviderOrder("nvidia_nim", { ...BOTH_KEYS, AI_PROVIDER_FAILOVER: "false" }),
    ["nvidia_nim"])
);
check(
  "any other value keeps failover on",
  same(buildProviderOrder("nvidia_nim", { ...BOTH_KEYS, AI_PROVIDER_FAILOVER: "true" }),
    ["nvidia_nim", "gemini"])
);

console.log("\n=== the chosen provider is always tried first ===");
for (const primary of ["nvidia_nim", "gemini"]) {
  check(
    `${primary} stays first`,
    buildProviderOrder(primary, BOTH_KEYS)[0] === primary
  );
}
check(
  "a provider is never tried twice",
  new Set(buildProviderOrder("nvidia_nim", BOTH_KEYS)).size === 2
);

// --- the failover actually happening ----------------------------------------

const AI_ENV = {
  env: {
    AI_PROVIDER: "nvidia_nim",
    NVIDIA_NIM_API_KEY: "nv",
    GEMINI_API_KEY: "gm",
  },
};
const FALLBACK = { offline: true };
const good = provider => async () => ({
  json: { from: provider }, text: "", usage: { prompt_tokens: 1, completion_tokens: 1 }, model: `${provider}-model`,
});
const broken = message => async () => { throw new Error(message); };

async function run(callers) {
  const calls = [];
  const wrap = (name, fn) => async (args) => { calls.push(name); return fn(args); };
  const result = await callControlledAi(AI_ENV, {
    userId: "u1", featureType: "test", sectionName: "s", promptVersion: "v1",
    businessProfile: {}, messages: [{ role: "user", content: "hi" }],
    fallback: FALLBACK,
    callers: {
      nvidia_nim: wrap("nvidia_nim", callers.nvidia_nim),
      gemini: wrap("gemini", callers.gemini),
    },
  });
  return { result, calls };
}

console.log("\n=== the first provider fails, the second one saves it ===");
{
  const { result, calls } = await run({ nvidia_nim: broken("503 upstream"), gemini: good("gemini") });
  check("the customer still gets a real answer", result.ok === true, result.error || "");
  check("it came from the backup", result.provider === "gemini", String(result.provider));
  check("both were tried, in order", same(calls, ["nvidia_nim", "gemini"]), JSON.stringify(calls));
  check("the handover is visible to the caller", result.failedOverFrom === "nvidia_nim");
  check("the offline template was not used", result.data?.offline !== true);
}

console.log("\n=== the first provider works: the second is never touched ===");
{
  const { result, calls } = await run({ nvidia_nim: good("nvidia_nim"), gemini: good("gemini") });
  check("answered by the primary", result.ok === true && result.provider === "nvidia_nim");
  check("the backup was not called", same(calls, ["nvidia_nim"]), JSON.stringify(calls));
  check("no handover reported", result.failedOverFrom === undefined);
}

console.log("\n=== both are down: fall back, and say what was tried ===");
{
  const { result, calls } = await run({ nvidia_nim: broken("503"), gemini: broken("429") });
  check("falls back to the offline plan", result.ok === false && result.data === FALLBACK);
  check("both were attempted", same(calls, ["nvidia_nim", "gemini"]), JSON.stringify(calls));
  check("the attempts are recorded", same(result.providersTried, ["nvidia_nim", "gemini"]));
  check("the last error is kept for the logs", String(result.error).includes("429"), String(result.error));
}

console.log("\n=== bad JSON counts as a failure worth failing over ===");
{
  // A model that answers with prose where JSON was asked for is no more usable
  // than one that is down.
  const prose = async () => ({ json: null, text: "Sure! Here is your plan...", usage: {}, model: "x" });
  const { result, calls } = await run({ nvidia_nim: prose, gemini: good("gemini") });
  check("the second provider is tried", same(calls, ["nvidia_nim", "gemini"]), JSON.stringify(calls));
  check("and its answer is used", result.ok === true && result.provider === "gemini");
}

rmSync(root, { recursive: true, force: true });

if (failures) {
  console.log(`\n${failures} FAILOVER CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL FAILOVER CHECKS PASSED\n");
