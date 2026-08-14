-- Offer letters auto-expire (auto-decline) if the expert does not respond within 3 days.

ALTER TABLE onboarding_requests
  ADD COLUMN IF NOT EXISTS offer_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS onboarding_requests_offer_expires_at_idx
  ON onboarding_requests(offer_expires_at);

ALTER TABLE onboarding_requests
  DROP CONSTRAINT IF EXISTS onboarding_requests_status_check;

ALTER TABLE onboarding_requests
  ADD CONSTRAINT onboarding_requests_status_check
  CHECK (status IN ('pending_review', 'offer_sent', 'accepted', 'declined', 'expired'));
