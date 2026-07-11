-- Booking completion request: expert requests close; institution approves or declines.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS completion_note text,
  ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_decision_note text,
  ADD COLUMN IF NOT EXISTS completion_decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_history jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.bookings.completion_note IS 'Optional note from expert when requesting completion';
COMMENT ON COLUMN public.bookings.completion_requested_at IS 'When expert requested completion';
COMMENT ON COLUMN public.bookings.completion_decision_note IS 'Optional note from institution on approve/decline';
COMMENT ON COLUMN public.bookings.completion_decided_at IS 'When institution approved or declined completion';
COMMENT ON COLUMN public.bookings.completion_history IS
  'JSON array of completion conversation events (request / approve / decline / close)';

