-- AUTO-GENERATED SEED FOR INDUSTRY: Cafe (ind-cafe-304)
BEGIN TRANSACTION;

-- 1. TAXONOMY
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-food-beverage-300', 'Parent Industry', NULL, 0, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-cafe-304', 'Cafe', 'ind-food-beverage-300', 1, 1);

-- 2. KNOWLEDGE DOMAINS
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'Consumer Psychology', 'Standard domain for Consumer Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'Offer Strategy', 'Standard domain for Offer Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'Pricing Psychology', 'Standard domain for Pricing Psychology', 1);

-- 3. RESEARCH WORKSPACE
INSERT OR IGNORE INTO research_projects (id, name, industry_id, status, created_by) VALUES ('proj-cafe-304', '2026 Cafe Marketing Insights', 'ind-cafe-304', 'Active', 'CAC Research Team');
INSERT OR IGNORE INTO research_sources (id, project_id, source_type, url, publication_date, last_verified_at, reliability_score, citation_notes) VALUES ('src-cac-expert-04', 'proj-cafe-304', 'Internal', 'internal://cac/cafe-2026', '2026-06-01', datetime('now'), 95, 'CAC Expert Synthesis derived from 150+ cafe analyses.');

-- 4. KNOWLEDGE OBJECTS
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    '99fb2304-0dfe-4872-a3ad-97ec381864e2', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-cafe-304', 'Insight', '1.0.0', 'CAC Research Team', 'src-cac-expert-04', 'internal://cac/cafe-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 90, '["atmosphere","community"]', 'Insight on positioning the cafe as a space between work and home.', '[]',
    'Build Trust', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight":"{{BUSINESS_NAME}} acts as a ''third place''—a crucial social environment separate from the two usual environments of home and workplace.","implication":"Marketing should focus not just on the coffee, but on the environment, comfort, and sense of community."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    '425e2b23-5b4b-4f26-a964-13571cead162', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-cafe-304', 'Framework', '1.0.0', 'CAC Research Team', 'src-cac-expert-04', 'internal://cac/cafe-2026',
    'Published', 'Lead Editor', datetime('now'), 88, 85, '["revenue optimization","customer behavior"]', 'Strategies to convert long-stay laptop workers into repeat purchasers.', '[]',
    'Increase AOV', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Mid-Market', 'ANY', 'ANY', 'ANY',
    '{"problem":"Customers buying a single $4 coffee and staying for 6 hours.","solution":"Implement ''bottomless'' drip coffee subscriptions, or offer a ''Work from Cafe'' tier that includes lunch for a fixed higher price."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    'b78dd4e7-20d5-44fc-a7eb-7c828de67b7d', 'bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'ind-cafe-304', 'Campaign', '1.0.0', 'CAC Strategy Team', 'src-cac-expert-04', 'internal://cac/cafe-2026',
    'Published', 'Lead Editor', datetime('now'), 92, 90, '["retention","morning rush"]', 'A subscription or punch-card strategy aimed at the morning crowd.', '[]',
    'Increase Footfall', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"hook":"Own the morning routine for the neighborhood.","execution":"Launch a ''Skip the Line'' coffee subscription. For $30/month, they get their first drip coffee free every day, ordered ahead. You make the margin back on upsold pastries."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    '0f52ed41-31e5-496a-a68a-c3e5d310bcf0', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-cafe-304', 'Framework', '1.0.0', 'CAC Psychology Team', 'src-cac-expert-04', 'internal://cac/cafe-2026',
    'Published', 'Lead Editor', datetime('now'), 95, 95, '["pricing structure","aov"]', 'Structuring pricing so the large size feels like a no-brainer deal.', '[]',
    'Increase AOV', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Mid-Market', 'ANY', 'ANY', 'ANY',
    '{"principle":"The ''Decoy Effect'' applied to cup sizes.","application":"Price the Small at $3.50, the Medium at $4.50, and the Large at $4.75. The minimal difference between Medium and Large makes the Large seem like the best value, driving higher AOV."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
COMMIT;
