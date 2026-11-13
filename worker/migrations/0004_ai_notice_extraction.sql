-- GO7 AI notice extraction fields. Additive migration only.
ALTER TABLE posts ADD COLUMN ai_details_json TEXT;
ALTER TABLE posts ADD COLUMN ai_extraction_status TEXT NOT NULL DEFAULT 'not_applicable'
  CHECK(ai_extraction_status IN ('pending','processing','completed','failed','not_applicable'));
ALTER TABLE posts ADD COLUMN ai_extracted_at TEXT;
ALTER TABLE posts ADD COLUMN ai_extraction_error TEXT;

CREATE INDEX IF NOT EXISTS idx_posts_ai_extraction
  ON posts(ai_extraction_status, category, created_at DESC);

-- Queue existing published Latest Jobs for AI extraction.
UPDATE posts
SET ai_extraction_status = 'pending'
WHERE status = 'published'
  AND category = 'latest-jobs'
  AND ai_extraction_status = 'not_applicable';
