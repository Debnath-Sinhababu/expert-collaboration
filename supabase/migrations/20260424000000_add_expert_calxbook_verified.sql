-- Migration: add calxbook_verified to experts
ALTER TABLE experts
ADD COLUMN IF NOT EXISTS calxbook_verified boolean DEFAULT false;

-- Backfill existing rows to false (idempotent)
UPDATE experts SET calxbook_verified = false WHERE calxbook_verified IS NULL;
