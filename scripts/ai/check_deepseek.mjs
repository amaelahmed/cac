/**
 * Run: npm run check:deepseek
 *
 * One real call to DeepSeek, so you know the key works BEFORE you put it in
 * Cloudflare. It answers three questions in plain English: did it reply, was
 * the reply usable, and what will it cost.
 */
import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { callDeepseek, getDeepseekConfig } from "../../functions/api/engine/aiProviders/deepseek.js";

const root = process.cwd();

// Keys live in .dev.vars for Cloudflare and .env for plain node scripts, so read
// whichever one this machine happens to have.
function loadLocalEnv() {
  for (const file of [".dev.vars", ".env"]) {
    const envPath = path.join(root, file);
    if (!fs.existsSync(envPath)) continue;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
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
}

// Published DeepSeek rates per million tokens, peak (the dearer half of the day).
// Off-peak is half of this. Update if DeepSeek changes its price list.
const RATES = {
  "deepseek-v4-flash": { input: 0.22, output: 0.66 },
  "deepseek-v4-pro": { input: 0.66, output: 1.98 },
};
const AI_CALLS_PER_REPORT = 5;

const messages = [
  {
    role: "system",
    content: "You write marketing plans for small local businesses. Return valid JSON only. No markdown, no commentary.",
  },
  {
    role: "user",
    content: 'A family bakery on a quiet high street wants more walk-in customers this month. Return {"idea": "...", "why_it_works": "...", "first_step": "..."} in plain everyday English, no marketing jargon.',
  },
];

async function main() {
  loadLocalEnv();

  if (!process.env.DEEPSEEK_API_KEY) {
    console.error("\n  No DeepSeek key found.");
    console.error("  Put a line like this in your .dev.vars file, then run this again:\n");
    console.error("    DEEPSEEK_API_KEY=sk-your-key-here\n");
    process.exit(1);
  }

  const config = getDeepseekConfig(process.env);
  console.log(`\n  Asking ${config.model} to plan a month for a bakery...\n`);

  const started = performance.now();
  const response = await callDeepseek({
    env: process.env,
    messages,
    maxTokens: 1200,
    temperature: 0.35,
    responseFormat: "json",
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);

  const answer = response.json;
  const usable = Boolean(answer?.idea && answer?.first_step);
  const inputTokens = Number(response.usage?.prompt_tokens || 0);
  const outputTokens = Number(response.usage?.completion_tokens || 0);
  const rate = RATES[response.model] || RATES[config.model] || RATES["deepseek-v4-flash"];
  const callCost = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;

  console.log(`  It answered:      ${usable ? "yes, and the answer was usable" : "yes, but the shape was wrong"}`);
  console.log(`  It took:          ${seconds} seconds  (a live report allows 24)`);
  console.log(`  It used:          ${inputTokens} tokens in, ${outputTokens} out`);
  console.log(`  This call cost:   $${callCost.toFixed(5)}`);
  console.log(`  So one report is: about $${(callCost * AI_CALLS_PER_REPORT).toFixed(4)} (${AI_CALLS_PER_REPORT} calls)`);
  console.log(`  1,000 reports:    about $${(callCost * AI_CALLS_PER_REPORT * 1000).toFixed(2)}`);
  console.log("\n  (Costs are at peak rates. Outside peak hours DeepSeek charges half.)\n");

  if (answer?.idea) {
    console.log(`  What it wrote for the bakery:\n\n    ${answer.idea}\n`);
  }

  if (!usable) {
    console.log("  The key works, but the answer came back in the wrong shape.");
    console.log("  Raw reply:\n");
    console.log(`    ${String(response.text || "").slice(0, 400)}\n`);
    process.exit(1);
  }

  console.log("  All good. This key is safe to put in Cloudflare.\n");
}

main().catch(error => {
  console.error(`\n  It failed: ${error?.message || error}`);
  if (error?.status === 401) console.error("  That status means the key was rejected. Check it was copied whole.\n");
  else if (error?.status === 402) console.error("  That status means the DeepSeek account has no credit on it yet.\n");
  else console.error("");
  process.exit(1);
});
