import { BusinessProfileBuilder } from '../functions/api/engine/profileBuilder.js';
import { TaxonomyResolver } from '../functions/api/engine/taxonomy.js';
import { RetrievalEngine } from '../functions/api/engine/retrieval.js';
import Database from 'better-sqlite3';

const db = new Database('.wrangler/state/v3/d1/miniflare-D1DatabaseObject/05a0974269f0151f17aa3d3dbe05d7ae94519888c571a58ff6af54b9cefcc4fd.sqlite');

// Create env DB mock that wraps better-sqlite3
const env = {
  DB: {
    prepare: (query) => {
      const stmt = db.prepare(query);
      return {
        bind: (...args) => {
          return {
            all: async () => ({ results: stmt.all(...args) }),
            first: async () => stmt.get(...args)
          };
        }
      };
    }
  }
};

async function testUnknownIndustry() {
    console.log("=== Testing Generic Fallback ===");
    
    // 1. Build profile
    const profile = BusinessProfileBuilder.build({ 
        biz_industry: "Space Mining", 
        biz_audience: "Billionaires",
        biz_offer: "Asteroid Ore"
    });
    
    // 2. Resolve Lineage
    const taxonomy = new TaxonomyResolver(env.DB);
    const lineage = await taxonomy.resolveLineage(profile.market.industry);
    console.log("Resolved Lineage:", lineage);
    
    // 3. Assemble Strategy
    const engine = new RetrievalEngine(env.DB);
    const strategy = await engine.assembleStrategy(lineage, profile, "test-session", { debug: true });
    
    console.log("\nStrategy Assembled:");
    if (strategy) {
        console.log("Confidence:", strategy.confidence);
        console.log("Strategy Keys:", Object.keys(JSON.parse(strategy.strategyRawJson)));
        console.log("Debug trace:", JSON.stringify(strategy._debug, null, 2));
    } else {
        console.log("NULL");
    }
}

testUnknownIndustry().catch(console.error);
