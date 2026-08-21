/**
 * Decides whether the customer waits for AI, or gets the fast plan now and the
 * AI rewrite behind it.
 *
 * A full AI generation is one strategy call plus one call per ten calendar days,
 * each with its own timeout, run one after another. Making someone watch a
 * spinner through all of that reads as a hung product. The deterministic engine
 * builds a complete, usable plan in about a second, so that is what we answer
 * with, and the AI improves it afterwards.
 *
 * Deferring is only safe when the platform can keep running work after the
 * response is sent. Without that, the AI pass would simply be dropped, so we
 * fall back to the old blocking behaviour rather than silently lose it.
 */
export function planGeneration({ forceRuleBased, forceAiFailure, env = {}, canDeferWork } = {}) {
  const wantsAi = !forceRuleBased && !forceAiFailure;
  const enabled = env.BACKGROUND_AI_ENRICHMENT !== "false";
  const background = Boolean(wantsAi && enabled && canDeferWork);
  return {
    wantsAi,
    // Run the AI after responding.
    background,
    // Make the customer wait for it, because we cannot run it afterwards.
    blocking: wantsAi && !background,
    // What the first saved report should say about what is coming next.
    initialStatus: background ? "running" : "skipped",
  };
}
