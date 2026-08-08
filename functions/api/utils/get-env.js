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
    AI_TEST_MODE: env.AI_TEST_MODE || fallback.AI_TEST_MODE || "false",
    AI_DAILY_GLOBAL_LIMIT: env.AI_DAILY_GLOBAL_LIMIT || fallback.AI_DAILY_GLOBAL_LIMIT || "25",
    AI_DAILY_USER_LIMIT: env.AI_DAILY_USER_LIMIT || fallback.AI_DAILY_USER_LIMIT || "3",
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
