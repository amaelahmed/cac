import fs from "fs";
import path from "path";

const root = process.cwd();
const defaultFiles = [
  path.join(root, "data/strategy-library/review-batch-001.jsonl"),
];

const bannedWords = [
  "heuristic",
  "CAC",
  "CTA",
  "funnel",
  "persona",
  "objections",
  "trust builders",
  "messaging angles",
  "positioning",
  "proof assets",
  "leverage",
  "scalable",
  "conversion path",
  "low friction",
  "retention engine",
  "outcome first",
  "stakeholder",
  "acquisition strategy",
];

const requiredBlockFields = [
  "id",
  "title",
  "domain",
  "section_type",
  "content_json",
  "category_tags",
  "launch_status_tags",
  "audience_tags",
  "platform_tags",
  "product_type_tags",
  "business_model_tags",
  "goal_tags",
  "budget_tags",
  "location_tags",
  "problem_tags",
  "difficulty",
  "priority",
  "timeframe",
  "quality_score",
  "language_level",
  "active",
];

const requiredContentFields = [
  "title",
  "what_it_means",
  "what_to_do",
  "example",
  "why_this_helps",
  "how_to_check",
];

const requiredCalendarFields = [
  "day_hint",
  "post_type",
  "topic",
  "what_to_show",
  "ready_caption",
  "customer_action",
];

const customProductCoverage = [
  ["design_preview", /preview|mockup|design/i],
  ["approval_before_making", /confirm|approval|approved/i],
  ["advance_payment", /advance|payment/i],
  ["delivery_time", /delivery time|days|date needed|making time/i],
  ["final_photo", /final photo|ready photo/i],
  ["mistake_handling", /mistake|wrong|spelling|correction/i],
  ["material_clarity", /material|finish|size|texture/i],
  ["before_after", /before and after|before\/after|customisation/i],
  ["making_video", /making video|making videos|film hands|record.*making/i],
  ["packaging_video", /packaging|packing/i],
  ["whatsapp_ordering", /whatsapp/i],
];

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bannedWordHits(text) {
  const lower = text.toLowerCase();
  return bannedWords.filter(word => {
    const pattern = new RegExp(`\\b${escapeRegex(word.toLowerCase()).replace(/\\s+/g, "\\s+")}\\b`);
    return pattern.test(lower);
  });
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

function flattenText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).filter(Boolean).join(" ");
  return "";
}

function normalizeText(value) {
  return flattenText(value)
    .toLowerCase()
    .replace(/\{\{[^}]+\}\}/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasBusinessContext(text) {
  return /\{\{businessName\}\}|\{\{location\}\}|\{\{deliveryArea\}\}/i.test(text);
}

function readJsonl(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return [];

  return raw.split("\n").map((line, index) => {
    try {
      return { filePath, index: index + 1, block: JSON.parse(line) };
    } catch (error) {
      return {
        filePath,
        index: index + 1,
        block: null,
        parseError: error.message,
      };
    }
  });
}

function collectInputFiles(args) {
  if (args.length > 0) {
    return args.map(item => path.resolve(root, item));
  }

  return defaultFiles.filter(filePath => fs.existsSync(filePath));
}

function validateBlock(block) {
  const problems = [];

  for (const field of requiredBlockFields) {
    if (block?.[field] === undefined || block?.[field] === null || block?.[field] === "") {
      problems.push(`missing ${field}`);
    }
  }

  if (!block || typeof block !== "object") return problems;

  for (const field of [
    "category_tags",
    "launch_status_tags",
    "audience_tags",
    "platform_tags",
    "product_type_tags",
    "business_model_tags",
    "goal_tags",
    "budget_tags",
    "location_tags",
    "problem_tags",
  ]) {
    if (!Array.isArray(block[field]) || block[field].length === 0) {
      problems.push(`${field} must be a non-empty array`);
    }
  }

  for (const field of requiredContentFields) {
    const value = block.content_json?.[field];
    if (!value || (Array.isArray(value) && value.length === 0)) {
      problems.push(`missing content_json.${field}`);
    }
  }

  const contentText = JSON.stringify({
    title: block.title,
    section_type: block.section_type,
    content_json: block.content_json,
  });
  const banned = bannedWordHits(contentText);
  if (banned.length > 0) problems.push(`banned words: ${banned.join(", ")}`);

  if (block.active && Number(block.quality_score) < 4) {
    problems.push("active block quality_score must be 4 or 5");
  }

  if (block.language_level !== "beginner") {
    problems.push("language_level must be beginner");
  }

  if (contentText.length < 260) {
    problems.push("content is too thin");
  }

  if (!hasBusinessContext(contentText)) {
    problems.push("content should include business or location placeholder");
  }

  if (block.section_type === "thirty_day_calendar") {
    for (const field of requiredCalendarFields) {
      if (!block.content_json?.[field]) problems.push(`missing calendar field ${field}`);
    }
  }

  const launchTags = asArray(block.launch_status_tags);
  if (launchTags.includes("pre_launch")) {
    const existingBusinessLanguage = /\b(monthly revenue|repeat customers?|returning customers?|loyalty program|existing sales|your reviews already|past customers)\b/i;
    if (existingBusinessLanguage.test(contentText)) {
      problems.push("pre-launch block uses existing-business language");
    }
  }

  return problems;
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const value = getter(item);
    if (Array.isArray(value)) {
      for (const entry of value) acc[entry] = (acc[entry] || 0) + 1;
    } else {
      acc[value] = (acc[value] || 0) + 1;
    }
    return acc;
  }, {});
}

function duplicateValues(items, getter) {
  const counts = countBy(items, getter);
  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function buildReport(rows) {
  const parseErrors = rows.filter(row => row.parseError);
  const blocks = rows.filter(row => row.block).map(row => row.block);
  const validation = rows
    .filter(row => row.block)
    .map(row => ({
      id: row.block.id || `${row.filePath}:${row.index}`,
      file: path.relative(root, row.filePath),
      line: row.index,
      problems: validateBlock(row.block),
    }))
    .filter(item => item.problems.length > 0);

  const duplicateIds = duplicateValues(blocks, block => block.id);
  const duplicateTitles = duplicateValues(blocks, block => normalizeText(block.title))
    .filter(item => item.value);
  const duplicateContent = duplicateValues(blocks, block => normalizeText([
    block.content_json?.what_to_do,
    block.content_json?.why_this_helps,
    block.content_json?.example,
  ]))
    .filter(item => item.value);
  const duplicateCalendarTopics = duplicateValues(
    blocks.filter(block => block.section_type === "thirty_day_calendar"),
    block => normalizeText(block.content_json?.topic),
  ).filter(item => item.value);

  const customProductBlocks = blocks.filter(block => asArray(block.product_type_tags).includes("customised_product"));
  const customProductText = flattenText(customProductBlocks.map(block => block.content_json));
  const missingCustomCoverage = customProductCoverage
    .filter(([, pattern]) => !pattern.test(customProductText))
    .map(([name]) => name);

  const warnings = [
    ...duplicateIds.map(item => `duplicate ID ${item.value} (${item.count})`),
    ...duplicateTitles.map(item => `duplicate title "${item.value}" (${item.count})`),
    ...duplicateContent.map(item => `duplicate content signature "${item.value.slice(0, 80)}" (${item.count})`),
    ...duplicateCalendarTopics.map(item => `duplicate calendar topic "${item.value}" (${item.count})`),
    ...missingCustomCoverage.map(item => `customised product coverage missing ${item}`),
  ];

  return {
    ok: parseErrors.length === 0 && validation.length === 0 && warnings.length === 0,
    totalBlocks: blocks.length,
    activeBlocks: blocks.filter(block => block.active && Number(block.quality_score) >= 4).length,
    calendarBlocks: blocks.filter(block => block.section_type === "thirty_day_calendar").length,
    parseErrors,
    validation,
    warnings,
    counts: {
      byDomain: countBy(blocks, block => block.domain),
      bySectionType: countBy(blocks, block => block.section_type),
      byCategoryTag: countBy(blocks, block => block.category_tags || []),
      byLaunchStatus: countBy(blocks, block => block.launch_status_tags || []),
      byPlatform: countBy(blocks, block => block.platform_tags || []),
    },
  };
}

const files = collectInputFiles(process.argv.slice(2));
if (files.length === 0) {
  console.error("No strategy library files found to validate.");
  process.exit(1);
}

const rows = files.flatMap(readJsonl);
const report = buildReport(rows);
const reportPath = path.join(root, "reports/strategy_library_quality_latest.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  files: files.map(filePath => path.relative(root, filePath)),
  totalBlocks: report.totalBlocks,
  activeBlocks: report.activeBlocks,
  calendarBlocks: report.calendarBlocks,
  validationProblems: report.validation.length,
  warnings: report.warnings.length,
  report: path.relative(root, reportPath),
}, null, 2));

if (!report.ok) {
  process.exitCode = 1;
}
