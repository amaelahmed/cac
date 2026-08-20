/**
 * Calendar expander tests.  Run: npm run test:calendar
 *
 * The degradation paths matter more than the happy path here: with
 * AI_DAILY_GLOBAL_LIMIT in play, most generations will hit a refusal partway
 * through. A rejected slice must cost ten days, never thirty.
 */
import { mkdtempSync, cpSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "cac-cal-"));
cpSync("functions/api/engine", join(root, "engine"), { recursive: true });
cpSync("functions/api/utils", join(root, "utils"), { recursive: true });
writeFileSync(join(root, "package.json"), '{"type":"module"}');
const { expandCalendarWithAi, validateSlice, mergeDay } =
  await import(pathToFileURL(join(root, "engine", "calendarExpander.js")).href);

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const ruleDay = n => ({
  day: n, platform: "Instagram", post_type: "Reel",
  title: `rule topic ${n}`, topic: `rule topic ${n}`,
  customer_objection: "They need proof.", target_customer: "Buyer",
  marketing_psychology: "Proof", when_to_do_this: "Morning",
  caption: `rule caption ${n}`, customer_action: "Message us",
});
const master = {
  content_calendar_30_days: Array.from({ length: 30 }, (_, i) => ruleDay(i + 1)),
  content_pillars: [{ pillar: "Proof", proof_needed: "Photos" }],
  customer_objections: [{ objection: "Too costly?", answer: "Show range" }],
  target_personas: [{ name: "Buyer", need: "Trust" }],
};
const goodDay = n => ({
  day: n, topic: `real topic ${n}`, hook: `a different hook ${n}`,
  what_to_show: `show ${n}`, caption: `caption ${n}`,
  customer_action: `action ${n}`, why_this_helps: `why ${n}`,
});
const okSlice = (s, e) => ({ ok: true, cached: false, data: { days: Array.from({ length: e - s + 1 }, (_, i) => goodDay(s + i)) } });

console.log("\n=== validation rejects what the branch just fixed ===");
check("hook repeating topic is rejected",
  !validateSlice([{ ...goodDay(1), hook: "Real Topic 1" }], { startDay: 1, endDay: 1 }).ok);
check("missing field is rejected",
  !validateSlice([{ ...goodDay(1), caption: "" }], { startDay: 1, endDay: 1 }).ok);
check("wrong day count is rejected",
  !validateSlice([goodDay(1)], { startDay: 1, endDay: 10 }).ok);
check("banned jargon is rejected",
  !validateSlice([{ ...goodDay(1), caption: "We leverage synergy" }], { startDay: 1, endDay: 1 }).ok);
check("duplicate topic inside a slice is rejected",
  !validateSlice([goodDay(1), { ...goodDay(2), topic: "real topic 1" }], { startDay: 1, endDay: 2 }).ok);
check("topic already used by an earlier slice is rejected",
  !validateSlice([goodDay(11)], { startDay: 11, endDay: 11, seenTopics: new Set(["real topic 11"]) }).ok);
check("a clean slice is accepted", validateSlice([goodDay(1), goodDay(2)], { startDay: 1, endDay: 2 }).ok);

console.log("\n=== merge keeps structure, takes copy ===");
const merged = mergeDay(ruleDay(3), goodDay(3));
check("structural fields survive", merged.platform === "Instagram" && merged.post_type === "Reel");
check("copy is replaced", merged.topic === "real topic 3" && merged.caption === "caption 3");
check("aliases stay consistent", merged.customerAction === merged.customer_action && merged.ready_caption === merged.caption);
check("provenance recorded", merged._source === "ai_expanded");

console.log("\n=== all three slices succeed ===");
let calls = 0;
let out = await expandCalendarWithAi({}, {
  masterStrategy: structuredClone(master),
  callAi: async (_ctx, { sectionName }) => {
    calls += 1;
    const [s, e] = sectionName.match(/\d+/g).map(Number);
    return okSlice(s, e);
  },
});
check("three AI calls, one per slice", calls === 3, `${calls}`);
check("all 30 days replaced", out.days.every(d => d._source === "ai_expanded"));
check("telemetry counts slices", out.telemetry.calendar_slices_accepted === 3);

console.log("\n=== quota exhausted partway: keep the deterministic remainder ===");
out = await expandCalendarWithAi({}, {
  masterStrategy: structuredClone(master),
  callAi: async (_ctx, { sectionName }) => {
    const [s, e] = sectionName.match(/\d+/g).map(Number);
    return s === 1 ? okSlice(s, e) : { ok: false, limited: true };
  },
});
check("days 1-10 are AI", out.days.slice(0, 10).every(d => d._source === "ai_expanded"));
check("days 11-30 fall back to the plan", out.days.slice(10).every(d => d._source !== "ai_expanded"));
check("still exactly 30 days", out.days.length === 30);
check("limit is reported", out.telemetry.calendar_limited === true);

console.log("\n=== a malformed slice costs ten days, not thirty ===");
out = await expandCalendarWithAi({}, {
  masterStrategy: structuredClone(master),
  callAi: async (_ctx, { sectionName }) => {
    const [s, e] = sectionName.match(/\d+/g).map(Number);
    return s === 11 ? { ok: true, data: { days: [{ day: 11 }] } } : okSlice(s, e);
  },
});
check("bad slice rejected, neighbours kept",
  out.days[0]._source === "ai_expanded" && out.days[10]._source !== "ai_expanded" && out.days[20]._source === "ai_expanded");
check("rejection reason recorded", out.telemetry.calendar_reject_reasons.length === 1,
  out.telemetry.calendar_reject_reasons[0] || "");

console.log("\n=== a thrown error never breaks the calendar ===");
out = await expandCalendarWithAi({}, {
  masterStrategy: structuredClone(master),
  callAi: async () => { throw new Error("network down"); },
});
check("30 deterministic days returned", out.days.length === 30 && out.days.every(d => d._source !== "ai_expanded"));
check("no slice accepted", out.telemetry.calendar_slices_accepted === 0);

console.log("\n=== disabled by flag makes no calls ===");
calls = 0;
out = await expandCalendarWithAi({}, {
  masterStrategy: structuredClone(master), enabled: false,
  callAi: async () => { calls += 1; return okSlice(1, 10); },
});
check("no AI calls when disabled", calls === 0 && out.days.length === 30);

rmSync(root, { recursive: true, force: true });
console.log(`\n${failures === 0 ? "ALL CALENDAR EXPANDER CHECKS PASSED" : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
