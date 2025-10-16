-- Add screening_answers (TEXT) to store concatenated Q/A or JSON string
ALTER TABLE IF EXISTS internship_applications
  ADD COLUMN IF NOT EXISTS screening_answers TEXT;

