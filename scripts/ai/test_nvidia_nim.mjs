import fs from "fs";
import path from "path";
import { performance } from "perf_hooks";
import { callNvidiaNim, getNvidiaNimConfig } from "../../functions/api/engine/aiProviders/nvidiaNim.js";

const root = process.cwd();
const reportsDir = path.join(root, "reports");
const jsonReportPath = path.join(reportsDir, "nvidia_nim_first_test.json");
const mdReportPath = path.join(reportsDir, "nvidia_nim_first_test.md");

function loadLocalEnv() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
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

function stripFence(text) {
  return String(text || "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

function parseJson(text) {
  try {
    return JSON.parse(stripFence(text));
  } catch {
    return null;
  }
}

function flattenText(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return String(value);
}

function scoreOutput(parsed, rawText) {
  const text = flattenText(parsed || rawText);
  const lower = text.toLowerCase();
  const requiredTop = ["calendar_card", "whatsapp_message", "customer_problem"];
  const jargon = ["funnel", "cta", "leverage", "positioning", "persona", "synergy", "conversion"];
  const wrongBusiness = ["salon", "cafe", "restaurant", "gym", "software", "saas"].filter(word => lower.includes(word));

  return {
    json_validity: Boolean(parsed),
    has_required_shape: Boolean(parsed && requiredTop.every(key => parsed[key] && typeof parsed[key] === "object")),
    simple_language: text.split(/\s+/).filter(Boolean).length < 450 && !jargon.some(word => lower.includes(word)),
    specific_to_cartroid: /cartroid/i.test(text) && /kozhikode|calicut/i.test(text) && /gift|custom/i.test(text),
    copy_ready_text: Boolean(parsed?.calendar_card?.caption && parsed?.whatsapp_message?.message && parsed?.customer_problem?.text_to_use),
    no_jargon: !jargon.some(word => lower.includes(word)),
    no_wrong_business_logic: wrongBusiness.length === 0,
    wrong_business_terms: wrongBusiness,
  };
}

function renderMarkdown(report) {
  const parsed = report.parsed;
  return `# NVIDIA NIM First Test

This was a single small test. It did not generate a full strategy or a 30-day calendar.

## Config

- Provider: \`${report.provider}\`
- Model: \`${report.model}\`
- Latency: ${report.latency_ms}ms
- Token usage: ${JSON.stringify(report.usage || {})}
- Rate limit headers: ${JSON.stringify(report.rate_limit_headers || {})}

## Score

- JSON validity: ${report.score.json_validity ? "pass" : "fail"}
- Required shape: ${report.score.has_required_shape ? "pass" : "fail"}
- Simple language: ${report.score.simple_language ? "pass" : "fail"}
- Specific to Cartroid: ${report.score.specific_to_cartroid ? "pass" : "fail"}
- Copy-ready text: ${report.score.copy_ready_text ? "pass" : "fail"}
- No jargon: ${report.score.no_jargon ? "pass" : "fail"}
- No wrong business logic: ${report.score.no_wrong_business_logic ? "pass" : "fail"}

## Output

\`\`\`json
${JSON.stringify(parsed || { raw_text: report.raw_text }, null, 2)}
\`\`\`
`;
}

const messages = [
  {
    role: "system",
    content: `You are a simple business assistant for small local businesses in India.

Write in very simple English.
No marketing jargon.
No corporate words.
No long paragraphs.
No fake research.
No raw tags.
No complicated labels.

The user should feel:
"I understand this."
"This is about my business."
"I can do this today."

Return valid JSON only.`,
  },
  {
    role: "user",
    content: `Create 3 action-card outputs for this business.

Business:
Cartroid is a pre-launch customised gift/product store in Kozhikode, Kerala, India.
Target customers are students and Gen-Z.
Platforms are Instagram, WhatsApp, and Google Business.
Goal is to launch properly, build trust, and get first customers.
Budget is low.

Create:

1. One 30-day calendar card
2. One WhatsApp reply message
3. One customer problem card

JSON shape:

{
  "calendar_card": {
    "day": 1,
    "post_type": "",
    "title": "",
    "hook": "",
    "caption": "",
    "how_to_create": "",
    "customer_action": "",
    "why_this_works": ""
  },
  "whatsapp_message": {
    "title": "",
    "message": "",
    "when_to_use": "",
    "why_this_works": ""
  },
  "customer_problem": {
    "problem": "",
    "why_they_feel_this": "",
    "your_solution": "",
    "text_to_use": "",
    "content_idea": ""
  }
}

Make it specific to Cartroid.
Mention Kozhikode where useful.
Mention preview before making if useful.
Do not use jargon.`,
  },
];

async function main() {
  loadLocalEnv();
  fs.mkdirSync(reportsDir, { recursive: true });

  if (!process.env.NVIDIA_NIM_API_KEY) {
    throw new Error("NVIDIA_NIM_API_KEY is missing. Add it to local .env before running this one small test.");
  }

  const config = getNvidiaNimConfig();
  const started = performance.now();
  const response = await callNvidiaNim({
    messages,
    model: config.model,
    maxTokens: 1200,
    temperature: 0.35,
    responseFormat: "json",
  });
  const latencyMs = Math.round(performance.now() - started);
  const parsed = response.json || parseJson(response.text);

  const report = {
    provider: "nvidia_nim",
    model: response.model || config.model,
    latency_ms: latencyMs,
    usage: response.usage || null,
    rate_limit_headers: response.headers || {},
    score: scoreOutput(parsed, response.text),
    parsed,
    raw_text: response.text,
  };

  fs.writeFileSync(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdReportPath, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.score.json_validity && report.score.has_required_shape,
    provider: report.provider,
    model: report.model,
    latency_ms: report.latency_ms,
    json_report: path.relative(root, jsonReportPath),
    markdown_report: path.relative(root, mdReportPath),
  }, null, 2));
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
