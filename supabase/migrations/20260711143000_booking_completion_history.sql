-- Completion conversation history on bookings (mirrors application negotiation_history).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completion_history jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.bookings.completion_history IS
  'JSON array of completion conversation events (request / approve / decline / close)';
