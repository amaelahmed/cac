import fs from "fs";
import path from "path";

const root = process.cwd();

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
  "conversion path",
  "low friction",
  "retention engine",
  "leverage",
  "scalable",
  "stakeholder",
  "acquisition strategy",
];

const requiredFields = [
  "id",
  "title",
  "domain",
  "section_type",
  "business_type",
  "launch_status",
  "simple_explanation",
  "do_this",
  "copy_ready_text",
  "example_for_business",
  "why_this_works",
  "how_to_know_it_worked",
  "tags",
  "quality_score",
  "language_level",
];

const requiredTagFields = [
  "category",
  "launch_status",
  "audience",
  "platform",
  "product_type",
  "goal",
  "location",
  "problem",
];

const salonSectionTypes = [
  "booking_trust_card",
  "hygiene_proof_card",
  "instagram_content_card",
  "whatsapp_reply_card",
  "customer_problem_card",
  "google_business_card",
  "repeat_visit_card",
  "simple_offer_card",
  "review_request_card",
  "service_menu_card",
  "stylist_trust_card",
  "delay_message_card",
  "aftercare_card",
  "bridal_trial_card",
  "walk_in_booking_card",
  "no_show_policy_card",
  "student_offer_card",
  "family_package_card",
  "men_grooming_card",
  "local_discovery_card",
  "referral_card",
  "festival_booking_card",
  "event_rush_card",
  "nearby_search_card",
  "instagram_story_card",
  "staff_intro_card",
];

const groupRules = {
  salon: {
    allowedDomains: ["salon"],
    allowedSectionTypes: salonSectionTypes,
    requiredAny: [/salon|beauty|hair|grooming|skincare|bridal|appointment|hygiene/i],
    forbidden: [/\b(cafe|coffee|juice|bakery|dish|food photo)\b/i, /\b(clothing|dress|kurti|fabric|size chart)\b/i, /\b(customi[sz]ed gift|photo frame|mug|keychain)\b/i, /\b(software|app dashboard|robot|linkedin|book a call)\b/i],
  },
  cafe: {
    allowedDomains: ["cafe"],
    requiredAny: [/cafe|coffee|juice|bakery|snack|menu|dish|taste|ambience|table/i],
    forbidden: [/\b(salon|haircut|facial|bridal makeup|skincare)\b/i, /\b(clothing|dress|fabric|size chart)\b/i, /\b(customi[sz]ed gift|photo frame|mug|keychain)\b/i, /\b(software|robot|linkedin|book a call)\b/i],
  },
  clothing: {
    allowedDomains: ["clothing"],
    requiredAny: [/clothing|dress|outfit|fabric|size|fit|boutique|fashion|new arrival/i],
    forbidden: [/\b(salon|haircut|facial|skincare)\b/i, /\b(cafe|coffee|juice|bakery|menu)\b/i, /\b(customi[sz]ed gift|photo frame|mug|keychain)\b/i, /\b(software|robot|linkedin|book a call)\b/i],
  },
  local_service: {
    allowedDomains: ["local_service"],
    requiredAny: [/service|repair|cleaning|coaching|home visit|booking|price|guarantee|local area/i],
    forbidden: [/\b(cafe|coffee|juice|bakery|menu)\b/i, /\b(salon|haircut|facial|bridal makeup)\b/i, /\b(clothing|dress|fabric|size chart)\b/i, /\b(customi[sz]ed gift|photo frame|mug|keychain)\b/i, /\b(software|robot|linkedin|book a call)\b/i],
  },
  running_custom_gifts: {
    allowedDomains: ["running_custom_gifts", "custom_gifts"],
    requiredAny: [/gift|custom|customi[sz]ed|preview|spelling|print|photo|delivery|approval|material/i],
    forbidden: [/\b(salon|haircut|facial|skincare)\b/i, /\b(cafe|coffee|juice|bakery|menu)\b/i, /\b(clothing store|size chart|trial room)\b/i, /\b(software|robot|linkedin|book a call)\b/i],
  },
};

const stopWords = new Set([
  "the", "a", "an", "and", "or", "to", "of", "for", "in", "on", "at", "with", "your", "you",
  "this", "that", "they", "them", "their", "it", "is", "are", "be", "as", "when", "what", "how",
  "businessname", "location", "service", "customer", "customers", "salon", "card", "reply", "message",
]);

function parseArgs(argv) {
  const options = { files: [], group: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--group") options.group = argv[++index] || "";
    else if (arg.startsWith("--group=")) options.group = arg.slice("--group=".length);
    else options.files.push(path.resolve(root, arg));
  }
  return options;
}

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

function importantTokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter(token => token.length > 3 && !stopWords.has(token));
}

function tokenSimilarity(left, right) {
  const leftTokens = new Set(importantTokens(left));
  const rightTokens = new Set(importantTokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;
  const intersection = [...leftTokens].filter(token => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function ideaText(block) {
  return flattenText({
    title: block.title,
    section_type: block.section_type,
    problem: block.tags?.problem,
    simple_explanation: block.simple_explanation,
    do_this: block.do_this,
    copy_ready_text: block.copy_ready_text,
  });
}

function isSnakeToken(value) {
  return /^[a-z0-9_]+$/.test(String(value || ""));
}

function readJsonl(filePath) {
  const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "";
  if (!raw) return [];

  return raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return { filePath, line: index + 1, block: JSON.parse(line) };
    } catch (error) {
      return { filePath, line: index + 1, parseError: error.message };
    }
  });
}

function countBy(items, getter) {
  return items.reduce((acc, item) => {
    const value = getter(item);
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (entry) acc[entry] = (acc[entry] || 0) + 1;
    }
    return acc;
  }, {});
}

function duplicates(items, getter) {
  return Object.entries(countBy(items, getter))
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function inferGroup(filePath, explicitGroup) {
  if (explicitGroup) return explicitGroup;
  const name = path.basename(filePath || "").toLowerCase();
  if (name.includes("salon")) return "salon";
  if (name.includes("cafe")) return "cafe";
  if (name.includes("clothing")) return "clothing";
  if (name.includes("local-service")) return "local_service";
  if (name.includes("custom-gift")) return "running_custom_gifts";
  return "";
}

function inventedOutcomeHits(text) {
  const checks = [
    /\b(?:she|he|they|customer|customers|client|clients|bride|woman|man|people)\s+(?:repl(?:y|ies)|book(?:s|ed)?|arrive(?:s|d)?|confirm(?:s|ed)?|agree(?:s|d)?|pick(?:s|ed)?|come(?:s)? back|share(?:s|d)?|save(?:s|d)?|leave(?:s)?|message(?:s|d)?)\b/i,
    /\bcustomers?\s+(?:start|stop)\s+(?:saying|asking|calling|complaining|booking|coming|replying)\b/i,
    /\byou\s+(?:will\s+)?(?:see|get)\s+fewer\b/i,
    /\bfewer\s+customers?\s+(?:leave|call|complain|ask|cancel)\b/i,
    /\bcustomers?\s+come\s+back\s+sooner\b/i,
    /\bno\s+(?:angry reply|one-star review|complaints?)\b/i,
    /\bnow\s+when\s+someone\s+searches\b/i,
    /\bprofile\s+shows\s+real\s+work\s+instead\s+of\s+an\s+empty\s+page\b/i,
    /\bhappy message after delivery\b/i,
  ];
  return checks
    .map(pattern => text.match(pattern)?.[0])
    .filter(Boolean);
}

function validateBlock(block, group) {
  const problems = [];
  if (!block || typeof block !== "object") return ["block is not an object"];

  for (const field of requiredFields) {
    const value = block[field];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      problems.push(`missing ${field}`);
    }
  }

  if (!Array.isArray(block.do_this) || block.do_this.length < 2) {
    problems.push("do_this must have at least 2 exact steps");
  }

  if (!isSnakeToken(block.section_type)) {
    problems.push("section_type must use lower_snake_case");
  }

  if (block.domain && !isSnakeToken(block.domain)) {
    problems.push("domain must use lower_snake_case");
  }

  for (const field of requiredTagFields) {
    if (!Array.isArray(block.tags?.[field]) || block.tags[field].length === 0) {
      problems.push(`tags.${field} must be a non-empty array`);
    } else if (!block.tags[field].every(isSnakeToken)) {
      problems.push(`tags.${field} must use lower_snake_case values`);
    }
  }

  if (Number(block.quality_score) !== 5) {
    problems.push("quality_score must be 5 for approved-style drafts");
  }

  if (block.language_level !== "beginner") {
    problems.push("language_level must be beginner");
  }

  const visibleText = flattenText({
    title: block.title,
    business_type: block.business_type,
    simple_explanation: block.simple_explanation,
    do_this: block.do_this,
    copy_ready_text: block.copy_ready_text,
    example_for_business: block.example_for_business,
    why_this_works: block.why_this_works,
    how_to_know_it_worked: block.how_to_know_it_worked,
  });

  const banned = bannedWordHits(visibleText);
  if (banned.length > 0) problems.push(`banned words: ${banned.join(", ")}`);

  if (visibleText.length < 280) {
    problems.push("content is too thin");
  }

  if (!/\{\{businessName\}\}|\{\{location\}\}|your salon|your cafe|your shop|your business|your service/i.test(visibleText)) {
    problems.push("content should be reusable with business/location placeholder or safe generic wording");
  }

  if (/\b\d+\s*out\s*of\s*\d+\b|\b\d+%\b|bookings?\s+.*\b(go|went|goes)\s+up\b|sales\s+.*\b(go|went|goes)\s+up\b|\bmore\s+(customers|people|buyers|clients|followers|visitors)(?:\s+\w+){0,4}\s+(book|buy|visit|reply|message|come|ask)\b/i.test(visibleText)) {
    problems.push("avoid fake performance claims or invented results");
  }

  if (/#\w+/.test(visibleText)) {
    problems.push("avoid raw hashtags inside draft card text");
  }

  if (/\b(?:rs|₹)\s*\d+/i.test(visibleText)) {
    problems.push("avoid fixed invented prices; use a placeholder or price range wording");
  }

  if (/gets?\s+(saved|shared)|one of them books|becomes a walk-in|bookings?\s+from|messages?\s+.*\bsaying\b|followers?\s+send|customers?\s+reply/i.test(String(block.example_for_business || ""))) {
    problems.push("example_for_business should not invent customer reactions or results");
  }

  for (const [field, maxLength] of [
    ["simple_explanation", 260],
    ["copy_ready_text", 420],
    ["why_this_works", 260],
    ["how_to_know_it_worked", 260],
  ]) {
    if (String(block[field] || "").length > maxLength) {
      problems.push(`${field} is too long`);
    }
  }

  const rules = groupRules[group];
  if (rules) {
    if (rules.allowedDomains?.length && !rules.allowedDomains.includes(block.domain)) {
      problems.push(`domain must be one of: ${rules.allowedDomains.join(", ")}`);
    }
    if (rules.allowedSectionTypes?.length && !rules.allowedSectionTypes.includes(block.section_type)) {
      problems.push(`section_type must be one of the approved ${group} section types`);
    }
    if (!rules.requiredAny.some(pattern => pattern.test(visibleText))) {
      problems.push(`wrong-business check: does not look specific to ${group}`);
    }
    const forbiddenHits = rules.forbidden.flatMap(pattern => {
      const match = visibleText.match(pattern);
      return match ? [match[0]] : [];
    });
    if (forbiddenHits.length > 0) {
      problems.push(`wrong-business mixing: ${[...new Set(forbiddenHits)].join(", ")}`);
    }
  }

  if (/cartroid/i.test(visibleText) && !/custom/i.test(group)) {
    problems.push("mentions Cartroid outside a custom-gift-specific batch");
  }

  const exampleOutcomeHits = inventedOutcomeHits(String(block.example_for_business || ""));
  if (exampleOutcomeHits.length > 0) {
    problems.push(`example_for_business should describe setup, not invented outcomes: ${[...new Set(exampleOutcomeHits)].join(", ")}`);
  }

  const measurementOutcomeHits = inventedOutcomeHits(String(block.how_to_know_it_worked || ""));
  if (measurementOutcomeHits.length > 0) {
    problems.push(`how_to_know_it_worked should use measurable checks, not imagined outcomes: ${[...new Set(measurementOutcomeHits)].join(", ")}`);
  }

  return problems;
}

function buildReport(rows, options) {
  const parseErrors = rows.filter(row => row.parseError);
  const blocks = rows.filter(row => row.block).map(row => row.block);
  const group = inferGroup(rows[0]?.filePath, options.group);
  const validation = rows
    .filter(row => row.block)
    .map(row => ({
      id: row.block.id || `${path.relative(root, row.filePath)}:${row.line}`,
      file: path.relative(root, row.filePath),
      line: row.line,
      problems: validateBlock(row.block, group),
    }))
    .filter(item => item.problems.length > 0);

  const duplicateIds = duplicates(blocks, block => block.id);
  const duplicateTitles = duplicates(blocks, block => normalizeText(block.title)).filter(item => item.value);
  const duplicateIdeas = duplicates(blocks, block => normalizeText([
    block.title,
    block.simple_explanation,
    block.do_this,
    block.copy_ready_text,
  ])).filter(item => item.value);
  const nearDuplicateIdeas = [];
  for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < blocks.length; rightIndex += 1) {
      const left = blocks[leftIndex];
      const right = blocks[rightIndex];
      const similarity = tokenSimilarity(ideaText(left), ideaText(right));
      const sameSection = left.section_type && left.section_type === right.section_type;
      const sharedProblems = (left.tags?.problem || []).filter(problem => (right.tags?.problem || []).includes(problem));
      if (similarity >= 0.38 || (sameSection && sharedProblems.length > 0 && similarity >= 0.18)) {
        nearDuplicateIdeas.push({
          left: left.id || left.title,
          right: right.id || right.title,
          similarity: Number(similarity.toFixed(2)),
        });
      }
    }
  }

  const warnings = [
    ...duplicateIds.map(item => `duplicate id ${item.value} (${item.count})`),
    ...duplicateTitles.map(item => `duplicate title "${item.value}" (${item.count})`),
    ...duplicateIdeas.map(item => `duplicate idea "${item.value.slice(0, 100)}" (${item.count})`),
    ...nearDuplicateIdeas.map(item => `near-duplicate idea ${item.left} <> ${item.right} (${item.similarity})`),
  ];

  return {
    ok: parseErrors.length === 0 && validation.length === 0 && warnings.length === 0,
    group,
    totalBlocks: blocks.length,
    parseErrors,
    validation,
    warnings,
    counts: {
      bySectionType: countBy(blocks, block => block.section_type),
      byBusinessType: countBy(blocks, block => block.business_type),
      byCategory: countBy(blocks, block => block.tags?.category || []),
      byLaunchStatus: countBy(blocks, block => block.tags?.launch_status || []),
      byPlatform: countBy(blocks, block => block.tags?.platform || []),
    },
  };
}

const options = parseArgs(process.argv.slice(2));
if (options.files.length === 0) {
  console.error("Usage: node scripts/strategy-library/validate_batch002_drafts.mjs [--group salon] <draft.jsonl>");
  process.exit(1);
}

const rows = options.files.flatMap(readJsonl);
const report = buildReport(rows, options);
const reportPath = path.join(root, "reports/strategy-library-drafts/batch002_quality_latest.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  ok: report.ok,
  group: report.group,
  files: options.files.map(filePath => path.relative(root, filePath)),
  totalBlocks: report.totalBlocks,
  validationProblems: report.validation.length,
  warnings: report.warnings.length,
  report: path.relative(root, reportPath),
}, null, 2));

if (!report.ok) {
  process.exitCode = 1;
}
