-- Posted-rate offer flow: institution requests posted rate; expert must accept or decline.
-- Negotiation closes either way; decline blocks Confirm & lock booking.

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
      'agreed',
      'posted_rate_offered',
      'posted_rate_declined'
    )
  );

COMMENT ON COLUMN public.applications.rate_status IS
  'Negotiation lifecycle: includes posted_rate_offered (awaiting expert) and posted_rate_declined (negotiation closed, booking blocked)';
