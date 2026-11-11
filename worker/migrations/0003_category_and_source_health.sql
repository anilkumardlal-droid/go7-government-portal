CREATE TABLE IF NOT EXISTS source_health (
  source_name TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unknown',
  last_checked_at TEXT,
  last_success_at TEXT,
  last_error TEXT
);

UPDATE posts SET category='latest-jobs'
WHERE category NOT IN ('results','admit-cards','latest-jobs','answer-keys','documents','admissions','iti-jobs','outsourcing-jobs','syllabus');
UPDATE sources SET category='latest-jobs'
WHERE category NOT IN ('results','admit-cards','latest-jobs','answer-keys','documents','admissions','iti-jobs','outsourcing-jobs','syllabus');
UPDATE review_items SET category='latest-jobs'
WHERE category NOT IN ('results','admit-cards','latest-jobs','answer-keys','documents','admissions','iti-jobs','outsourcing-jobs','syllabus');
