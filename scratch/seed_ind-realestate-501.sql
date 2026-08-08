-- AUTO-GENERATED SEED FOR INDUSTRY: Real Estate (ind-realestate-501)
BEGIN TRANSACTION;

-- 1. TAXONOMY
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-services-500', 'Parent Industry', NULL, 0, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-realestate-501', 'Real Estate', 'ind-services-500', 1, 1);

-- 2. KNOWLEDGE DOMAINS
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'Consumer Psychology', 'Standard domain for Consumer Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'Offer Strategy', 'Standard domain for Offer Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'Pricing Psychology', 'Standard domain for Pricing Psychology', 1);

-- 3. RESEARCH WORKSPACE
INSERT OR IGNORE INTO research_projects (id, name, industry_id, status, created_by) VALUES ('proj-realestate-501', '2026 Real Estate Marketing Insights', 'ind-realestate-501', 'Active', 'CAC Research Team');
INSERT OR IGNORE INTO research_sources (id, project_id, source_type, url, publication_date, last_verified_at, reliability_score, citation_notes) VALUES ('src-cac-expert-06', 'proj-realestate-501', 'Internal', 'internal://cac/realestate-2026', '2026-06-01', datetime('now'), 95, 'CAC Expert Synthesis derived from 300+ real estate transactions and market analyses.');

-- 4. KNOWLEDGE OBJECTS
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    '69035a7c-7839-4d0d-a4ed-0a59b3bbf569', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-realestate-501', 'Insight', '1.0.0', 'CAC Research Team', 'src-cac-expert-06', 'internal://cac/realestate-2026',
    'Published', 'Lead Editor', datetime('now'), 95, 92, '["trust","anxiety"]', 'Insight detailing the anxiety around hidden flaws and overpaying in real estate.', '[]',
    'Build Trust', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Premium', 'ANY', 'ANY', 'ANY',
    '{"insight":"Buying a house is inherently terrifying because the cost of a mistake is catastrophic.","implication":"Marketing should over-index on transparency, detailed disclosures, and the agent''s role as a protective guide, not a salesperson."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    'f95d415a-437a-4e5f-a948-9a9097705211', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-realestate-501', 'Insight', '1.0.0', 'CAC Research Team', 'src-cac-expert-06', 'internal://cac/realestate-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 88, '["community","lifestyle"]', 'Understanding the importance of community in selling homes.', '[]',
    'Increase Awareness', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight":"Buyers purchase access to a community first and a structure second.","implication":"Sell the neighborhood lifestyle in the copy before describing the granite countertops."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '26d51b35-2fa6-40be-ab59-906e53025a96', 'bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'ind-realestate-501', 'Campaign', '1.0.0', 'CAC Strategy Team', 'src-cac-expert-06', 'internal://cac/realestate-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 95, '["lead gen","exclusivity"]', 'A strategy to build buyer leads by offering exclusive access.', '[]',
    'Increase Lead Quality', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Premium', 'ANY', 'ANY', 'ANY',
    '{"hook":"See homes before they hit Zillow.","execution":"Create an email capture campaign offering early access to listings 48 hours before they hit the MLS. This generates high-intent buyer leads without paying for portal ads."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '5785a2bb-4c90-4c59-a01e-cb253ceeba12', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-realestate-501', 'Insight', '1.0.0', 'CAC Psychology Team', 'src-cac-expert-06', 'internal://cac/realestate-2026',
    'Published', 'Lead Editor', datetime('now'), 95, 90, '["pricing structure","seo"]', 'Search engine bracket pricing strategy.', '[]',
    'Increase Footfall', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Mid-Market', 'ANY', 'ANY', 'ANY',
    '{"insight":"Zillow and Redfin filters work in $50k or $100k increments.","implication":"Pricing a home at $499,000 places it in the ''$400k-$500k'' bracket, whereas $505,000 completely excludes buyers who hard-cap their search at $500k."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
COMMIT;
