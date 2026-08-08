import { getRuntimeBinding } from "./get-env.js";

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashBusinessProfile(profile) {
  return sha256Hex(stableStringify(profile));
}

export async function buildAiCacheKey({
  provider,
  userId,
  businessProfileHash,
  featureType,
  sectionName,
  promptVersion,
  model,
  inputHash,
}) {
  const raw = stableStringify({
    provider: provider || "unknown",
    user_id: userId || "anonymous",
    business_profile_hash: businessProfileHash || "no-profile",
    feature_type: featureType,
    section_name: sectionName,
    prompt_version: promptVersion,
    model,
    input_hash: inputHash || "no-input",
  });
  return `ai:${featureType}:${await sha256Hex(raw)}`;
}

export async function readAiCache(db, cacheKey) {
  if (!db || !cacheKey) return null;
  try {
    const row = await db.prepare(`
      SELECT content_json
      FROM ai_cache
      WHERE cache_key = ?
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `).bind(cacheKey).first();
    return row?.content_json ? JSON.parse(row.content_json) : null;
  } catch (error) {
    console.warn("AI cache read skipped:", error?.message || error);
    return null;
  }
}

export async function writeAiCache(context, cacheKey, content, ttlDays = 30) {
  const db = getRuntimeBinding(context, "DB");
  if (!db || !cacheKey || content === undefined) return;

  try {
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    context.waitUntil(
      db.prepare(`
        INSERT INTO ai_cache (cache_key, content_json, expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT(cache_key) DO UPDATE SET
          content_json = excluded.content_json,
          expires_at = excluded.expires_at
      `).bind(cacheKey, JSON.stringify(content), expiresAt).run()
        .catch(error => console.warn("AI cache write skipped:", error?.message || error))
    );
  } catch (error) {
    console.warn("AI cache write skipped:", error?.message || error);
  }
}

export async function recordAiUsage(context, {
  requestId,
  userId,
  provider,
  feature,
  featureType,
  model,
  cacheKey,
  businessProfileHash,
  promptVersion,
  inputTokens,
  outputTokens,
  totalTokens,
  estimatedCostOrCredits,
  latencyMs,
  cacheHit,
  success = true,
  errorMessage = "",
  metadata = {},
}) {
  const db = getRuntimeBinding(context, "DB");
  if (!db) return;

  const fallbackLog = async error => {
    try {
      await db.prepare(`
        INSERT INTO ai_usage_logs
          (id, uid, feature, model, cache_key, cache_hit, input_tokens, output_tokens, estimated_cost_usd, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        requestId || crypto.randomUUID(),
        userId || null,
        feature || featureType,
        model || null,
        cacheKey || null,
        cacheHit ? 1 : 0,
        Number(inputTokens || 0),
        Number(outputTokens || 0),
        Number(estimatedCostOrCredits || 0),
        JSON.stringify({
          provider,
          feature_type: featureType || feature,
          business_profile_hash: businessProfileHash,
          prompt_version: promptVersion,
          total_tokens: totalTokens,
          latency_ms: latencyMs,
          success,
          error_message: errorMessage || error?.message || String(error || ""),
          ...metadata,
        }),
      ).run();
    } catch (fallbackError) {
      console.warn("AI usage log skipped:", fallbackError?.message || fallbackError);
    }
  };

  try {
    context.waitUntil(
      db.prepare(`
        INSERT INTO ai_usage_logs
          (id, uid, provider, feature, feature_type, model, cache_key,
           business_profile_hash, prompt_version, input_tokens, output_tokens,
           total_tokens, estimated_cost_or_credits, latency_ms, cache_hit,
           success, error_message, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        requestId || crypto.randomUUID(),
        userId || null,
        provider || "unknown",
        feature || featureType,
        featureType || feature,
        model || null,
        cacheKey || null,
        businessProfileHash || null,
        promptVersion || null,
        Number(inputTokens || 0),
        Number(outputTokens || 0),
        Number(totalTokens || inputTokens + outputTokens || 0),
        Number(estimatedCostOrCredits || 0),
        Number(latencyMs || 0),
        cacheHit ? 1 : 0,
        success ? 1 : 0,
        String(errorMessage || "").slice(0, 500),
        JSON.stringify(metadata),
      ).run().catch(fallbackLog)
    );
  } catch (error) {
    context.waitUntil(fallbackLog(error));
  }
}

export async function countAiUsageToday(db, { userId } = {}) {
  if (!db) return { global: 0, user: 0 };

  try {
    const globalRow = await db.prepare(`
      SELECT COUNT(*) AS count
      FROM ai_usage_logs
      WHERE cache_hit = 0
        AND success = 1
        AND date(created_at) = date('now')
    `).first();
    const userRow = userId
      ? await db.prepare(`
          SELECT COUNT(*) AS count
          FROM ai_usage_logs
          WHERE uid = ?
            AND cache_hit = 0
            AND success = 1
            AND date(created_at) = date('now')
        `).bind(userId).first()
      : { count: 0 };
    return {
      global: Number(globalRow?.count || 0),
      user: Number(userRow?.count || 0),
    };
  } catch {
    try {
      const globalRow = await db.prepare(`
        SELECT COUNT(*) AS count
        FROM ai_usage_logs
        WHERE cache_hit = 0
          AND date(created_at) = date('now')
          AND (
            metadata_json IS NULL
            OR metadata_json = ''
            OR metadata_json LIKE '%"success":true%'
            OR input_tokens > 0
            OR output_tokens > 0
          )
      `).first();
      const userRow = userId
        ? await db.prepare(`
            SELECT COUNT(*) AS count
            FROM ai_usage_logs
            WHERE uid = ?
              AND cache_hit = 0
              AND date(created_at) = date('now')
              AND (
                metadata_json IS NULL
                OR metadata_json = ''
                OR metadata_json LIKE '%"success":true%'
                OR input_tokens > 0
                OR output_tokens > 0
              )
          `).bind(userId).first()
        : { count: 0 };
      return {
        global: Number(globalRow?.count || 0),
        user: Number(userRow?.count || 0),
      };
    } catch {
      return { global: 0, user: 0 };
    }
  }
}
