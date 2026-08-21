/**
 * Run: npm run test:summary
 *
 * The opening screen has one job: sound like somebody who read the form.
 *
 * The rule it must never break is the owner's: never invent a business fact.
 * A missing answer gets named as missing. It does not get filled in.
 */
import { buildBusinessSummary } from "../functions/api/engine/businessSummary.js";

let failures = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const TUITION = {
  businessName: "floreo",
  businessType: "training centre",
  parentCategory: "education",
  productsOrServices: "class plan package",
  audience: "Parents & families",
  differentiator: "Niche expertise",
  city: "Kochi",
  customerAction: "WhatsApp for batch details",
  platforms: ["instagram"],
};

console.log("\n=== it reads back what they told us, in one line ===");
{
  const out = buildBusinessSummary({
    context: TUITION,
    rawBiz: { biz_stage: "running", biz_ticket: "₹2,000-₹10,000", biz_followers: "2,000 - 10,000" },
    diagnostics: { scores: [] },
  });
  check("the trade matches the industry they ticked", /training centre/.test(out.inOneMinute.what_you_do), out.inOneMinute.what_you_do);
  check("it is NOT called a professional service", !/professional service/i.test(out.inOneMinute.what_you_do));
  check("it names who they serve", /parents/i.test(out.inOneMinute.who_you_serve), out.inOneMinute.who_you_serve);
  check("no ticked-box pipe reaches the page", !JSON.stringify(out).includes(" | "));
  check("their own numbers are read back", out.inOneMinute.current_situation.some(line => line.includes("₹2,000-₹10,000")));
}

console.log("\n=== it goes deeper than the product ===");
{
  const out = buildBusinessSummary({ context: TUITION, rawBiz: {}, diagnostics: { scores: [] } });
  check("what they sell and what is bought are different", out.whatToSell.you_are_selling !== out.whatToSell.customers_are_really_buying);
  check("the outcome is about the person, not the class", /confidence|result/i.test(out.whatToSell.customers_are_really_buying), out.whatToSell.customers_are_really_buying);
  check("and it says what to do with that", out.whatToSell.so_your_marketing_should.length > 20);
}

console.log("\n=== the message lines are usable and specific ===");
{
  const out = buildBusinessSummary({ context: TUITION, rawBiz: {}, diagnostics: { scores: [] } });
  const m = out.yourMessage;
  check("the main message names the business", /floreo/i.test(m.main_message), m.main_message);
  check("it names the audience", /parents/i.test(m.main_message));
  check("the headline says what and for whom", /class plan package/i.test(m.website_headline) && /parents/i.test(m.website_headline), m.website_headline);
  check("the bio ends with a real next step", /whatsapp/i.test(m.instagram_bio), m.instagram_bio.split("\\n").pop());
  for (const banned of ["unlock your potential", "transform your business", "next level", "take your growth"]) {
    check(`no filler: "${banned}"`, !JSON.stringify(m).toLowerCase().includes(banned));
  }
}

console.log("\n=== a gap is named, never filled in ===");
{
  // platforms cleared too: one channel is a real fact about them, so naming it
  // as the opportunity is grounded. This case is "we were told nothing".
  const bare = { ...TUITION, differentiator: "", audience: "", productsOrServices: "", platforms: [] };
  const out = buildBusinessSummary({ context: bare, rawBiz: {}, diagnostics: { scores: [] } });
  check("it admits it cannot describe the business", /do not have enough/i.test(out.inOneMinute.what_you_do), out.inOneMinute.what_you_do);
  check("it asks them to decide the audience", /have not told us/i.test(out.inOneMinute.who_you_serve));
  check("it lists the missing answers by name", out.inOneMinute.we_do_not_know.length >= 3, out.inOneMinute.we_do_not_know.join(", "));
  check("no advantage is invented", /have not told us what makes you different/i.test(out.yourMessage.a_note));
  check("the opportunity is not guessed", /need a bit more/i.test(out.inOneMinute.biggest_opportunity.opportunity), out.inOneMinute.biggest_opportunity.opportunity);
}

console.log("\n=== one channel is a fact, so it counts as grounded ===");
{
  const out = buildBusinessSummary({
    context: { ...TUITION, platforms: ["instagram"] },
    rawBiz: {},
    diagnostics: { scores: [] },
  });
  check(
    "being on one channel is named as the opportunity",
    /instagram/i.test(out.inOneMinute.biggest_opportunity.opportunity),
    out.inOneMinute.biggest_opportunity.opportunity
  );
}

console.log("\n=== the opportunity comes from a fact they gave ===");
{
  const out = buildBusinessSummary({
    context: TUITION,
    rawBiz: { biz_followers: "2,000 - 10,000" },
    diagnostics: { scores: [] },
  });
  check("an audience with nowhere to go is spotted", /nowhere to send them/i.test(out.inOneMinute.biggest_opportunity.opportunity), out.inOneMinute.biggest_opportunity.opportunity);
  check("and it quotes the number they gave", out.inOneMinute.biggest_opportunity.why.includes("2,000 - 10,000"));
}

if (failures) {
  console.log(`\n${failures} SUMMARY CHECK(S) FAILED\n`);
  process.exit(1);
}
console.log("\nALL SUMMARY CHECKS PASSED\n");
