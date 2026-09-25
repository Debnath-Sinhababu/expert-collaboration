-- A super admin can renew a declined/expired offer letter with a new payment term and re-send it.
-- The same onboarding request is reused (so the expert only ever sees the latest letter); each
-- superseded offer is archived here, oldest first, for the super-admin audit trail.
ALTER TABLE onboarding_requests
  ADD COLUMN IF NOT EXISTS offer_history jsonb NOT NULL DEFAULT '[]'::jsonb;
