-- Update site_students with extended fields used by the application
-- Idempotent: only adds columns if they don't already exist

ALTER TABLE IF EXISTS site_students
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(200),
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS availability VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferred_engagement VARCHAR(50),
  ADD COLUMN IF NOT EXISTS preferred_work_mode VARCHAR(50),
  -- Store year-month values as strings (e.g., '2025-09') to match UI input
  ADD COLUMN IF NOT EXISTS education_start_date VARCHAR(7),
  ADD COLUMN IF NOT EXISTS education_end_date VARCHAR(7),
  ADD COLUMN IF NOT EXISTS currently_studying BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS github_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS resume_public_id TEXT;

-- Ensure updated_at trigger exists (no-op if it already does)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'site_students' AND trigger_name = 'update_site_students_updated_at'
    ) THEN
        CREATE TRIGGER update_site_students_updated_at 
        BEFORE UPDATE ON site_students 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Add additional Internshala-like fields to site_students

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'date_of_birth'
    ) THEN
        ALTER TABLE site_students ADD COLUMN date_of_birth DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'gender'
    ) THEN
        ALTER TABLE site_students ADD COLUMN gender VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'city'
    ) THEN
        ALTER TABLE site_students ADD COLUMN city VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'state'
    ) THEN
        ALTER TABLE site_students ADD COLUMN state VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'address'
    ) THEN
        ALTER TABLE site_students ADD COLUMN address TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'specialization'
    ) THEN
        ALTER TABLE site_students ADD COLUMN specialization VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'about'
    ) THEN
        ALTER TABLE site_students ADD COLUMN about TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'availability'
    ) THEN
        ALTER TABLE site_students ADD COLUMN availability VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'preferred_engagement'
    ) THEN
        ALTER TABLE site_students ADD COLUMN preferred_engagement VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'preferred_work_mode'
    ) THEN
        ALTER TABLE site_students ADD COLUMN preferred_work_mode VARCHAR(10);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'github_url'
    ) THEN
        ALTER TABLE site_students ADD COLUMN github_url TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'portfolio_url'
    ) THEN
        ALTER TABLE site_students ADD COLUMN portfolio_url TEXT;
    END IF;

    -- Education period and current status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'education_start_date'
    ) THEN
        ALTER TABLE site_students ADD COLUMN education_start_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'education_end_date'
    ) THEN
        ALTER TABLE site_students ADD COLUMN education_end_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'currently_studying'
    ) THEN
        ALTER TABLE site_students ADD COLUMN currently_studying BOOLEAN DEFAULT FALSE;
    END IF;

    -- Resume Cloudinary public id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_students' AND column_name = 'resume_public_id'
    ) THEN
        ALTER TABLE site_students ADD COLUMN resume_public_id VARCHAR(255);
    END IF;
END $$;


