/**
 * Run: npm run test:nextsteps
 *
 * The owner must never finish the report thinking "okay... but what do I
 * actually DO?".
 *
 * The trap this guards against: the report names a problem and then recommends
 * something else. A business with no website was being told to publish a post
 * about what competitors hide. The advice has to repair the thing just named.
 */
import { buildNextSteps } from "../functions/api/engine/nextSteps.js";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const NO_WEBSITE = {
  scores: [
    {
      id: "findability",
      label: "Can a new customer find you?",
      score: 20,
      band: "Weak",
      plain_meaning: "Only people you personally tell can find you.",
      caveat: "Every check here came from what you typed in.",
      failed: [
        { question: "Do you have a website a stranger can open?", evidence: "No website address was given in your brief.", fixes: "website_basic" },
        { question: "Are you findable in more than one place?", evidence: "You are only on instagram.", fixes: "second_channel" },
      ],
      not_checked: [],
    },
    { id: "clarity", label: "Can they tell what you sell?", score: 80, band: "Solid", plain_meaning: "Clear enough.", failed: [], not_checked: [] },
  ],
};
const CONTENT_STEPS = [
  { title: "Highlight the detail competitors usually hide", because: "We could not check this one.", effort: "About 15 minutes", money: "Free", fixes_checks: [], target: { watch: "Enquiries" } },
];

console.log("\n=== the advice repairs the problem the report just named ===");
{
  const out = buildNextSteps({ diagnostics: NO_WEBSITE, rankedSteps: CONTENT_STEPS, headline: {} });
  check(
    "no website means the one thing is to make one",
    /website/i.test(out.oneThing.action),
    out.oneThing.action
  );
  check(
    "it is NOT a content post",
    !/highlight the detail/i.test(out.oneThing.action),
    out.oneThing.action
  );
  check("it says why, in plain words", out.oneThing.why_it_matters.length > 20, out.oneThing.why_it_matters);
  check("it gives concrete steps", out.oneThing.what_to_do.length >= 2, `${out.oneThing.what_to_do.length} steps`);
  check("it says what success looks like", Boolean(out.oneThing.what_success_looks_like));
  check("and points at the evidence it used", /no website address/i.test(out.oneThing.based_on), out.oneThing.based_on);
}

console.log("\n=== the biggest problem is the weakest MEASURED area ===");
{
  const out = buildNextSteps({ diagnostics: NO_WEBSITE, rankedSteps: CONTENT_STEPS, headline: {} });
  check("it picks findability, not the solid area", out.biggestProblem.problem === "Can a new customer find you?", out.biggestProblem.problem);
  check("it quotes what is actually wrong", out.biggestProblem.what_is_wrong.length === 2);
  check("every fix repairs a failed check", out.biggestProblem.what_to_do.slice(0, 2).every(a => /website|find you/i.test(`${a.action} ${a.why}`)));
  check("only one problem is named, not twenty", typeof out.biggestProblem.problem === "string");
}

console.log("\n=== the week is short, ordered, and never repeats itself ===");
{
  const out = buildNextSteps({ diagnostics: NO_WEBSITE, rankedSteps: CONTENT_STEPS, headline: {} });
  check("seven at most", out.next7Days.length <= 7, `${out.next7Days.length} actions`);
  check("repairs come before content", /website/i.test(out.next7Days[0].action), out.next7Days[0].action);
  check("every action says why", out.next7Days.every(item => item.why && item.why.length > 10));
  check("nothing appears twice", new Set(out.next7Days.map(i => i.action)).size === out.next7Days.length);
  check("they are numbered", out.next7Days.every((item, index) => item.order === index + 1));
}

console.log("\n=== nothing measurable: say so, do not invent ===");
{
  const out = buildNextSteps({
    diagnostics: { scores: [{ id: "findability", label: "Can a new customer find you?", score: null, band: "Not checked", failed: [], not_checked: [{ question: "Do you have a website?", why: "Nothing to read." }] }] },
    rankedSteps: [],
    headline: {},
  });
  check("it admits it could not measure", /could not measure/i.test(out.biggestProblem.problem), out.biggestProblem.problem);
  check("it asks for what is missing instead of guessing", /website/i.test(out.biggestProblem.what_to_do.join(" ")));
  check("the one thing becomes: give us more to work with", /run this again|website/i.test(out.oneThing.action), out.oneThing.action);
  check("no fake week is produced", out.next7Days.length === 0);
}

if (failures) {
  console.log(`\n${failures} NEXT-STEP CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL NEXT-STEP CHECKS PASSED\n");
