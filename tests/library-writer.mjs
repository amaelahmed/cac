/**
 * Run: npm run test:writer
 *
 * The writer's whole job is to be refused. The previous generator wrote 500
 * pieces into the library with nobody checking, and one of its sentences now
 * appears 240 times. So the only thing worth testing hard is the gate: does
 * filler get thrown away, and does genuinely specific writing survive?
 *
 * No API key and no network. The model's answer is supplied directly.
 */
import { tiredSentences, buildPrompt, toBlock, judgeDrafts }
  from "../scripts/strategy-library/write-blocks.mjs";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

// A small stand-in library carrying the same disease as the real one: one
// sentence repeated across many trades with only the trade name swapped.
const WORN = "This works for a TRADE because people decide faster when they can see proof and know the next step.";
const LIBRARY = ["salon", "gym", "cafe", "clinic", "boutique", "garage", "florist", "tutor"]
  .map((trade, index) => ({
    id: `old-${index}`,
    quality_score: 5,
    category_tags: [trade],
    content_json: {
      title: `${trade}: make the promise easy to repeat`,
      what_it_means: `${trade} customers want to know what they get before they choose you.`,
      what_to_do: ["Write one line about what you sell.", "Put it in your bio.", "Say it again in replies."],
      example: `A ${trade} can show one real job from this week.`,
      why_this_helps: WORN.replace("TRADE", trade),
      how_to_check: "Count how many people ask the right next question.",
    },
  }));

console.log("\n=== it knows which sentences are worn out ===");
{
  const tired = tiredSentences(LIBRARY);
  check("it finds the repeated line", tired.length > 0, `${tired.length} found`);
  check(
    "and reports how many times it was used",
    tired[0]?.count === LIBRARY.length,
    `counted ${tired[0]?.count}`
  );
}

console.log("\n=== the model is told what not to write ===");
{
  const tired = tiredSentences(LIBRARY);
  const { user, system } = buildPrompt("bakery", 3, tired);
  check("the trade is named", user.includes("bakery"));
  check("the worn-out line is shown as banned", user.includes("already used"));
  check("plain English is demanded", /no marketing words/i.test(system));
  check("it asks for detail true only of this trade", /physical/i.test(system));
  check("three pieces are requested", /1\..*\n.*2\..*\n.*3\./s.test(user));
}

console.log("\n=== filler is thrown away ===");
{
  // Exactly what the old generator produced: the library's own sentence, with
  // the trade name changed.
  const filler = [1, 2, 3].map((n, index) => toBlock({
    section_type: "first_priority",
    title: "bakery: make the promise easy to repeat",
    what_it_means: "bakery customers want to know what they get before they choose you.",
    what_to_do: ["Write one line about what you sell.", "Put it in your bio.", "Say it again in replies."],
    example: "A bakery can show one real job from this week.",
    why_this_helps: WORN.replace("TRADE", "bakery"),
    how_to_check: "Count how many people ask the right next question.",
  }, "bakery", index));

  const { kept, rejected } = judgeDrafts(filler, LIBRARY);
  check("nothing is kept", kept.length === 0, `${kept.length} kept`);
  check("everything is refused", rejected.length === filler.length);
  check(
    "and the reason is the reused wording",
    rejected[0]?.faults.some(fault => /reused/.test(fault)),
    rejected[0]?.faults.join("; ")
  );
}

console.log("\n=== writing that is actually about a bakery survives ===");
{
  const real = [
    {
      section_type: "first_priority",
      title: "Put the batch times on a board by the door",
      what_it_means: "People come at the wrong hour and find empty shelves, then stop coming back.",
      what_to_do: [
        "Write the two times your oven finishes on a small board.",
        "Stand it where people queue, not behind the counter.",
        "Take one photo of it and post that photo.",
      ],
      example: "{{businessName}} can write 7am and 3pm on a board by the door in {{location}}.",
      why_this_helps: "Someone who knows when the bread lands will plan their walk around it.",
      how_to_check: "See whether the queue grows in the ten minutes before each batch.",
    },
    {
      section_type: "customer_question",
      title: "Answer how long the loaf keeps before they ask",
      what_it_means: "Sourdough goes hard faster than shop bread, and buyers get caught out once and never return.",
      what_to_do: [
        "Cut a two-day-old loaf open on camera.",
        "Say plainly how it should be stored, and in what.",
        "Put that answer on a card beside the bread.",
      ],
      example: "{{businessName}} can film one loaf on day one and the same loaf on day three.",
      why_this_helps: "Being honest about day three stops the one bad experience that loses a regular.",
      how_to_check: "Count how many people stop asking at the counter after the card goes up.",
    },
  ].map((piece, index) => toBlock(piece, "bakery", index));

  const { kept, rejected } = judgeDrafts(real, LIBRARY);
  check(
    "both are kept",
    kept.length === 2,
    rejected.map(row => `${row.title}: ${row.faults.join("; ")}`).join(" | ")
  );
  check("they are marked 4 or better", kept.every(block => block.quality_score >= 4));
}

console.log("\n=== the saved shape is a real library piece ===");
{
  const block = toBlock({
    section_type: "measurement",
    title: "Count the loaves left at four o'clock",
    what_it_means: "The number left at four tells you whether you baked the right amount.",
    what_to_do: ["Count what is left at four.", "Write it down.", "Compare it on Friday."],
    example: "{{businessName}} counts eight left on Tuesday and two on Saturday.",
    why_this_helps: "Baking to the real number stops waste without emptying the shelf early.",
    how_to_check: "Watch whether the leftover count settles down over two weeks.",
  }, "artisan bakery", 0);

  for (const field of ["id", "title", "domain", "section_type", "content_json",
    "category_tags", "quality_score", "active", "version"]) {
    check(`has ${field}`, block[field] !== undefined);
  }
  check("the trade becomes a usable tag", block.category_tags[0] === "artisan_bakery", block.category_tags[0]);
  check("it does not arrive claiming to be perfect", block.quality_score < 4, String(block.quality_score));
  check("the three steps survive", block.content_json.what_to_do.length === 3);
}

if (failures) {
  console.log(`\n${failures} LIBRARY WRITER CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL LIBRARY WRITER CHECKS PASSED\n");
