-- Add is_rated column to bookings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'is_rated'
    ) THEN
        ALTER TABLE bookings ADD COLUMN is_rated BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_rated column to bookings table';
    ELSE
        RAISE NOTICE 'is_rated column already exists in bookings table';
    END IF;
END $$;
