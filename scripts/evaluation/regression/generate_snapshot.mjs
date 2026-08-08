import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

import { RetrievalEngine } from '../../../functions/api/engine/retrieval.js';
import { TaxonomyResolver } from '../../../functions/api/engine/taxonomy.js';
import { generateBenchmarkMetadata } from '../metadata.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    console.log("Generating Frozen Regression Snapshot...");
    
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
    
    const snapshot = {
        metadata: generateBenchmarkMetadata(),
        profiles: []
    };
    
    // 3. Generate snapshot
    for (const p of profiles) {
        let lineage = await taxonomy.resolveLineage(p.biz.industry);
        if (!lineage || lineage.length === 0) {
             const genericNode = await mockDB.prepare("SELECT id FROM industries WHERE name = 'Generic Business' COLLATE NOCASE LIMIT 1").first();
             if (genericNode) lineage = [genericNode.id];
        }
        
        const assemblyResult = await engine.assembleStrategy(lineage, p.biz, "regression-session", { debug: true });
        
        let retrievedIds = [];
        if (assemblyResult && assemblyResult._debug) {
            const sortedTrace = assemblyResult._debug.sort((a, b) => b.score - a.score);
            retrievedIds = sortedTrace.map(t => t.object_id);
        }
        
        snapshot.profiles.push({
            id: p.id,
            expected_ids: retrievedIds,
            expected_confidence: assemblyResult ? assemblyResult.confidence.score : 0
        });
    }
    
    const outPath = path.join(__dirname, 'regression_suite.json');
    fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2));
    console.log(`Snapshot saved to ${outPath} with ${snapshot.profiles.length} profiles.`);
}

main().catch(console.error);
