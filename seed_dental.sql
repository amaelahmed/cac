-- SEED DATA FOR PHASE 4: DENTAL CLINIC

-- 1. TAXONOMY
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-healthcare-123', 'Healthcare', NULL, 0, 1);
INSERT OR IGNORE INTO industries (id, name, parent_id, level, is_active) VALUES ('ind-dental-456', 'Dental Clinic', 'ind-healthcare-123', 1, 1);

-- 2. KNOWLEDGE DOMAINS
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('771cc888-033e-4ea7-ab89-c7fb9df7649f', 'Industry Overview', 'Standard domain for Industry Overview', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f81469c2-667a-430e-a519-98493192f499', 'Customer Personas', 'Standard domain for Customer Personas', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'Consumer Psychology', 'Standard domain for Consumer Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('08820a32-c6f6-43c6-a185-bcce4a1ef75a', 'Buying Triggers', 'Standard domain for Buying Triggers', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('c5fd24ac-80ef-4e47-abd2-b141a060374f', 'Pain Points', 'Standard domain for Pain Points', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('b2ef4a7b-f687-4528-a6e8-ad587b95ac6d', 'Common Objections', 'Standard domain for Common Objections', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('a61bfd33-abd6-4b8d-a3d3-eb2341dd315b', 'Competitor Intelligence', 'Standard domain for Competitor Intelligence', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('a52fce78-b8f3-403d-a789-878f2635a977', 'Positioning', 'Standard domain for Positioning', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'Offer Strategy', 'Standard domain for Offer Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'Pricing Psychology', 'Standard domain for Pricing Psychology', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('edab8322-3a8e-4526-a62c-40e01b92fa10', 'Local SEO', 'Standard domain for Local SEO', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('a1072230-9c5c-4b7d-aaa8-163009a8ae25', 'Google Business', 'Standard domain for Google Business', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('f86cedc0-1ef9-45ec-aa90-ce831d5fe17d', 'Instagram Strategy', 'Standard domain for Instagram Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('17067f58-046a-4551-ac59-eb84f0d9565d', 'WhatsApp Marketing', 'Standard domain for WhatsApp Marketing', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('60b5c457-5fe8-4f48-a814-628e23c488c6', 'Referral Strategy', 'Standard domain for Referral Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('916e22be-fc65-470e-a7b5-e8e08493d1ed', 'Retention Strategy', 'Standard domain for Retention Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('231b7bd5-a292-4c40-a9f6-4b59859d125e', 'Upsell Strategy', 'Standard domain for Upsell Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('e3961d82-e497-4dd3-a39e-5035ace0ca6d', 'Cross-sell Strategy', 'Standard domain for Cross-sell Strategy', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('2f1343bd-9afb-484b-ae57-9ec7a805b9e4', 'Content Calendar', 'Standard domain for Content Calendar', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('90754ce6-3edf-457c-ad81-01433938c17d', 'Caption Bank', 'Standard domain for Caption Bank', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('a8ae4c4c-e829-4b82-ac34-33a1c4c68aa6', 'Hashtag Bank', 'Standard domain for Hashtag Bank', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('23e0994d-6250-47c3-a5bf-f89fecdec53d', 'KPIs', 'Standard domain for KPIs', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('9c244bde-489d-4a69-abf8-8aa1cabb2551', 'ROI', 'Standard domain for ROI', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('2d843dc7-2759-4dc5-abf5-5a2422dcac3d', 'Website Improvements', 'Standard domain for Website Improvements', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('5405d8a9-03c8-4e89-ab64-9f1b518ef1be', 'Frequently Asked Questions', 'Standard domain for Frequently Asked Questions', 1);
INSERT OR IGNORE INTO knowledge_domains (id, name, description, is_active) VALUES ('1015a221-7ce4-42b7-ab70-afa13035cac9', 'Common Mistakes', 'Standard domain for Common Mistakes', 1);

-- 3. RESEARCH WORKSPACE
INSERT OR IGNORE INTO research_projects (id, name, industry_id, status, created_by) VALUES ('proj-dental-2026', '2026 Dental Marketing Insights', 'ind-dental-456', 'Active', 'CAC Research Team');
INSERT OR IGNORE INTO research_sources (id, project_id, source_type, url, publication_date, last_verified_at, reliability_score, citation_notes) VALUES ('src-cac-expert-01', 'proj-dental-2026', 'Internal', 'internal://cac/dental-2026', '2026-06-01', datetime('now'), 95, 'CAC Expert Synthesis derived from 200+ dental clinic analyses.');

-- 4. KNOWLEDGE OBJECTS
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '3a244dd0-ee38-4290-99a9-0e7b6b24cbcc', '771cc888-033e-4ea7-ab89-c7fb9df7649f', 'ind-dental-456', 'Insight', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "industry overview"]', 'Detailed actionable strategy for Dental Clinic Industry Overview', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"insight":"{{BUSINESS_NAME}} operates in a high-trust, high-anxiety local market.","trends":["Shift towards cosmetic & elective procedures over purely restorative.","Increase in cash-pay membership plans to bypass insurance.","High reliance on local search visibility (Map Pack)."],"implication":"Marketing must prioritize anxiety-reduction, transparency, and social proof. A beautiful smile is a highly emotional purchase."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '88245118-cb31-4676-a5ed-af55417fe63a', 'f81469c2-667a-430e-a519-98493192f499', 'ind-dental-456', 'Framework', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "customer personas"]', 'Detailed actionable strategy for Dental Clinic Customer Personas', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'Premium', 'Offline', 'ANY', 'ANY',
    '{"persona_name":"The Cosmetic Upgrader","demographics":"28-45 years old, professional, higher disposable income.","psychographics":"Self-conscious about their smile on Zoom calls or upcoming life events (weddings). Values aesthetics, speed, and comfort over price.","marketing_angle":"Focus on transformation, confidence, and ''painless'' technology (e.g., 3D scanning instead of goop impressions)."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'f9ced3dd-8c10-43e2-8d25-8e51b24aa044', '780bb6f6-2b0d-4f3d-a499-41cc1330fcdd', 'ind-dental-456', 'Framework', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "consumer psychology"]', 'Detailed actionable strategy for Dental Clinic Consumer Psychology', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"core_fear":"Pain (the drill) and judgment (being lectured about not flossing).","trust_signals":"Before/after gallery with unretouched photos, video testimonials of patients immediately after procedures, immaculate clinic environment.","buying_trigger":"A specific painful event (toothache) OR a specific life event (wedding, new job, dating)."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '6d871a54-a936-47ce-a581-dbfa63b5088e', '08820a32-c6f6-43c6-a185-bcce4a1ef75a', 'ind-dental-456', 'Insight', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "buying triggers"]', 'Detailed actionable strategy for Dental Clinic Buying Triggers', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"triggers":[{"event":"Acute Pain","urgency":"High","response":"Requires immediate emergency SEO campaign and 24/7 call answering."},{"event":"Life Milestone","urgency":"Medium","response":"Targeted Facebook ads for ''Wedding Ready Smiles'' or Invisalign."},{"event":"Loss of Insurance","urgency":"Low","response":"Promote in-house dental membership plans."}]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'cf89b32f-df2d-4092-869c-f4613ffff999', 'c5fd24ac-80ef-4e47-abd2-b141a060374f', 'ind-dental-456', 'Fact', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "pain points"]', 'Detailed actionable strategy for Dental Clinic Pain Points', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"patient_pain_points":["Fear of the needle and the drill sound.","Unpredictable out-of-pocket costs and confusing insurance.","Being shamed by the hygienist.","Taking time off work for multiple appointments."],"solution_messaging":"Position {{BUSINESS_NAME}} as a ''Judgment-Free Zone'' with transparent upfront pricing and single-visit procedures (like CEREC crowns)."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '63c746e3-198a-403b-a5da-9e56bcacf7ce', 'b2ef4a7b-f687-4528-a6e8-ad587b95ac6d', 'ind-dental-456', 'Framework', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "common objections"]', 'Detailed actionable strategy for Dental Clinic Common Objections', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"objections":[{"objection":"It''s going to hurt.","rebuttal":"Highlight sedation options, numbing gel, and gentle techniques."},{"objection":"I can''t afford it.","rebuttal":"Offer third-party financing (CareCredit) and break down daily cost."},{"objection":"I don''t have the time.","rebuttal":"Emphasize early morning, evening, or weekend hours, and same-day treatments."}]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '54f82955-e748-42ce-80c4-8d0889f1a2d4', 'a61bfd33-abd6-4b8d-a3d3-eb2341dd315b', 'ind-dental-456', 'Insight', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "competitor intelligence"]', 'Detailed actionable strategy for Dental Clinic Competitor Intelligence', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"weaknesses":"Most local competitors have outdated websites, use stock photos of models instead of real patients, and have terrible phone answering protocols.","opportunity":"{{BUSINESS_NAME}} can win simply by answering the phone on the first ring, having real team photos, and offering online booking."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'f498279e-3aa7-4139-b5ab-9204de27b5d9', 'a52fce78-b8f3-403d-a789-878f2635a977', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "positioning"]', 'Detailed actionable strategy for Dental Clinic Positioning', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'Premium', 'Offline', 'ANY', 'ANY',
    '{"statement":"The Spa-Like Dental Experience for the Anxious Professional.","differentiators":["Noise-canceling headphones","Ceiling TVs","Aromatherapy","Comfort menu (blankets, lip balm)"]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '76bbfc9e-5d2f-4f3a-89df-fa7992c29c12', 'bbdd4c94-6db1-487f-a8ff-fe795809a7fe', 'ind-dental-456', 'Campaign', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "offer strategy"]', 'Detailed actionable strategy for Dental Clinic Offer Strategy', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'Budget', 'Offline', 'ANY', 'ANY',
    '{"offer_name":"The New Patient Welcome Package","hook":"$99 Exam, X-Rays, and Cleaning (Normally $350).","upsell_path":"Identify necessary restorative work during exam. Present treatment plan with financing options before they leave the chair."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '08a5585f-ea79-4ed3-8b41-d7316e96bb54', 'f339c7ce-59f8-49fd-ac3f-7fd9ecf1483b', 'ind-dental-456', 'Framework', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "pricing psychology"]', 'Detailed actionable strategy for Dental Clinic Pricing Psychology', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'Premium', 'Offline', 'ANY', 'ANY',
    '{"tactic":"The Anchor & Package","execution":"Never present a raw number for cosmetic work. Present a ''Total Smile Makeover'' package that includes whitening, retainers, and the core procedure. Anchor against the cost of traditional braces."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'c6204c0a-6a3d-437a-b9fa-3ffc7ecbb333', 'edab8322-3a8e-4526-a62c-40e01b92fa10', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "local seo"]', 'Detailed actionable strategy for Dental Clinic Local SEO', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"focus_keywords":["Dentist near me","Emergency dentist [City]","Invisalign [City]","Dental implants [City]"],"gbp_optimization":"Ensure ''Dental Clinic'' is the primary category. Upload weekly photos of the clinic exterior and happy patients. Respond to all reviews using keywords."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'f8d056c8-b058-4441-84ac-94ab94855ca0', 'a1072230-9c5c-4b7d-aaa8-163009a8ae25', 'ind-dental-456', 'Campaign', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "google business"]', 'Detailed actionable strategy for Dental Clinic Google Business', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"action_plan":"Implement a strict Review Request protocol. The front desk must ask every patient for a review *before* they leave the building, while they are still happy and relieved. Send an automated SMS with the direct review link 1 hour after the appointment."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'c9878442-d30f-4524-a287-881797a27520', 'f86cedc0-1ef9-45ec-aa90-ce831d5fe17d', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "instagram strategy"]', 'Detailed actionable strategy for Dental Clinic Instagram Strategy', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"pillars":["Before/After Transformations (High quality, same lighting).","Meet the Team (Humanize the staff, show personalities).","Educational Reels (Debunking dental myths, showing how tools work).","Patient Testimonials (Video format)."]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '0096c097-40a2-44ad-892f-ab56024beaf3', '17067f58-046a-4551-ac59-eb84f0d9565d', 'ind-dental-456', 'Campaign', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "whatsapp marketing"]', 'Detailed actionable strategy for Dental Clinic WhatsApp Marketing', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"use_case":"Post-Treatment Care & Recall","message_template":"Hi [Name], this is {{BUSINESS_NAME}}. Just checking in to see how you are feeling after your procedure today? Let us know if you have any discomfort!"}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '93dca530-3fbf-4b96-8e62-bbc9bc5162d9', '60b5c457-5fe8-4f48-a814-628e23c488c6', 'ind-dental-456', 'Campaign', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "referral strategy"]', 'Detailed actionable strategy for Dental Clinic Referral Strategy', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"program":"Share a Smile","incentive":"Give a friend $50 off their first visit, and you get a $50 credit towards your next treatment or whitening.","distribution":"Physical referral cards handed out in a nice welcome folder at the end of the first successful visit."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'aeeabdc9-1024-4400-8c17-09045b7be6e8', '916e22be-fc65-470e-a7b5-e8e08493d1ed', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "retention strategy"]', 'Detailed actionable strategy for Dental Clinic Retention Strategy', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"concept":"The Membership Model","details":"Create an in-house membership plan for uninsured patients. E.g., $29/month covers two cleanings, exams, X-rays, and 15% off all restorative work. This guarantees recurring revenue and patient loyalty."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '601aea48-f71a-44fc-8c03-7241b3abf964', '231b7bd5-a292-4c40-a9f6-4b59859d125e', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "upsell strategy"]', 'Detailed actionable strategy for Dental Clinic Upsell Strategy', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"timing":"Post-Hygiene Check","offer":"Professional Whitening","script":"While your teeth are perfectly clean today, we are running a special on our professional whitening pens if you wanted to brighten them up for the summer."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'a195c9e8-97b1-451d-a441-16ef3853c9bc', 'e3961d82-e497-4dd3-a39e-5035ace0ca6d', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "cross-sell strategy"]', 'Detailed actionable strategy for Dental Clinic Cross-sell Strategy', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"offer":"Night Guards","target":"Patients showing signs of bruxism (teeth grinding).","execution":"Dentist uses intraoral camera to show the patient the wear on their molars. Suggest a custom night guard to protect their investment in their teeth."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'cb3f3f7a-b845-460b-ab99-2058d7b96cb4', '2f1343bd-9afb-484b-ae57-9ec7a805b9e4', 'ind-dental-456', 'Framework', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "content calendar"]', 'Detailed actionable strategy for Dental Clinic Content Calendar', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"schedule":{"Monday":"Motivation/Transformation (Before & After).","Wednesday":"Educational/FAQ (Reel).","Friday":"Team Culture/Behind the Scenes."}}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '9a06caf3-3167-4390-be94-dc509ea99e1f', '90754ce6-3edf-457c-ad81-01433938c17d', 'ind-dental-456', 'Asset', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "caption bank"]', 'Detailed actionable strategy for Dental Clinic Caption Bank', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"captions":["Afraid of the dentist? You''re not alone. At {{BUSINESS_NAME}}, we specialize in anxiety-free dentistry. Here is how we make your visit comfortable...","Swipe to see the difference a single visit can make! 👉"]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '81b8c57e-2e2a-4ea5-acc4-cf47001c0c02', 'a8ae4c4c-e829-4b82-ac34-33a1c4c68aa6', 'ind-dental-456', 'Asset', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "hashtag bank"]', 'Detailed actionable strategy for Dental Clinic Hashtag Bank', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"tags":["#DentalCare","#[City]Dentist","#SmileMakeover","#Invisalign[City]","#[Neighborhood]Local"]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '0d1c242d-2fd5-43f9-a971-7f714ac028cb', '23e0994d-6250-47c3-a5bf-f89fecdec53d', 'ind-dental-456', 'Framework', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "kpis"]', 'Detailed actionable strategy for Dental Clinic KPIs', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"metrics":["Cost Per Acquisition (CPA) for New Patients.","New Patient Show-Up Rate (Target: >85%).","Treatment Plan Acceptance Rate (Target: >60%).","Active Patients (Visited in last 18 months)."]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '468688f9-e487-4655-ba9e-a142bd17432b', '9c244bde-489d-4a69-abf8-8aa1cabb2551', 'ind-dental-456', 'Fact', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "roi"]', 'Detailed actionable strategy for Dental Clinic ROI', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"calculation":"The lifetime value (LTV) of a dental patient is typically $1,000 - $4,000+. Therefore, acquiring a patient for $50-$150 via Google Ads is highly profitable, provided retention is strong."}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'fa286e5a-c3d7-41e1-a243-9551f621e29d', '2d843dc7-2759-4dc5-abf5-5a2422dcac3d', 'ind-dental-456', 'Strategy', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "website improvements"]', 'Detailed actionable strategy for Dental Clinic Website Improvements', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"checklist":["Sticky ''Book Online'' button in the header.","Real photos of the clinic on the homepage banner (NO STOCK PHOTOS).","Clear list of accepted insurances or financing options.","Mobile-friendly click-to-call phone number."]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    'ea19fd13-1766-4498-994c-6ffcd69dcc1d', '5405d8a9-03c8-4e89-ab64-9f1b518ef1be', 'ind-dental-456', 'Asset', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "frequently asked questions"]', 'Detailed actionable strategy for Dental Clinic Frequently Asked Questions', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"faqs":[{"q":"Do you accept my insurance?","a":"Yes, we accept most major PPO plans. We will even verify your benefits before your appointment."},{"q":"Will this hurt?","a":"Your comfort is our top priority. We offer various sedation options to ensure a painless experience."}]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );
INSERT INTO knowledge_objects (
    id, domain_id, industry_id, object_type, version, author, source_id, evidence_source, 
    review_status, reviewer, last_reviewed_at, base_confidence, quality_score, tags, expected_output, placeholders,
    target_goal, target_audience, target_location, target_size, target_service, target_stage, target_model, target_pricing, target_type, target_maturity, target_challenge,
    content_json, created_at, updated_at, published_at, review_due_at, expired_at
  ) VALUES (
    '85066e89-819f-462e-bce4-34029a0bad55', '1015a221-7ce4-42b7-ab70-afa13035cac9', 'ind-dental-456', 'Insight', '1.0.0', 'System', 'src-cac-expert-01', 'internal://cac/dental-2026',
    'Published', 'Lead Editor', datetime('now'), 90, 85, '["dental", "common mistakes"]', 'Detailed actionable strategy for Dental Clinic Common Mistakes', '["{{BUSINESS_NAME}}"]',
    'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'ANY', 'B2C', 'ANY', 'Offline', 'ANY', 'ANY',
    '{"mistakes":["Focusing marketing solely on routine cleanings (low margin) instead of high-value services (implants, clear aligners).","Front desk staff not trained in sales/conversion (letting callers hang up without booking).","Ignoring Google Reviews."]}', datetime('now'), datetime('now'), datetime('now'), datetime('now', '+1 year'), datetime('now', '+2 years')
  );

