-- Freelancing schema

-- Projects posted by Corporate institutions
CREATE TABLE IF NOT EXISTS freelance_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  corporate_institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  required_skills TEXT[],
  deadline DATE,
  budget_min INTEGER,
  budget_max INTEGER,
  draft_attachment_url TEXT,
  draft_attachment_public_id TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','ongoing','completed','closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Applications from students
CREATE TABLE IF NOT EXISTS freelance_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES freelance_projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES site_students(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','shortlisted','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions by shortlisted students
CREATE TABLE IF NOT EXISTS freelance_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES freelance_projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES site_students(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES freelance_applications(id) ON DELETE CASCADE,
  note TEXT,
  attachment_url TEXT,
  attachment_public_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_freelance_projects_corp'
  ) THEN
    CREATE INDEX idx_freelance_projects_corp ON freelance_projects(corporate_institution_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_freelance_apps_project'
  ) THEN
    CREATE INDEX idx_freelance_apps_project ON freelance_applications(project_id);
  END IF;
END $$;

-- updated_at trigger for freelance_projects
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'freelance_projects' AND trigger_name = 'update_freelance_projects_updated_at'
  ) THEN
    CREATE TRIGGER update_freelance_projects_updated_at 
    BEFORE UPDATE ON freelance_projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

