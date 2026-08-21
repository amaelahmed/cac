/**
 * Run: npm run test:library
 *
 * The strategy library stores 551 pieces, every one of them marked quality 5,
 * and the report engine will only use pieces scored 4 or 5. Nothing had ever
 * measured them. When we did, one sentence appeared 240 times across the
 * library with only the trade name swapped - the same defect the report engine
 * had, sitting in the data that feeds it.
 *
 * These checks cover the grader itself: it must catch that, and it must not
 * cry wolf, because a grader that fails everything is as useless as no grader.
 */
import { gradeBlocks, readingGrade, skeleton } from "../scripts/strategy-library/library-grader.mjs";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const block = (id, content, categories = ["bakery"]) => ({
  id, quality_score: 5, category_tags: categories, content_json: content,
});

const GOOD = {
  title: "Make five samples before you ask for orders",
  what_it_means: "People trust a new shop faster when they can see real work.",
  what_to_do: [
    "Make five samples in different styles.",
    "Film a close-up while you make each one.",
    "Post them before you talk about price.",
  ],
  example: "{{businessName}} can show five sample loaves from this week's bake.",
  why_this_helps: "A photo of real work answers more doubts than a price list.",
  how_to_check: "Count how many people ask what it costs after seeing them.",
};

console.log("\n=== a good piece keeps its score ===");
{
  const [row] = gradeBlocks([block("good-1", GOOD)]);
  check("scores 4 or 5", row.score >= 4, `scored ${row.score}: ${row.faults.join("; ")}`);
  check("no faults raised", row.faults.length === 0, row.faults.join("; "));
}

console.log("\n=== the 240x sentence: wording reused across the library ===");
{
  // Twelve pieces for twelve trades, all saying the same thing.
  const trades = ["bakery", "salon", "gym", "cafe", "clinic", "boutique",
    "agency", "florist", "tailor", "garage", "tutor", "plumber"];
  const cloned = trades.map((trade, index) => block(`clone-${index}`, {
    ...GOOD,
    title: `${trade}: make the promise easy to repeat`,
    what_it_means: `${trade} customers want to know what they get before they choose you.`,
    why_this_helps: `This works for a ${trade} because people decide faster when they can see proof and know the next step.`,
    example: `A ${trade} can show one real job from this week.`,
  }, [trade]));
  const graded = gradeBlocks(cloned);
  check(
    "the copies are marked down",
    graded.every(row => row.score < 4),
    `scores: ${[...new Set(graded.map(r => r.score))].join(", ")}`
  );
  check(
    "and the reason names the reuse",
    graded[0].faults.some(fault => /reused/.test(fault)),
    graded[0].faults.join("; ")
  );
}

console.log("\n=== it does not cry wolf ===");
{
  // Twelve genuinely different pieces must all survive.
  const varied = [
    "Photograph the shelf at the same hour each day so people learn when to come.",
    "Write the price on every item so nobody has to ask at the counter.",
    "Film one loaf being cut open and say how long it stays good.",
    "Ask three regulars what they buy every week and post their answer.",
    "Show what sells out first and the hour it usually goes.",
    "Box one order as a gift and show what fits inside it.",
    "Say which day you take orders for a party in advance.",
    "Record the oven timer going off and put the time on screen.",
    "Show the queue at nine in the morning and again at four.",
    "Explain what changes between the morning bake and the evening one.",
    "Post the one thing a first-time buyer should try, and why.",
    "Show how you wrap something so it survives a bus ride home.",
  ].map((line, index) => block(`varied-${index}`, {
    title: line,
    what_it_means: line,
    what_to_do: [line, `Write down what happened on day ${index + 1}.`],
    why_this_helps: `Reason number ${index + 1}: buyers act on what they can see for themselves.`,
    example: `{{businessName}} tried this and got ${index + 3} replies that same day.`,
    how_to_check: `Count the replies on day ${index + 1} and compare with the week before.`,
  }));
  const graded = gradeBlocks(varied);
  const kept = graded.filter(row => row.score >= 4).length;
  check("at least three quarters survive", kept >= 9, `${kept} of 12 kept`);
}

console.log("\n=== the other faults ===");
{
  const [jargon] = gradeBlocks([block("jargon-1", {
    ...GOOD,
    why_this_helps: "This strengthens your positioning and improves the conversion path.",
  })]);
  check("jargon is caught", jargon.faults.some(f => /jargon/.test(f)), jargon.faults.join("; "));

  const [broken] = gradeBlocks([block("broken-1", {
    ...GOOD,
    what_it_means: "bakery customers need explain the one clear promise before they choose you.",
  })]);
  check("broken grammar is caught", broken.faults.some(f => /broken sentence/.test(f)), broken.faults.join("; "));

  const [thin] = gradeBlocks([block("thin-1", { ...GOOD, what_to_do: ["Do one thing."] })]);
  check("a piece with nothing to do is caught", thin.faults.some(f => /two things/.test(f)), thin.faults.join("; "));

  // A real draft came back answering "why does this help?" by pasting back what
  // it had already said the thing means. It filled the slot and added nothing.
  const echoed = "People trust a new shop faster when they can see real work.";
  const [echo] = gradeBlocks([block("echo-1", {
    ...GOOD, what_it_means: echoed, why_this_helps: echoed,
  })]);
  check("a piece repeating itself is caught", echo.faults.some(f => /same sentence twice/.test(f)), echo.faults.join("; "));

  // "Check Instagram to see if the special has been posted" checks that you did
  // the task, not whether it was worth doing.
  const [hollow] = gradeBlocks([block("hollow-1", {
    ...GOOD, how_to_check: "Check Instagram to see if the daily special has been posted.",
  })]);
  check(
    "a check that measures nothing is caught",
    hollow.faults.some(f => /does not measure a result/.test(f)),
    hollow.faults.join("; ")
  );

  // But a real one must still pass.
  const [measured] = gradeBlocks([block("measured-1", {
    ...GOOD, how_to_check: "Count how many people walk in before eight the following week.",
  })]);
  check("a real check is left alone", !measured.faults.some(f => /does not measure/.test(f)), measured.faults.join("; "));
}

console.log("\n=== the reading measure itself ===");
{
  // The bug that made the first version useless: a placeholder counted as one
  // long unpronounceable word, scoring plain English at grade 20.
  const plain = "{{businessName}} will support delivery and pickup around {{deliveryArea}}.";
  check(
    "placeholders do not make plain English look hard",
    readingGrade(plain) < 10,
    `grade ${readingGrade(plain).toFixed(1)}`
  );
  const dense = "Turn one doubt about price, timing, quality, or safety into a public answer using portfolio samples, editing before after, package clarity, and delivery proof.";
  check("a genuine run-on is still caught", readingGrade(dense) > 12, `grade ${readingGrade(dense).toFixed(1)}`);
  check(
    "swapping the trade name reveals the same sentence",
    skeleton("This works for a bakery because people decide faster.", ["bakery"])
      === skeleton("This works for a salon because people decide faster.", ["salon"])
  );
}

if (failures) {
  console.log(`\n${failures} LIBRARY GRADER CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL LIBRARY GRADER CHECKS PASSED\n");
