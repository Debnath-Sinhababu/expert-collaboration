-- Full-day hour credit for backdated attendance entries + missing-attendance reminder dedup tracking

ALTER TABLE public.training_attendance_days
  ADD COLUMN IF NOT EXISTS is_backdated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credited_hours numeric;

CREATE TABLE IF NOT EXISTS public.training_attendance_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_attendance_reminders_unique UNIQUE (booking_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_reminders_booking
  ON public.training_attendance_reminders (booking_id);
