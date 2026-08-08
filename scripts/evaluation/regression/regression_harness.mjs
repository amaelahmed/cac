import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

import { RetrievalEngine } from '../../../functions/api/engine/retrieval.js';
import { TaxonomyResolver } from '../../../functions/api/engine/taxonomy.js';
import { generateBenchmarkMetadata, formatMetadataMarkdown, formatExecutionSummary } from '../metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRegressionEvaluation() {
    console.log("\n=========================================");
    console.log("=== REGRESSION EVALUATION ===");
    console.log("=========================================");
    
    const startTime = Date.now();
    
    // 1. Setup Mock DB
    const d1Dir = path.join(__dirname, '../../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
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

    // 2. Load Profiles
    const profilesPath = path.join(__dirname, '../profiles.json');
    const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
    
    // 3. Load Snapshot
    const snapshotPath = path.join(__dirname, 'regression_suite.json');
    if (!fs.existsSync(snapshotPath)) {
        console.log("⚠️ No regression_suite.json found. Run generate_snapshot.mjs first.");
        return false;
    }
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    
    let metrics = {
        durationMs: 0,
        datasetSize: snapshot.profiles ? snapshot.profiles.length : 0,
        assertionsExecuted: 0,
        assertionsPassed: 0,
        assertionsFailed: 0,
        warnings: 0
    };

    let reportMd = `# Regression Report\n\n`;
    reportMd += formatMetadataMarkdown(generateBenchmarkMetadata());

    let resultsTable = `| Profile | Drift % | Expected IDs | Retrieved IDs | Mismatched | Status |\n`;
    resultsTable += `|---|---|---|---|---|---|\n`;

    let failures = 0;
    
    for (const snapProfile of snapshot.profiles) {
        metrics.assertionsExecuted++;
        const p = profiles.find(pr => pr.id === snapProfile.id);
        if (!p) {
            console.log(`  ⚠️ Profile ${snapProfile.id} not found in profiles.json. Skipping.`);
            metrics.warnings++;
            metrics.assertionsFailed++;
            continue;
        }
        
        let lineage = await taxonomy.resolveLineage(p.biz.industry);
        if (!lineage || lineage.length === 0) {
             const genericNode = await mockDB.prepare("SELECT id FROM industries WHERE name = 'Generic Business' COLLATE NOCASE LIMIT 1").first();
             if (genericNode) lineage = [genericNode.id];
        }
        
        const assemblyResult = await engine.assembleStrategy(lineage, p.biz, "regression-session", { debug: true });
        
        let retrievedIds = [];
        let actualConfidence = 0;
        if (assemblyResult && assemblyResult._debug) {
            const sortedTrace = assemblyResult._debug.sort((a, b) => b.final_score - a.final_score);
            retrievedIds = sortedTrace.map(t => t.object_id);
            actualConfidence = assemblyResult.confidence.score;
        }
        
        const expectedIds = snapProfile.expected_ids || [];
        const expectedConfidence = snapProfile.expected_confidence || 0;
        
        const retrievedSet = new Set(retrievedIds);
        const expectedSet = new Set(expectedIds);
        
        const missing = expectedIds.filter(id => !retrievedSet.has(id));
        const unexpected = retrievedIds.filter(id => !expectedSet.has(id));
        
        const mismatched = missing.length + unexpected.length;
        const driftPct = (expectedIds.length > 0) ? (mismatched / expectedIds.length) * 100 : (mismatched > 0 ? 100 : 0);
        
        if (missing.length > 0 || unexpected.length > 0 || Math.abs(actualConfidence - expectedConfidence) > 5) {
            console.log(`  ❌ FAILURE: Regression detected for profile [${snapProfile.id}]`);
            if (missing.length > 0) console.log(`     Missing Objects: ${missing.join(', ')}`);
            if (unexpected.length > 0) console.log(`     Unexpected Objects: ${unexpected.join(', ')}`);
            if (Math.abs(actualConfidence - expectedConfidence) > 5) {
                 console.log(`     Confidence drift: Expected ${expectedConfidence}, Got ${actualConfidence}`);
            }
            failures++;
            metrics.assertionsFailed++;
            resultsTable += `| ${snapProfile.id} | ${driftPct.toFixed(1)}% | ${expectedIds.length} | ${retrievedIds.length} | ${mismatched} | ❌ FAIL |\n`;
        } else {
            console.log(`  ✅ SUCCESS: [${snapProfile.id}] identical to baseline.`);
            metrics.assertionsPassed++;
            resultsTable += `| ${snapProfile.id} | 0.0% | ${expectedIds.length} | ${retrievedIds.length} | 0 | ✅ PASS |\n`;
        }
    }
    
    metrics.durationMs = Date.now() - startTime;
    reportMd += formatExecutionSummary(metrics);
    reportMd += `\n\n## Regression Details\n\n` + resultsTable;
    
    const reportsDir = path.join(__dirname, '../../../reports');
    if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(path.join(reportsDir, 'regression_report.md'), reportMd);
    
    return failures === 0;
}

runRegressionEvaluation().then(passed => {
    if (!passed) process.exit(1);
}).catch(console.error);
