BEGIN TRANSACTION;

-- 1. INDUSTRIES
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-generic-000', 'Generic Business', NULL, 0, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-software-600', 'Software', 'ind-generic-000', 1, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-technology-700', 'Technology', 'ind-generic-000', 1, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-consulting-800', 'Consulting', 'ind-generic-000', 1, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-media-900', 'Media', 'ind-generic-000', 1, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-enterprise-1000', 'Enterprise', 'ind-generic-000', 1, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-ecommerce-1100', 'E-commerce', 'ind-generic-000', 1, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-retail-1200', 'Retail', 'ind-generic-000', 1, 1);

-- 2. DOMAINS (Reuse existing from DB, assume they exist or insert if missing)
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'Consumer Psychology', 'Standard domain for Consumer Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'Offer Strategy', 'Standard domain for Offer Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'Pricing Psychology', 'Standard domain for Pricing Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('88888888-8888-8888-8888-888888888888', 'Growth Strategy', 'Standard domain for Growth Strategy', 1);

-- 3. GENERIC FALLBACK OBJECTS
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'gen-framework-1', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-generic-000', 'Framework', '1.0.0', 'CAC AI', 'Published',
    50, 80, 'Universal Value Proposition', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"principle": "Clarity over cleverness.", "application": "Focus on clearly communicating what problem you solve and for whom, rather than using buzzwords."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'gen-growth-1', '88888888-8888-8888-8888-888888888888', 'ind-generic-000', 'Strategy', '1.0.0', 'CAC AI', 'Published',
    50, 80, 'Universal Growth Channel', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"strategy": "Referral loops", "action": "Ask your happiest customers for a review or referral immediately after they receive value from your product."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- 4. SPECIFIC ARCHETYPE OBJECTS
-- Software (SaaS / Open Source)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'sw-pricing-1', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-software-600', 'Strategy', '1.0.0', 'CAC AI', 'Published',
    80, 90, 'SaaS Pricing Tiers', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"principle": "The Rule of 3 Tiers", "application": "Offer a basic, pro, and enterprise tier. Most users will pick the middle tier."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- Technology (AI Startup / Enterprise Tech)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'tech-psych-1', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-technology-700', 'Insight', '1.0.0', 'CAC AI', 'Published',
    85, 90, 'Selling to Developers', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight": "Developers hate marketing.", "implication": "Sell through documentation, quick-start guides, and open APIs instead of traditional sales pages."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- Consulting (Agency)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'cons-offer-1', 'bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'ind-consulting-800', 'Framework', '1.0.0', 'CAC AI', 'Published',
    85, 90, 'Productized Services', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"hook": "Stop charging by the hour.", "execution": "Package your consulting into a fixed-price audit or roadmap to reduce friction and increase perceived value."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- Media (Creator)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'med-growth-1', '88888888-8888-8888-8888-888888888888', 'ind-media-900', 'Strategy', '1.0.0', 'CAC AI', 'Published',
    85, 90, 'Audience Funnel', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"strategy": "Rent to Own", "action": "Use short-form rented platforms (TikTok, Reels) to drive traffic to owned platforms (Email list, Community)."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- Enterprise (Internal Tool)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'ent-psych-1', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-enterprise-1000', 'Insight', '1.0.0', 'CAC AI', 'Published',
    85, 90, 'Enterprise Buying Committees', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"insight": "Enterprise purchases require consensus.", "implication": "Provide collateral for the champion to sell to the CFO, IT, and legal teams."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- E-commerce (Marketplace)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'ecom-growth-1', '88888888-8888-8888-8888-888888888888', 'ind-ecommerce-1100', 'Strategy', '1.0.0', 'CAC AI', 'Published',
    85, 90, 'Solving the Cold Start', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"strategy": "Constrain the market.", "action": "Launch your marketplace in a highly specific geographic area or niche category before expanding."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;

-- Retail (D2C Brand)
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, review_status, 
    base_confidence, quality_score, expected_output, target_goal, target_audience, 
    target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json
) VALUES (
    'ret-pricing-1', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-retail-1200', 'Strategy', '1.0.0', 'CAC AI', 'Published',
    85, 90, 'Subscription Box Economics', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY',
    '{"principle": "LTV over CAC", "application": "Offer a steep discount on the first box to acquire customers, knowing they will stick around for 4-6 months."}'
) ON CONFLICT(id) DO UPDATE SET content_json=excluded.content_json;


COMMIT;
