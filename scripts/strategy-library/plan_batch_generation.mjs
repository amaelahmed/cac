import fs from "fs";
import path from "path";

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (current !== path.dirname(current)) {
    if (fs.existsSync(path.join(current, "data/strategy-library/taxonomy"))) return current;
    current = path.dirname(current);
  }
  return path.resolve(startDir);
}

const root = findRepoRoot(process.cwd());
const docsDir = path.join(root, "docs");
const reportsDir = path.join(root, "reports");

const approvedSources = [
  path.join(root, "data/strategy-library/review-batch-001.jsonl"),
  path.join(root, "data/strategy-library/blocks/review-001"),
];

const draftSources = [
  path.join(root, "data/strategy-library/drafts"),
];

const sectionLabels = {
  simple_summary_first_priority: "Simple summary / first priority",
  customer_problem: "Customer problem",
  what_customers_think: "What customers think",
  example_customer_type: "Example customer type",
  competitor_comparison: "Competitor comparison",
  post_idea: "Post idea",
  caption: "Caption",
  whatsapp_message: "WhatsApp / message",
  google_business_local_action: "Google Business / local action",
  offer: "Offer",
  measurement: "Measurement",
  advanced_growth: "Advanced growth",
  calendar_day_or_recipe: "Calendar day / recipe",
};

const batch002Clusters = [
  {
    name: "Salon",
    archetypes: ["salon"],
    draftTarget: 40,
    reason: "High local demand, service trust issues, hygiene and booking logic.",
  },
  {
    name: "Cafe / small food counter",
    archetypes: ["cafe"],
    draftTarget: 40,
    reason: "Food businesses need taste, menu, footfall, repeat visit, and local discovery cards.",
  },
  {
    name: "Clothing store",
    archetypes: ["clothing_store"],
    draftTarget: 40,
    reason: "Retail logic needs size, fit, new arrivals, WhatsApp catalogue, and offer cards.",
  },
  {
    name: "Local service",
    archetypes: ["home_cleaning", "plumber_electrician"],
    draftTarget: 40,
    reason: "Service cards must handle trust, price doubt, urgency, before-after proof, and home visits.",
  },
  {
    name: "Running custom gifts / products",
    archetypes: ["customised_gifts"],
    draftTarget: 40,
    reason: "Batch 001 covers pre-launch custom gifts; running-business variants are still missing.",
  },
  {
    name: "Restaurant / bakery",
    archetypes: ["restaurant", "bakery"],
    draftTarget: 40,
    reason: "Food operators need menu clarity, daily specials, reviews, repeat orders, and local discovery.",
  },
  {
    name: "Tuition / coaching",
    archetypes: ["tuition_centre", "language_coaching"],
    draftTarget: 40,
    reason: "Education cards need parent trust, student outcomes, demo class, syllabus, and enquiry logic.",
  },
  {
    name: "Clinic",
    archetypes: ["dental_clinic", "general_clinic"],
    draftTarget: 40,
    reason: "Clinics need safety, doctor trust, appointment clarity, reviews, and local search logic.",
  },
  {
    name: "Photographer / event",
    archetypes: ["photographer_videographer", "event_planner"],
    draftTarget: 40,
    reason: "Project businesses need portfolio proof, package clarity, dates, WhatsApp follow-up, and referrals.",
  },
  {
    name: "Real estate / professional",
    archetypes: ["real_estate_agent", "consulting_service"],
    draftTarget: 40,
    reason: "Lead-driven services need trust, qualification, proof, local relevance, and follow-up cards.",
  },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function listJsonlFiles(source) {
  if (!fs.existsSync(source)) return [];
  const stats = fs.statSync(source);
  if (stats.isFile()) return source.endsWith(".jsonl") ? [source] : [];

  return fs.readdirSync(source, { withFileTypes: true }).flatMap(entry => {
    const child = path.join(source, entry.name);
    if (entry.isDirectory()) return listJsonlFiles(child);
    if (!entry.name.endsWith(".jsonl")) return [];
    return [child];
  });
}

function readJsonl(filePath, sourceType) {
  const raw = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").trim() : "";
  if (!raw) return [];
  return raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
    try {
      return {
        sourceType,
        filePath,
        line: index + 1,
        block: JSON.parse(line),
      };
    } catch (error) {
      return {
        sourceType,
        filePath,
        line: index + 1,
        parseError: error.message,
      };
    }
  });
}

function collectApprovedBlocks() {
  const files = approvedSources.flatMap(listJsonlFiles).sort();
  const byId = new Map();
  const parseErrors = [];

  for (const file of files) {
    for (const record of readJsonl(file, "approved")) {
      if (record.parseError) {
        parseErrors.push(record);
        continue;
      }
      const id = record.block?.id || `${path.relative(root, file)}:${record.line}`;
      if (!byId.has(id)) byId.set(id, record);
    }
  }

  return { records: [...byId.values()], parseErrors, files };
}

function collectDraftBlocks() {
  const files = draftSources
    .flatMap(listJsonlFiles)
    .filter(file => /reviewed/i.test(path.basename(file)))
    .sort();
  const byId = new Map();
  const parseErrors = [];

  for (const file of files) {
    for (const record of readJsonl(file, "draft")) {
      if (record.parseError) {
        parseErrors.push(record);
        continue;
      }
      const id = record.block?.id || `${path.relative(root, file)}:${record.line}`;
      if (!byId.has(id)) byId.set(id, record);
    }
  }

  return { records: [...byId.values()], parseErrors, files };
}

function flattenText(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).filter(Boolean).join(" ");
  return "";
}

function normalize(value) {
  return flattenText(value)
    .toLowerCase()
    .replace(/[_/-]+/g, " ")
    .replace(/\{\{[^}]+\}\}/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(item => item !== undefined && item !== null && item !== "");
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function tagValues(block, tagName) {
  const legacyName = `${tagName}_tags`;
  const legacy = block?.[legacyName] || [];
  const modern = block?.tags?.[tagName] || [];

  if (tagName === "category") return [...asArray(legacy), ...asArray(modern), ...asArray(block?.business_type)];
  if (tagName === "launch_status") return [...asArray(legacy), ...asArray(modern), ...asArray(block?.launch_status)];
  return [...asArray(legacy), ...asArray(modern)];
}

function visibleBlockText(block) {
  return normalize({
    id: block?.id,
    title: block?.title,
    domain: block?.domain,
    section_type: block?.section_type,
    business_type: block?.business_type,
    content_json: block?.content_json,
    simple_explanation: block?.simple_explanation,
    do_this: block?.do_this,
    copy_ready_text: block?.copy_ready_text,
    example_for_business: block?.example_for_business,
    tags: block?.tags,
    category_tags: block?.category_tags,
    product_type_tags: block?.product_type_tags,
    business_model_tags: block?.business_model_tags,
  });
}

function includesAny(text, patterns) {
  return patterns.some(pattern => pattern.test(text));
}

function classifyArchetype(block, archetypes) {
  const text = visibleBlockText(block);
  const explicit = normalize([block?.business_type, block?.domain, tagValues(block, "category"), tagValues(block, "product_type")]);

  if (includesAny(explicit, [/\bsalon\b/, /\bbeauty studio\b/, /\bbridal\b/, /\bhair\b/, /\bgrooming\b/])) {
    return "salon";
  }

  if (includesAny(explicit, [/\bcustomised products?\b/, /\bcustomized products?\b/, /\bcustomised gift\b/, /\bcustomized gift\b/, /\bcustom product\b/, /\bphoto gift\b/, /\bgifts?\b/])) {
    return "customised_gifts";
  }

  if (includesAny(explicit, [/\bcafe\b/, /\bcoffee\b/, /\bjuice\b/])) return "cafe";
  if (includesAny(explicit, [/\bclothing\b/, /\bfashion\b/, /\bapparel\b/])) return "clothing_store";
  if (includesAny(explicit, [/\bhome cleaning\b/, /\bcleaning service\b/])) return "home_cleaning";
  if (includesAny(explicit, [/\bplumber\b/, /\belectrician\b/])) return "plumber_electrician";
  if (includesAny(explicit, [/\brestaurant\b/])) return "restaurant";
  if (includesAny(explicit, [/\bbakery\b/])) return "bakery";
  if (includesAny(explicit, [/\btuition\b/])) return "tuition_centre";
  if (includesAny(explicit, [/\bcoaching\b/])) return "tuition_centre";
  if (includesAny(explicit, [/\bdental\b/])) return "dental_clinic";
  if (includesAny(explicit, [/\bclinic\b/])) return "general_clinic";

  for (const archetype of archetypes) {
    const candidates = [archetype.id, archetype.name, ...(archetype.aliases || [])].map(normalize).filter(Boolean);
    if (candidates.some(candidate => text.includes(candidate))) return archetype.id;
  }

  return "unknown";
}

function classifySection(block) {
  const sectionType = String(block?.section_type || "").trim().toLowerCase();
  const sectionText = normalize(block?.section_type);
  const domain = normalize(block?.domain);
  const text = visibleBlockText(block);
  const combined = `${sectionText} ${domain} ${text}`;

  const direct = {
    first_priority: "simple_summary_first_priority",
    simple_summary: "simple_summary_first_priority",
    seven_day_plan: "simple_summary_first_priority",
    thirty_day_calendar: "calendar_day_or_recipe",
    google_business_action: "google_business_local_action",
    local_action: "google_business_local_action",
    offer_idea: "offer",
    whatsapp_message: "whatsapp_message",
    caption: "caption",
    measurement: "measurement",
    instagram_action: "post_idea",
    customer_question: "what_customers_think",
    confidence_step: "customer_problem",
    customer_problem_card: "customer_problem",
    google_business_card: "google_business_local_action",
    local_discovery_card: "google_business_local_action",
    nearby_search_card: "google_business_local_action",
    review_request_card: "google_business_local_action",
    whatsapp_reply_card: "whatsapp_message",
    delay_message_card: "whatsapp_message",
    no_show_policy_card: "whatsapp_message",
    simple_offer_card: "offer",
    student_offer_card: "offer",
    family_package_card: "offer",
    repeat_visit_card: "advanced_growth",
    referral_card: "advanced_growth",
    festival_booking_card: "advanced_growth",
    event_rush_card: "advanced_growth",
    instagram_content_card: "post_idea",
    instagram_story_card: "post_idea",
    staff_intro_card: "post_idea",
    men_grooming_card: "post_idea",
    hygiene_proof_card: "customer_problem",
    booking_trust_card: "customer_problem",
    service_menu_card: "simple_summary_first_priority",
    stylist_trust_card: "what_customers_think",
    aftercare_card: "customer_problem",
    bridal_trial_card: "customer_problem",
    walk_in_booking_card: "customer_problem",
  };

  if (direct[sectionType]) return direct[sectionType];

  if (/\bcalendar\b|\bday\b|\bpost type\b/.test(combined)) return "calendar_day_or_recipe";
  if (/\bwhatsapp\b|\breply\b|\bmessage\b/.test(combined)) return "whatsapp_message";
  if (/\bcaption\b/.test(combined)) return "caption";
  if (/\bcompetitor\b|\bcompare\b|\balternative\b/.test(combined)) return "competitor_comparison";
  if (/\boffer\b|\bdiscount\b|\btrial\b|\bpackage\b/.test(combined)) return "offer";
  if (/\bgoogle\b|\blocal\b|\bnear me\b|\breview\b/.test(combined)) return "google_business_local_action";
  if (/\bmeasure\b|\bcheck\b|\bkpi\b|\bworked\b/.test(combined)) return "measurement";
  if (/\badvanced\b|\bgrowth\b|\breferral\b|\brepeat\b/.test(combined)) return "advanced_growth";
  if (/\bpersona\b|\bcustomer type\b|\bexample customer\b/.test(combined)) return "example_customer_type";
  if (/\bthink\b|\bfear\b|\bquestion\b|\bdoubt\b/.test(combined)) return "what_customers_think";
  if (/\binstagram\b|\breel\b|\bstory\b|\bpost\b/.test(combined)) return "post_idea";
  if (/\bproblem\b|\bpain\b|\btrust\b|\bconfused\b|\bsafe\b/.test(combined)) return "customer_problem";

  return "simple_summary_first_priority";
}

function emptySectionCounts(sectionMinimums) {
  return Object.fromEntries(Object.keys(sectionMinimums).map(section => [section, 0]));
}

function buildCoverage({ archetypes, sectionMinimums, approvedRecords, draftRecords }) {
  const coverage = new Map();
  for (const archetype of archetypes) {
    coverage.set(archetype.id, {
      archetype,
      approved: 0,
      draft: 0,
      approvedSections: emptySectionCounts(sectionMinimums),
      draftSections: emptySectionCounts(sectionMinimums),
      files: new Set(),
      draftFiles: new Set(),
    });
  }

  const unknown = [];
  const applyRecord = record => {
    const block = record.block;
    const archetypeId = classifyArchetype(block, archetypes);
    const section = classifySection(block);
    const target = coverage.get(archetypeId);
    if (!target) {
      unknown.push({ archetypeId, section, record });
      return;
    }

    if (record.sourceType === "approved") {
      target.approved += 1;
      target.approvedSections[section] = (target.approvedSections[section] || 0) + 1;
      target.files.add(path.relative(root, record.filePath));
    } else {
      target.draft += 1;
      target.draftSections[section] = (target.draftSections[section] || 0) + 1;
      target.draftFiles.add(path.relative(root, record.filePath));
    }
  };

  approvedRecords.forEach(applyRecord);
  draftRecords.forEach(applyRecord);

  return { coverage: [...coverage.values()], unknown };
}

function sectionTotal(row, section, includeDraft = true) {
  return (row.approvedSections[section] || 0) + (includeDraft ? row.draftSections[section] || 0 : 0);
}

function missingSections(row, sectionMinimums, includeDraft = true) {
  return Object.entries(sectionMinimums)
    .map(([section, minimum]) => {
      const current = sectionTotal(row, section, includeDraft);
      return {
        section,
        current,
        minimum,
        missing: Math.max(0, minimum - current),
      };
    })
    .filter(item => item.missing > 0);
}

function runtimeStatus(row, rules) {
  const enough = rules.runtime_matching_policy?.enough_approved_blocks_threshold || 40;
  const partial = rules.runtime_matching_policy?.partial_approved_blocks_threshold || 12;
  if (row.approved >= enough) return "approved full-plan ready";
  if (row.approved >= partial) return "approved partial plan";
  if (row.approved + row.draft >= partial) return "draft progress only";
  return "not enough approved blocks";
}

function readinessRank(status) {
  if (status === "approved full-plan ready") return 0;
  if (status === "approved partial plan") return 1;
  if (status === "draft progress only") return 2;
  return 3;
}

function markdownTable(headers, rows) {
  const divider = headers.map(() => "---");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...rows.map(row => `| ${row.map(cell => String(cell).replace(/\n/g, " ").replace(/\|/g, "\\|")).join(" | ")} |`),
  ].join("\n");
}

function formatMissing(missing, limit = 4) {
  if (!missing.length) return "none";
  return missing
    .slice(0, limit)
    .map(item => `${sectionLabels[item.section] || item.section} -${item.missing}`)
    .join("; ");
}

function groupBy(items, getter) {
  return items.reduce((acc, item) => {
    const key = getter(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function buildInventorySummary(approvedCollection, draftCollection, coverage) {
  const approvedTotal = coverage.reduce((sum, row) => sum + row.approved, 0);
  const draftTotal = coverage.reduce((sum, row) => sum + row.draft, 0);
  const ready = coverage.filter(row => runtimeStatus(row, rules) === "approved full-plan ready").length;
  const draftProgress = coverage.filter(row => runtimeStatus(row, rules) === "draft progress only").length;

  return {
    approvedTotal,
    draftTotal,
    ready,
    draftProgress,
    approvedFiles: approvedCollection.files.map(file => path.relative(root, file)),
    draftFiles: draftCollection.files.map(file => path.relative(root, file)),
  };
}

function batch002Rows(coverage, rules) {
  const coverageById = new Map(coverage.map(row => [row.archetype.id, row]));
  const perCluster = batch002Clusters.map(cluster => {
    const approved = cluster.archetypes.reduce((sum, id) => sum + (coverageById.get(id)?.approved || 0), 0);
    const draft = cluster.archetypes.reduce((sum, id) => sum + (coverageById.get(id)?.draft || 0), 0);
    const names = cluster.archetypes.map(id => coverageById.get(id)?.archetype.name || id).join(", ");
    const runtime = approved >= (rules.runtime_matching_policy?.enough_approved_blocks_threshold || 40)
      ? "runtime ready"
      : approved > 0
        ? "partial approved"
        : draft > 0
          ? "draft only"
          : "empty";
    return [
      cluster.name,
      names,
      cluster.draftTarget,
      approved,
      draft,
      runtime,
      cluster.reason,
    ];
  });

  return perCluster;
}

function buildCoverageMatrixDoc({ archetypes, rules, modifiers, coverage, inventory }) {
  const rowsByGroup = groupBy(coverage, row => `${row.archetype.group}. ${row.archetype.group_label}`);
  const sectionRows = Object.entries(rules.minimum_per_archetype).map(([section, minimum]) => [
    sectionLabels[section] || section,
    minimum,
  ]);

  const groupSections = Object.entries(rowsByGroup).map(([groupName, rows]) => {
    const tableRows = rows
      .sort((a, b) => (a.archetype.priority_rank || 999) - (b.archetype.priority_rank || 999))
      .map(row => {
        const status = runtimeStatus(row, rules);
        const missing = missingSections(row, rules.minimum_per_archetype, true);
        return [
          row.archetype.name,
          row.archetype.id,
          row.archetype.batch_priority,
          row.approved,
          row.draft,
          Math.max(0, rules.minimum_total_per_archetype - row.approved - row.draft),
          formatMissing(missing),
          status,
        ];
      });

    return `### ${groupName}\n\n${markdownTable(
      ["Business archetype", "ID", "Batch", "Approved", "Draft", "Missing to 125", "Biggest section gaps", "Runtime status"],
      tableRows,
    )}`;
  }).join("\n\n");

  return `# Business Model Coverage Matrix

Generated by \`scripts/strategy-library/plan_batch_generation.mjs\`.

## Current Truth

- Archetypes defined: ${archetypes.length}
- Approved action-card blocks counted: ${inventory.approvedTotal}
- Reviewed draft blocks counted: ${inventory.draftTotal}
- Runtime full-plan-ready archetypes: ${inventory.ready}
- Draft-progress-only archetypes: ${inventory.draftProgress}
- Batch 001 is only a Cartroid-style preview/reference: pre-launch customised gifts/products, Instagram, WhatsApp, Google Business, students/Gen-Z, Kozhikode/Calicut.
- Draft blocks are planning evidence only. They are not runtime-approved until manually approved and imported.

## Launch Stages Every Archetype Must Support

${(modifiers.launch_stages || []).map(stage => `- ${stage.id}: ${stage.name || stage.id}`).join("\n")}

## Minimum Coverage Per Archetype

Every archetype needs ${rules.minimum_total_per_archetype} approved blocks before it can be considered complete.

${markdownTable(["Section", "Minimum blocks"], sectionRows)}

## Batch 002 Multi-Type Plan

Batch 002 should prove broad coverage, not one deep vertical. Recommended core wave: 10 clusters, 400 draft blocks total, then manual review before any D1 import.

${markdownTable(
  ["Cluster", "Archetypes", "Draft target", "Approved now", "Draft now", "Current state", "Why it matters"],
  batch002Rows(coverage, rules),
)}

## Runtime Guardrails

- Enough approved blocks: ${rules.runtime_matching_policy.enough_approved_blocks_threshold}
- Partial approved blocks: ${rules.runtime_matching_policy.partial_approved_blocks_threshold}
- No approved blocks behavior: ${rules.runtime_matching_policy.no_approved_blocks_behavior}
- Wrong-business content policy: ${rules.runtime_matching_policy.wrong_business_content_policy}
- Fallback order: approved business-specific blocks, then approved channel blocks, then approved universal blocks, then closest safe archetype only if the exclusion rules allow it.
- Never show salon advice to cafes, cafe advice to clinics, software/SaaS advice to non-software businesses, or custom-gift advice to generic retail unless the product type is explicitly custom/personalised.

## Full Coverage Matrix

${groupSections}
`;
}

function buildGapReport({ archetypes, rules, coverage, inventory, unknown, approvedCollection, draftCollection }) {
  const rowsWithStatus = coverage.map(row => ({
    ...row,
    status: runtimeStatus(row, rules),
    missingTotal: Math.max(0, rules.minimum_total_per_archetype - row.approved - row.draft),
  }));

  const priorityRows = rowsWithStatus
    .filter(row => row.archetype.batch_priority === "batch_002")
    .sort((a, b) => readinessRank(a.status) - readinessRank(b.status) || (a.archetype.priority_rank || 999) - (b.archetype.priority_rank || 999));

  const emptyRows = rowsWithStatus
    .filter(row => row.approved === 0 && row.draft === 0)
    .sort((a, b) => (a.archetype.priority_rank || 999) - (b.archetype.priority_rank || 999));

  const priorityTableRows = priorityRows.map(row => [
    row.archetype.name,
    row.archetype.id,
    row.approved,
    row.draft,
    row.missingTotal,
    formatMissing(missingSections(row, rules.minimum_per_archetype, true), 5),
    row.status,
  ]);

  const topEmptyRows = emptyRows.slice(0, 20).map(row => [
    row.archetype.name,
    row.archetype.group_label,
    row.archetype.batch_priority,
    row.archetype.priority_rank,
  ]);

  const sourceRows = [
    ...inventory.approvedFiles.map(file => ["approved", file]),
    ...inventory.draftFiles.map(file => ["reviewed draft", file]),
  ];

  const wrongBusinessTests = (rules.batch_test_matrix || []).map(test => `- ${test}`).join("\n");

  return `# Strategy Library Gap Report

Generated by \`scripts/strategy-library/plan_batch_generation.mjs\`.

## Summary

- Total archetypes defined: ${archetypes.length}
- Approved blocks counted: ${inventory.approvedTotal}
- Reviewed draft blocks counted: ${inventory.draftTotal}
- Runtime full-plan-ready archetypes: ${inventory.ready}
- Draft-progress-only archetypes: ${inventory.draftProgress}
- Empty archetypes: ${emptyRows.length}
- Unknown/unmatched block records: ${unknown.length}

The current library is not production-ready for all business types. It is safe only as a scoped Cartroid/customised-gifts preview plus a small salon draft review set. Do not import Batch 002 or scale to 300-500/2000 blocks until the next generation plan is approved.

## Source Files Counted

${sourceRows.length ? markdownTable(["Status", "File"], sourceRows) : "No source files found."}

Parse errors:

- Approved parse errors: ${approvedCollection.parseErrors.length}
- Draft parse errors: ${draftCollection.parseErrors.length}

## Batch 001 Boundary

Batch 001 should stay labelled as a reference set:

- 51 approved active quality blocks
- 30 calendar blocks
- Scope: pre-launch customised product/gift business
- Channels: Instagram, WhatsApp, Google Business
- Audience: students / Gen-Z
- Location: Kozhikode / Calicut

It must not be used as proof that the system can handle salons, cafes, clothing stores, clinics, restaurants, or professional services.

## Batch 002 Recommended Coverage

Core wave target: 400 draft blocks across 10 business clusters. This keeps Batch 002 within the 300-500 draft range while proving multiple business types.

${markdownTable(
  ["Cluster", "Archetypes", "Draft target", "Approved now", "Draft now", "Current state", "Why it matters"],
  batch002Rows(coverage, rules),
)}

Recommended split inside each 40-block cluster:

- 12 business-specific action cards
- 10 channel cards
- 8 launch-stage cards
- 10 calendar/action recipe cards

Do not generate one business at a time to completion. Generate a balanced starter set across all 10 clusters, validate wrong-business risk, manually review, then decide what to deepen.

## Batch 002 Priority Gaps

${markdownTable(
  ["Archetype", "ID", "Approved", "Draft", "Missing to 125", "Biggest section gaps", "Status"],
  priorityTableRows,
)}

## Empty Archetypes With Highest Priority

${markdownTable(
  ["Archetype", "Group", "Batch", "Priority rank"],
  topEmptyRows,
)}

## Required Wrong-Business Tests

Every generation batch must include these tests before approval:

${wrongBusinessTests}

## Runtime Fallback Rule

The runtime should behave like this:

- Enough approved business-specific blocks: show a full plan.
- Partial approved business-specific blocks: show a useful plan using approved universal and channel blocks.
- No approved blocks for a business type: in admin/testing, show "Not enough approved blocks for this business type yet."
- No live AI fallback should silently produce a full strategy for normal users.
- Never show wrong-business content.

## Next Approval Checkpoint

Before creating/importing any more blocks, approve or edit:

1. The 65-archetype taxonomy.
2. The 10-cluster Batch 002 plan.
3. The 40-block starter target per cluster.
4. The wrong-business test list.
5. The rule that drafts are not runtime-ready until approved and imported.
`;
}

const archetypeTaxonomy = readJson("data/strategy-library/taxonomy/business_archetypes.json");
const modifiers = readJson("data/strategy-library/taxonomy/business_modifiers.json");
const rules = readJson("data/strategy-library/taxonomy/section_coverage_rules.json");
const archetypes = archetypeTaxonomy.archetypes || [];

const approvedCollection = collectApprovedBlocks();
const draftCollection = collectDraftBlocks();
const { coverage, unknown } = buildCoverage({
  archetypes,
  sectionMinimums: rules.minimum_per_archetype,
  approvedRecords: approvedCollection.records,
  draftRecords: draftCollection.records,
});
const inventory = buildInventorySummary(approvedCollection, draftCollection, coverage);

ensureDir(docsDir);
ensureDir(reportsDir);

const matrixPath = path.join(docsDir, "business_model_coverage_matrix.md");
const gapReportPath = path.join(reportsDir, "strategy_library_gap_report.md");

fs.writeFileSync(matrixPath, buildCoverageMatrixDoc({
  archetypes,
  rules,
  modifiers,
  coverage,
  inventory,
}), "utf8");

fs.writeFileSync(gapReportPath, buildGapReport({
  archetypes,
  rules,
  coverage,
  inventory,
  unknown,
  approvedCollection,
  draftCollection,
}), "utf8");

console.log(`Wrote ${path.relative(root, matrixPath)}`);
console.log(`Wrote ${path.relative(root, gapReportPath)}`);
console.log(`Approved blocks counted: ${inventory.approvedTotal}`);
console.log(`Reviewed draft blocks counted: ${inventory.draftTotal}`);
console.log(`Runtime full-plan-ready archetypes: ${inventory.ready}`);
