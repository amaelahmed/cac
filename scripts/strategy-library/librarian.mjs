/**
 * The librarian: it grades the strategy library and shows where it is thin.
 *
 *   npm run library:audit            grade every block, print the worst
 *   npm run library:audit -- --gaps  show which kinds of business are covered
 *   npm run library:audit -- --fix   write corrected quality scores to a new file
 *   npm run library:audit -- --id X  explain one block's score
 *
 * WHY THIS EXISTS
 *
 * Every one of the 500 blocks in the library is stored with quality_score 5,
 * and the report engine will only ever use blocks scored 4 or 5. But nothing
 * ever measured them. When we did, one sentence turned out to appear in nearly
 * half the library, with only the trade name swapped:
 *
 *   "This works for a <TYPE> because people decide faster when they can see
 *    proof, understand the offer, and know the next step..."     240 times
 *
 * That is the same defect the report engine had: personalised by industry, not
 * by business. Generating more blocks before fixing the grading would multiply
 * it, so the grader comes first and generation is gated behind it.
 *
 * Grading is deterministic and free - no API key, no calls.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { gradeBlocks } from "./library-grader.mjs";

const LIBRARY_DIR = "data/strategy-library";
const argv = process.argv.slice(2);
const has = flag => argv.includes(`--${flag}`);
const valueOf = (flag, fallback = "") => {
  const i = argv.indexOf(`--${flag}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

function loadBlocks() {
  const files = readdirSync(LIBRARY_DIR)
    .filter(name => name.endsWith(".jsonl"))
    .map(name => join(LIBRARY_DIR, name));
  const blocks = [];
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n").filter(line => line.trim());
    lines.forEach((line, index) => {
      try {
        const block = JSON.parse(line);
        block._file = file;
        block._line = index + 1;
        blocks.push(block);
      } catch {
        console.error(`  could not read ${file} line ${index + 1}`);
      }
    });
  }
  return blocks;
}

const blocks = loadBlocks();
if (!blocks.length) {
  console.error(`No library files found in ${LIBRARY_DIR}`);
  process.exit(1);
}
const graded = gradeBlocks(blocks);

if (has("id")) {
  const wanted = valueOf("id");
  const row = graded.find(item => item.id === wanted);
  if (!row) { console.error(`No block with id ${wanted}`); process.exit(1); }
  console.log(`\n${row.id}  —  ${row.title}\n`);
  console.log(`  stored as quality ${row.claimed}, actually scores ${row.score}\n`);
  if (!row.faults.length) console.log("  nothing wrong with it.");
  row.faults.forEach(fault => console.log(`  - ${fault}`));
  console.log();
  process.exit(0);
}

if (has("gaps")) {
  const usable = new Map();
  const total = new Map();
  for (const row of graded) {
    for (const tag of row.categories) {
      total.set(tag, (total.get(tag) || 0) + 1);
      if (row.score >= 4) usable.set(tag, (usable.get(tag) || 0) + 1);
    }
  }
  console.log("\nWHAT YOUR LIBRARY COVERS\n");
  console.log("The report engine can only use pieces scored 4 or 5.\n");
  console.log("  usable / stored   kind of business");
  const rows = [...total.entries()]
    .map(([tag, count]) => ({ tag, total: count, usable: usable.get(tag) || 0 }))
    .sort((a, b) => a.usable - b.usable || b.total - a.total);
  for (const row of rows) {
    const flag = row.usable === 0 ? "  <- nothing usable" : row.usable < 10 ? "  <- thin" : "";
    console.log(`  ${String(row.usable).padStart(6)} / ${String(row.total).padEnd(6)}  ${row.tag}${flag}`);
  }
  console.log();
  process.exit(0);
}

// Default: the report card.
const usable = graded.filter(row => row.score >= 4);
const byScore = new Map();
for (const row of graded) byScore.set(row.score, (byScore.get(row.score) || 0) + 1);

console.log("\nLIBRARY REPORT CARD\n");
console.log(`  ${graded.length} pieces stored`);
console.log(`  ${graded.filter(r => r.claimed >= 4).length} of them claim to be good enough to use`);
console.log(`  ${usable.length} actually are\n`);
console.log("  score   pieces");
for (const score of [5, 4, 3, 2, 1]) {
  const count = byScore.get(score) || 0;
  const bar = "#".repeat(Math.round((count / graded.length) * 40));
  console.log(`  ${score}       ${String(count).padStart(4)}  ${bar}`);
}

const faultCounts = new Map();
for (const row of graded) {
  for (const fault of row.faults) {
    const kind = fault.replace(/\d+/g, "N").replace(/".*"/, '"..."');
    faultCounts.set(kind, (faultCounts.get(kind) || 0) + 1);
  }
}
console.log("\n  most common problems\n");
[...faultCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
  .forEach(([kind, count]) => console.log(`  ${String(count).padStart(4)}x  ${kind}`));

console.log("\n  worst pieces\n");
graded.slice().sort((a, b) => a.score - b.score).slice(0, 5).forEach(row => {
  console.log(`  [${row.score}] ${row.id}  ${row.title.slice(0, 60)}`);
  row.faults.slice(0, 2).forEach(fault => console.log(`        ${fault}`));
});

if (has("fix")) {
  const out = join(LIBRARY_DIR, "graded.jsonl");
  const lines = graded.map(row => JSON.stringify({ ...row.block, quality_score: row.score, graded_faults: row.faults }));
  // _file and _line are bookkeeping, not part of a block.
  const cleaned = lines.map(line => {
    const parsed = JSON.parse(line);
    delete parsed._file;
    delete parsed._line;
    return JSON.stringify(parsed);
  });
  writeFileSync(out, `${cleaned.join("\n")}\n`);
  console.log(`\n  wrote corrected scores to ${out}`);
  console.log("  nothing live changed - import it when you are ready.");
}
console.log();
