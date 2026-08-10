-- Application rate intent / negotiation + locked rates on applications & bookings.

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS rate_intent text,
  ADD COLUMN IF NOT EXISTS rate_status text,
  ADD COLUMN IF NOT EXISTS proposed_net_per_unit numeric,
  ADD COLUMN IF NOT EXISTS institution_counter_gross_per_unit numeric,
  ADD COLUMN IF NOT EXISTS final_gross_per_unit numeric,
  ADD COLUMN IF NOT EXISTS final_net_per_unit numeric,
  ADD COLUMN IF NOT EXISTS compensation_unit text,
  ADD COLUMN IF NOT EXISTS unit_quantity integer,
  ADD COLUMN IF NOT EXISTS rate_note text,
  ADD COLUMN IF NOT EXISTS negotiation_history jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_rate_intent_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_rate_intent_check
  CHECK (
    rate_intent IS NULL
    OR rate_intent IN ('agreed_posted', 'open_to_negotiate')
  );

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_rate_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_rate_status_check
  CHECK (
    rate_status IS NULL
    OR rate_status IN (
      'agreed_posted',
      'open_to_negotiate',
      'expert_proposed',
      'institution_countered',
      'expert_countered',
      'agreed'
    )
  );

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_compensation_unit_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_compensation_unit_check
  CHECK (
    compensation_unit IS NULL
    OR compensation_unit IN ('per_session', 'per_day', 'fixed_package', 'hourly')
  );

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS final_gross_per_unit numeric,
  ADD COLUMN IF NOT EXISTS final_net_per_unit numeric,
  ADD COLUMN IF NOT EXISTS compensation_unit text,
  ADD COLUMN IF NOT EXISTS unit_quantity integer;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_compensation_unit_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_compensation_unit_check
  CHECK (
    compensation_unit IS NULL
    OR compensation_unit IN ('per_session', 'per_day', 'fixed_package', 'hourly')
  );

-- Backfill: treat legacy proposed_rate applications as open to negotiate when rate set,
-- otherwise agreed to posted (no explicit intent recorded historically).
UPDATE public.applications
SET
  rate_intent = COALESCE(
    rate_intent,
    CASE
      WHEN proposed_rate IS NOT NULL THEN 'open_to_negotiate'
      ELSE 'agreed_posted'
    END
  ),
  rate_status = COALESCE(
    rate_status,
    CASE
      WHEN final_hourly_rate IS NOT NULL THEN 'agreed'
      WHEN proposed_rate IS NOT NULL THEN 'open_to_negotiate'
      ELSE 'agreed_posted'
    END
  )
WHERE rate_intent IS NULL OR rate_status IS NULL;

COMMENT ON COLUMN public.applications.rate_intent IS 'Apply choice: agreed_posted | open_to_negotiate';
COMMENT ON COLUMN public.applications.rate_status IS 'Negotiation lifecycle status';
COMMENT ON COLUMN public.applications.proposed_net_per_unit IS 'Expert proposed net earn per unit';
COMMENT ON COLUMN public.applications.institution_counter_gross_per_unit IS 'Institution counter offer gross per unit';
COMMENT ON COLUMN public.applications.final_gross_per_unit IS 'Locked institution pay per unit';
COMMENT ON COLUMN public.applications.final_net_per_unit IS 'Locked expert earn per unit';
COMMENT ON COLUMN public.applications.negotiation_history IS 'JSON array of negotiation events';
