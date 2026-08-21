// The first screen should read like somebody who listened.
//
// Three things the report never said out loud:
//   1. Your business in one minute - what you do, who for, and what people are
//      really buying when they buy it.
//   6. What you should sell - the product is not the thing being bought.
//  10. Your marketing message - lines the owner can copy today.
//
// Everything here is built from the form answers. Where an answer is missing
// this says so by name, because a confident sentence built on nothing is worse
// than an admission.

const MISSING = "";

function text(value, fallback = MISSING) {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return fallback;
  // Placeholders the form and older payloads send when nothing was chosen.
  if (/^(any|n\/?a|none|na|-|nil|no|not sure|other)$/i.test(cleaned)) return fallback;
  return cleaned;
}

function lower(value) {
  const cleaned = text(value);
  return cleaned ? cleaned.charAt(0).toLowerCase() + cleaned.slice(1) : "";
}

function sentence(value) {
  const cleaned = text(value);
  if (!cleaned) return "";
  const capped = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
}

// What people are actually buying when they buy this. Not the product - the
// thing that changes for them. Keyed on the industry the owner ticked, so it
// moves with their answer rather than with a word we spotted somewhere.
const REALLY_BUYING = {
  education: "Confidence, and a real chance at the result they are studying for. Nobody wants classes. They want to be someone who can do the thing.",
  healthcare: "Relief, and the reassurance that they are in safe hands. They are buying the end of worrying about it.",
  food_beverage: "A good hour they do not have to work for. Taste matters, but so does not being let down when they are hungry.",
  appointment_service: "Feeling good about how they look and being treated with care. They are buying the feeling on the way home.",
  local_service: "The problem being gone, without them having to chase anyone. They are buying one less thing to worry about.",
  professional_service: "Someone competent taking it off their hands. They are buying certainty and their own time back.",
  software: "Time back and fewer mistakes. Nobody wants software. They want the job done without the mess.",
  ecommerce: "The thing arriving as promised, when promised. They are buying trust that the order will be fine.",
  retail: "Something they are glad they chose, without a wasted trip. They are buying a decision they will not regret.",
  creator_personal_brand: "Being understood by someone who gets it. They are buying belonging as much as information.",
};

const FOCUS_LINE = {
  education: "Show the result, not the syllabus. Show a real person who finished and what changed for them.",
  healthcare: "Show the path, not the treatment. Explain what happens first, how long it takes, and what it costs.",
  food_beverage: "Show the real portion, the real price, and the real wait. Hunger does not wait for clever wording.",
  appointment_service: "Show real before and after, and be plain about time and price. Nobody books a surprise.",
  local_service: "Show the job done, start to finish, and how fast you reply. Speed is the promise.",
  professional_service: "Show your process and one real result. Competence has to be visible before it is believed.",
  software: "Show one real workflow, screen by screen. Feature lists convince nobody.",
  ecommerce: "Show the product in real use, with delivery time and return terms in plain words.",
  retail: "Show what is in stock, the price, and how to get it. Remove every reason to hesitate.",
  creator_personal_brand: "Show your actual thinking, not a polished version of it. People follow a person.",
};

function reallyBuying(context) {
  return REALLY_BUYING[context?.parentCategory]
    || "The result they get after paying you, not the thing itself. People buy the change, not the product.";
}

function focusLine(context) {
  return FOCUS_LINE[context?.parentCategory]
    || "Show the result a real customer got, in their words, before you ask for anything.";
}

// Everything the owner actually told us about where the business stands. Each
// line is their own answer read back, never a conclusion we invented.
function currentSituation(context, rawBiz = {}) {
  const facts = [];
  const stage = text(rawBiz.biz_stage || context?.launchStage);
  const revenue = text(rawBiz.biz_revenue);
  const ticket = text(rawBiz.biz_ticket);
  const team = text(rawBiz.biz_team);
  const followers = text(rawBiz.biz_followers);
  const budget = text(rawBiz.biz_budget);
  const website = text(rawBiz.biz_website);
  const platforms = Array.isArray(context?.platforms) ? context.platforms.filter(Boolean) : [];

  if (stage) facts.push(`You described the business as ${lower(stage)}.`);
  if (revenue) facts.push(`Monthly sales: ${revenue}.`);
  if (ticket) facts.push(`A typical order is ${ticket}.`);
  if (team) facts.push(`Team size: ${team}.`);
  if (followers) facts.push(`Following: ${followers}.`);
  if (budget) facts.push(`Marketing budget: ${budget}.`);
  facts.push(
    website
      ? `You have a website: ${website}.`
      : "You have no website, so people can only find you where you post."
  );
  if (platforms.length) {
    facts.push(
      platforms.length === 1
        ? `You are on one channel: ${platforms[0]}.`
        : `You are on ${platforms.length} channels: ${platforms.join(", ")}.`
    );
  }
  return facts;
}

function missingAnswers(context, rawBiz = {}) {
  const gaps = [];
  if (!text(rawBiz.biz_website)) gaps.push("your website address");
  if (!text(rawBiz.biz_competitor)) gaps.push("a competitor to compare you against");
  if (!text(rawBiz.biz_ticket)) gaps.push("what a typical order is worth");
  if (!text(rawBiz.biz_revenue)) gaps.push("roughly what you sell in a month");
  if (!text(context?.differentiator)) gaps.push("what makes you different from the next option");
  return gaps;
}

// The strongest thing they have that is not being used yet. Every branch is
// tied to a fact they gave us; if none fits, we say we need more rather than
// dressing up a guess as an opportunity.
function biggestOpportunity(context, rawBiz = {}, diagnostics) {
  const followers = text(rawBiz.biz_followers);
  const website = text(rawBiz.biz_website);
  const hasAudience = followers && !/^0|none|under 100|no following/i.test(followers);
  const platforms = Array.isArray(context?.platforms) ? context.platforms.filter(Boolean) : [];

  if (hasAudience && !website) {
    return {
      opportunity: "You already have people paying attention. There is nowhere to send them.",
      why: `You told us your following is ${followers}, but you have no website. Every interested person has to message you and wait. One simple page turns that attention into enquiries while you sleep.`,
    };
  }

  const strongest = (diagnostics?.scores || [])
    .filter(score => typeof score.score === "number")
    .sort((a, b) => b.score - a.score)[0];

  if (strongest && strongest.score >= 60) {
    return {
      opportunity: `${strongest.label} is already working for you.`,
      why: `${sentence(strongest.plain_meaning)} That is the part you do not have to build from nothing, so it is the cheapest place to grow from.`,
    };
  }

  if (platforms.length === 1) {
    return {
      opportunity: `Everything you have built is on ${platforms[0]}.`,
      why: "One good channel is a real asset. Putting the same thing in one more place doubles who can find you, for no extra work.",
    };
  }

  return {
    opportunity: "We need a bit more before we can name this honestly.",
    why: "Add your website address and one competitor, then run this again. Naming an opportunity from what we have now would be a guess.",
  };
}

function buildMessage(context) {
  const name = text(context?.businessName, "Your business");
  const offer = text(context?.productsOrServices);
  const audience = text(context?.audience);
  const edge = text(context?.differentiator);
  const city = text(context?.city);
  const action = text(context?.customerAction, "Message us");
  const place = city ? ` in ${city}` : "";

  // Never a slogan. Every line is their own words arranged so a stranger
  // understands what is on offer and what to do about it.
  const main = offer && audience
    ? `${name} helps ${lower(audience)}${place} with ${lower(offer)}${edge ? `, and the difference is ${lower(edge)}` : ""}.`
    : "";

  return {
    main_message: sentence(main) || "We need your offer and your audience before we can write this line for you.",
    short_version: offer
      ? sentence(`${lower(offer)}${place}${edge ? `, ${lower(edge)}` : ""}`)
      : "Tell us what you sell and this becomes one line you can use everywhere.",
    instagram_bio: offer
      ? [
          `${offer}${place}`,
          audience ? `For ${lower(audience)}` : "",
          edge || "",
          `${action} 👇`,
        ].filter(Boolean).join("\n")
      : "",
    website_headline: offer && audience
      ? `${offer} for ${lower(audience)}${place}`
      : "",
    call_to_action: action,
    a_note: edge
      ? ""
      : "You have not told us what makes you different yet, so these lines say what you do but not why you and not somebody else. That is the single line worth deciding on.",
  };
}

export function buildBusinessSummary({ context, rawBiz = {}, diagnostics } = {}) {
  const offer = text(context?.productsOrServices);
  const audience = text(context?.audience);
  const type = text(context?.businessType);
  const city = text(context?.city);
  const name = text(context?.businessName, "Your business");
  const place = city ? ` in ${city}` : "";

  return {
    inOneMinute: {
      what_you_do: offer
        ? sentence(`${name} is a ${lower(type) || "business"}${place} selling ${lower(offer)}`)
        : `We do not have enough from the form to say what ${name} does in one line yet.`,
      who_you_serve: audience
        ? sentence(audience)
        : "You have not told us who this is for. That is the first thing to decide.",
      what_you_sell: offer || "Not given in the form.",
      what_customers_are_buying: reallyBuying(context),
      current_situation: currentSituation(context, rawBiz),
      we_do_not_know: missingAnswers(context, rawBiz),
      biggest_opportunity: biggestOpportunity(context, rawBiz, diagnostics),
    },
    whatToSell: {
      you_are_selling: offer || "Not given in the form.",
      customers_are_really_buying: reallyBuying(context),
      so_your_marketing_should: focusLine(context),
    },
    yourMessage: buildMessage(context),
  };
}
