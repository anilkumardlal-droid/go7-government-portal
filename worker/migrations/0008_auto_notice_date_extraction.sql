-- Track automatic official page / PDF date checks for review items and published posts.
ALTER TABLE review_items ADD COLUMN date_checked_at TEXT;
ALTER TABLE review_items ADD COLUMN date_evidence TEXT;
ALTER TABLE posts ADD COLUMN date_checked_at TEXT;
ALTER TABLE posts ADD COLUMN date_evidence TEXT;
