-- Add stable, readable slugs to published GO7 posts. Existing rows are filled lazily by the API.
ALTER TABLE posts ADD COLUMN slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_slug
ON posts(slug)
WHERE slug IS NOT NULL AND slug <> '';
