-- Preserve the official notice publication date and application deadline.
-- Existing review items remain NULL until a verified date is supplied.
ALTER TABLE review_items ADD COLUMN published_at TEXT;
ALTER TABLE review_items ADD COLUMN application_last_date TEXT;
ALTER TABLE posts ADD COLUMN application_last_date TEXT;
