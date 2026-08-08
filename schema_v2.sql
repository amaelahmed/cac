-- Represents a top-level Industry Pack (e.g., "Dental Clinic")
CREATE TABLE ii_packs (
  id TEXT PRIMARY KEY,
  industry TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  is_active INTEGER DEFAULT 1, -- 1 for active, 0 for draft/deprecated
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ii_packs_industry ON ii_packs(industry);

-- Represents an individual intelligence module (e.g., "Google Business Strategies")
CREATE TABLE ii_modules (
  id TEXT PRIMARY KEY,
  pack_id TEXT NOT NULL REFERENCES ii_packs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,          -- e.g., 'Customer Personas', 'Pricing Psychology'
  
  -- Matching Criteria (Store specific values or 'ANY' for wildcard matching)
  target_goal TEXT DEFAULT 'ANY', 
  target_audience TEXT DEFAULT 'ANY',
  target_location TEXT DEFAULT 'ANY',
  target_size TEXT DEFAULT 'ANY',
  target_service TEXT DEFAULT 'ANY',
  
  tags TEXT,                       -- JSON string of additional context tags
  content_json TEXT NOT NULL,      -- The actual content payload containing placeholders
  
  -- Metadata
  version TEXT DEFAULT '1.0.0',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ii_modules_pack_category ON ii_modules(pack_id, category);
