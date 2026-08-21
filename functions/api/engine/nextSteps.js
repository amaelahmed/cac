// The owner should never reach the end of the report thinking "okay... but what
// do I actually DO?"
//
// The engine already worked all of this out - the weakest area, the ranked
// actions, what to watch afterwards - and then buried it inside the Full Plan
// tab under raw keys nobody opens. Nothing here is new analysis. It is the
// answer to "what now", pulled to the front and written in plain English.
//
// Every line traces back to a check the engine can point at. Where there was
// nothing to check, this says so rather than inventing an action.

import { directFixesFor } from "./diagnostics.js";

const MAX_WEEK_ACTIONS = 7;
const MAX_FIX_ACTIONS = 5;

function text(value, fallback = "") {
  const cleaned = String(value ?? "").replace(/\s+/g, " ").trim();
  return cleaned || fallback;
}

function sentence(value) {
  const cleaned = text(value);
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function actionList(step) {
  const raw = step?.steps || step?.action_steps || (step?.action ? [step.action] : []);
  return (Array.isArray(raw) ? raw : [raw])
    .map(item => text(typeof item === "string" ? item : item?.action || item?.title))
    .filter(Boolean)
    .slice(0, MAX_FIX_ACTIONS);
}

// The weakest area the engine could actually measure. A group it could not
// check at all is not "the biggest problem" - it is a gap in what we know, and
// that gets said out loud instead.
function weakestScore(scores) {
  const measured = (scores || []).filter(score => typeof score.score === "number");
  if (!measured.length) return null;
  return [...measured].sort((a, b) => a.score - b.score)[0];
}

function buildBiggestProblem(diagnostics, rankedSteps) {
  const scores = diagnostics?.scores || [];
  const weakest = weakestScore(scores);

  if (!weakest) {
    const unchecked = scores.flatMap(score => (score.not_checked || []).map(item => item.question));
    return {
      problem: "We could not measure anything yet.",
      why_it_matters:
        "Every check needed something we did not have, so naming a biggest problem now would be a guess.",
      what_to_do: [
        "Add your website address to the form and run the report again.",
        "Add one competitor's name or website so we can compare.",
      ],
      still_unknown: unchecked.slice(0, 5),
      honest_note: "Nothing here is a verdict. We would rather say we do not know.",
    };
  }

  // Only actions that fix THIS area. If none of the ranked actions point at it,
  // fall back to the strongest ones rather than inventing a fix.
  const failedQuestions = new Set((weakest.failed || []).map(item => text(item.question)));
  const targeted = (rankedSteps || []).filter(step =>
    (step.fixes_checks || []).some(question => failedQuestions.has(text(question)))
  );
  // A repair for a check that actually failed beats any content idea. The old
  // list was built only from content steps, so a report could say "you have no
  // website" and then recommend a post.
  const repairs = directFixesFor(weakest).map(fix => ({
    action: fix.action,
    why: sentence(fix.why),
    how: fix.steps,
    time_needed: "",
    cost: "Free",
  }));
  const chosen = [
    ...repairs,
    ...(targeted.length ? targeted : rankedSteps || []).map(step => ({
      action: text(step.title, "Action"),
      why: sentence(step.because),
      how: actionList(step),
      time_needed: text(step.effort),
      cost: text(step.money),
    })),
  ].slice(0, MAX_FIX_ACTIONS);

  return {
    problem: text(weakest.label, "Your weakest area"),
    rating: text(weakest.band),
    why_it_matters: sentence(weakest.plain_meaning),
    what_is_wrong: (weakest.failed || [])
      .map(item => text(item.evidence || item.question))
      .filter(Boolean)
      .slice(0, 3),
    what_to_do: chosen,
    still_unknown: (weakest.not_checked || []).map(item => text(item.question)).filter(Boolean).slice(0, 3),
    honest_note: text(weakest.caveat),
  };
}

function buildNext7Days(rankedSteps, scores) {
  // Every failed basic across every area, worst area first, then the ranked
  // content work. Seven at most - a list of twenty is a list nobody starts.
  const byWorst = (scores || [])
    .filter(score => typeof score.score === "number")
    .sort((a, b) => a.score - b.score);
  const repairs = byWorst.flatMap(score => directFixesFor(score));

  const seen = new Set();
  const week = [];
  for (const fix of repairs) {
    if (seen.has(fix.action)) continue;
    seen.add(fix.action);
    week.push({ action: fix.action, why: sentence(fix.why), cost: "Free" });
  }
  for (const step of rankedSteps || []) {
    const action = text(step.title, "Action");
    if (seen.has(action)) continue;
    seen.add(action);
    week.push({
      action,
      why: sentence(step.because),
      time_needed: text(step.effort),
      cost: text(step.money),
    });
  }
  return week.slice(0, MAX_WEEK_ACTIONS).map((item, index) => ({ order: index + 1, ...item }));
}

function buildOneThing(rankedSteps, headline, weakest) {
  // If something basic is broken, THAT is the one thing. Recommending a post to
  // a business with no website is answering a question nobody asked.
  const repair = directFixesFor(weakest)[0];
  if (repair) {
    return {
      action: repair.action,
      why_it_matters: sentence(repair.why),
      what_to_do: repair.steps,
      what_success_looks_like: "A stranger can find you and understand what you sell, without asking you first.",
      based_on: sentence(repair.because),
      time_needed: "",
      cost: "Free",
      weakest_area: text(weakest?.label || headline?.weakest_area),
    };
  }

  const top = (rankedSteps || [])[0];
  if (!top) {
    return {
      action: "Add your website address and run this again.",
      why_it_matters:
        "We could not check enough to name your number one action, and guessing one would waste your week.",
      what_to_do: [
        "Put your website address into the form.",
        "Add one competitor's name or website.",
        "Run the report again.",
      ],
      what_success_looks_like: "The report comes back with real checks instead of gaps.",
    };
  }

  return {
    action: text(top.title, text(headline?.do_this, "Your first action")),
    why_it_matters: sentence(top.because || headline?.why),
    what_to_do: actionList(top),
    what_success_looks_like: sentence(
      top.target?.good_sign || top.target?.watch || "You see more of the replies you actually want."
    ),
    watch_this_number: text(top.target?.watch),
    bad_sign: sentence(top.target?.bad_sign),
    time_needed: text(top.effort, text(headline?.time_needed)),
    cost: text(top.money, text(headline?.cost)),
    weakest_area: text(headline?.weakest_area),
  };
}

export function buildNextSteps({ diagnostics, rankedSteps, headline } = {}) {
  const weakest = weakestScore(diagnostics?.scores);
  return {
    oneThing: buildOneThing(rankedSteps, headline, weakest),
    biggestProblem: buildBiggestProblem(diagnostics, rankedSteps),
    next7Days: buildNext7Days(rankedSteps, diagnostics?.scores),
  };
}
