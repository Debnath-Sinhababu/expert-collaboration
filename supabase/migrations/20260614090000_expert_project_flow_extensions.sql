-- Expert/institution project flow extensions.

ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS open_to_work boolean NOT NULL DEFAULT false;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS opening_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_opening_count_positive_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_opening_count_positive_check
  CHECK (opening_count >= 1);

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS interview_availability jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_hourly_rate numeric DEFAULT NULL;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS actual_start_date date,
  ADD COLUMN IF NOT EXISTS actual_end_date date;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_actual_dates_order_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_actual_dates_order_check
  CHECK (
    actual_start_date IS NULL
    OR actual_end_date IS NULL
    OR actual_end_date >= actual_start_date
  );

ALTER TABLE public.training_attendance_days
  ADD COLUMN IF NOT EXISTS entry_attachment_url text,
  ADD COLUMN IF NOT EXISTS entry_attachment_public_id text,
  ADD COLUMN IF NOT EXISTS exit_attachment_url text,
  ADD COLUMN IF NOT EXISTS exit_attachment_public_id text;

CREATE INDEX IF NOT EXISTS idx_experts_open_to_work
  ON public.experts (open_to_work);
