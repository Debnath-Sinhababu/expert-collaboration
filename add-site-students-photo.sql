-- Add profile photo fields for site_students
ALTER TABLE IF EXISTS site_students
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_public_id TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_small_url TEXT;

-- No changes to RLS or triggers are required; existing policies apply.

