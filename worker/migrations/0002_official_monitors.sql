CREATE TABLE IF NOT EXISTS page_monitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  page_url TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'latest-jobs',
  active INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS review_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'latest-jobs',
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','dismissed'))
);
CREATE INDEX IF NOT EXISTS idx_review_status_date ON review_items(status, detected_at DESC);
