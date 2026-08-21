/**
 * AI quota regression test.
 *
 * Run: npm run test:quota
 *
 * A report is not one AI call. A full generation makes one master-strategy call
 * plus one call per ten calendar days, so about five. The shipped limits were
 * 25 calls a day across EVERY user combined, and 3 calls per user - so a paying
 * customer could not finish a single report, and the whole account ran dry after
 * five reports no matter how many people had paid.
 *
 * These checks fail the build if either number drifts back to a value that
 * cannot serve a paying customer.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "cac-quota-"));
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const load = name => import(pathToFileURL(join(root, "utils", name)).href);
const { getRuntimeEnv } = await load("get-env.js");
const { countAiUsageToday } = await load("ai-cache.js");

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

// Keep in step with AI_CALLS_PER_REPORT in functions/api/utils/controlled-ai.js.
const CALLS_PER_REPORT = 5;

console.log("\n=== the shipped defaults must be able to serve a paying customer ===");
// process.env leaks into getRuntimeEnv, so clear anything the shell set.
delete process.env.AI_DAILY_USER_LIMIT;
delete process.env.AI_DAILY_GLOBAL_LIMIT;
const env = getRuntimeEnv({});
const userLimit = Number(env.AI_DAILY_USER_LIMIT);
const globalLimit = Number(env.AI_DAILY_GLOBAL_LIMIT);

check(
  "one customer can finish at least one whole report a day",
  userLimit >= CALLS_PER_REPORT,
  `${userLimit} calls allowed, a report needs ${CALLS_PER_REPORT}`
);
check(
  "one customer can regenerate a few times a day",
  userLimit >= CALLS_PER_REPORT * 3,
  `${userLimit} calls is ${Math.floor(userLimit / CALLS_PER_REPORT)} reports a day`
);
// The ceiling exists to catch a runaway bug, so it has to sit far above real
// use. At 10,000 subscribers making one report each, that is 50,000 calls.
check(
  "the account ceiling is above real subscriber traffic",
  globalLimit === 0 || globalLimit >= 10000 * CALLS_PER_REPORT,
  `${globalLimit} calls; 10,000 customers making one report each need ${10000 * CALLS_PER_REPORT}`
);

console.log("\n=== the account-wide tally is skippable ===");
// That COUNT runs on every AI call. When no ceiling is set there is nothing to
// compare it against, so it must not be paid for.
let globalQueries = 0;
const fakeDb = {
  prepare(sql) {
    if (/FROM ai_usage_logs/.test(sql) && !/uid = \?/.test(sql)) globalQueries += 1;
    return {
      bind: () => ({ first: async () => ({ count: 0 }) }),
      first: async () => ({ count: 0 }),
    };
  },
};

await countAiUsageToday(fakeDb, { userId: "u1", skipGlobal: true });
check("skipGlobal runs no account-wide query", globalQueries === 0, `${globalQueries} ran`);

globalQueries = 0;
await countAiUsageToday(fakeDb, { userId: "u1" });
check("the query still runs when a ceiling is enforced", globalQueries === 1, `${globalQueries} ran`);

rmSync(root, { recursive: true, force: true });

if (failures) {
  console.log(`\n${failures} QUOTA CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL QUOTA CHECKS PASSED\n");
