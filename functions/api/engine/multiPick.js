// The intake form lets people tick several boxes for one question - main
// advantage, audience, offer, personality. The form joins those ticks into ONE
// string with " | " between them, and that string arrives here as if it were a
// phrase somebody wrote.
//
// Dropped into a sentence it reads as broken:
//
//   "Week 5: tighten the owner workflow behind Better quality | Better price /"
//   "...built around better quality | Better price / value | Faster service"
//
// The clipping that shortens long phrases then cuts it mid-item, which is where
// the stray trailing "| Better" came from.
//
// The diagnostic is right to show the WHOLE list - ticking everything is exactly
// the weakness it calls out. Only the writing side needs one pick, so the split
// lives here rather than in the intake.

const SEPARATOR = " | ";

// Claims every competitor also makes. When somebody ticks a mix, the sentence
// reads better led by the pick that actually narrows them down, so these go to
// the back of the queue. Ticking only these is still fair - the queue keeps
// their order and the first one wins.
const EVERYBODY_SAYS_THIS = [
  "better quality",
  "better price / value",
  "better price/value",
  "faster service",
  "more convenient",
  "better customer care",
];

export function splitPicks(value) {
  return String(value || "")
    .split(SEPARATOR)
    .map(item => item.trim())
    .filter(Boolean);
}

// One pick, for use inside a sentence a customer will read.
export function onePick(value, fallback = "") {
  const picks = splitPicks(value);
  if (!picks.length) return fallback;
  if (picks.length === 1) return picks[0];
  const distinctive = picks.find(pick => !EVERYBODY_SAYS_THIS.includes(pick.toLowerCase()));
  return distinctive || picks[0];
}

export function isPickList(value) {
  return splitPicks(value).length > 1;
}

// Belt and braces. The picks are fixed at the point they enter the copy, but
// this engine writes titles from a dozen constant tables and one missed path
// puts a pipe salad in front of a paying customer. Given the lists the form
// actually sent, strip any tail that survived.
//
// Only tails matching a known pick are removed - a prefix match as well, so a
// pick already clipped mid-word ("| Better" from "Better customer care") goes
// too. Anything else with a pipe in it is left alone.
export function collapsePickLists(text, pickLists = []) {
  let result = String(text || "");
  if (!result.includes("|")) return result;

  const tails = [];
  for (const list of pickLists) {
    const picks = splitPicks(list);
    if (picks.length < 2) continue;
    tails.push(...picks.slice(1));
  }
  if (!tails.length) return result;

  // Longest first, so "Better customer care" is tried before "Better".
  tails.sort((a, b) => b.length - a.length);

  let changed = true;
  while (changed) {
    changed = false;
    for (const tail of tails) {
      for (let length = tail.length; length >= 1; length -= 1) {
        const fragment = tail.slice(0, length);
        const index = result.toLowerCase().indexOf(`${SEPARATOR}${fragment.toLowerCase()}`);
        if (index === -1) continue;
        const after = result.slice(index + SEPARATOR.length + fragment.length);
        // Only a whole word, or the end of the line. Without this "| Better"
        // would eat the start of an unrelated word.
        if (after && /^[a-z0-9]/i.test(after)) continue;
        result = `${result.slice(0, index)}${after}`;
        changed = true;
        break;
      }
      if (changed) break;
    }
  }

  return result.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}
