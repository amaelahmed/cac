import { RetrievalEngine } from '../functions/api/engine/retrieval.js';
import { BusinessProfileBuilder } from '../functions/api/engine/profileBuilder.js';

// Need to mock env.DB
const mockDB = {
  prepare: (query) => {
    return {
      bind: (...args) => ({
        all: async () => {
          if (query.includes("industries")) {
            return { results: [] }; // No match found
          }
          if (query.includes("knowledge_objects")) {
            return { results: [
              { id: "gen-1", target_model: "ANY", target_audience: "ANY", target_stage: "ANY", content_json: '{"strategy": "Generic Plan"}' }
            ] };
          }
          return { results: [] };
        }
      })
    };
  }
};

async function run() {
  const payload = { biz_industry: "Space Mining", biz_audience: "Billionaires" };
  const profile = BusinessProfileBuilder.build(payload);
  console.log("Profile:", profile);
  
  const env = { DB: mockDB };
  const engine = new RetrievalEngine(env);
  const result = await engine.assembleStrategy(profile);
  console.log("Strategy:", JSON.stringify(result, null, 2));
}

run().catch(console.error);
