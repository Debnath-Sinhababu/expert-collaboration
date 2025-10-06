-- Internship applications for student portal

CREATE TABLE IF NOT EXISTS internship_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES site_students(id) ON DELETE CASCADE,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_institution'
      CHECK (status IN (
        'pending_institution',
        'approved_institution',
        'rejected_institution',
        'pending_corporate',
        'shortlisted_corporate',
        'interview',
        'offered',
        'hired',
        'rejected_corporate'
      )),
    cover_letter TEXT,
    resume_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_intern_app_internship'
    ) THEN
        CREATE INDEX idx_intern_app_internship ON internship_applications(internship_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_intern_app_student'
    ) THEN
        CREATE INDEX idx_intern_app_student ON internship_applications(student_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_intern_app_status'
    ) THEN
        CREATE INDEX idx_intern_app_status ON internship_applications(status);
    END IF;
END $$;

-- updated_at trigger
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'internship_applications' AND trigger_name = 'update_internship_applications_updated_at'
    ) THEN
        CREATE TRIGGER update_internship_applications_updated_at 
        BEFORE UPDATE ON internship_applications 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Enable RLS
DO $$ BEGIN
    BEGIN
        EXECUTE 'ALTER TABLE internship_applications ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- Policies: students can manage their own applications
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='internship_applications' AND policyname='Students can view own applications'
    ) THEN
        CREATE POLICY "Students can view own applications" ON internship_applications FOR SELECT USING (
          auth.uid() = (SELECT user_id FROM site_students WHERE id = student_id)
        );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='internship_applications' AND policyname='Students can create own applications'
    ) THEN
        CREATE POLICY "Students can create own applications" ON internship_applications FOR INSERT WITH CHECK (
          auth.uid() = (SELECT user_id FROM site_students WHERE id = student_id)
        );
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename='internship_applications' AND policyname='Students can update own applications'
    ) THEN
        CREATE POLICY "Students can update own applications" ON internship_applications FOR UPDATE USING (
          auth.uid() = (SELECT user_id FROM site_students WHERE id = student_id)
        );
    END IF;
END $$;


