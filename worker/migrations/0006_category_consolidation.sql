-- Consolidate existing GO7 post categories into the six public categories.
UPDATE posts SET category = CASE
  WHEN category IN ('latest-jobs','iti-jobs','outsourcing-jobs') THEN 'jobs-vacancies'
  WHEN category = 'admit-cards' THEN 'admit-cards-exams'
  WHEN category IN ('admissions','syllabus') THEN 'admissions-education'
  WHEN category = 'documents' THEN 'important-notices'
  WHEN category IN ('results','answer-keys') THEN category
  ELSE 'important-notices'
END;

UPDATE sources SET category = CASE
  WHEN category IN ('latest-jobs','iti-jobs','outsourcing-jobs') THEN 'jobs-vacancies'
  WHEN category = 'admit-cards' THEN 'admit-cards-exams'
  WHEN category IN ('admissions','syllabus') THEN 'admissions-education'
  WHEN category = 'documents' THEN 'important-notices'
  WHEN category IN ('results','answer-keys') THEN category
  ELSE 'jobs-vacancies'
END;

UPDATE review_items SET category = CASE
  WHEN category IN ('latest-jobs','iti-jobs','outsourcing-jobs') THEN 'jobs-vacancies'
  WHEN category = 'admit-cards' THEN 'admit-cards-exams'
  WHEN category IN ('admissions','syllabus') THEN 'admissions-education'
  WHEN category = 'documents' THEN 'important-notices'
  WHEN category IN ('results','answer-keys') THEN category
  ELSE 'important-notices'
END;
