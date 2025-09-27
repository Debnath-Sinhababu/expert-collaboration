-- Create schema for Corporate Internship flow

-- 1) Internships (owned by Corporate institutions)
CREATE TABLE IF NOT EXISTS internships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    corporate_institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,

    title VARCHAR(200) NOT NULL,
    skills_required TEXT[],
    work_mode VARCHAR(10) NOT NULL CHECK (work_mode IN ('In office','Hybrid','Remote')),
    engagement VARCHAR(10) NOT NULL CHECK (engagement IN ('Part-time','Full-time')),
    openings INTEGER NOT NULL CHECK (openings >= 1),

    start_timing VARCHAR(12) NOT NULL CHECK (start_timing IN ('immediately','later')),
    start_date DATE,

    duration_value INTEGER NOT NULL CHECK (duration_value >= 1),
    duration_unit VARCHAR(10) NOT NULL CHECK (duration_unit IN ('weeks','months')),

    responsibilities TEXT NOT NULL,

    paid BOOLEAN NOT NULL DEFAULT TRUE,
    stipend_min INTEGER,
    stipend_max INTEGER,
    stipend_unit VARCHAR(10) CHECK (stipend_unit IN ('month')),
    incentives_min INTEGER,
    incentives_max INTEGER,
    incentives_unit VARCHAR(10) CHECK (incentives_unit IN ('month')),

    ppo BOOLEAN NOT NULL DEFAULT FALSE,
    perks TEXT[],
    screening_questions TEXT[],

    alt_phone VARCHAR(20),
    application_deadline DATE,
    location TEXT,

    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
    visibility_scope VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility_scope IN ('public','restricted')),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for internships
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_internships_corp'
    ) THEN
        CREATE INDEX idx_internships_corp ON internships(corporate_institution_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_internships_status'
    ) THEN
        CREATE INDEX idx_internships_status ON internships(status);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_internships_deadline'
    ) THEN
        CREATE INDEX idx_internships_deadline ON internships(application_deadline);
    END IF;
END $$;

-- updated_at trigger for internships
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE event_object_table = 'internships' AND trigger_name = 'update_internships_updated_at'
    ) THEN
        CREATE TRIGGER update_internships_updated_at 
        BEFORE UPDATE ON internships 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 2) Allow-list mapping for restricted visibility
CREATE TABLE IF NOT EXISTS internship_visibility (
    internship_id UUID NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    PRIMARY KEY (internship_id, institution_id)
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_visibility_institution'
    ) THEN
        CREATE INDEX idx_visibility_institution ON internship_visibility(institution_id);
    END IF;
END $$;

-- Enable RLS (policies will be added in subsequent migration)
DO $$ BEGIN
    BEGIN
        EXECUTE 'ALTER TABLE internships ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN others THEN NULL;
    END;
    BEGIN
        EXECUTE 'ALTER TABLE internship_visibility ENABLE ROW LEVEL SECURITY';
    EXCEPTION WHEN others THEN NULL;
    END;
END $$;


