-- Add PAN and profile intro video columns to experts (run in Supabase SQL editor or migration pipeline).
-- pan_number is nullable for legacy rows; application enforces on new signup.

ALTER TABLE public.experts ADD COLUMN IF NOT EXISTS pan_number character varying(10);
ALTER TABLE public.experts ADD COLUMN IF NOT EXISTS profile_video_url text;
ALTER TABLE public.experts ADD COLUMN IF NOT EXISTS profile_video_public_id character varying;

ALTER TABLE public.experts
  DROP CONSTRAINT IF EXISTS experts_pan_number_format_check;

ALTER TABLE public.experts
  ADD CONSTRAINT experts_pan_number_format_check
  CHECK (
    pan_number IS NULL
    OR pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
  );

COMMENT ON COLUMN public.experts.pan_number IS 'Indian PAN; nullable for legacy experts; validated on create/update in API.';
COMMENT ON COLUMN public.experts.profile_video_url IS 'Cloudinary (or other) HTTPS URL for profile intro video.';
COMMENT ON COLUMN public.experts.profile_video_public_id IS 'Cloudinary public_id for replace/delete; resource_type video.';
