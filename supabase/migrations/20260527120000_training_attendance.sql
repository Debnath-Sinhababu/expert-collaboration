-- Training attendance per booking day (entry/exit + institution review)

CREATE TABLE IF NOT EXISTS public.training_attendance_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  expert_entry_at timestamptz,
  expert_exit_at timestamptz,
  effective_entry_at timestamptz,
  effective_exit_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  dispute_reason text,
  approved_at timestamptz,
  approved_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_attendance_days_booking_date_unique UNIQUE (booking_id, session_date),
  CONSTRAINT training_attendance_days_status_check CHECK (
    status IN ('open', 'pending_review', 'approved', 'disputed')
  )
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_days_booking_date
  ON public.training_attendance_days (booking_id, session_date);

CREATE TABLE IF NOT EXISTS public.training_attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_day_id uuid NOT NULL REFERENCES public.training_attendance_days(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT training_attendance_audit_actor_role_check CHECK (
    actor_role IN ('expert', 'institution', 'super_admin')
  )
);

CREATE INDEX IF NOT EXISTS idx_training_attendance_audit_day
  ON public.training_attendance_audit (attendance_day_id, created_at);
