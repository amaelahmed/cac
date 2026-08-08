import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Connect to Local D1 SQLite
const d1Dir = path.join(__dirname, '../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
let dbFiles = [];
try {
    dbFiles = fs.readdirSync(d1Dir).filter(f => f.endsWith('.sqlite') && !f.includes('metadata'));
} catch {
    console.error("Could not find D1 directory.");
    process.exit(1);
}

if (dbFiles.length === 0) {
    console.error("No sqlite file found.");
    process.exit(1);
}

const db = new Database(path.join(d1Dir, dbFiles[0]));

const objects = [
  // RESTAURANT
  {
    id: 'ko-rest-overview-001',
    domain_id: '771cc888-033e-4ea7-ab89-c7fb9df7649f',
    industry_id: 'ind-restaurant-303',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 95,
    tags: JSON.stringify(['food', 'restaurant', 'overview']),
    expected_output: 'Restaurant industry general overview',
    placeholders: JSON.stringify(['{{biz_name}}', '{{biz_location}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Restaurant Market Overview',
      description: 'Overview for {{biz_name}} located in {{biz_location}}. The restaurant industry is highly competitive, emphasizing customer experience and food quality.'
    })
  },
  {
    id: 'ko-rest-seo-001',
    domain_id: 'edab8322-3a8e-4526-a62c-40e01b92fa10',
    industry_id: 'ind-restaurant-303',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 95,
    tags: JSON.stringify(['seo', 'local', 'restaurant']),
    expected_output: 'Restaurant local SEO tips',
    placeholders: JSON.stringify(['{{biz_location}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Local SEO for Restaurants',
      description: 'To dominate {{biz_location}}, focus on Google Business Profile reviews with keywords like "best food in {{biz_location}}".'
    })
  },
  {
    id: 'ko-rest-persona-001',
    domain_id: 'f81469c2-667a-430e-a519-98493192f499',
    industry_id: 'ind-restaurant-303',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 92,
    tags: JSON.stringify(['persona', 'restaurant', 'foodie']),
    expected_output: 'Foodie persona for restaurants',
    placeholders: JSON.stringify(['{{biz_name}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Persona: The Weekend Foodie',
      description: 'They visit {{biz_name}} for the aesthetic and unique flavors. They are highly active on Instagram and TikTok.'
    })
  },
  {
    id: 'ko-rest-wa-001',
    domain_id: '17067f58-046a-4551-ac59-eb84f0d9565d',
    industry_id: 'ind-restaurant-303',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 90,
    tags: JSON.stringify(['whatsapp', 'restaurant', 'reservations']),
    expected_output: 'WhatsApp reservation strategy',
    placeholders: JSON.stringify(['{{biz_name}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Automated WhatsApp Reservations',
      description: 'Allow customers of {{biz_name}} to book a table directly via WhatsApp with a chat flow.'
    })
  },
  
  // GYM
  {
    id: 'ko-gym-overview-001',
    domain_id: '771cc888-033e-4ea7-ab89-c7fb9df7649f',
    industry_id: 'ind-gym-401',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 95,
    tags: JSON.stringify(['gym', 'fitness', 'overview']),
    expected_output: 'Gym industry overview',
    placeholders: JSON.stringify(['{{biz_name}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Fitness Market Overview',
      description: '{{biz_name}} operates in a market that heavily values community, equipment quality, and flexible hours.'
    })
  },
  {
    id: 'ko-gym-persona-001',
    domain_id: 'f81469c2-667a-430e-a519-98493192f499',
    industry_id: 'ind-gym-401',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 92,
    tags: JSON.stringify(['persona', 'gym', 'beginner']),
    expected_output: 'Beginner persona for gyms',
    placeholders: JSON.stringify(['{{biz_name}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Persona: The Intimidated Beginner',
      description: 'Needs guidance. {{biz_name}} should offer an introductory walkthrough to convert them into long-term members.'
    })
  },
  {
    id: 'ko-gym-comp-001',
    domain_id: 'a61bfd33-abd6-4b8d-a3d3-eb2341dd315b',
    industry_id: 'ind-gym-401',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 88,
    tags: JSON.stringify(['competitor', 'gym', 'differentiation']),
    expected_output: 'Gym competitor differentiation',
    placeholders: JSON.stringify(['{{biz_name}}', '{{biz_location}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Competitor Intel: Big Box Gyms',
      description: 'In {{biz_location}}, large chains compete on price. {{biz_name}} must compete on community and specialized classes.'
    })
  },
  
  // REAL ESTATE
  {
    id: 'ko-real-overview-001',
    domain_id: '771cc888-033e-4ea7-ab89-c7fb9df7649f',
    industry_id: 'ind-realestate-501',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 90,
    tags: JSON.stringify(['realestate', 'overview']),
    expected_output: 'Real estate overview',
    placeholders: JSON.stringify(['{{biz_name}}', '{{biz_location}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Real Estate Dynamics',
      description: '{{biz_name}} operates in {{biz_location}}, a market driven by trust, personal brand, and digital property discovery.'
    })
  },
  {
    id: 'ko-real-seo-001',
    domain_id: 'edab8322-3a8e-4526-a62c-40e01b92fa10',
    industry_id: 'ind-realestate-501',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 96,
    tags: JSON.stringify(['seo', 'realestate', 'local']),
    expected_output: 'Real estate local SEO',
    placeholders: JSON.stringify(['{{biz_name}}', '{{biz_location}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'Local SEO for Realtors',
      description: 'Publish local neighborhood guides on the {{biz_name}} blog to capture "moving to {{biz_location}}" searches.'
    })
  },
  {
    id: 'ko-real-wa-001',
    domain_id: '17067f58-046a-4551-ac59-eb84f0d9565d',
    industry_id: 'ind-realestate-501',
    object_type: 'Module',
    author: 'CAC Seeder',
    review_status: 'Published',
    base_confidence: 85,
    tags: JSON.stringify(['whatsapp', 'realestate', 'viewings']),
    expected_output: 'Real estate WhatsApp usage',
    placeholders: JSON.stringify(['{{biz_name}}']),
    target_goal: 'ANY',
    target_audience: 'ANY',
    target_location: 'ANY',
    target_size: 'ANY',
    target_service: 'ANY',
    target_stage: 'ANY',
    target_model: 'ANY',
    target_pricing: 'ANY',
    target_type: 'ANY',
    target_maturity: 'ANY',
    target_challenge: 'ANY',
    content_json: JSON.stringify({
      title: 'WhatsApp Property Tours',
      description: '{{biz_name}} can use WhatsApp Business to send virtual video tours to prospects before scheduling physical viewings.'
    })
  }
];

let inserted = 0;

try {
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO knowledge_objects (
      id, domain_id, industry_id, object_type, author, review_status, base_confidence,
      tags, expected_output, placeholders,
      target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
      content_json, created_at, updated_at
    ) VALUES (
      @id, @domain_id, @industry_id, @object_type, @author, @review_status, @base_confidence,
      @tags, @expected_output, @placeholders,
      @target_goal, @target_audience, @target_location, @target_size, @target_service, @target_stage, @target_model, @target_pricing, @target_type, @target_maturity, @target_challenge,
      @content_json, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `);

  const insertMany = db.transaction((objs) => {
    for (const obj of objs) {
      insertStmt.run(obj);
      inserted++;
    }
  });

  insertMany(objects);
  console.log(`Successfully seeded ${inserted} knowledge objects into the intelligence library.`);
} catch (err) {
  console.error("Error seeding:", err);
  process.exit(1);
}
