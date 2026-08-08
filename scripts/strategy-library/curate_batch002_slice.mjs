import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
const reportsDir = path.join(root, "reports/strategy-library-drafts");

function parseArgs(argv) {
  const options = {
    group: "",
    base: "",
    slice: "",
    acceptedOut: "",
    rejectedOut: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--group") options.group = argv[++index] || "";
    else if (arg.startsWith("--group=")) options.group = arg.slice("--group=".length);
    else if (arg === "--base") options.base = argv[++index] || "";
    else if (arg.startsWith("--base=")) options.base = arg.slice("--base=".length);
    else if (arg === "--slice") options.slice = argv[++index] || "";
    else if (arg.startsWith("--slice=")) options.slice = arg.slice("--slice=".length);
    else if (arg === "--accepted-out") options.acceptedOut = argv[++index] || "";
    else if (arg.startsWith("--accepted-out=")) options.acceptedOut = arg.slice("--accepted-out=".length);
    else if (arg === "--rejected-out") options.rejectedOut = argv[++index] || "";
    else if (arg.startsWith("--rejected-out=")) options.rejectedOut = arg.slice("--rejected-out=".length);
  }

  return options;
}

function readJsonl(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeJsonl(filePath, blocks) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, blocks.length ? `${blocks.map(block => JSON.stringify(block)).join("\n")}\n` : "");
}

function validateBlocks(blocks, group) {
  const tmpFile = path.join(os.tmpdir(), `batch002-curate-${crypto.randomUUID()}.jsonl`);
  writeJsonl(tmpFile, blocks);
  const result = spawnSync(process.execPath, [
    "scripts/strategy-library/validate_batch002_drafts.mjs",
    ...(group ? ["--group", group] : []),
    tmpFile,
  ], {
    cwd: root,
    encoding: "utf8",
  });

  fs.rmSync(tmpFile, { force: true });

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
    report,
  };
}

function rejectionReasons(validation) {
  const problems = [];
  for (const item of validation.report?.validation || []) {
    problems.push(...item.problems);
  }
  problems.push(...(validation.report?.warnings || []));
  return [...new Set(problems)].slice(0, 12);
}

function renderReview({ group, basePath, slicePath, acceptedPath, rejectedPath, accepted, rejected }) {
  fs.mkdirSync(reportsDir, { recursive: true });
  const reviewPath = path.join(reportsDir, `${path.basename(slicePath, path.extname(slicePath))}-curation-review.md`);
  const lines = [
    `# Batch 002 Slice Curation: ${group}`,
    "",
    `Base: \`${path.relative(root, basePath)}\``,
    `Slice: \`${path.relative(root, slicePath)}\``,
    `Accepted output: \`${path.relative(root, acceptedPath)}\``,
    `Rejected output: \`${path.relative(root, rejectedPath)}\``,
    "",
    `Accepted blocks: ${accepted.length}`,
    `Rejected blocks: ${rejected.length}`,
    "",
    "No D1 import has been created or executed.",
    "",
  ];

  if (accepted.length) {
    lines.push("## Accepted", "");
    for (const block of accepted) {
      lines.push(`- ${block.id}: ${block.title}`);
    }
    lines.push("");
  }

  if (rejected.length) {
    lines.push("## Rejected", "");
    for (const item of rejected) {
      lines.push(`- ${item.block.id}: ${item.block.title} — ${item.reasons.join("; ")}`);
    }
    lines.push("");
  }

  fs.writeFileSync(reviewPath, `${lines.join("\n")}\n`);
  return reviewPath;
}

const options = parseArgs(process.argv.slice(2));
if (!options.group || !options.base || !options.slice || !options.acceptedOut) {
  console.error("Usage: node scripts/strategy-library/curate_batch002_slice.mjs --group salon --base reviewed.jsonl --slice slice.jsonl --accepted-out selected.jsonl [--rejected-out rejected.jsonl]");
  process.exit(1);
}

const basePath = path.resolve(root, options.base);
const slicePath = path.resolve(root, options.slice);
const acceptedPath = path.resolve(root, options.acceptedOut);
const rejectedPath = path.resolve(root, options.rejectedOut || options.acceptedOut.replace(/\.jsonl$/, "-rejected.jsonl"));

const baseBlocks = readJsonl(basePath);
const sliceBlocks = readJsonl(slicePath);
const accepted = [];
const rejected = [];

for (const block of sliceBlocks) {
  const singleValidation = validateBlocks([block], options.group);
  if (!singleValidation.ok) {
    rejected.push({ block, reasons: rejectionReasons(singleValidation) });
    continue;
  }

  const combinedValidation = validateBlocks([...baseBlocks, ...accepted, block], options.group);
  if (!combinedValidation.ok) {
    rejected.push({ block, reasons: rejectionReasons(combinedValidation) });
    continue;
  }

  accepted.push(block);
}

writeJsonl(acceptedPath, accepted);
writeJsonl(rejectedPath, rejected.map(item => ({
  ...item.block,
  rejection_reasons: item.reasons,
})));

const reviewPath = renderReview({
  group: options.group,
  basePath,
  slicePath,
  acceptedPath,
  rejectedPath,
  accepted,
  rejected,
});

console.log(JSON.stringify({
  ok: true,
  group: options.group,
  accepted: accepted.length,
  rejected: rejected.length,
  acceptedOut: path.relative(root, acceptedPath),
  rejectedOut: path.relative(root, rejectedPath),
  review: path.relative(root, reviewPath),
}, null, 2));
