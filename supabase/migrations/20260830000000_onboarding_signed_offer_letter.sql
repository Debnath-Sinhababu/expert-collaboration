-- The expert types their name + date as an electronic signature before accepting the offer
-- (Clause 19, Electronic Execution). On acceptance a signed copy of the letter is generated
-- and stored so the expert, institution, and super admins all reference the same document.

ALTER TABLE onboarding_requests
  ADD COLUMN IF NOT EXISTS signature_name text,
  ADD COLUMN IF NOT EXISTS signature_date date,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_offer_letter_url text,
  ADD COLUMN IF NOT EXISTS signed_offer_letter_public_id text;
