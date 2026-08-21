import { getRuntimeEnv } from "../../utils/get-env.js";
import { parseJsonMaybe } from "./parseJson.js";
import { getAiTaskProfile } from "./taskProfile.js";

// DeepSeek is the paid replacement for NVIDIA's free tier. A free tier has no
// uptime promise, which is not something a paying customer can be sold on top of.
//
// It speaks the same request shape as NVIDIA NIM (OpenAI style chat/completions),
// so this adapter is deliberately the same shape as nvidiaNim.js - the only real
// differences are the host, the model names and the default model.
const DEFAULT_BASE_URL = "https://api.deepseek.com/v1";

// Named so no key is needed to run: v4-flash is the cheap one, and at roughly a
// cent per report it is the right default for live customer traffic. The library
// writer overrides this with the pro model, because a library piece is written
// once and then served to every future customer of that trade.
const DEFAULT_MODEL = "deepseek-v4-flash";

function normalizeBaseUrl(value) {
  return String(value || DEFAULT_BASE_URL).replace(/\/$/, "");
}

export function getDeepseekConfig(env = {}) {
  const runtimeEnv = getRuntimeEnv(env);
  return {
    provider: "deepseek",
    apiKey: runtimeEnv.DEEPSEEK_API_KEY,
    baseURL: normalizeBaseUrl(runtimeEnv.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL),
    model: runtimeEnv.DEEPSEEK_DEFAULT_MODEL || DEFAULT_MODEL,
    maxOutputTokens: Number(runtimeEnv.AI_MAX_OUTPUT_TOKENS || "2000"),
    testMode: runtimeEnv.AI_TEST_MODE === "true",
    taskProfile: runtimeEnv.AI_TASK_PROFILE || "runtime",
  };
}

export async function callDeepseek({
  env = {},
  messages,
  model,
  temperature = 0.4,
  maxTokens,
  responseFormat = "json",
  taskProfile,
  signal,
}) {
  const config = getDeepseekConfig(env);
  const profile = getAiTaskProfile(env, taskProfile);
  const selectedModel = model || config.model;

  if (!config.apiKey) {
    throw new Error("DEEPSEEK_API_KEY is missing");
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

  // DeepSeek's JSON mode also wants the word "json" somewhere in the prompt, or
  // it can answer with empty content. Every prompt in this engine already says
  // "Return valid JSON only", so the check below is the safety net rather than
  // the plan.
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
    const message = payload?.error?.message || payload?.message || raw || `DeepSeek request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = payload;
    throw error;
  }

  const text = payload?.choices?.[0]?.message?.content || "";

  return {
    provider: "deepseek",
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
