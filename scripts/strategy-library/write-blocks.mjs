/**
 * The writer: drafts new library pieces for a trade, then makes them earn a
 * place by passing the grader.
 *
 *   npm run library:write -- --for bakery              draft 8 pieces
 *   npm run library:write -- --for plumber --count 12
 *   npm run library:write -- --gaps                    pick the emptiest trade
 *   npm run library:write -- --for bakery --dry-run    show the prompt, call nothing
 *
 * Nothing is ever written into the live library. Accepted drafts land in
 * data/strategy-library/drafts/ for a human to read and import.
 *
 * WHY IT IS BUILT THIS WAY
 *
 * The previous generator produced 500 pieces that are one template with the
 * trade name swapped in - one sentence appears 240 times across the library.
 * So this one:
 *
 *   1. shows the model the actual repeated sentences and forbids them
 *   2. asks for detail only true of THIS trade, not of any shop
 *   3. grades every draft against the WHOLE existing library, not just itself
 *   4. throws away anything that does not earn a 4 or a 5
 *
 * A run that keeps nothing is a good run. It means the gate held.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gradeBlocks, longStrings, skeleton } from "./library-grader.mjs";

const LIBRARY_DIR = "data/strategy-library";
// Its own folder: data/strategy-library/drafts already holds older drafts in a
// different shape, and mixing them would make an import ambiguous.
const DRAFTS_DIR = join(LIBRARY_DIR, "drafts", "librarian");

// Section slots the report engine fills. A trade needs a spread, not eight of one.
const SECTIONS = [
  ["first_priority", "the single most important thing to do first"],
  ["customer_question", "a real question this trade's customers ask before buying"],
  ["confidence_step", "one thing that makes a nervous first-time buyer feel safe"],
  ["instagram_action", "one post to make, described so it can be shot today"],
  ["whatsapp_message", "a message to send a customer who enquired"],
  ["measurement", "one number to watch this week, and what it means"],
  ["offer_idea", "an offer that suits how this trade actually sells"],
  ["local_action", "something to do offline, near the shop"],
];

const argv = process.argv.slice(2);
const has = flag => argv.includes(`--${flag}`);
const valueOf = (flag, fallback = "") => {
  const i = argv.indexOf(`--${flag}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

function loadLocalEnvFile(name) {
  if (!existsSync(name)) return;
  for (const line of readFileSync(name, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const at = trimmed.indexOf("=");
    const key = trimmed.slice(0, at).trim();
    let value = trimmed.slice(at + 1).trim();
    if (/^".*"$|^'.*'$/.test(value)) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
}
loadLocalEnvFile(".dev.vars");
loadLocalEnvFile(".env");

function loadLibrary() {
  const blocks = [];
  for (const name of readdirSync(LIBRARY_DIR).filter(file => file.endsWith(".jsonl"))) {
    for (const line of readFileSync(join(LIBRARY_DIR, name), "utf8").split("\n")) {
      if (!line.trim()) continue;
      try { blocks.push(JSON.parse(line)); } catch { /* the audit reports these */ }
    }
  }
  return blocks;
}

/** The sentences already worn out by the library, shown to the model as a ban list. */
export function tiredSentences(library, limit = 8) {
  const counts = new Map();
  const examples = new Map();
  for (const block of library) {
    for (const text of longStrings(block.content_json)) {
      const shape = skeleton(text, block.category_tags || []);
      counts.set(shape, (counts.get(shape) || 0) + 1);
      if (!examples.has(shape)) examples.set(shape, text);
    }
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([shape, count]) => ({ count, text: examples.get(shape) }));
}

export function buildPrompt(trade, count, tired) {
  const wanted = SECTIONS.slice(0, count);
  const system = [
    "You write practical marketing actions for small shop owners.",
    "Your reader runs the shop. They have no marketing training and English may be their second language.",
    "Short sentences. Everyday words. No marketing words at all: no funnel, positioning, persona, CTA, leverage, value proposition.",
    "Every piece must name something physical and specific to this exact trade.",
    "A sentence that would be equally true of a gym and a bakery is a failed sentence.",
    "Return valid JSON only. No markdown, no commentary.",
  ].join(" ");

  const banned = tired.length
    ? [
        "",
        "NEVER write anything like these. They are already worn out in our library:",
        ...tired.map(item => `  - "${item.text}"  (already used ${item.count} times)`),
        "",
      ].join("\n")
    : "";

  const user = `Write ${wanted.length} pieces of advice for a ${trade}.
${banned}
One piece for each of these, in this order:
${wanted.map(([type, ask], i) => `  ${i + 1}. ${type} — ${ask}`).join("\n")}

Rules for every piece:
- Name a real, physical thing from a ${trade}. The equipment, the counter, the hours, the season, what goes wrong.
- Say what to do, not why it matters in theory.
- "what_to_do" must be 3 steps a person could do tomorrow morning.
- Use {{businessName}} where the shop's name belongs and {{location}} for the town.
- Do not start a sentence with the words "${trade} customers".

Answer with this JSON shape and nothing else:
{"pieces":[{"section_type":"first_priority","title":"...","what_it_means":"...","what_to_do":["...","...","..."],"example":"...","why_this_helps":"...","how_to_check":"..."}]}`;

  return { system, user, sections: wanted.map(([type]) => type) };
}

/** Turn a model answer into a library block. */
export function toBlock(piece, trade, index) {
  const slug = trade.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return {
    id: `lw_${slug}_${stamp}_${String(index + 1).padStart(2, "0")}`,
    title: piece.title,
    domain: String(piece.section_type || "").replace(/_/g, "-"),
    section_type: piece.section_type,
    content_json: {
      title: piece.title,
      what_it_means: piece.what_it_means,
      what_to_do: Array.isArray(piece.what_to_do) ? piece.what_to_do : [piece.what_to_do].filter(Boolean),
      example: piece.example,
      why_this_helps: piece.why_this_helps,
      how_to_check: piece.how_to_check,
    },
    category_tags: [slug],
    launch_status_tags: ["pre_launch", "running"],
    audience_tags: ["local_customers"],
    platform_tags: ["instagram", "whatsapp"],
    product_type_tags: ["standard_product"],
    business_model_tags: ["local_store"],
    goal_tags: ["build_trust", "explain_product"],
    budget_tags: ["no_budget", "low_budget"],
    location_tags: ["local_city"],
    problem_tags: ["unclear_offer"],
    difficulty: "easy",
    priority: "important",
    timeframe: "this_week",
    quality_score: 3,
    language_level: "beginner",
    active: true,
    version: `librarian-${stamp}`,
  };
}

/** Grade drafts against the whole existing library, and keep only what earns it. */
export function judgeDrafts(drafts, library) {
  const graded = gradeBlocks([...library, ...drafts]);
  const byId = new Map(graded.map(row => [row.id, row]));
  const kept = [];
  const rejected = [];
  for (const draft of drafts) {
    const row = byId.get(draft.id);
    if (!row) continue;
    if (row.score >= 4) kept.push({ ...draft, quality_score: row.score });
    else rejected.push({ id: draft.id, title: draft.title, score: row.score, faults: row.faults });
  }
  return { kept, rejected };
}

// ---------------------------------------------------------------- CLI

if (import.meta.url === `file://${process.argv[1]}`) {
  const library = loadLibrary();
  const tired = tiredSentences(library);

  let trade = valueOf("for");
  if (!trade && has("gaps")) {
    const graded = gradeBlocks(library);
    const usable = new Map();
    const total = new Map();
    for (const row of graded) {
      for (const tag of row.categories) {
        total.set(tag, (total.get(tag) || 0) + 1);
        if (row.score >= 4) usable.set(tag, (usable.get(tag) || 0) + 1);
      }
    }
    const emptiest = [...total.keys()]
      .map(tag => ({ tag, usable: usable.get(tag) || 0, total: total.get(tag) }))
      .sort((a, b) => a.usable - b.usable || b.total - a.total)[0];
    trade = emptiest?.tag.replace(/_/g, " ");
    console.log(`\nEmptiest kind of business: ${trade} (${emptiest.usable} usable of ${emptiest.total})\n`);
  }
  if (!trade) {
    console.error("Say which kind of business: --for bakery   (or --gaps to pick the emptiest)");
    process.exit(1);
  }

  const count = Math.max(1, Math.min(SECTIONS.length, Number(valueOf("count", "8"))));
  const { system, user, sections } = buildPrompt(trade, count, tired);

  if (has("dry-run")) {
    console.log("\n--- what the model will be told -------------------------------\n");
    console.log(system);
    console.log(user);
    console.log("\n--- nothing was sent. remove --dry-run to write for real.\n");
    process.exit(0);
  }

  const key = process.env.NVIDIA_NIM_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    console.error("\nNo AI key found. Put NVIDIA_NIM_API_KEY or GEMINI_API_KEY in .dev.vars,");
    console.error("or run with --dry-run to see the instructions without calling anything.\n");
    process.exit(1);
  }

  const useGemini = !process.env.NVIDIA_NIM_API_KEY;
  const { callNvidiaNim } = await import("../../functions/api/engine/aiProviders/nvidiaNim.js");
  const { callGemini } = await import("../../functions/api/engine/aiProviders/gemini.js");

  // One section per call. Asked for four at once, the model returned one - and
  // a single fumbled answer cost the whole run. Separate calls give it one
  // simple job each time, and a bad answer costs one piece instead of all of
  // them.
  console.log(`\nWriting ${count} pieces for a ${trade}, one at a time...`);
  const pieces = [];
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const single = buildPrompt(trade, count, tired);
    const focused = `${single.user}\n\nWrite ONLY piece ${index + 1} (${section}). Return {"pieces":[ ... one piece ... ]}.`;
    const turn = [{ role: "system", content: system }, { role: "user", content: focused }];
    process.stdout.write(`  ${index + 1}/${sections.length} ${section} ... `);
    try {
      const response = useGemini
        ? await callGemini({ env: process.env, messages: turn, responseFormat: "json", maxTokens: 2000 })
        : await callNvidiaNim({ env: process.env, messages: turn, responseFormat: "json", maxTokens: 2000, taskProfile: "offline_block_generation" });
      const answer = response.json || (() => { try { return JSON.parse(response.text); } catch { return null; } })();
      const piece = Array.isArray(answer?.pieces) ? answer.pieces[0] : answer;
      if (!piece?.title) { console.log("no usable answer"); continue; }
      pieces.push({ ...piece, section_type: section });
      console.log("done");
    } catch (error) {
      console.log(`failed (${error?.message || error})`);
    }
  }
  if (!pieces.length) {
    console.error("\nThe model did not answer with usable pieces. Nothing was saved.");
    process.exit(1);
  }

  const drafts = pieces.map((piece, index) => toBlock(piece, trade, index));
  const { kept, rejected } = judgeDrafts(drafts, library);

  console.log(`\n  written: ${drafts.length}`);
  console.log(`  kept:    ${kept.length}`);
  console.log(`  thrown away: ${rejected.length}\n`);
  for (const row of rejected) {
    console.log(`  [${row.score}] ${row.title?.slice(0, 60)}`);
    row.faults.slice(0, 2).forEach(fault => console.log(`        ${fault}`));
  }

  if (kept.length) {
    mkdirSync(DRAFTS_DIR, { recursive: true });
    const file = join(DRAFTS_DIR, `${trade.replace(/\s+/g, "-")}-${Date.now()}.jsonl`);
    writeFileSync(file, `${kept.map(block => JSON.stringify(block)).join("\n")}\n`);
    console.log(`\n  saved ${kept.length} to ${file}`);
    console.log("  read them before importing. nothing live has changed.\n");
  } else {
    console.log("  Nothing was good enough to keep. Nothing was saved.\n");
  }
}
