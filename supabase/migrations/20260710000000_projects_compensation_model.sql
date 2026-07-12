-- Compensation model fields for contract requirements (projects).
-- Institutions enter gross + unit; hours/budget are derived where possible.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS compensation_unit text,
  ADD COLUMN IF NOT EXISTS unit_quantity integer,
  ADD COLUMN IF NOT EXISTS duration_per_unit numeric,
  ADD COLUMN IF NOT EXISTS institution_gross_per_unit numeric,
  ADD COLUMN IF NOT EXISTS institution_gross_total numeric,
  ADD COLUMN IF NOT EXISTS schedule_notes text,
  ADD COLUMN IF NOT EXISTS other_description text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_compensation_unit_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_compensation_unit_check
  CHECK (
    compensation_unit IS NULL
    OR compensation_unit IN ('per_session', 'per_day', 'fixed_package', 'hourly')
  );

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_unit_quantity_positive_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_unit_quantity_positive_check
  CHECK (unit_quantity IS NULL OR unit_quantity >= 1);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_duration_per_unit_positive_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_duration_per_unit_positive_check
  CHECK (duration_per_unit IS NULL OR duration_per_unit > 0);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_institution_gross_per_unit_positive_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_institution_gross_per_unit_positive_check
  CHECK (institution_gross_per_unit IS NULL OR institution_gross_per_unit > 0);

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_institution_gross_total_positive_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_institution_gross_total_positive_check
  CHECK (institution_gross_total IS NULL OR institution_gross_total > 0);

-- Backfill legacy hourly projects as explicit hourly compensation.
UPDATE public.projects
SET
  compensation_unit = COALESCE(compensation_unit, 'hourly'),
  unit_quantity = COALESCE(unit_quantity, GREATEST(COALESCE(duration_hours, 1), 1)),
  duration_per_unit = COALESCE(duration_per_unit, 1),
  institution_gross_per_unit = COALESCE(institution_gross_per_unit, hourly_rate),
  institution_gross_total = COALESCE(
    institution_gross_total,
    total_budget,
    CASE
      WHEN hourly_rate IS NOT NULL AND duration_hours IS NOT NULL
        THEN hourly_rate * duration_hours
      ELSE NULL
    END
  )
WHERE compensation_unit IS NULL
  AND hourly_rate IS NOT NULL;

COMMENT ON COLUMN public.projects.compensation_unit IS 'How institution pays: per_session | per_day | fixed_package | hourly';
COMMENT ON COLUMN public.projects.unit_quantity IS 'Number of sessions/days, or 1 for fixed package; for hourly equals expected hours when duration_per_unit=1';
COMMENT ON COLUMN public.projects.duration_per_unit IS 'Hours per session/day; 1 for hourly; estimated effort for package';
COMMENT ON COLUMN public.projects.institution_gross_per_unit IS 'Gross amount institution pays per unit (100%)';
COMMENT ON COLUMN public.projects.institution_gross_total IS 'Total gross budget institution pays (100%)';
COMMENT ON COLUMN public.projects.schedule_notes IS 'Optional schedule note e.g. Saturdays only';
COMMENT ON COLUMN public.projects.other_description IS 'Required engagement description when type=other';
