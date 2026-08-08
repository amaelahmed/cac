-- VERSION HISTORY
CREATE TABLE IF NOT EXISTS knowledge_object_versions (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL REFERENCES knowledge_objects(id),
  version TEXT NOT NULL,
  author TEXT NOT NULL,
  change_summary TEXT NOT NULL,
  content_json TEXT NOT NULL,
  placeholders TEXT,
  tags TEXT,
  target_goal TEXT,
  target_audience TEXT,
  target_location TEXT,
  target_size TEXT,
  target_service TEXT,
  target_stage TEXT,
  target_model TEXT,
  target_pricing TEXT,
  target_type TEXT,
  target_maturity TEXT,
  target_challenge TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ko_versions_object ON knowledge_object_versions(object_id);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL, -- 'Create', 'Edit', 'Publish', 'Archive', 'Delete', 'Restore', 'Import', 'Export', 'Rollback'
  object_id TEXT, -- nullable for bulk operations
  summary TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_object ON audit_logs(object_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_email);
