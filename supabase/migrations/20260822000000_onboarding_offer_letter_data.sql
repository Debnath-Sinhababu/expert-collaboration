-- Stores the data used to render the offer letter so the expert can preview the same
-- content (as HTML, for real in-page scroll tracking) before accepting/declining.
alter table onboarding_requests
  add column if not exists offer_letter_data jsonb;
