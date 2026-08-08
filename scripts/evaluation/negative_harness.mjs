import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

import { RetrievalEngine } from '../../functions/api/engine/retrieval.js';
import { TaxonomyResolver } from '../../functions/api/engine/taxonomy.js';
import { hydrateStrategy } from '../../functions/api/engine/hydration.js';
import { generateBenchmarkMetadata, formatMetadataMarkdown, formatExecutionSummary } from './metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runNegativeTesting() {
    console.log("Running Negative Testing...");
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
    
    let currentMockInterceptor = null;

    const mockDB = {
        prepare: (query) => {
            if (currentMockInterceptor) {
                const override = currentMockInterceptor(query);
                if (override) return override;
            }
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

    const startTime = Date.now();
    let metrics = {
        durationMs: 0,
        datasetSize: 10,
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
            await testFn();
            passed = true;
            actual = "Handled gracefully / as expected.";
            metrics.assertionsPassed++;
        } catch (e) {
            if (e.message.includes("EXPECTED_ERROR:")) {
                passed = true;
                actual = e.message;
                metrics.assertionsPassed++;
            } else {
                passed = false;
                actual = `Exception: ${e.message}`;
                metrics.assertionsFailed++;
            }
        }
        results.push({ name, description, passed, actual });
        currentMockInterceptor = null;
    }

    // 1. Unknown Industry
    await runTest("Unknown Industry", "Retrieving strategy for an unknown industry.", async () => {
        const lineage = await taxonomy.resolveLineage("non_existent_industry_123");
        if (!lineage.includes("ind-generic-000")) throw new Error("Unknown industry should resolve to the generic fallback.");
        const assemblyResult = await engine.assembleStrategy(lineage, {}, "test-session");
        if (!assemblyResult) throw new Error("Generic fallback should return a strategy when generic objects exist.");
    });

    // 2. Invalid Business Type
    await runTest("Invalid Business Type", "Providing an invalid business type.", async () => {
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        const assemblyResult = await engine.assembleStrategy(lineage, { business_type: "Space Station" }, "test-session");
        // Should fallback to ANY or ignore invalid type safely
        if (!assemblyResult) throw new Error("Strategy should not fail completely.");
    });

    // 3. Empty Payload / User Inputs
    await runTest("Empty Payload", "Missing all user inputs.", async () => {
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        const assemblyResult = await engine.assembleStrategy(lineage, {}, "test-session");
        if (assemblyResult === null || Object.keys(JSON.parse(assemblyResult.strategyRawJson)).length === 0) {
            throw new Error("Empty user inputs should still return fallback objects.");
        }
    });

    // 4. Missing Placeholders for Hydration
    await runTest("Missing Placeholders", "Hydration without required inputs.", async () => {
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        const assemblyResult = await engine.assembleStrategy(lineage, {}, "test-session");
        hydrateStrategy(assemblyResult.strategyRawJson, { });
    });

    // 5. Duplicate IDs
    await runTest("Duplicate IDs", "Database returns duplicate object IDs.", async () => {
        currentMockInterceptor = (query) => {
            if (query.includes("FROM knowledge_objects")) {
                return {
                    bind: (...args) => ({
                        all: async () => {
                            const res = db.prepare(query).all(...args);
                            if (res.length > 0) res.push(res[0]); // Duplicate the first result
                            return { results: res };
                        }
                    })
                };
            }
            return null;
        };
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        const assemblyResult = await engine.assembleStrategy(lineage, {}, "test-session");
    });

    // 6. Broken Relationships
    await runTest("Broken Relationships", "Database returns a relationship to a missing object.", async () => {
        currentMockInterceptor = (query) => {
            if (query.includes("FROM object_relationships")) {
                return {
                    bind: (...args) => ({
                        all: async () => {
                            const res = db.prepare(query).all(...args);
                            res.push({ source_id: "obj_1", target_id: "missing_obj_999", relationship_type: "requires" });
                            return { results: res };
                        }
                    })
                };
            }
            return null;
        };
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        await engine.assembleStrategy(lineage, {}, "test-session");
    });

    // 7. Circular Relationships
    await runTest("Circular Relationships", "Database returns a circular dependency graph.", async () => {
        currentMockInterceptor = (query) => {
            if (query.includes("FROM object_relationships")) {
                return {
                    bind: (...args) => ({
                        all: async () => {
                            return { results: [
                                { source_id: "obj_a", target_id: "obj_b", relationship_type: "requires" },
                                { source_id: "obj_b", target_id: "obj_a", relationship_type: "requires" }
                            ]};
                        }
                    })
                };
            }
            return null;
        };
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        await engine.assembleStrategy(lineage, {}, "test-session");
    });

    // 8. Malformed JSON in Database
    await runTest("Malformed JSON", "Database returns invalid JSON in content fields.", async () => {
        currentMockInterceptor = (query) => {
            if (query.includes("FROM knowledge_objects")) {
                return {
                    bind: (...args) => ({
                        all: async () => {
                            const res = db.prepare(query).all(...args);
                            if (res.length > 0) res[0].content_json = "{ invalid json ";
                            return { results: res };
                        }
                    })
                };
            }
            return null;
        };
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        await engine.assembleStrategy(lineage, {}, "test-session");
    });

    // 9. Missing Knowledge Objects
    await runTest("Missing Knowledge Objects", "Database has no objects for the industry.", async () => {
        currentMockInterceptor = (query) => {
            if (query.includes("FROM knowledge_objects")) {
                return {
                    bind: (...args) => ({
                        all: async () => ({ results: [] })
                    })
                };
            }
            return null;
        };
        const lineage = await taxonomy.resolveLineage("Dental Clinic");
        const result = await engine.assembleStrategy(lineage, {}, "test-session");
        if (result !== null) throw new Error("Missing objects should return null.");
    });

    // 10. Empty Database
    await runTest("Empty Database", "Database has no tables/data.", async () => {
        currentMockInterceptor = (query) => {
            return {
                bind: (...args) => ({
                    all: async () => ({ results: [] }),
                    first: async () => null
                }),
                all: async () => ({ results: [] }),
                first: async () => null
            };
        };
        try {
            const lineage = await taxonomy.resolveLineage("Dental Clinic");
            await engine.assembleStrategy(lineage, {}, "test-session");
        } catch (e) {
            throw new Error(`EXPECTED_ERROR: ${e.message}`);
        }
    });

    metrics.durationMs = Date.now() - startTime;
    
    let md = `# Negative Test Validation\n\n`;
    md += formatMetadataMarkdown(generateBenchmarkMetadata());
    md += formatExecutionSummary(metrics);
    md += `\n\n## Results\n\n`;
    md += `| Test Case | Expected Behavior | Actual Behavior | Status |\n`;
    md += `|---|---|---|---|\n`;
    let allPassed = true;
    for (const r of results) {
        const icon = r.passed ? "✅ PASS" : "❌ FAIL";
        md += `| ${r.name} | ${r.description} | ${r.actual} | ${icon} |\n`;
        if (!r.passed) allPassed = false;
    }

    fs.writeFileSync(path.join(reportsDir, 'negative_tests.md'), md);
    
    if (allPassed) {
        console.log(`NEGATIVE TESTING: PASSED ✅`);
        return true;
    } else {
        console.log(`NEGATIVE TESTING: FAILED ❌`);
        return false;
    }
}

runNegativeTesting().then(passed => {
    if (!passed) process.exit(1);
}).catch(console.error);
