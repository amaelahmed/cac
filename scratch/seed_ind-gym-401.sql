-- AUTO-GENERATED SEED FOR INDUSTRY: Gym (ind-gym-401)
BEGIN TRANSACTION;

-- 1. TAXONOMY
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-health-wellness-400', 'Parent Industry', NULL, 0, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-gym-401', 'Gym', 'ind-health-wellness-400', 1, 1);

-- 2. KNOWLEDGE DOMAINS
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'Consumer Psychology', 'Standard domain for Consumer Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'Offer Strategy', 'Standard domain for Offer Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'Pricing Psychology', 'Standard domain for Pricing Psychology', 1);

-- 3. RESEARCH WORKSPACE
INSERT OR IGNORE INTO research_projects (id, name, industry_id, status, created_by) VALUES ('proj-gym-401', '2026 Gym Marketing Insights', 'ind-gym-401', 'Active', 'CAC Research Team');
INSERT OR IGNORE INTO research_sources (id, project_id, source_type, url, publication_date, last_verified_at, reliability_score, citation_notes) VALUES ('src-cac-expert-05', 'proj-gym-401', 'Internal', 'internal://cac/gym-2026', '2026-06-01', datetime('now'), 95, 'CAC Expert Synthesis derived from 200+ fitness business analyses.');

-- 4. KNOWLEDGE OBJECTS
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
) VALUES (
    '4d5093cb-163b-4656-a6d3-abd4bdaa9903', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-gym-401', 'Insight', '1.0.0', 'CAC Research Team', 'src-cac-expert-05', 'internal://cac/gym-2026',
    'Published', 'Lead Editor', datetime('now'), 95, 92, '["friction","trust"]', 'Understanding the primary barrier to entry for new members.', '[]',
    'Build Trust', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight":"The number one reason prospects don''t sign up is fear of looking foolish or being judged.","implication":"Marketing should de-emphasize ''hardcore'' fitness models and highlight beginner-friendly onboarding."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '61303b7f-259f-42ba-aaca-9b73fc12d176', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-gym-401', 'Insight', '1.0.0', 'CAC Research Team', 'src-cac-expert-05', 'internal://cac/gym-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 88, '["seasonality","retention"]', 'Understanding the lifecycle of the New Year resolutioner.', '[]',
    'Increase Retention', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight":"Most gyms see a 40% influx in January, followed by a 60% drop-off by March.","implication":"Retention campaigns must begin on day 14, not day 60, focusing on small habit formation rather than massive results."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    '742ecdfb-491a-4cf3-af24-fabac51fd8d6', 'bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'ind-gym-401', 'Campaign', '1.0.0', 'CAC Strategy Team', 'src-cac-expert-05', 'internal://cac/gym-2026',
    'Published', 'Lead Editor', datetime('now'), 88, 95, '["challenge","lead gen"]', 'A low-barrier challenge designed to build habits before upselling.', '[]',
    'Increase Lead Quality', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Premium', 'ANY', 'ANY', 'ANY',
    '{"hook":"Give us 21 days. We''ll give you a habit you won''t want to break.","execution":"Offer a high-ticket, short-duration front-end challenge ($199 for 21 days). Include accountability coaching. Convert them to the $39/month annual plan on day 18 when momentum is highest."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
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
    'ae4bb4f4-9fe2-4c24-af5d-9892ef2617cd', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-gym-401', 'Framework', '1.0.0', 'CAC Psychology Team', 'src-cac-expert-05', 'internal://cac/gym-2026',
    'Published', 'Lead Editor', datetime('now'), 92, 90, '["pricing structure","commitment"]', 'Using an inflated monthly price to drive annual commitments.', '[]',
    'Increase AOV', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'Mid-Market', 'ANY', 'ANY', 'ANY',
    '{"principle":"High short-term pricing makes long-term commitments seem financially irresponsible to ignore.","application":"Set the month-to-month rate at $79, but the 12-month commitment at $39/month. This makes the $79 option a decoy to force the long-term contract."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
) ON CONFLICT(id) DO UPDATE SET 
    version=excluded.version, 
    content_json=excluded.content_json, 
    quality_score=excluded.quality_score, 
    updated_at=datetime('now');
COMMIT;
