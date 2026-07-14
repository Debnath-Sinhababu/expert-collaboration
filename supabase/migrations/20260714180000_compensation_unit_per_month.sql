-- Allow per_month pay unit (app already supports it; DB check was outdated).

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_compensation_unit_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_compensation_unit_check
  CHECK (
    compensation_unit IS NULL
    OR compensation_unit IN ('per_session', 'per_day', 'per_month', 'fixed_package', 'hourly')
  );

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_compensation_unit_check;

ALTER TABLE public.applications
  ADD CONSTRAINT applications_compensation_unit_check
  CHECK (
    compensation_unit IS NULL
    OR compensation_unit IN ('per_session', 'per_day', 'per_month', 'fixed_package', 'hourly')
  );

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_compensation_unit_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_compensation_unit_check
  CHECK (
    compensation_unit IS NULL
    OR compensation_unit IN ('per_session', 'per_day', 'per_month', 'fixed_package', 'hourly')
  );

COMMENT ON CONSTRAINT projects_compensation_unit_check ON public.projects IS
  'Allowed pay units: per_session | per_day | per_month | fixed_package | hourly';
