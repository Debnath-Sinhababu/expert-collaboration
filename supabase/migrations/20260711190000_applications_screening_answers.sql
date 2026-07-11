-- Expert project applications: store screening Q&A from apply drawer
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS screening_answers text;
