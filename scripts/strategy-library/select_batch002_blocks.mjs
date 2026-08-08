import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();

function parseArgs(argv) {
  const options = {
    group: "",
    out: "",
    ids: [],
    inputs: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--group") options.group = argv[++index] || "";
    else if (arg.startsWith("--group=")) options.group = arg.slice("--group=".length);
    else if (arg === "--out") options.out = argv[++index] || "";
    else if (arg.startsWith("--out=")) options.out = arg.slice("--out=".length);
    else if (arg === "--id") options.ids.push(argv[++index] || "");
    else if (arg.startsWith("--id=")) options.ids.push(arg.slice("--id=".length));
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

function validate(filePath, group) {
  const args = [
    "scripts/strategy-library/validate_batch002_drafts.mjs",
    ...(group ? ["--group", group] : []),
    filePath,
  ];
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

const options = parseArgs(process.argv.slice(2));
if (!options.out || options.ids.length === 0 || options.inputs.length === 0) {
  console.error("Usage: node scripts/strategy-library/select_batch002_blocks.mjs --group salon --out data/strategy-library/drafts/selected.jsonl --id block_id <input.jsonl...>");
  process.exit(1);
}

const wanted = new Set(options.ids);
const blocks = options.inputs.flatMap(readJsonl).filter(block => wanted.has(block.id));
const missing = options.ids.filter(id => !blocks.some(block => block.id === id));
if (missing.length > 0) {
  console.error(`Missing requested IDs: ${missing.join(", ")}`);
  process.exit(1);
}

const outFile = path.resolve(root, options.out);
writeJsonl(outFile, blocks);
const result = validate(outFile, options.group);

console.log(JSON.stringify({
  ok: result.ok,
  output: path.relative(root, outFile),
  selectedIds: options.ids,
  blocks: blocks.length,
}, null, 2));

if (!result.ok) {
  if (result.stdout) process.stderr.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exitCode = 1;
}
