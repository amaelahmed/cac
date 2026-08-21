import { getRuntimeEnv } from "../../utils/get-env.js";

// How long an AI call may run and how much it may write. This has nothing to do
// with WHICH provider is answering, so every adapter reads the same profile.
//
// "runtime" is a live customer waiting on a page. "offline_block_generation" is
// the library writer on a laptop, where a seven minute call is fine because the
// piece it writes is served to every future customer of that trade.
export function getAiTaskProfile(env = {}, requestedProfile) {
  const runtimeEnv = getRuntimeEnv(env);
  const profile = requestedProfile || runtimeEnv.AI_TASK_PROFILE || "runtime";
  if (profile === "offline_block_generation") {
    const offlineTimeout = Number(runtimeEnv.AI_OFFLINE_TIMEOUT_MS || 420000);
    return {
      name: "offline_block_generation",
      maxOutputTokens: Math.min(Number(runtimeEnv.AI_OFFLINE_MAX_OUTPUT_TOKENS || 8000), 12000),
      timeoutMs: Math.min(Number.isFinite(offlineTimeout) ? offlineTimeout : 420000, 600000),
      cacheRequired: false,
      cloudflareRuntimeAllowed: false,
    };
  }

  return {
    name: "runtime",
    maxOutputTokens: Math.min(Number(runtimeEnv.AI_MAX_OUTPUT_TOKENS || 2000), 2000),
    timeoutMs: Math.min(Number(runtimeEnv.AI_RUNTIME_TIMEOUT_MS || 24000), 180000),
    cacheRequired: true,
    cloudflareRuntimeAllowed: true,
  };
}
