import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.join(__dirname, '../../reports');

if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

function run(script) {
  try {
    const start = Date.now();
    const output = execSync(`node ${path.join(__dirname, script)}`, { encoding: 'utf8', stdio: 'pipe' });
    return { output, passed: true, duration: Date.now() - start };
  } catch (err) {
    return { output: err.stdout + "\n" + err.stderr, passed: false, duration: 0 };
  }
}

console.log("Running Complete Evaluation Suite...");

console.log("- Running eval_harness.mjs...");
const evalResult = run('eval_harness.mjs');

console.log("- Running regression_harness.mjs...");
const regressionResult = run('regression/regression_harness.mjs');

console.log("- Running performance_harness.mjs...");
const performanceResult = run('performance_harness.mjs');

console.log("- Running negative_harness.mjs...");
const negativeResult = run('negative_harness.mjs');

console.log("- Running telemetry_harness.mjs...");
const telemetryResult = run('telemetry_harness.mjs');

console.log("- Running explainability_harness.mjs...");
const explainabilityResult = run('explainability_harness.mjs');


let summary = `# Phase 5.3 - Final Evidence Lockdown Validation\n\n`;
summary += `## Overview\n`;
summary += `| Item | Status | Output Log |\n`;
summary += `|---|---|---|\n`;
summary += `| Evaluation framework & orchestration | ${evalResult.passed ? 'VERIFIED' : 'FAILED'} | eval_harness.mjs |
`;
summary += `| Regression statistics | ${regressionResult.passed ? 'VERIFIED' : 'FAILED'} | regression_harness.mjs |
`;
summary += `| Explainability output validation | ${explainabilityResult.passed ? 'VERIFIED' : 'FAILED'} | explainability_harness.mjs |
`;
summary += `| Telemetry execution metrics | ${telemetryResult.passed ? 'VERIFIED' : 'FAILED'} | telemetry_harness.mjs |
`;
summary += `| Actual benchmark metrics (IR) | ${evalResult.passed ? 'VERIFIED' : 'FAILED'} | eval_harness.mjs |
`;
summary += `| Negative edge cases | ${negativeResult.passed ? 'VERIFIED' : 'FAILED'} | negative_harness.mjs |
`;
summary += `| Real production benchmarking | BLOCKED | Waiting for deployed Worker/API endpoint |
`;

summary += `\n## Output Logs\n`;

const results = [
    { name: 'eval_harness', data: evalResult },
    { name: 'regression_harness', data: regressionResult },
    { name: 'performance_harness', data: performanceResult },
    { name: 'negative_harness', data: negativeResult },
    { name: 'telemetry_harness', data: telemetryResult },
    { name: 'explainability_harness', data: explainabilityResult }
];

for (const r of results) {
    summary += `\n### ${r.name}\n\`\`\`\n${r.data.output}\n\`\`\`\n`;
}

fs.writeFileSync(path.join(reportsDir, 'evaluation_summary.md'), summary);
fs.writeFileSync(path.join(reportsDir, 'phase_5_3_validation.md'), summary);

console.log("\nEvaluation complete. Results written to reports/evaluation_summary.md and reports/phase_5_3_validation.md");

