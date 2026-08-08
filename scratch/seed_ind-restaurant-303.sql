-- AUTO-GENERATED SEED FOR INDUSTRY: Restaurant (ind-restaurant-303)
BEGIN TRANSACTION;

-- 1. TAXONOMY
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-food-beverage-300', 'Parent Industry', NULL, 0, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-restaurant-303', 'Restaurant', 'ind-food-beverage-300', 1, 1);

-- 2. KNOWLEDGE DOMAINS
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'Consumer Psychology', 'Standard domain for Consumer Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'Offer Strategy', 'Standard domain for Offer Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'Pricing Psychology', 'Standard domain for Pricing Psychology', 1);

-- 3. RESEARCH WORKSPACE
INSERT OR IGNORE INTO research_projects (id, name, industry_id, status, created_by) VALUES ('proj-restaurant-3036', '2026 Restaurant Marketing Insights', 'ind-restaurant-303', 'Active', 'CAC Research Team');
INSERT OR IGNORE INTO research_sources (id, project_id, source_type, url, publication_date, last_verified_at, reliability_score, citation_notes) VALUES ('src-cac-expert-03', 'proj-restaurant-3036', 'Internal', 'internal://cac/restaurant-2026', '2026-06-01', datetime('now'), 95, 'CAC Expert Synthesis derived from 200+ restaurant analyses.');

-- 4. KNOWLEDGE OBJECTS
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    '6099bf27-89f2-47d2-a92a-5ba757d7abb3', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-restaurant-303', 'Framework', '1.1.0', 'CAC Research Team', 'src-cac-expert-03', 'internal://cac/restaurant-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 95, '["fine dining","trust"]', 'Detailed consumer fears and trust signals for premium restaurants.', '[]',
    'Build Trust', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Premium', 'ANY', 'ANY', 'ANY',
    '{"core_fear":"Paying a premium for a mediocre or rushed experience.","trust_signals":"Immaculate plating, professional service staff, curated wine list."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '7b76ccfc-2699-44a9-af06-ddbb8c95cb30', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-restaurant-303', 'Insight', '1.1.0', 'CAC Research Team', 'src-cac-expert-03', 'internal://cac/restaurant-2026',
    'Published', 'Lead Editor', datetime('now'), 92, 92, '["visuals"]', 'Insight on the visual nature of the restaurant industry.', '[]',
    'Increase Awareness', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight":"{{BUSINESS_NAME}} operates in a highly visual and experience-driven market.","trends":["User-generated content dominating discovery.","Shift from formal dining to experiential dining."],"implication":"Marketing must highlight the atmosphere and visual appeal of the food."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '111bf2b6-a6b6-4c2e-af13-35fc6e700cb2', 'bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'ind-restaurant-303', 'Campaign', '1.1.0', 'CAC Strategy Team', 'src-cac-expert-03', 'internal://cac/restaurant-2026',
    'Published', 'Lead Editor', datetime('now'), 85, 90, '["promotion","mid-week"]', 'A mid-week promotion strategy to drive slower day traffic.', '[]',
    'Increase Footfall', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Mid-Market', 'ANY', 'ANY', 'ANY',
    '{"hook":"Turn the slowest day of the week into a recurring event.","execution":"Offer 50% off select bottles of wine with the purchase of two entrees.","upsell_path":"Train servers to recommend the premium dessert menu after the meal, as the customer feels they saved money on the wine."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '86978101-cb3c-45b8-aa27-d3f1e8421c97', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-restaurant-303', 'Framework', '1.1.0', 'CAC Psychology Team', 'src-cac-expert-03', 'internal://cac/restaurant-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 95, '["pricing","aov"]', 'Explanation of how a high-priced decoy makes other items look reasonable.', '[]',
    'Increase AOV', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Premium', 'ANY', 'ANY', 'ANY',
    '{"principle":"People compare prices relative to each other, not in a vacuum.","application":"Introduce an extremely expensive item (e.g., $150 Seafood Tower) so the $45 Steak looks like a reasonable mid-tier option."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    'a6623cdf-2f51-4add-aa65-2252574268f7', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-restaurant-303', 'Insight', '1.1.0', 'CAC Psychology Team', 'src-cac-expert-03', 'internal://cac/restaurant-2026',
    'Published', 'Lead Editor', datetime('now'), 95, 90, '["menu design"]', 'The psychological impact of currency symbols on spending.', '[]',
    'Reduce Friction', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight":"Currency symbols trigger the ''pain of paying'' center in the brain.","implication":"List prices as simple numbers (e.g., ''14'' instead of ''$14.00'') to abstract the concept of money."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
COMMIT;
