-- Optional interview period interval shown to experts before they apply.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS interview_period_interval text;
