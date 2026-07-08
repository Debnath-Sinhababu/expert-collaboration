-- Contract (projects) LinkedIn-style fields, expert address, availability slots

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS job_location text,
  ADD COLUMN IF NOT EXISTS workplace_type text,
  ADD COLUMN IF NOT EXISTS employment_type text,
  ADD COLUMN IF NOT EXISTS screening_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_workplace_type_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_workplace_type_check
  CHECK (workplace_type IS NULL OR workplace_type IN ('remote', 'hybrid', 'on_site'));

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_employment_type_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_employment_type_check
  CHECK (employment_type IS NULL OR employment_type IN ('full_time', 'part_time', 'contract'));

ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS address text;

CREATE TABLE IF NOT EXISTS public.expert_availability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expert_id uuid NOT NULL REFERENCES public.experts(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  source text DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT expert_availability_slots_time_check CHECK (end_at > start_at),
  CONSTRAINT expert_availability_slots_source_check CHECK (source IS NULL OR source IN ('manual', 'bulk_weekly'))
);

CREATE INDEX IF NOT EXISTS idx_expert_availability_slots_expert_start
  ON public.expert_availability_slots (expert_id, start_at);
