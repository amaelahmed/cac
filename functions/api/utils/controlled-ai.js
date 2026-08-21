import { callDeepseek, getDeepseekConfig } from "../engine/aiProviders/deepseek.js";
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

// A report is not one AI call. A full generation makes one master-strategy call
// plus one call per ten calendar days, so about five. The old per-user limit of
// 3 CALLS could not finish a single report - a paying customer ran out of quota
// halfway through their first one of the day and silently got the offline
// template for the rest of it.
const AI_CALLS_PER_REPORT = 5;
const DEFAULT_USER_REPORTS_PER_DAY = 8;
const DEFAULT_USER_CALL_LIMIT = AI_CALLS_PER_REPORT * DEFAULT_USER_REPORTS_PER_DAY;

// This ceiling is spend protection against a bug or abuse - it is NOT a product
// limit. It used to be 25 calls a day shared across EVERY user combined, which
// meant the fifth report of the day, from any customer anywhere, quietly became
// the offline template. At 10,000 subscribers that is every customer, every day.
// Set AI_DAILY_GLOBAL_LIMIT to 0 to switch the ceiling off entirely.
const DEFAULT_GLOBAL_CALL_LIMIT = 200000;

function readLimit(env, key, fallback) {
  const runtimeEnv = getRuntimeEnv(env);
  const raw = runtimeEnv?.[key] ?? fallback;
  const number = Number(raw);
  return Number.isFinite(number) ? number : Number(fallback);
}

// Every provider the engine can talk to, in the order it prefers them.
//
// DeepSeek leads because it is paid and cheap - roughly a cent a report - and a
// paid account comes with an uptime promise. NVIDIA is a FREE tier: it has no
// such promise, so it sits last and is only ever tried if a key is still set.
// Delete NVIDIA_NIM_API_KEY in Cloudflare and the product no longer touches a
// free tier anywhere.
const PROVIDERS = {
  deepseek: {
    hasKey: env => Boolean(env.DEEPSEEK_API_KEY),
    config: getDeepseekConfig,
    call: callDeepseek,
    usesTaskProfile: true,
  },
  gemini: {
    hasKey: env => Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY),
    config: getGeminiConfig,
    call: callGemini,
    usesTaskProfile: false,
  },
  nvidia_nim: {
    hasKey: env => Boolean(env.NVIDIA_NIM_API_KEY),
    config: getNvidiaNimConfig,
    call: callNvidiaNim,
    usesTaskProfile: true,
  },
};

const PROVIDER_PREFERENCE = ["deepseek", "gemini", "nvidia_nim"];

function providerFromEnv(env) {
  const runtimeEnv = getRuntimeEnv(env);
  const explicit = String(runtimeEnv.AI_PROVIDER || "none").toLowerCase();
  if (explicit && explicit !== "none") return explicit;
  return PROVIDER_PREFERENCE.find(name => PROVIDERS[name].hasKey(runtimeEnv)) || "none";
}

function configFor(name, runtimeEnv) {
  return (PROVIDERS[name] || PROVIDERS.nvidia_nim).config(runtimeEnv);
}

// The provider to try first, then every other configured one behind it. Set
// AI_PROVIDER_FAILOVER=false to go back to a single attempt.
export function buildProviderOrder(primary, runtimeEnv) {
  const order = [primary];
  if (String(runtimeEnv.AI_PROVIDER_FAILOVER || "").toLowerCase() === "false") return order;
  for (const name of PROVIDER_PREFERENCE) {
    if (name === primary) continue;
    if (PROVIDERS[name].hasKey(runtimeEnv)) order.push(name);
  }
  return order;
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
  // Injected in tests so the failover path can be exercised without network.
  callers,
}) {
  const runtimeEnv = getRuntimeEnv(context);
  const db = getRuntimeBinding(context, "DB");
  const provider = providerFromEnv(runtimeEnv);

  if (!PROVIDERS[provider]) {
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

  const config = configFor(provider, runtimeEnv);
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

  const globalLimit = readLimit(runtimeEnv, "AI_DAILY_GLOBAL_LIMIT", DEFAULT_GLOBAL_CALL_LIMIT);
  const userLimit = readLimit(runtimeEnv, "AI_DAILY_USER_LIMIT", DEFAULT_USER_CALL_LIMIT);
  // The global tally is a COUNT over every row logged today, run on every single
  // AI call. When the ceiling is off there is nothing to compare it against, so
  // skip the query rather than pay for it on every request.
  const usageToday = await countAiUsageToday(db, { userId, skipGlobal: globalLimit <= 0 });

  const overGlobal = globalLimit > 0 && usageToday.global >= globalLimit;
  if (overGlobal || usageToday.user >= userLimit) {
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

  // One provider going quiet should not take the whole product with it. Before
  // this, a bad hour at NVIDIA dropped EVERY customer to the offline template at
  // the same moment, even though a working Gemini key sat right there in the
  // environment. Try the second one before giving up.
  //
  // A failed attempt is logged with success = 0, and the daily counters only
  // count successes, so failing over never costs the customer quota.
  const providerOrder = buildProviderOrder(provider, runtimeEnv);
  let lastError = null;

  for (let attempt = 0; attempt < providerOrder.length; attempt += 1) {
    const attemptProvider = providerOrder[attempt];
    const isPrimary = attempt === 0;
    const attemptConfig = configFor(attemptProvider, runtimeEnv);
    // A model name belongs to the provider it was written for, so a caller's
    // model only applies to the provider they were aiming at.
    const attemptModel = isPrimary ? selectedModel : attemptConfig.model;
    const attemptCacheKey = isPrimary
      ? cacheKey
      : await buildAiCacheKey({
          provider: attemptProvider,
          userId,
          businessProfileHash,
          featureType,
          sectionName,
          promptVersion,
          model: attemptModel,
          inputHash,
        });
    const attemptRequestId = isPrimary ? requestId : crypto.randomUUID();
    const startedAt = Date.now();

    const callProvider = callers?.[attemptProvider] || PROVIDERS[attemptProvider].call;

    try {
      const response = await callProvider({
        env: runtimeEnv,
        messages,
        model: attemptModel,
        temperature,
        maxTokens,
        responseFormat,
        ...(PROVIDERS[attemptProvider].usesTaskProfile ? { taskProfile: "runtime" } : {}),
      });
      const latencyMs = Date.now() - startedAt;
      const usage = tokenUsage(response.usage);
      if (responseFormat === "json" && !response.json) {
        const invalidJsonError = new Error("AI returned invalid JSON");
        invalidJsonError.rawText = response.text || "";
        invalidJsonError.model = response.model || attemptModel;
        throw invalidJsonError;
      }
      const cacheValue = {
        response_json: response.json,
        raw_text: response.text,
        usage_tokens: response.usage || usage,
        estimated_cost_or_credits: 0,
        provider: attemptProvider,
        model: response.model || attemptModel,
        created_at: new Date().toISOString(),
        expires_at: null,
        validation_status: "valid",
      };

      await writeAiCache(context, attemptCacheKey, cacheValue);
      await recordAiUsage(context, {
        requestId: attemptRequestId,
        userId,
        provider: attemptProvider,
        feature: featureType,
        featureType,
        model: response.model || attemptModel,
        cacheKey: attemptCacheKey,
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
          ...(isPrimary ? {} : { failover_from: providerOrder[0], attempt: attempt + 1 }),
        },
      });

      return {
        ok: true,
        provider: attemptProvider,
        cached: false,
        limited: false,
        cacheKey: attemptCacheKey,
        data: response.json || response.text,
        rawText: response.text,
        usage: response.usage,
        model: response.model || attemptModel,
        headers: response.headers,
        latencyMs,
        ...(isPrimary ? {} : { failedOverFrom: providerOrder[0] }),
      };
    } catch (error) {
      lastError = error;
      await recordAiUsage(context, {
        requestId: attemptRequestId,
        userId,
        provider: attemptProvider,
        feature: featureType,
        featureType,
        model: attemptModel,
        cacheKey: attemptCacheKey,
        businessProfileHash,
        promptVersion,
        latencyMs: Date.now() - startedAt,
        cacheHit: false,
        success: false,
        errorMessage: error?.message || String(error),
        metadata: {
          section_name: sectionName,
          attempt: attempt + 1,
          ...(attempt + 1 < providerOrder.length
            ? { failing_over_to: providerOrder[attempt + 1] }
            : {}),
        },
      });
    }
  }

  return {
    ok: false,
    provider: providerOrder[0],
    providersTried: providerOrder,
    cached: false,
    limited: false,
    fallbackUsed: true,
    error: lastError?.message || String(lastError),
    rawText: lastError?.rawText || "",
    data: fallback,
  };
}
