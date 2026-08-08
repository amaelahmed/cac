import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const reportsDir = path.join(root, "reports/strategy-library-drafts");

function parseArgs(argv) {
  const options = {
    group: "",
    out: "",
    inputs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--group") options.group = argv[++index] || "";
    else if (arg.startsWith("--group=")) options.group = arg.slice("--group=".length);
    else if (arg === "--out") options.out = argv[++index] || "";
    else if (arg.startsWith("--out=")) options.out = arg.slice("--out=".length);
    else options.inputs.push(path.resolve(root, arg));
  }

  return options;
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeJsonl(filePath, blocks) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${blocks.map(block => JSON.stringify(block)).join("\n")}\n`);
}

function runValidator(filePath, group) {
  const args = [
    "scripts/strategy-library/validate_batch002_drafts.mjs",
    ...(group ? ["--group", group] : []),
    filePath,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
  });

  let summary = null;
  try {
    summary = JSON.parse(result.stdout);
  } catch {
    summary = null;
  }

  let report = null;
  if (summary?.report) {
    const reportPath = path.join(root, summary.report);
    if (fs.existsSync(reportPath)) report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  }

  return {
    ok: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr,
    summary,
    report,
  };
}

function renderGroupReview({ group, outFile, blocks, inputs, validation }) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const reviewPath = path.join(reportsDir, `${path.basename(outFile, path.extname(outFile))}-group-review.md`);
  const lines = [
    `# Batch 002 Group Review: ${group || "unknown"}`,
    "",
    `Combined JSONL: \`${path.relative(root, outFile)}\``,
    `Total blocks: ${blocks.length}`,
    `Validation: ${validation.ok ? "passed" : "failed"}`,
    "",
    "No D1 import has been created or executed. This combined file is still draft-only and requires manual approval.",
    "",
    "## Source Slices",
    "",
    ...inputs.map(filePath => `- \`${path.relative(root, filePath)}\``),
    "",
    "## Gate Results",
    "",
    `- JSON validity: ${validation.report?.parseErrors?.length ? "failed" : "passed"}`,
    `- Banned words: ${validation.report?.validation?.some(item => item.problems.some(problem => problem.includes("banned words"))) ? "failed" : "passed"}`,
    `- Duplicate ideas: ${validation.report?.warnings?.some(warning => warning.includes("duplicate idea")) ? "failed" : "passed"}`,
    `- Wrong-business mixing: ${validation.report?.validation?.some(item => item.problems.some(problem => problem.includes("wrong-business"))) ? "failed" : "passed"}`,
    "",
  ];

  if (validation.report?.validation?.length) {
    lines.push("## Validation Problems", "");
    for (const item of validation.report.validation.slice(0, 50)) {
      lines.push(`- ${item.id}: ${item.problems.join("; ")}`);
    }
    lines.push("");
  }

  if (validation.report?.warnings?.length) {
    lines.push("## Warnings", "");
    for (const warning of validation.report.warnings.slice(0, 50)) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  lines.push("## Review Sample", "");
  for (const block of blocks.slice(0, 12)) {
    lines.push(`### ${block.title}`);
    lines.push("");
    lines.push(block.simple_explanation || "");
    lines.push("");
    for (const step of Array.isArray(block.do_this) ? block.do_this : []) {
      lines.push(`- ${step}`);
    }
    lines.push("");
    lines.push(`Copy: ${block.copy_ready_text || ""}`);
    lines.push("");
    lines.push(`Example: ${block.example_for_business || ""}`);
    lines.push("");
  }

  fs.writeFileSync(reviewPath, `${lines.join("\n")}\n`);
  return reviewPath;
}

const options = parseArgs(process.argv.slice(2));
if (!options.group || !options.out || options.inputs.length === 0) {
  console.error("Usage: node scripts/strategy-library/merge_batch002_slices.mjs --group salon --out data/strategy-library/drafts/batch-002-group-01-salon-reviewed.jsonl <slice...>");
  process.exit(1);
}

const individualValidations = [];
for (const input of options.inputs) {
  const validation = runValidator(input, options.group);
  individualValidations.push({ input, validation });
}

const failingInputs = individualValidations.filter(item => !item.validation.ok);
if (failingInputs.length > 0) {
  console.error(JSON.stringify({
    ok: false,
    message: "Merge refused because one or more slices failed validation.",
    failingInputs: failingInputs.map(item => path.relative(root, item.input)),
  }, null, 2));
  process.exit(1);
}

const blocks = options.inputs.flatMap(readJsonl);
const outFile = path.resolve(root, options.out);
writeJsonl(outFile, blocks);
const validation = runValidator(outFile, options.group);
const reviewPath = renderGroupReview({
  group: options.group,
  outFile,
  blocks,
  inputs: options.inputs,
  validation,
});

console.log(JSON.stringify({
  ok: validation.ok,
  group: options.group,
  output: path.relative(root, outFile),
  blocks: blocks.length,
  review: path.relative(root, reviewPath),
  importStatus: "not_imported_manual_approval_required",
}, null, 2));

if (!validation.ok) {
  process.exitCode = 1;
}
