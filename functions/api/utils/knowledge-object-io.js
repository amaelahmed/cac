import * as yaml from "js-yaml";

const CANONICAL_TYPES = new Set([
  "strategy_step",
  "content_idea",
  "hook",
  "customer_pain",
  "objection",
  "trust_builder",
  "growth_experiment",
  "positioning_angle",
  "competitor_gap",
  "offer_improvement",
  "funnel_step",
  "CTA",
  "cta",
  "calendar_item",
  "checklist_item",
  "website_roast_rule",
  "caption_template",
  "premium_growth_module",
  "brand_voice_rule",
  "template_message",
  "roi_assumption",
]);

const LEGACY_TYPES = new Set([
  "Fact",
  "Insight",
  "Framework",
  "Campaign",
  "Offer",
  "Strategy",
  "Asset",
]);

const VALID_STATUSES = new Set(["Draft", "Pending", "Published", "Archived"]);

const SAFE_PLACEHOLDERS = new Set([
  "BUSINESS_NAME",
  "AUDIENCE",
  "TARGET_AUDIENCE",
  "OFFER",
  "LOCATION",
  "CITY",
  "PLATFORM",
  "STAGE",
  "INDUSTRY",
  "PRICE_RANGE",
  "USP",
  "ADVANTAGE",
  "PROBLEM",
  "GOAL",
  "CUSTOMER_MODEL",
  "REVENUE_MODEL",
  "OPERATING_MODEL",
]);

function titleStatus(value) {
  const raw = String(value || "Draft").trim().toLowerCase();
  if (raw === "published") return "Published";
  if (raw === "archived") return "Archived";
  if (raw === "pending") return "Pending";
  if (raw === "draft") return "Draft";
  return String(value || "Draft").trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [value];
    } catch {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
  }
  return [value];
}

function stringifyJson(value, fallback) {
  if (typeof value === "string") {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(fallback(value));
    }
  }
  if (value !== undefined && value !== null) return JSON.stringify(value);
  return JSON.stringify(fallback(""));
}

function normalizePlaceholder(value) {
  return String(value || "")
    .replace(/\{/g, "")
    .replace(/\}/g, "")
    .trim()
    .toUpperCase();
}

function normalizeOperatingModel(value) {
  const raw = String(value || "ANY").trim();
  const lower = raw.toLowerCase();
  if (!raw || lower === "any") return "ANY";
  if (lower.includes("online") && lower.includes("physical")) return "Hybrid";
  if (lower.includes("hybrid")) return "Hybrid";
  if (lower.includes("online") || lower.includes("app") || lower.includes("saas")) return "Online";
  if (lower.includes("offline") || lower.includes("local") || lower.includes("walk") || lower.includes("physical")) return "Offline";
  return raw;
}

function normalizeCustomerModel(value) {
  const raw = String(value || "ANY").trim();
  const lower = raw.toLowerCase();
  if (!raw || lower === "any") return "ANY";
  if (lower.includes("b2b") && lower.includes("b2c")) return "Both B2B & B2C";
  if (lower.includes("b2b")) return "B2B";
  if (lower.includes("d2c")) return "B2C";
  if (lower.includes("b2c") || lower.includes("consumer")) return "B2C";
  if (lower.includes("developer")) return "B2D";
  if (lower.includes("enterprise")) return "Enterprise";
  if (lower.includes("creator")) return "Creator";
  if (lower.includes("internal")) return "Internal";
  if (lower.includes("hybrid")) return "Hybrid";
  return raw;
}

function normalizeStage(value) {
  const raw = String(value || "ANY").trim();
  const lower = raw.toLowerCase();
  if (!raw || lower === "any") return "ANY";
  if (lower.includes("mvp") || lower.includes("beta") || lower.includes("first")) return "Startup";
  if (lower.includes("idea") || lower.includes("pre") || lower.includes("validation")) return "Idea";
  if (lower.includes("growth") || lower.includes("scal")) return "Growth";
  if (lower.includes("mature") || lower.includes("established")) return "Mature";
  return raw;
}

function normalizeOneObject(obj, pack = {}) {
  const type = obj.object_type || obj.type;
  const title = obj.title || obj.expected_output || obj.id;
  const template = obj.template || obj.body || obj.content || obj.content_json;
  const placeholders = asArray(obj.placeholders).map(normalizePlaceholder).filter(Boolean);
  const tags = asArray(obj.tags).map(String);
  const contentJson = stringifyJson(template, text => ({
    title,
    type,
    body: text,
    template: text,
    priority: obj.priority ?? null,
    revenue_model: obj.revenue_model || null,
  }));

  return {
    id: String(obj.id || "").trim(),
    domain_id: String(obj.domain_id || pack.domain_id || "").trim(),
    industry_id: String(obj.industry_id || pack.industry_id || "").trim(),
    object_type: String(type || "").trim(),
    version: String(obj.version || pack.version || "1.0.0"),
    author: String(obj.author || pack.author || "CAC Knowledge YAML"),
    review_status: titleStatus(obj.review_status || obj.status || pack.status || "Draft"),
    base_confidence: Number(obj.base_confidence || obj.priority || 80),
    tags: JSON.stringify(tags),
    expected_output: String(obj.expected_output || title || ""),
    placeholders: JSON.stringify(placeholders),
    target_goal: obj.target_goal || obj.goal || "ANY",
    target_audience: obj.target_audience || obj.audience || "ANY",
    target_location: obj.target_location || obj.location || "ANY",
    target_size: obj.target_size || obj.size || "ANY",
    target_service: obj.target_service || obj.revenue_model || "ANY",
    target_stage: obj.target_stage || normalizeStage(obj.business_stage),
    target_model: obj.target_model || normalizeCustomerModel(obj.customer_model),
    target_pricing: obj.target_pricing || obj.pricing || "ANY",
    target_type: obj.target_type || normalizeOperatingModel(obj.operating_model),
    target_maturity: obj.target_maturity || obj.maturity || "ANY",
    target_challenge: obj.target_challenge || obj.challenge || "ANY",
    content_json: contentJson,
  };
}

export async function parseKnowledgePayload(request) {
  const text = await request.text();
  if (!text.trim()) {
    throw new Error("Import file is empty.");
  }

  const contentType = request.headers.get("content-type") || "";
  const preferJson = contentType.includes("json");
  let parsed;
  let format = preferJson ? "json" : "yaml";

  try {
    parsed = preferJson ? JSON.parse(text) : yaml.load(text);
  } catch (firstError) {
    try {
      parsed = preferJson ? yaml.load(text) : JSON.parse(text);
      format = preferJson ? "yaml" : "json";
    } catch {
      throw firstError;
    }
  }

  const pack = parsed?.knowledge_pack || parsed?.pack || {};
  const rawObjects = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.objects)
      ? parsed.objects
      : Array.isArray(parsed?.knowledge_objects)
        ? parsed.knowledge_objects
        : null;

  if (!Array.isArray(rawObjects)) {
    throw new Error("Payload must be a JSON array or a YAML object with an objects list.");
  }

  return {
    format,
    pack,
    objects: rawObjects.map(obj => normalizeOneObject(obj, pack)),
  };
}

export async function validateKnowledgeObjects(db, objects, options = {}) {
  const updateMode = Boolean(options.updateMode);
  const preview = {
    format: options.format || "json",
    updateMode,
    total: objects.length,
    validCount: 0,
    invalidCount: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    newCount: 0,
    duplicateCount: 0,
    errors: [],
    items: [],
  };

  const [{ results: existingObjs }, { results: industries }, { results: domains }] = await db.batch([
    db.prepare("SELECT id FROM knowledge_objects"),
    db.prepare("SELECT id FROM industries WHERE is_active = 1"),
    db.prepare("SELECT id FROM knowledge_domains WHERE is_active = 1"),
  ]);
  const existingIds = new Set((existingObjs || []).map(row => row.id));
  const industryIds = new Set((industries || []).map(row => row.id));
  const domainIds = new Set((domains || []).map(row => row.id));
  const seen = new Set();

  objects.forEach((obj, index) => {
    const item = {
      id: obj.id || `index-${index}`,
      valid: true,
      isNew: !existingIds.has(obj.id),
      willUpdate: false,
      errors: [],
    };

    if (!obj.id || !obj.domain_id || !obj.industry_id || !obj.object_type || !obj.author || !obj.content_json) {
      item.valid = false;
      item.errors.push("Missing required fields (id, domain_id, industry_id, object_type, author, content_json)");
    }

    if (obj.id && seen.has(obj.id)) {
      item.valid = false;
      item.errors.push(`Duplicate ID ${obj.id} appears more than once in this import.`);
    }
    seen.add(obj.id);

    if (obj.industry_id && !industryIds.has(obj.industry_id)) {
      item.valid = false;
      item.errors.push(`Unknown or inactive industry_id ${obj.industry_id}`);
    }

    if (obj.domain_id && !domainIds.has(obj.domain_id)) {
      item.valid = false;
      item.errors.push(`Unknown or inactive domain_id ${obj.domain_id}`);
    }

    if (obj.object_type && !CANONICAL_TYPES.has(obj.object_type) && !LEGACY_TYPES.has(obj.object_type)) {
      item.valid = false;
      item.errors.push(`Invalid object_type ${obj.object_type}`);
    }

    if (!VALID_STATUSES.has(obj.review_status)) {
      item.valid = false;
      item.errors.push(`Invalid status ${obj.review_status}`);
    }

    try {
      JSON.parse(obj.content_json);
      JSON.parse(obj.placeholders || "[]");
      JSON.parse(obj.tags || "[]");
    } catch {
      item.valid = false;
      item.errors.push("Invalid JSON in content_json, placeholders, or tags");
    }

    const unsafePlaceholders = asArray(obj.placeholders).map(normalizePlaceholder).filter(ph => ph && !SAFE_PLACEHOLDERS.has(ph));
    if (unsafePlaceholders.length > 0) {
      item.valid = false;
      item.errors.push(`Unsafe placeholders: ${unsafePlaceholders.join(", ")}`);
    }

    if (existingIds.has(obj.id)) {
      preview.duplicateCount++;
      item.isNew = false;
      if (updateMode) {
        item.willUpdate = true;
      } else {
        item.valid = false;
        item.errors.push(`Object ID ${obj.id} already exists. Use update mode to overwrite intentionally.`);
      }
    }

    if (item.valid) {
      preview.validCount++;
      if (item.willUpdate) preview.updated++;
      else {
        preview.created++;
        preview.newCount++;
      }
    } else {
      preview.invalidCount++;
      preview.failed++;
      preview.errors.push(`Item at index ${index} (${obj.id || "unknown"}): ${item.errors.join("; ")}`);
    }

    preview.items.push(item);
  });

  return preview;
}

function insertObjectStmt(db, obj) {
  return db.prepare(`
    INSERT INTO knowledge_objects (
      id, domain_id, industry_id, object_type, version, author,
      review_status, base_confidence, tags, expected_output, placeholders,
      target_goal, target_audience, target_location, target_size, target_service,
      target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
      content_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `).bind(
    obj.id,
    obj.domain_id,
    obj.industry_id,
    obj.object_type,
    obj.version,
    obj.author,
    obj.review_status,
    obj.base_confidence,
    obj.tags,
    obj.expected_output,
    obj.placeholders,
    obj.target_goal,
    obj.target_audience,
    obj.target_location,
    obj.target_size,
    obj.target_service,
    obj.target_stage,
    obj.target_model,
    obj.target_pricing,
    obj.target_type,
    obj.target_maturity,
    obj.target_challenge,
    obj.content_json
  );
}

function updateObjectStmt(db, obj) {
  return db.prepare(`
    UPDATE knowledge_objects SET
      domain_id = ?, industry_id = ?, object_type = ?, version = ?, author = ?,
      review_status = ?, base_confidence = ?, tags = ?, expected_output = ?, placeholders = ?,
      target_goal = ?, target_audience = ?, target_location = ?, target_size = ?, target_service = ?,
      target_stage = ?, target_model = ?, target_pricing = ?, target_type = ?, target_maturity = ?, target_challenge = ?,
      content_json = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(
    obj.domain_id,
    obj.industry_id,
    obj.object_type,
    obj.version,
    obj.author,
    obj.review_status,
    obj.base_confidence,
    obj.tags,
    obj.expected_output,
    obj.placeholders,
    obj.target_goal,
    obj.target_audience,
    obj.target_location,
    obj.target_size,
    obj.target_service,
    obj.target_stage,
    obj.target_model,
    obj.target_pricing,
    obj.target_type,
    obj.target_maturity,
    obj.target_challenge,
    obj.content_json,
    obj.id
  );
}

function versionStmt(db, obj, summary) {
  return db.prepare(`
    INSERT INTO knowledge_object_versions
      (id, object_id, version, author, change_summary, content_json, placeholders, tags,
       target_goal, target_audience, target_location, target_size, target_service,
       target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    obj.id,
    obj.version,
    obj.author,
    summary,
    obj.content_json,
    obj.placeholders,
    obj.tags,
    obj.target_goal,
    obj.target_audience,
    obj.target_location,
    obj.target_size,
    obj.target_service,
    obj.target_stage,
    obj.target_model,
    obj.target_pricing,
    obj.target_type,
    obj.target_maturity,
    obj.target_challenge
  );
}

export async function commitKnowledgeObjects(db, objects, userEmail, options = {}) {
  const updateMode = Boolean(options.updateMode);
  const preview = await validateKnowledgeObjects(db, objects, { ...options, updateMode });
  const validIds = new Set(preview.items.filter(item => item.valid).map(item => item.id));
  const updateIds = new Set(preview.items.filter(item => item.valid && item.willUpdate).map(item => item.id));
  const stmts = [];
  let created = 0;
  let updated = 0;

  for (const obj of objects) {
    if (!validIds.has(obj.id)) continue;
    if (updateIds.has(obj.id)) {
      stmts.push(updateObjectStmt(db, obj));
      stmts.push(versionStmt(db, obj, "YAML/JSON import update"));
      updated++;
    } else {
      stmts.push(insertObjectStmt(db, obj));
      stmts.push(versionStmt(db, obj, "YAML/JSON import create"));
      created++;
    }
  }

  if (stmts.length === 0) {
    return {
      success: false,
      created: 0,
      updated: 0,
      skipped: preview.total - preview.validCount,
      failed: preview.failed,
      errors: preview.errors,
    };
  }

  stmts.push(
    db.prepare(`INSERT INTO audit_logs (id, user_email, action, object_id, summary) VALUES (?, ?, ?, ?, ?)`).bind(
      crypto.randomUUID(),
      userEmail,
      "Import",
      null,
      `Imported ${created} and updated ${updated} knowledge objects`
    )
  );

  await db.batch(stmts);

  return {
    success: true,
    created,
    updated,
    skipped: preview.total - created - updated,
    failed: preview.failed,
    errors: preview.errors,
  };
}

export function toYamlExport(rows) {
  const objects = rows.map(row => ({
    id: row.id,
    type: row.object_type,
    title: row.expected_output || row.id,
    industry_id: row.industry_id,
    domain_id: row.domain_id,
    customer_model: row.target_model,
    revenue_model: row.target_service,
    business_stage: row.target_stage,
    audience: row.target_audience,
    operating_model: row.target_type,
    priority: row.base_confidence,
    status: String(row.review_status || "Draft").toLowerCase(),
    tags: asArray(row.tags),
    placeholders: asArray(row.placeholders),
    template: flattenContent(row.content_json),
    version: row.version,
  }));

  return yaml.dump({
    knowledge_pack: {
      id: `cac-export-${new Date().toISOString().slice(0, 10)}`,
      title: "CAC Knowledge Objects Export",
      version: 1,
      status: "published",
    },
    objects,
  }, { lineWidth: 120, noRefs: true });
}

function flattenContent(contentJson) {
  try {
    const parsed = JSON.parse(contentJson);
    if (typeof parsed === "string") return parsed;
    if (parsed.template) return parsed.template;
    if (parsed.body) return parsed.body;
    return JSON.stringify(parsed);
  } catch {
    return String(contentJson || "");
  }
}
