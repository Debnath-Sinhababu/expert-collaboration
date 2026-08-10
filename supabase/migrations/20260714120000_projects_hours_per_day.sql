-- Optional daily session length for institution requirements (all pay units).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS hours_per_day numeric;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_hours_per_day_positive_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_hours_per_day_positive_check
  CHECK (hours_per_day IS NULL OR hours_per_day > 0);

COMMENT ON COLUMN public.projects.hours_per_day IS
  'Optional: how many hours per day the session/program is held';
