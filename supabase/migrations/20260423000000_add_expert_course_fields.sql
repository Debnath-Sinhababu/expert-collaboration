-- Add fields for expert course interest, course video and service prices
ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS interested_in_services boolean DEFAULT false;

ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS course_video_url text DEFAULT NULL;

ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS course_video_public_id text DEFAULT NULL;
ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS service_price numeric DEFAULT NULL;
