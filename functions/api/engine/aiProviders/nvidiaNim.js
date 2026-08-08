import { getRuntimeEnv } from "../../utils/get-env.js";

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function firstBalancedJsonObject(text) {
  const source = String(text || "");
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (start === -1) {
      if (char === "{") {
        start = index;
        depth = 1;
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  return "";
}

function parseJsonMaybe(text) {
  const cleaned = String(text || "")
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const balanced = firstBalancedJsonObject(cleaned);
    if (!balanced) return null;
    try {
      return JSON.parse(balanced);
    } catch {
      return null;
    }
  }
}

export function getNvidiaNimConfig(env = {}) {
  const runtimeEnv = getRuntimeEnv(env);
  return {
    provider: "nvidia_nim",
    apiKey: runtimeEnv.NVIDIA_NIM_API_KEY,
    baseURL: normalizeBaseUrl(runtimeEnv.NVIDIA_NIM_BASE_URL || DEFAULT_BASE_URL),
    model: runtimeEnv.NVIDIA_NIM_DEFAULT_MODEL,
    maxOutputTokens: Number(runtimeEnv.AI_MAX_OUTPUT_TOKENS || "2000"),
    testMode: runtimeEnv.AI_TEST_MODE === "true",
    taskProfile: runtimeEnv.AI_TASK_PROFILE || "runtime",
  };
}

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

export async function callNvidiaNim({
  env = {},
  messages,
  model,
  temperature = 0.4,
  maxTokens,
  responseFormat = "json",
  taskProfile,
  signal,
}) {
  const config = getNvidiaNimConfig(env);
  const profile = getAiTaskProfile(env, taskProfile);
  const selectedModel = model || config.model;

  if (!config.apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is missing");
  }

  if (!selectedModel) {
    throw new Error("NVIDIA_NIM_DEFAULT_MODEL is missing");
  }

  const body = {
    model: selectedModel,
    messages,
    temperature,
    max_tokens: Math.min(
      Number(maxTokens || profile.maxOutputTokens || config.maxOutputTokens || 1200),
      Number(profile.maxOutputTokens || config.maxOutputTokens || 2000),
    ),
  };

  if (responseFormat === "json") {
    body.response_format = { type: "json_object" };
  }

  const controller = signal ? null : new AbortController();
  const timeoutId = controller
    ? setTimeout(() => controller.abort(), profile.timeoutMs)
    : null;

  let response;
  try {
    response = await fetch(`${config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: signal || controller?.signal,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  const raw = await response.text();
  let payload = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || raw || `NVIDIA NIM request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = payload;
    throw error;
  }

  const text = payload?.choices?.[0]?.message?.content || "";

  return {
    provider: "nvidia_nim",
    text,
    json: responseFormat === "json" ? parseJsonMaybe(text) : null,
    usage: payload?.usage || null,
    model: payload?.model || selectedModel,
    headers: {
      rateLimitLimit: response.headers.get("x-ratelimit-limit"),
      rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
      rateLimitReset: response.headers.get("x-ratelimit-reset"),
    },
    rawResponse: payload,
  };
}
