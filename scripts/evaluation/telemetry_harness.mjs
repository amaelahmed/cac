import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { generateBenchmarkMetadata, formatMetadataMarkdown, formatExecutionSummary } from './metadata.mjs';
import { onRequestPost } from '../../functions/api/engine/telemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTelemetryTesting() {
    console.log("Running Telemetry Testing...");
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
    
    // Clear interactions before test
    try {
      db.prepare('DELETE FROM object_interactions').run();
    } catch(e) {
      console.warn("Could not delete from object_interactions - table might not exist");
    }

    const mockEnv = {
        DB: {
            prepare: (query) => {
                return {
                    bind: (...args) => {
                        return { query, args };
                    }
                }
            },
            batch: async (stmts) => {
                const transaction = db.transaction(() => {
                    for (const stmt of stmts) {
                        db.prepare(stmt.query).run(...stmt.args);
                    }
                });
                transaction();
            }
        }
    };

    const startTime = Date.now();
    let metrics = {
        durationMs: 0,
        datasetSize: 6, // 6 tests
        assertionsExecuted: 0,
        assertionsPassed: 0,
        assertionsFailed: 0,
        warnings: 0
    };
    const results = [];
    
    async function runTest(name, description, testFn) {
        metrics.assertionsExecuted++;
        let passed = false;
        let actual = "";
        try {
            actual = await testFn();
            passed = true;
            metrics.assertionsPassed++;
        } catch (e) {
            passed = false;
            actual = `Exception: ${e.message}`;
            metrics.assertionsFailed++;
        }
        results.push({ name, description, passed, actual });
    }

    // 1. Valid Batch Insert
    await runTest("Valid Batch Insert", "Inserts multiple valid telemetry events.", async () => {
        const req = {
            json: async () => ({
                interactions: [
                    { id: "telemetry_1", session_id: "s1", interaction_type: "CLICK", object_id: null },
                    { id: "telemetry_2", session_id: "s1", interaction_type: "HOVER", object_id: null }
                ]
            })
        };
        const res = await onRequestPost({ request: req, env: mockEnv });
        if (res.status !== 200) throw new Error("Expected status 200");
        const count = db.prepare('SELECT count(*) as c FROM object_interactions').get().c;
        if (count < 2) throw new Error("Rows were not inserted");
        return `Inserted 2 rows successfully. Total rows: ${count}`;
    });

    // 2. Invalid Payload Rejection
    await runTest("Invalid Payload Rejection", "Payload missing 'interactions' array.", async () => {
        const req = { json: async () => ({ data: "missing interactions" }) };
        const res = await onRequestPost({ request: req, env: mockEnv });
        if (res.status !== 400) throw new Error("Expected status 400");
        return "Rejected with 400 Bad Request correctly.";
    });

    // 3. Duplicate Handling
    await runTest("Duplicate Handling", "Inserting a duplicate ID.", async () => {
        const req = {
            json: async () => ({
                interactions: [
                    { id: "telemetry_1", session_id: "s2", interaction_type: "CLICK" } // Duplicate ID
                ]
            })
        };
        const res = await onRequestPost({ request: req, env: mockEnv });
        if (res.status !== 500) {
            throw new Error("Should return 500 for UNIQUE constraint failure.");
        }
        return "UNIQUE constraint failed as expected (500).";
    });

    // 4. Transaction Rollback
    await runTest("Transaction Rollback", "One failing insert should rollback the batch.", async () => {
        const countBefore = db.prepare('SELECT count(*) as c FROM object_interactions').get().c;
        const req = {
            json: async () => ({
                interactions: [
                    { id: "telemetry_new_1", session_id: "s3" },
                    { id: "telemetry_1", session_id: "s3" } // This will fail (duplicate)
                ]
            })
        };
        const res = await onRequestPost({ request: req, env: mockEnv });
        if (res.status !== 500) throw new Error("Expected 500 for batch failure.");
        
        const countAfter = db.prepare('SELECT count(*) as c FROM object_interactions').get().c;
        if (countBefore !== countAfter) throw new Error("Rollback failed, rows were inserted.");
        return `Batch rolled back. Row count remained ${countAfter}.`;
    });

    // 5. Malformed Events
    await runTest("Malformed Events", "Invalid JSON body payload.", async () => {
        const req = { json: async () => { throw new Error("Invalid JSON"); } };
        const res = await onRequestPost({ request: req, env: mockEnv });
        if (res.status !== 500) throw new Error("Expected 500 error for JSON parsing failure.");
        return "Rejected malformed request.";
    });

    // 6. Schema Constraints
    await runTest("Schema Constraints", "Missing required fields.", async () => {
        const req = {
            json: async () => ({
                interactions: [
                    { id: "telemetry_nulls" } 
                ]
            })
        };
        const res = await onRequestPost({ request: req, env: mockEnv });
        if (res.status !== 200) throw new Error("Expected 200 - schema should allow nulls per JS logic.");
        const inserted = db.prepare('SELECT * FROM object_interactions WHERE id = ?').get("telemetry_nulls");
        if (inserted.interaction_type !== 'UNKNOWN') throw new Error("Default values were not applied.");
        return "Inserted with default constraints/fallbacks.";
    });

    metrics.durationMs = Date.now() - startTime;
    
    let md = `# Telemetry Validation\n\n`;
    md += formatMetadataMarkdown(generateBenchmarkMetadata());
    md += formatExecutionSummary(metrics);
    md += `\n\n## Results\n\n`;
    md += `| Test Case | Description | Actual Behavior | Status |\n`;
    md += `|---|---|---|---|\n`;
    let allPassed = true;
    for (const r of results) {
        const icon = r.passed ? "✅ PASS" : "❌ FAIL";
        md += `| ${r.name} | ${r.description} | ${r.actual} | ${icon} |\n`;
        if (!r.passed) allPassed = false;
    }

    fs.writeFileSync(path.join(reportsDir, 'telemetry_validation.md'), md);
    
    if (allPassed) {
        console.log(`TELEMETRY TESTING: PASSED ✅`);
        return true;
    } else {
        console.log(`TELEMETRY TESTING: FAILED ❌`);
        return false;
    }
}

runTelemetryTesting().then(passed => {
    if (!passed) process.exit(1);
}).catch(console.error);
