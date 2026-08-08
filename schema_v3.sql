-- INDUSTRY TAXONOMY (Supports hierarchy: Healthcare -> Dental -> Pediatric)
CREATE TABLE IF NOT EXISTS industries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES industries(id),
  level INTEGER DEFAULT 0, -- 0 for root, 1 for child...
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_industries_parent ON industries(parent_id);

-- KNOWLEDGE DOMAINS (e.g., 'Consumer Psychology', 'Pricing Psychology')
CREATE TABLE IF NOT EXISTS knowledge_domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active INTEGER DEFAULT 1
);

-- RESEARCH WORKSPACE (Knowledge Acquisition Pipeline)
CREATE TABLE IF NOT EXISTS research_projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry_id TEXT REFERENCES industries(id),
  status TEXT DEFAULT 'Active', -- 'Active', 'Completed', 'Archived'
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS research_sources (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES research_projects(id),
  source_type TEXT, -- 'Academic', 'Gov', 'Case Study', 'Public Dataset', 'Internal'
  url TEXT,
  publication_date DATE,
  last_verified_at DATETIME,
  reliability_score INTEGER, -- 0-100 (e.g. Gov=95, Blog=50)
  citation_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- KNOWLEDGE OBJECTS (The granular intelligence modules)
CREATE TABLE IF NOT EXISTS knowledge_objects (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL REFERENCES knowledge_domains(id),
  industry_id TEXT NOT NULL REFERENCES industries(id), -- Specific node or root
  object_type TEXT NOT NULL,       -- 'Fact', 'Insight', 'Framework', 'Campaign', 'Offer', etc.
  version TEXT DEFAULT '1.0.0',
  
  -- Admin Metadata
  author TEXT NOT NULL,
  source_id TEXT REFERENCES research_sources(id),
  evidence_source TEXT,            -- URL or internal reference
  review_status TEXT DEFAULT 'Draft', -- 'Draft', 'Pending', 'Published', 'Archived'
  reviewer TEXT,
  last_reviewed_at DATETIME,
  base_confidence INTEGER DEFAULT 100, -- Author's confidence in the quality (0-100)
  quality_score INTEGER DEFAULT 0, -- Curated QA score
  tags TEXT,                       -- JSON array of descriptive tags
  expected_output TEXT,
  placeholders TEXT,               -- JSON array of required vars
  
  -- Multi-Dimensional Targeting Criteria (Store specific values or 'ANY')
  target_goal TEXT DEFAULT 'ANY', 
  target_audience TEXT DEFAULT 'ANY',
  target_location TEXT DEFAULT 'ANY',
  target_size TEXT DEFAULT 'ANY',
  target_service TEXT DEFAULT 'ANY',
  target_stage TEXT DEFAULT 'ANY',     -- 'Idea', 'Startup', 'Growth', 'Mature'
  target_model TEXT DEFAULT 'ANY',     -- 'B2B', 'B2C', 'B2B2C'
  target_pricing TEXT DEFAULT 'ANY',   -- 'Premium', 'Mid-Market', 'Budget'
  target_type TEXT DEFAULT 'ANY',      -- 'Online', 'Offline', 'Hybrid'
  target_maturity TEXT DEFAULT 'ANY',  -- 'Low', 'Medium', 'High'
  target_challenge TEXT DEFAULT 'ANY', -- 'Lead Gen', 'Conversion', 'Retention'
  
  -- Content Payload
  content_json TEXT NOT NULL,      -- Hydration placeholders support included
  
  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  published_at DATETIME,
  review_due_at DATETIME,
  expired_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_ko_domain ON knowledge_objects(domain_id);
CREATE INDEX IF NOT EXISTS idx_ko_industry ON knowledge_objects(industry_id);
CREATE INDEX IF NOT EXISTS idx_ko_status ON knowledge_objects(review_status);

-- KNOWLEDGE OBJECT RELATIONSHIPS (The Knowledge Factory)
CREATE TABLE IF NOT EXISTS ko_relationships (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES knowledge_objects(id),
  target_id TEXT NOT NULL REFERENCES knowledge_objects(id),
  relation_type TEXT NOT NULL, -- 'SUPPORTS', 'DEPENDS_ON', 'EXTENDS', 'REPLACES', 'DEPRECATED_BY', 'RELATED_TO'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ko_rel_source ON ko_relationships(source_id);
CREATE INDEX IF NOT EXISTS idx_ko_rel_target ON ko_relationships(target_id);

-- KNOWLEDGE USAGE ANALYTICS
CREATE TABLE IF NOT EXISTS ko_analytics (
  object_id TEXT REFERENCES knowledge_objects(id),
  times_selected INTEGER DEFAULT 0,
  times_skipped INTEGER DEFAULT 0,
  times_regenerated INTEGER DEFAULT 0,
  roast_override_count INTEGER DEFAULT 0,
  saved_in_report_count INTEGER DEFAULT 0,
  last_used_at DATETIME
);

-- TELEMETRY (Object Interactions)
CREATE TABLE IF NOT EXISTS object_interactions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  generation_id TEXT,
  strategy_id TEXT,
  object_id TEXT REFERENCES knowledge_objects(id),
  interaction_type TEXT NOT NULL, -- 'GENERATED', 'EDITED', 'EXPORTED', 'DELETED', 'REGENERATED'
  industry TEXT,
  edited INTEGER DEFAULT 0,
  exported INTEGER DEFAULT 0,
  deleted INTEGER DEFAULT 0,
  time_since_generation INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_obj_int_session ON object_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_obj_int_object ON object_interactions(object_id);

-- BUSINESS MEMORY SERVICE (Profile Persistence)
CREATE TABLE IF NOT EXISTS business_profiles (
  session_id TEXT PRIMARY KEY,
  schema_version INTEGER DEFAULT 1,
  profile_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- STRATEGY STORAGE & USER HISTORY (Legacy-compatible runtime tables)
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  uid TEXT NOT NULL,
  business_name TEXT,
  business_type TEXT,
  location TEXT,
  website TEXT,
  strategy_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_strategies_uid ON strategies(uid);

-- ANALYTICS TRACKING
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  uid TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- RATE LIMIT TRACKING
CREATE TABLE IF NOT EXISTS rate_limits (
  ip_or_uid TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1,
  window_start DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- TRANSACTIONS LOG FOR PAYMENT IDEMPOTENCY
CREATE TABLE IF NOT EXISTS transactions (
  payment_id TEXT PRIMARY KEY,
  uid TEXT,
  order_id TEXT,
  amount INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_transactions_uid ON transactions(uid);

-- BETTER AUTH CORE TABLES
CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    emailVerified INTEGER NOT NULL,
    image TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expiresAt DATETIME NOT NULL,
    token TEXT NOT NULL UNIQUE,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId TEXT NOT NULL REFERENCES user(id)
);
CREATE INDEX IF NOT EXISTS idx_session_user ON session(userId);

CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId TEXT NOT NULL REFERENCES user(id),
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt DATETIME,
    refreshTokenExpiresAt DATETIME,
    scope TEXT,
    password TEXT,
    createdAt DATETIME NOT NULL,
    updatedAt DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_account_user ON account(userId);

CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt DATETIME NOT NULL,
    createdAt DATETIME,
    updatedAt DATETIME
);

-- HYBRID AI LEGACY FALLBACK TABLES
CREATE TABLE IF NOT EXISTS kb_templates (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  business_type TEXT NOT NULL,
  region TEXT DEFAULT 'Global',
  content_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_kb_templates_biz_cat ON kb_templates(business_type, category);

CREATE TABLE IF NOT EXISTS ai_cache (
  cache_key TEXT PRIMARY KEY,
  content_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME
);
