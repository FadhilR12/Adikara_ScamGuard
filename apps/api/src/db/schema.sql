-- Skema ScamGuard (PRD 13.2)
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at  TEXT,
  ext_version   TEXT,
  locale        TEXT DEFAULT 'id'
);

CREATE TABLE IF NOT EXISTS risk_checks (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  input_type     TEXT NOT NULL CHECK (input_type IN ('url','text','number','page')),
  source         TEXT NOT NULL CHECK (source IN ('popup','auto','web')),
  target_hash    TEXT NOT NULL,
  target_display TEXT,
  score          INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  level          TEXT NOT NULL CHECK (level IN ('low','medium','high')),
  rule_hits      TEXT NOT NULL,
  rules_version  TEXT NOT NULL,
  user_action    TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rc_user ON risk_checks(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS incident_reports (
  id                 TEXT PRIMARY KEY,
  code               TEXT UNIQUE NOT NULL,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','in_progress','pack_generated','reported','closed')),
  current_step       INTEGER NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 4),
  checklist          TEXT NOT NULL DEFAULT '{}',
  source             TEXT,
  related_domain     TEXT,
  scam_type          TEXT,
  contact_channel    TEXT,
  transfer_at        TEXT,
  amount             INTEGER,
  recipient_bank     TEXT,
  recipient_account  TEXT,
  recipient_name     TEXT,
  related_accounts   TEXT,
  chronology         TEXT,
  bank_ticket        TEXT,
  iasc_report_no     TEXT,
  pack_generated_at  TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ir_user ON incident_reports(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS evidence (
  id            TEXT PRIMARY KEY,
  incident_id   TEXT NOT NULL REFERENCES incident_reports(id) ON DELETE CASCADE,
  category      TEXT NOT NULL CHECK (category IN ('transfer','chat','profile','other')),
  file_name     TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  mime          TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  ocr_text      TEXT,
  ocr_fields    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS risk_rules (
  id            TEXT PRIMARY KEY,
  scope         TEXT NOT NULL CHECK (scope IN ('text','url','page','number')),
  category      TEXT NOT NULL,
  pattern       TEXT,
  params        TEXT,
  weight        INTEGER NOT NULL,
  title         TEXT NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1,
  version       TEXT NOT NULL,
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  risk_check_id  TEXT REFERENCES risk_checks(id) ON DELETE SET NULL,
  target_type    TEXT NOT NULL CHECK (target_type IN ('url','number','text')),
  target_hash    TEXT NOT NULL,
  target_display TEXT,
  kind           TEXT NOT NULL CHECK (kind IN ('report','false_positive','helpful')),
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reported_entities (
  target_hash    TEXT PRIMARY KEY,
  target_type    TEXT NOT NULL,
  target_display TEXT,
  report_count   INTEGER NOT NULL DEFAULT 0,
  fp_count       INTEGER NOT NULL DEFAULT 0,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT,
  name       TEXT NOT NULL,
  props      TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
