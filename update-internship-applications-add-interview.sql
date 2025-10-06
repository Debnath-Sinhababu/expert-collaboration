-- Add optional interview schedule to internship applications

ALTER TABLE IF EXISTS internship_applications
  ADD COLUMN IF NOT EXISTS interview_scheduled_at TIMESTAMP WITH TIME ZONE;


