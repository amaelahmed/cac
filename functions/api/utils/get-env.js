export function getRuntimeEnv(contextOrEnv = {}) {
  const env = contextOrEnv?.env || contextOrEnv || {};
  const fallback =
    typeof process !== "undefined" && process.env
      ? process.env
      : {};

  return {
    AI_PROVIDER: env.AI_PROVIDER || fallback.AI_PROVIDER || "none",
    GEMINI_API_KEY: env.GEMINI_API_KEY || env.GOOGLE_API_KEY || fallback.GEMINI_API_KEY || fallback.GOOGLE_API_KEY || "",
    GOOGLE_API_KEY: env.GOOGLE_API_KEY || fallback.GOOGLE_API_KEY || "",
    GEMINI_BASE_URL: env.GEMINI_BASE_URL || fallback.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta",
    GEMINI_DEFAULT_MODEL: env.GEMINI_DEFAULT_MODEL || env.GEMINI_MODEL || fallback.GEMINI_DEFAULT_MODEL || fallback.GEMINI_MODEL || "gemini-1.5-flash",
    NVIDIA_NIM_API_KEY: env.NVIDIA_NIM_API_KEY || fallback.NVIDIA_NIM_API_KEY || "",
    NVIDIA_NIM_BASE_URL: env.NVIDIA_NIM_BASE_URL || fallback.NVIDIA_NIM_BASE_URL || "https://integrate.api.nvidia.com/v1",
    NVIDIA_NIM_DEFAULT_MODEL: env.NVIDIA_NIM_DEFAULT_MODEL || fallback.NVIDIA_NIM_DEFAULT_MODEL || "minimaxai/minimax-m3",
    // DeepSeek is the paid primary. NVIDIA above is a free tier, which has no
    // uptime promise, so it is no longer what the product leans on.
    DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY || fallback.DEEPSEEK_API_KEY || "",
    DEEPSEEK_BASE_URL: env.DEEPSEEK_BASE_URL || fallback.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    DEEPSEEK_DEFAULT_MODEL: env.DEEPSEEK_DEFAULT_MODEL || fallback.DEEPSEEK_DEFAULT_MODEL || "deepseek-v4-flash",
    AI_TEST_MODE: env.AI_TEST_MODE || fallback.AI_TEST_MODE || "false",
    // When the first provider errors, try the other one before falling back to
    // the offline template. Only applies if the second provider has a key.
    AI_PROVIDER_FAILOVER: env.AI_PROVIDER_FAILOVER || fallback.AI_PROVIDER_FAILOVER || "true",
    // Counted in AI CALLS, not reports. One report is about five calls, so the
    // user limit below is eight reports a day. The global figure is a spend
    // ceiling for bugs and abuse, not a product limit; 0 switches it off.
    AI_DAILY_GLOBAL_LIMIT: env.AI_DAILY_GLOBAL_LIMIT || fallback.AI_DAILY_GLOBAL_LIMIT || "200000",
    AI_DAILY_USER_LIMIT: env.AI_DAILY_USER_LIMIT || fallback.AI_DAILY_USER_LIMIT || "40",
    AI_MAX_OUTPUT_TOKENS: env.AI_MAX_OUTPUT_TOKENS || fallback.AI_MAX_OUTPUT_TOKENS || "2000",
    AI_RUNTIME_TIMEOUT_MS: env.AI_RUNTIME_TIMEOUT_MS || fallback.AI_RUNTIME_TIMEOUT_MS || "30000",
    AI_OFFLINE_MAX_OUTPUT_TOKENS: env.AI_OFFLINE_MAX_OUTPUT_TOKENS || fallback.AI_OFFLINE_MAX_OUTPUT_TOKENS || "8000",
    AI_OFFLINE_TIMEOUT_MS: env.AI_OFFLINE_TIMEOUT_MS || fallback.AI_OFFLINE_TIMEOUT_MS || "420000",
    AI_TASK_PROFILE: env.AI_TASK_PROFILE || fallback.AI_TASK_PROFILE || "runtime",
  };
}

export function getRuntimeBinding(contextOrEnv = {}, key) {
  return contextOrEnv?.env?.[key] || contextOrEnv?.[key] || null;
}
