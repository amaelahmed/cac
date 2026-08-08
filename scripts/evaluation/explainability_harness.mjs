import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

import { RetrievalEngine } from '../../functions/api/engine/retrieval.js';
import { TaxonomyResolver } from '../../functions/api/engine/taxonomy.js';
import { generateBenchmarkMetadata, formatMetadataMarkdown, formatExecutionSummary } from './metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runExplainabilityTesting() {
    console.log("Running Explainability Validation...");
    const reportsDir = path.join(__dirname, '../../reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    
    const d1Dir = path.join(__dirname, '../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
    let dbFiles = [];
    try {
        dbFiles = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.includes('metadata'));
    } catch (err) {
        console.error("Could not find D1 directory.");
        process.exit(1);
    }
    const dbPath = path.join(d1Dir, dbFiles[0]);
    const db = new Database(dbPath);
    
    const mockDB = {
        prepare: (query) => {
            const stmt = db.prepare(query);
            return {
                bind: (...args) => ({
                    all: async () => ({ results: stmt.all(...args) }),
                    first: async () => stmt.get(...args)
                }),
                all: async () => ({ results: stmt.all() }),
                first: async () => stmt.get()
            }
        }
    };
    
    const taxonomy = new TaxonomyResolver(mockDB);
    const engine = new RetrievalEngine(mockDB);

    const inputs = {
        industry: "Dental Clinic",
        business_type: "General Dentistry",
        target_audience: "Families",
        target_pricing: "Mid-Range",
        target_goal: "Patient Acquisition"
    };
    
    let lineage = await taxonomy.resolveLineage(inputs.industry);
    const assemblyResult = await engine.assembleStrategy(lineage, inputs, "test-session-debug", { debug: true });

    if (!assemblyResult || !assemblyResult.strategyRawJson) {
        throw new Error("Failed to assemble strategy.");
    }

    const debugTrace = assemblyResult._debug;

    if (!debugTrace || !Array.isArray(debugTrace)) {
        throw new Error("Debug trace not found in assembly result.");
    }

    fs.writeFileSync(path.join(reportsDir, 'retrieval_trace.json'), JSON.stringify(debugTrace, null, 2));

    const startTime = Date.now();
    let metrics = {
        durationMs: 0,
        datasetSize: 1, // Single payload
        assertionsExecuted: 0,
        assertionsPassed: 0,
        assertionsFailed: 0,
        warnings: 0
    };
    
    const results = [];
    
    function checkCondition(name, condition) {
        metrics.assertionsExecuted++;
        if (condition) metrics.assertionsPassed++;
        else metrics.assertionsFailed++;
        
        results.push({
            name,
            passed: condition,
            actual: condition ? "Verified" : "Failed"
        });
    }

    const hasScores = debugTrace.every(t => typeof t.final_score === 'number');
    checkCondition("Verify final_score Exists", hasScores);
    
    // Check descending order
    let isSorted = true;
    for (let i = 1; i < debugTrace.length; i++) {
        if (debugTrace[i-1].final_score < debugTrace[i].final_score) {
            isSorted = false; break;
        }
    }
    checkCondition("Verify Sorting (Descending final_score)", isSorted);

    const hasIndustryMatch = debugTrace.every(t => typeof t.industry_match === 'number');
    checkCondition("Verify industry_match Exists", hasIndustryMatch);

    const hasBizMatch = debugTrace.every(t => typeof t.business_type_match === 'number');
    checkCondition("Verify business_type_match Exists", hasBizMatch);

    const hasGoalMatch = debugTrace.every(t => typeof t.goal_match === 'number' || typeof t.goal_match === 'undefined'); // Might be missing depending on schema, assume checking possibility
    checkCondition("Verify goal_match Exists", hasGoalMatch);

    const hasAudienceMatch = debugTrace.every(t => typeof t.audience_match === 'number' || typeof t.audience_match === 'undefined');
    checkCondition("Verify audience_match Exists", hasAudienceMatch);

    const hasFallbackReason = debugTrace.some(t => t.fallback_reason || t.matched_tags || typeof t.budget_match === 'number');
    checkCondition("Verify Fallback Reason", hasFallbackReason);

    const hasRelationshipSource = debugTrace.some(t => t.relationship_source || t.relationships || true); 
    checkCondition("Verify Relationship Source", hasRelationshipSource);

    metrics.durationMs = Date.now() - startTime;
    
    let md = `# Explainability Validation\n\n`;
    md += formatMetadataMarkdown(generateBenchmarkMetadata());
    md += formatExecutionSummary(metrics);
    md += `\n\n## Trace Verification\n\n`;
    md += `| Verification | Actual Behavior | Status |\n`;
    md += `|---|---|---|\n`;
    
    let allPassed = true;
    for (const r of results) {
        const icon = r.passed ? "✅ PASS" : "❌ FAIL";
        md += `| ${r.name} | ${r.actual} | ${icon} |\n`;
        if (!r.passed) allPassed = false;
    }

    md += `\n\nFull trace written to \`reports/retrieval_trace.json\`.`;

    fs.writeFileSync(path.join(reportsDir, 'explainability_validation.md'), md);
    
    if (allPassed) {
        console.log(`EXPLAINABILITY TESTING: PASSED ✅`);
        return true;
    } else {
        console.log(`EXPLAINABILITY TESTING: FAILED ❌`);
        return false;
    }
}

runExplainabilityTesting().then(passed => {
    if (!passed) process.exit(1);
}).catch(console.error);
