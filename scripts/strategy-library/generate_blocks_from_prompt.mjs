import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { callNvidiaNim, getAiTaskProfile, getNvidiaNimConfig } from "../../functions/api/engine/aiProviders/nvidiaNim.js";

const root = process.cwd();
const reportsDir = path.join(root, "reports/strategy-library-drafts");

function loadLocalEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadLocalEnvFile(".dev.vars");
loadLocalEnvFile(".env");

const defaultModel = process.env.NVIDIA_NIM_DEFAULT_MODEL || "minimaxai/minimax-m3";

function parseArgs(argv) {
  const args = {
    prompt: "",
    out: "",
    count: "50",
    model: defaultModel,
    maxTokens: "",
    profile: "offline_block_generation",
    draftSchema: "",
    group: "",
    avoid: [],
    focus: [],
    generate: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--generate") {
      args.generate = true;
    } else if (arg === "--prompt") {
      args.prompt = argv[++index] || "";
    } else if (arg === "--out") {
      args.out = argv[++index] || "";
    } else if (arg === "--count") {
      args.count = argv[++index] || "50";
    } else if (arg === "--model") {
      args.model = argv[++index] || defaultModel;
    } else if (arg === "--max-tokens") {
      args.maxTokens = argv[++index] || "";
    } else if (arg === "--profile") {
      args.profile = argv[++index] || "offline_block_generation";
    } else if (arg === "--draft-schema") {
      args.draftSchema = argv[++index] || "";
    } else if (arg === "--group") {
      args.group = argv[++index] || "";
    } else if (arg === "--avoid") {
      args.avoid.push(argv[++index] || "");
    } else if (arg === "--focus") {
      args.focus.push(argv[++index] || "");
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    }
  }

  return args;
}

function usage() {
  return `Usage:
  node scripts/strategy-library/generate_blocks_from_prompt.mjs --prompt prompts/strategy-library/cartroid_custom_gifts_prelaunch.md

Options:
  --prompt <file>   Prompt pack markdown file.
  --out <file>      Output JSONL draft file. Defaults to data/strategy-library/drafts/<prompt>.jsonl
  --count <n>       Requested block count. Defaults to 50.
  --model <name>    NVIDIA NIM model. Defaults to NVIDIA_NIM_DEFAULT_MODEL or ${defaultModel}.
  --max-tokens <n>  Max output tokens. Defaults to offline profile limit.
  --profile <name>  Defaults to offline_block_generation. Do not use this script for runtime calls.
  --draft-schema <strategy_blocks|batch002>
                   Defaults to batch002 for prompts/strategy-library/batch-002/*.
  --group <name>    Optional validation group, such as salon, cafe, clothing.
  --avoid <file>    Existing JSONL draft file whose ideas should not be repeated. Can be repeated.
  --focus <text>    Extra instruction for this slice, such as missing section types.
  --generate        Actually call NVIDIA NIM. Without this, only writes a review request file.

Safety:
  This script never imports into D1. It only writes drafts, validates them, and renders a sample.
`;
}

function readPrompt(promptPath) {
  const resolved = path.resolve(root, promptPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }

  const isBatch002 = resolved.includes(`${path.sep}batch-002${path.sep}`);
  const basePath = isBatch002
    ? path.join(root, "prompts/strategy-library/_batch002_action_card_prompt.md")
    : path.join(root, "prompts/strategy-library/_base_action_card_prompt.md");
  const base = fs.existsSync(basePath) ? fs.readFileSync(basePath, "utf8") : "";
  const pack = fs.readFileSync(resolved, "utf8");
  return {
    resolved,
    name: path.basename(resolved, path.extname(resolved)),
    text: `${base}\n\n${pack}`,
  };
}

function readAvoidBlocks(files) {
  return files.flatMap(fileName => {
    if (!fileName) return [];
    const filePath = path.resolve(root, fileName);
    if (!fs.existsSync(filePath)) return [];
    return fs.readFileSync(filePath, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  });
}

function renderAvoidList(blocks) {
  if (!blocks.length) return "";
  const lines = blocks.slice(0, 80).map(block => {
    const steps = Array.isArray(block.do_this)
      ? block.do_this.slice(0, 2).join(" ")
      : Array.isArray(block.content_json?.what_to_do)
        ? block.content_json.what_to_do.slice(0, 2).join(" ")
        : "";
    return `- ${block.title || block.id}: ${block.simple_explanation || block.content_json?.what_it_means || ""} ${steps}`.trim();
  });
  return `\nAvoid repeating these existing approved draft ideas:\n${lines.join("\n")}\n`;
}

function renderFocusList(items) {
  const clean = items.map(item => String(item || "").trim()).filter(Boolean);
  return clean.length ? `\nFor this slice, focus only on:\n${clean.map(item => `- ${item}`).join("\n")}\n` : "";
}

function buildRequest(promptText, count, draftSchema, avoidBlocks = [], focus = []) {
  const avoidText = renderAvoidList(avoidBlocks);
  const focusText = renderFocusList(focus);
  if (draftSchema === "batch002") {
    return `${promptText}
${avoidText}
${focusText}

USER:
Generate ${count} approved-style draft blocks for this business type.

Rules:
- Keep each block short and crystal clear.
- Include exact steps.
- Include copy-ready text where useful.
- Include a real example.
- Do not mix advice from another business type.
- Do not mention Cartroid unless this batch is specifically for custom gifts.
- Do not invent exact prices, percentages, or performance results.
- Use placeholders like {{businessName}}, {{location}}, {{startingPrice}}, or {{serviceName}} where needed.
- Make every card reusable for many businesses in the same category.
- Use lower_snake_case for domain, section_type, and every tag value.
- Keep copy_ready_text under 320 characters.
- If one card needs multiple reply templates, split them into separate cards.
- In example_for_business, describe how the business would use the card. Do not invent customer reactions, shares, saves, bookings, sales, or review results.
- Return JSONL only: one valid JSON object per line.
- Do not include markdown, comments, explanations, or production import SQL.

Every line must be one JSON object with exactly this action-card shape:

{
  "id": "",
  "title": "",
  "domain": "",
  "section_type": "",
  "business_type": "",
  "launch_status": "",
  "simple_explanation": "",
  "do_this": [],
  "copy_ready_text": "",
  "example_for_business": "",
  "why_this_works": "",
  "how_to_know_it_worked": "",
  "tags": {
    "category": [],
    "launch_status": [],
    "audience": [],
    "platform": [],
    "product_type": [],
    "goal": [],
    "location": [],
    "problem": []
  },
  "quality_score": 5,
  "language_level": "beginner"
}
`;
  }

  return `${promptText}
${avoidText}
${focusText}

Create ${count} draft blocks.

Important:
- Return JSONL only: one valid JSON object per line.
- Every block must use the project schema exactly.
- Every content_json.example must include {{businessName}} or {{location}}.
- Every block must be original.
- Do not include production import SQL.
- Do not include comments.
`;
}

function stripCodeFence(text) {
  return String(text || "")
    .replace(/^```(?:json|jsonl)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseBlocks(rawText) {
  const cleaned = stripCodeFence(rawText);

  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.blocks)) return parsed.blocks;
  } catch {
    // Fall through to JSONL parsing.
  }

  const lines = cleaned.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const blocks = [];
  for (const line of lines) {
    blocks.push(JSON.parse(line));
  }
  return blocks;
}

async function callNvidiaForBlocks({ model, requestText, maxTokens, profile, draftSchema }) {
  const taskProfile = getAiTaskProfile(process.env, profile);
  const batch002System = [
    "You are creating strategy-library blocks for a Cloudflare SaaS that helps small local businesses in India.",
    "Write like a smart business assistant.",
    "Very simple English.",
    "No marketing jargon.",
    "No corporate language.",
    "No long paragraphs.",
    "No fake research.",
    "No raw tags.",
    "No confusing theory.",
    "No invented prices, statistics, or performance claims.",
    "Use placeholders like {{businessName}}, {{location}}, {{startingPrice}}, or {{serviceName}} where needed.",
    "Make every card reusable for many businesses in the same category.",
    "Use lower_snake_case for domain, section_type, and every tag value.",
    "Keep copy_ready_text under 320 characters.",
    "Do not invent customer reactions, shares, saves, bookings, sales, or review results in examples.",
    "Every block must make the user feel: I understand this. This is about my business. I can do this today.",
    "Return JSONL only.",
    "One valid JSON object per line.",
    "Each block must be original, practical, and specific.",
    "Do not use these words in visible card text: heuristic, CAC, CTA, funnel, persona, objections, trust builders, messaging angles, positioning, proof assets, conversion path, low friction, retention engine, leverage, scalable.",
  ].join(" ");
  const response = await callNvidiaNim({
    model,
    maxTokens: Number(maxTokens || process.env.AI_OFFLINE_MAX_OUTPUT_TOKENS || taskProfile.maxOutputTokens || 8000),
    temperature: 0.65,
    responseFormat: "text",
    taskProfile: profile || "offline_block_generation",
    messages: [
      {
        role: "system",
        content: draftSchema === "batch002" ? batch002System : [
          "You are creating strategy-library blocks for a Cloudflare SaaS that helps small local businesses in India.",
          "Write like a smart business assistant.",
          "Use very simple English.",
          "Do not use marketing jargon, corporate language, long paragraphs, fake research, raw tags, or confusing theory.",
          "Every block must make the user feel: I understand this. This is about my business. I can do this today.",
          "Return JSONL only. One valid JSON object per line. No markdown, comments, SQL, or explanations.",
          "Every block must be original, practical, specific, and match the requested business type.",
        ].join(" "),
      },
      {
        role: "user",
        content: requestText,
      },
    ],
  });

  return response.text;
}

function writeJsonl(filePath, blocks) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${blocks.map(block => JSON.stringify(block)).join("\n")}\n`);
}

function reportBaseName(promptName, outFile) {
  const outName = outFile ? path.basename(outFile, path.extname(outFile)) : "";
  return outName || promptName;
}

function renderSample({ promptName, outFile, blocks, validationStatus, draftSchema }) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const samplePath = path.join(reportsDir, `${reportBaseName(promptName, outFile)}-sample.md`);
  const lines = [
    `# Strategy Library Draft Sample: ${promptName}`,
    "",
    `Source JSONL: \`${path.relative(root, outFile)}\``,
    `Validation: ${validationStatus.status}`,
    "",
    "Manual review required before any D1 import.",
    "",
  ];

  for (const block of blocks.slice(0, 12)) {
    lines.push(`## ${block.title || block.id}`);
    lines.push("");
    lines.push(`- Section type: \`${block.section_type || "missing"}\``);
    lines.push(`- Quality score: ${block.quality_score ?? "missing"}`);
    if (draftSchema === "batch002") {
      lines.push(`- Business type: ${block.business_type || ""}`);
      lines.push(`- Launch status: ${block.launch_status || ""}`);
      lines.push(`- Simple explanation: ${block.simple_explanation || ""}`);
      lines.push(`- Do this: ${Array.isArray(block.do_this) ? block.do_this.join(" ") : block.do_this || ""}`);
      lines.push(`- Copy-ready text: ${block.copy_ready_text || ""}`);
      lines.push(`- Example: ${block.example_for_business || ""}`);
      lines.push(`- Why this works: ${block.why_this_works || ""}`);
      lines.push(`- How to know it worked: ${block.how_to_know_it_worked || ""}`);
    } else {
      lines.push(`- Simple explanation: ${block.content_json?.what_it_means || ""}`);
      lines.push(`- Do this: ${Array.isArray(block.content_json?.what_to_do) ? block.content_json.what_to_do.join(" ") : block.content_json?.what_to_do || ""}`);
      lines.push(`- Copy-ready text: ${block.content_json?.example || ""}`);
      lines.push(`- Why this works: ${block.content_json?.why_this_helps || ""}`);
      lines.push(`- How to know it worked: ${block.content_json?.how_to_check || ""}`);
    }
    lines.push("");
  }

  fs.writeFileSync(samplePath, `${lines.join("\n")}\n`);
  return samplePath;
}

function validate(outFile, draftSchema, group) {
  const args = draftSchema === "batch002"
    ? ["scripts/strategy-library/validate_batch002_drafts.mjs", ...(group ? ["--group", group] : []), outFile]
    : ["scripts/strategy-library/validate_strategy_library.mjs", outFile];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status === 0 ? "passed" : "failed",
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status,
  };
}

function renderReview({ promptName, outFile, blocks, validationStatus, samplePath, draftSchema }) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const reviewPath = path.join(reportsDir, `${reportBaseName(promptName, outFile)}-review.md`);
  let validatorReport = null;
  if (validationStatus.stdout) {
    try {
      const summary = JSON.parse(validationStatus.stdout);
      if (summary.report) {
        const reportPath = path.join(root, summary.report);
        if (fs.existsSync(reportPath)) validatorReport = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      }
    } catch {
      validatorReport = null;
    }
  }

  const lines = [
    `# Batch 002 Draft Review: ${promptName}`,
    "",
    `Source JSONL: \`${path.relative(root, outFile)}\``,
    `Sample: \`${path.relative(root, samplePath)}\``,
    `Draft schema: \`${draftSchema}\``,
    `Blocks generated: ${blocks.length}`,
    `Validation: ${validationStatus.status}`,
    "",
    "No D1 import has been created or executed. These are draft blocks for manual review only.",
    "",
    "## Gate Results",
    "",
    `- JSON validity: ${validatorReport?.parseErrors?.length ? "failed" : "passed"}`,
    `- Banned words: ${validatorReport?.validation?.some(item => item.problems.some(problem => problem.includes("banned words"))) ? "failed" : "passed"}`,
    `- Duplicate ideas: ${validatorReport?.warnings?.some(warning => warning.includes("duplicate idea")) ? "failed" : "passed"}`,
    `- Wrong-business mixing: ${validatorReport?.validation?.some(item => item.problems.some(problem => problem.includes("wrong-business"))) ? "failed" : "passed"}`,
    `- Manual approval required: yes`,
    "",
  ];

  if (validatorReport?.validation?.length) {
    lines.push("## Validation Problems", "");
    for (const item of validatorReport.validation.slice(0, 30)) {
      lines.push(`- ${item.id}: ${item.problems.join("; ")}`);
    }
    lines.push("");
  }

  if (validatorReport?.warnings?.length) {
    lines.push("## Warnings", "");
    for (const warning of validatorReport.warnings.slice(0, 30)) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Sample Cards", "");
  for (const block of blocks.slice(0, 8)) {
    lines.push(`### ${block.title || block.id}`);
    lines.push("");
    if (draftSchema === "batch002") {
      lines.push(block.simple_explanation || "");
      lines.push("");
      for (const step of Array.isArray(block.do_this) ? block.do_this : []) {
        lines.push(`- ${step}`);
      }
      lines.push("");
      lines.push(`Copy: ${block.copy_ready_text || ""}`);
      lines.push("");
      lines.push(`Example: ${block.example_for_business || ""}`);
    } else {
      lines.push(block.content_json?.what_it_means || "");
      lines.push("");
      for (const step of Array.isArray(block.content_json?.what_to_do) ? block.content_json.what_to_do : []) {
        lines.push(`- ${step}`);
      }
      lines.push("");
      lines.push(`Copy: ${block.content_json?.example || ""}`);
    }
    lines.push("");
  }

  fs.writeFileSync(reviewPath, `${lines.join("\n")}\n`);
  return reviewPath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.prompt) {
    console.log(usage());
    process.exit(args.help ? 0 : 1);
  }

  const prompt = readPrompt(args.prompt);
  const draftSchema = args.draftSchema || (prompt.resolved.includes(`${path.sep}batch-002${path.sep}`) ? "batch002" : "strategy_blocks");
  const avoidBlocks = readAvoidBlocks(args.avoid);
  const requestText = buildRequest(prompt.text, args.count, draftSchema, avoidBlocks, args.focus);
  fs.mkdirSync(reportsDir, { recursive: true });

  const defaultOut = path.join(root, "data/strategy-library/drafts", `${prompt.name}.jsonl`);
  const outFile = path.resolve(root, args.out || defaultOut);
  const requestPath = path.join(reportsDir, `${prompt.name}-request.md`);
  fs.writeFileSync(requestPath, requestText);

  if (!args.generate) {
    console.log(JSON.stringify({
      mode: "request_only",
      prompt: path.relative(root, prompt.resolved),
      request: path.relative(root, requestPath),
      next: "Add --generate with NVIDIA_NIM_API_KEY to create draft JSONL. No D1 import was performed.",
    }, null, 2));
    return;
  }

  if (!process.env.NVIDIA_NIM_API_KEY) {
    throw new Error("NVIDIA_NIM_API_KEY is required when using --generate.");
  }

  const config = getNvidiaNimConfig();
  const raw = await callNvidiaForBlocks({
    model: args.model || config.model,
    requestText,
    maxTokens: args.maxTokens,
    profile: args.profile,
    draftSchema,
  });
  const blocks = parseBlocks(raw);
  writeJsonl(outFile, blocks);
  const validationStatus = validate(outFile, draftSchema, args.group);
  const samplePath = renderSample({ promptName: prompt.name, outFile, blocks, validationStatus, draftSchema });
  const reviewPath = renderReview({ promptName: prompt.name, outFile, blocks, validationStatus, samplePath, draftSchema });

  console.log(JSON.stringify({
    mode: "generated_draft",
    prompt: path.relative(root, prompt.resolved),
    output: path.relative(root, outFile),
    blocks: blocks.length,
    validation: validationStatus.status,
    sample: path.relative(root, samplePath),
    review: path.relative(root, reviewPath),
    importStatus: "not_imported_manual_approval_required",
    taskProfile: args.profile,
    draftSchema,
  }, null, 2));

  if (validationStatus.exitCode !== 0) {
    console.error(validationStatus.stdout);
    console.error(validationStatus.stderr);
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
