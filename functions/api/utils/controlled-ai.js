import { callGemini, getGeminiConfig } from "../engine/aiProviders/gemini.js";
import { callNvidiaNim, getNvidiaNimConfig } from "../engine/aiProviders/nvidiaNim.js";
import { getRuntimeEnv, getRuntimeBinding } from "./get-env.js";
import {
  buildAiCacheKey,
  countAiUsageToday,
  hashBusinessProfile,
  readAiCache,
  recordAiUsage,
  writeAiCache,
} from "./ai-cache.js";

const LIMIT_MESSAGE = "AI limit reached for today. Showing the saved library plan instead.";

function readLimit(env, key, fallback) {
  const runtimeEnv = getRuntimeEnv(env);
  const raw = runtimeEnv?.[key] ?? fallback;
  const number = Number(raw);
  return Number.isFinite(number) ? number : Number(fallback);
}

function providerFromEnv(env) {
  const runtimeEnv = getRuntimeEnv(env);
  const explicit = String(runtimeEnv.AI_PROVIDER || "none").toLowerCase();
  if (explicit && explicit !== "none") return explicit;
  if (runtimeEnv.GEMINI_API_KEY || runtimeEnv.GOOGLE_API_KEY) return "gemini";
  if (runtimeEnv.NVIDIA_NIM_API_KEY) return "nvidia_nim";
  return "none";
}

function tokenUsage(usage) {
  return {
    inputTokens: Number(usage?.prompt_tokens || usage?.input_tokens || 0),
    outputTokens: Number(usage?.completion_tokens || usage?.output_tokens || 0),
    totalTokens: Number(usage?.total_tokens || 0),
  };
}

export async function callControlledAi(context, {
  userId,
  featureType,
  sectionName,
  promptVersion,
  businessProfile,
  input,
  messages,
  model,
  temperature = 0.4,
  maxTokens,
  responseFormat = "json",
  fallback,
}) {
  const runtimeEnv = getRuntimeEnv(context);
  const db = getRuntimeBinding(context, "DB");
  const provider = providerFromEnv(runtimeEnv);

  if (provider !== "nvidia_nim" && provider !== "gemini") {
    return {
      ok: false,
      provider,
      cached: false,
      limited: false,
      fallbackUsed: true,
      reason: `AI_PROVIDER=${provider || "none"} is not enabled for this feature.`,
      data: fallback,
    };
  }

  if ((runtimeEnv.AI_TASK_PROFILE || "runtime") === "offline_block_generation") {
    return {
      ok: false,
      provider,
      cached: false,
      limited: false,
      fallbackUsed: true,
      reason: "offline_block_generation profile is not allowed inside Cloudflare request runtime.",
      data: fallback,
    };
  }

  const config = provider === "gemini" ? getGeminiConfig(runtimeEnv) : getNvidiaNimConfig(runtimeEnv);
  const selectedModel = model || config.model;
  const requestId = crypto.randomUUID();
  const businessProfileHash = await hashBusinessProfile(businessProfile || {});
  const inputHash = await hashBusinessProfile(input || messages || {});
  const cacheKey = await buildAiCacheKey({
    provider,
    userId,
    businessProfileHash,
    featureType,
    sectionName,
    promptVersion,
    model: selectedModel,
    inputHash,
  });

  const cached = await readAiCache(db, cacheKey);
  const cachedData = responseFormat === "json" ? cached?.response_json : (cached?.response_json || cached?.raw_text);
  if (cachedData) {
    await recordAiUsage(context, {
      requestId,
      userId,
      provider,
      feature: featureType,
      featureType,
      model: selectedModel,
      cacheKey,
      businessProfileHash,
      promptVersion,
      cacheHit: true,
      success: true,
      metadata: { section_name: sectionName },
    });
    return {
      ok: true,
      provider,
      cached: true,
      limited: false,
      cacheKey,
      model: selectedModel,
      data: cachedData,
      rawText: cached.raw_text,
      usage: cached.usage_tokens || null,
    };
  }

  const usageToday = await countAiUsageToday(db, { userId });
  const globalLimit = readLimit(runtimeEnv, "AI_DAILY_GLOBAL_LIMIT", 25);
  const userLimit = readLimit(runtimeEnv, "AI_DAILY_USER_LIMIT", 3);

  if (usageToday.global >= globalLimit || usageToday.user >= userLimit) {
    await recordAiUsage(context, {
      requestId,
      userId,
      provider,
      feature: featureType,
      featureType,
      model: selectedModel,
      cacheKey,
      businessProfileHash,
      promptVersion,
      cacheHit: false,
      success: false,
      errorMessage: LIMIT_MESSAGE,
      metadata: {
        section_name: sectionName,
        usage_today: usageToday,
        global_limit: globalLimit,
        user_limit: userLimit,
      },
    });
    return {
      ok: false,
      provider,
      cached: false,
      limited: true,
      fallbackUsed: true,
      message: LIMIT_MESSAGE,
      data: fallback,
    };
  }

  const startedAt = Date.now();
  try {
    const response = provider === "gemini"
      ? await callGemini({
          env: runtimeEnv,
          messages,
          model: selectedModel,
          temperature,
          maxTokens,
          responseFormat,
        })
      : await callNvidiaNim({
          env: runtimeEnv,
          messages,
          model: selectedModel,
          temperature,
          maxTokens,
          responseFormat,
          taskProfile: "runtime",
        });
    const latencyMs = Date.now() - startedAt;
    const usage = tokenUsage(response.usage);
    if (responseFormat === "json" && !response.json) {
      const invalidJsonError = new Error("AI returned invalid JSON");
      invalidJsonError.rawText = response.text || "";
      invalidJsonError.model = response.model || selectedModel;
      throw invalidJsonError;
    }
    const cacheValue = {
      response_json: response.json,
      raw_text: response.text,
      usage_tokens: response.usage || usage,
      estimated_cost_or_credits: 0,
      provider,
      model: response.model || selectedModel,
      created_at: new Date().toISOString(),
      expires_at: null,
      validation_status: responseFormat === "json" && !response.json ? "invalid_json" : "valid",
    };

    await writeAiCache(context, cacheKey, cacheValue);
    await recordAiUsage(context, {
      requestId,
      userId,
      provider,
      feature: featureType,
      featureType,
      model: response.model || selectedModel,
      cacheKey,
      businessProfileHash,
      promptVersion,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      estimatedCostOrCredits: 0,
      latencyMs,
      cacheHit: false,
      success: true,
      metadata: {
        section_name: sectionName,
        rate_limit_headers: response.headers,
      },
    });

    return {
      ok: true,
      provider,
      cached: false,
      limited: false,
      cacheKey,
      data: response.json || response.text,
      rawText: response.text,
      usage: response.usage,
      model: response.model || selectedModel,
      headers: response.headers,
      latencyMs,
    };
  } catch (error) {
    await recordAiUsage(context, {
      requestId,
      userId,
      provider,
      feature: featureType,
      featureType,
      model: selectedModel,
      cacheKey,
      businessProfileHash,
      promptVersion,
      latencyMs: Date.now() - startedAt,
      cacheHit: false,
      success: false,
      errorMessage: error?.message || String(error),
      metadata: { section_name: sectionName },
    });
    return {
      ok: false,
      provider,
      cached: false,
      limited: false,
      fallbackUsed: true,
      error: error?.message || String(error),
      rawText: error?.rawText || "",
      data: fallback,
    };
  }
}
