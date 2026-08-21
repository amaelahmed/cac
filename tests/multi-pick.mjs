/**
 * Run: npm run test:picks
 *
 * The intake form lets people tick several boxes and joins the ticks with
 * " | ". A real report went out reading:
 *
 *   "Week 5: tighten the owner workflow behind Better quality | Better price /"
 *
 * A paying customer seeing that asks for their money back. These checks are
 * the real strings from that report.
 */
import { onePick, splitPicks, collapsePickLists } from "../functions/api/engine/multiPick.js";
import { normalizeBusinessContext } from "../functions/api/engine/marketingIntelligence.js";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

// The exact answer that produced the broken report.
const USP = "Better quality | Better price / value | Faster service | More convenient | Better customer care | Niche expertise | Unique product feature";
const AUDIENCE = "Parents & families | Young professionals";
const OFFER = "Consultation | class plan package";

console.log("\n=== one tick goes in a sentence, not all of them ===");
check("a ticked list is split", splitPicks(USP).length === 7, String(splitPicks(USP).length));
check(
  "the pick that narrows them down leads",
  onePick(USP) === "Niche expertise",
  onePick(USP)
);
check(
  "all-generic ticks keep their own order",
  onePick("Better quality | Faster service") === "Better quality",
  onePick("Better quality | Faster service")
);
check("a single answer is untouched", onePick("Founder-led trust") === "Founder-led trust");
check("nothing ticked falls back", onePick("", "a better result") === "a better result");
check("no pipe survives", !onePick(AUDIENCE).includes("|"), onePick(AUDIENCE));

console.log("\n=== the safety net, on the real broken lines ===");
const broken = [
  "Week 5: tighten the owner workflow behind Better quality | Better price /",
  "Frame day-one fitness as possible for office workers, built around better quality | Better price / value | Faster service | More convenient | Better",
  "Record the no-pressure trial route for beginners, so better quality | Better price / value | Faster service | More convenient | Better is the reason to act",
];
for (const line of broken) {
  const fixed = collapsePickLists(line, [USP, AUDIENCE, OFFER]);
  check(`no pipes left: "${fixed.slice(0, 52)}..."`, !fixed.includes("|"), fixed);
  check("and it still reads as a sentence", fixed.split(/\s+/).length >= 6, fixed);
}
check(
  "the tail is cut, the head is kept",
  collapsePickLists(broken[1], [USP]) === "Frame day-one fitness as possible for office workers, built around better quality",
  collapsePickLists(broken[1], [USP])
);
check(
  "text after the list survives",
  collapsePickLists(broken[2], [USP]).endsWith("is the reason to act"),
  collapsePickLists(broken[2], [USP])
);

console.log("\n=== it only touches lists the form actually sent ===");
check(
  "an unrelated pipe is left alone",
  collapsePickLists("a || b and c | d", [USP]) === "a || b and c | d",
  collapsePickLists("a || b and c | d", [USP])
);
check(
  "no ticked lists means no edits",
  collapsePickLists("built around Better quality | Faster service", []) === "built around Better quality | Faster service"
);

console.log("\n=== the whole context, built from a ticked-everything brief ===");
{
  const context = normalizeBusinessContext(
    {},
    {
      biz_name: "floreo",
      biz_usp: USP,
      biz_audience: AUDIENCE,
      biz_offer: OFFER,
      biz_personality: "Warm | Bold",
      biz_industry: "Healthcare / Wellness",
    }
  );
  for (const field of ["differentiator", "audience", "productsOrServices", "tone"]) {
    check(`${field} carries no pipe`, !String(context[field]).includes("|"), String(context[field]));
  }
  check(
    "the full ticked lists are still kept for the diagnostic",
    context.pickLists.includes(USP),
    `${context.pickLists.length} lists kept`
  );
}

if (failures) {
  console.log(`\n${failures} PICK CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL PICK CHECKS PASSED\n");
