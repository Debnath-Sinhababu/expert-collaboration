DO $$ 
BEGIN
    -- Add CORP fields to institutions table if not exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'gstin'
    ) THEN
        ALTER TABLE institutions ADD COLUMN gstin VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'pan'
    ) THEN
        ALTER TABLE institutions ADD COLUMN pan VARCHAR(20);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'cin'
    ) THEN
        ALTER TABLE institutions ADD COLUMN cin VARCHAR(30);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'industry'
    ) THEN
        ALTER TABLE institutions ADD COLUMN industry VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'company_size'
    ) THEN
        ALTER TABLE institutions ADD COLUMN company_size VARCHAR(50);
    END IF;


    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'requires_po'
    ) THEN
        ALTER TABLE institutions ADD COLUMN requires_po BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'nda_required'
    ) THEN
        ALTER TABLE institutions ADD COLUMN nda_required BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'preferred_engagements'
    ) THEN
        ALTER TABLE institutions ADD COLUMN preferred_engagements TEXT[];
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'institutions' AND column_name = 'work_mode_preference'
    ) THEN
        ALTER TABLE institutions ADD COLUMN work_mode_preference VARCHAR(20);
    END IF;

    -- Add CHECK constraint for company_size values (if not exists)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'institutions'
          AND tc.constraint_type = 'CHECK'
          AND tc.constraint_name = 'ck_institutions_company_size_range'
    ) THEN
        ALTER TABLE institutions
        ADD CONSTRAINT ck_institutions_company_size_range
        CHECK (company_size IS NULL OR company_size IN (
            '0-1',
            '2-10',
            '11-50',
            '51-200',
            '201-500',
            '501-1000',
            '1001-5000',
            '5001-10000',
            '10000+'
        ));
    END IF;

END $$;
