-- Portal Students schema (separate from feedback service tables)

CREATE TABLE IF NOT EXISTS site_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    degree VARCHAR(100),
    year VARCHAR(20),
    skills TEXT[],
    resume_url TEXT,
    linkedin_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_site_students_user_id'
    ) THEN
        CREATE INDEX idx_site_students_user_id ON site_students(user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_site_students_institution_id'
    ) THEN
        CREATE INDEX idx_site_students_institution_id ON site_students(institution_id);
    END IF;
END $$;

-- updated_at trigger
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

-- Enable RLS
DO $$ BEGIN
    BEGIN
        EXECUTE 'ALTER TABLE site_students ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;

-- Policies
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_students' AND policyname = 'Students can view own profile'
    ) THEN
        CREATE POLICY "Students can view own profile" ON site_students FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_students' AND policyname = 'Students can update own profile'
    ) THEN
        CREATE POLICY "Students can update own profile" ON site_students FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'site_students' AND policyname = 'Students can create own profile'
    ) THEN
        CREATE POLICY "Students can create own profile" ON site_students FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;


