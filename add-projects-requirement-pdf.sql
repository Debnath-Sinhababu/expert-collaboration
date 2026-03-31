ALTER TABLE projects
ADD COLUMN IF NOT EXISTS requirement_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS requirement_pdf_public_id VARCHAR(255);

