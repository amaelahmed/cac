import { getRuntimeEnv } from "../../utils/get-env.js";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

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

function splitMessages(messages = []) {
  const system = messages
    .filter(message => message.role === "system")
    .map(message => message.content)
    .filter(Boolean)
    .join("\n\n");
  const userText = messages
    .filter(message => message.role !== "system")
    .map(message => `${message.role || "user"}:\n${message.content || ""}`)
    .join("\n\n");
  return { system, userText };
}

export function getGeminiConfig(env = {}) {
  const runtimeEnv = getRuntimeEnv(env);
  return {
    provider: "gemini",
    apiKey: runtimeEnv.GEMINI_API_KEY || runtimeEnv.GOOGLE_API_KEY,
    baseURL: normalizeBaseUrl(runtimeEnv.GEMINI_BASE_URL),
    model: runtimeEnv.GEMINI_DEFAULT_MODEL || "gemini-1.5-flash",
    maxOutputTokens: Number(runtimeEnv.AI_MAX_OUTPUT_TOKENS || "2000"),
  };
}

export async function callGemini({
  env = {},
  messages,
  model,
  temperature = 0.35,
  maxTokens,
  responseFormat = "json",
  signal,
}) {
  const config = getGeminiConfig(env);
  const selectedModel = model || config.model;

  if (!config.apiKey) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  if (!selectedModel) {
    throw new Error("GEMINI_DEFAULT_MODEL is missing");
  }

  const { system, userText } = splitMessages(messages);
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: userText }],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: Number(maxTokens || config.maxOutputTokens || 1600),
      ...(responseFormat === "json" ? { responseMimeType: "application/json" } : {}),
    },
  };

  if (system) {
    body.systemInstruction = {
      parts: [{ text: system }],
    };
  }

  const controller = signal ? null : new AbortController();
  const timeoutId = controller ? setTimeout(() => controller.abort(), 20000) : null;

  let response;
  try {
    response = await fetch(`${config.baseURL}/models/${encodeURIComponent(selectedModel)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const message = payload?.error?.message || raw || `Gemini request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.response = payload;
    throw error;
  }

  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map(part => part.text || "")
    .join("")
    .trim();
  const usage = payload?.usageMetadata
    ? {
        prompt_tokens: payload.usageMetadata.promptTokenCount || 0,
        completion_tokens: payload.usageMetadata.candidatesTokenCount || 0,
        total_tokens: payload.usageMetadata.totalTokenCount || 0,
      }
    : null;

  return {
    provider: "gemini",
    text,
    json: responseFormat === "json" ? parseJsonMaybe(text) : null,
    usage,
    model: selectedModel,
    headers: {
      rateLimitLimit: response.headers.get("x-ratelimit-limit"),
      rateLimitRemaining: response.headers.get("x-ratelimit-remaining"),
      rateLimitReset: response.headers.get("x-ratelimit-reset"),
    },
    rawResponse: payload,
  };
}
