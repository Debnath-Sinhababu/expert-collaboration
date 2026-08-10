-- Cancellation request flow (expert requests; institution approves/declines).
-- Reuses completion_history as shared engagement activity log.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_note text,
  ADD COLUMN IF NOT EXISTS cancellation_requested_at timestamptz;

COMMENT ON COLUMN public.bookings.cancellation_note IS 'Optional note from expert when requesting cancellation';
COMMENT ON COLUMN public.bookings.cancellation_requested_at IS 'When expert requested cancellation';
COMMENT ON COLUMN public.bookings.completion_history IS
  'JSON array of engagement activity events (completion + cancellation conversation)';
