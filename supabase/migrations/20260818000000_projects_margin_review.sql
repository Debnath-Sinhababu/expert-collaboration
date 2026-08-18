-- Replace the hardcoded 30% platform cut with a per-requirement margin that a
-- super-admin sets before the requirement is shown to experts.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS margin_percent numeric,
  ADD COLUMN IF NOT EXISTS margin_status text NOT NULL DEFAULT 'pending_review',
  ADD COLUMN IF NOT EXISTS margin_set_by uuid,
  ADD COLUMN IF NOT EXISTS margin_set_at timestamptz;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_margin_percent_range_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_margin_percent_range_check
  CHECK (margin_percent IS NULL OR (margin_percent >= 0 AND margin_percent <= 100));

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_margin_status_check;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_margin_status_check
  CHECK (margin_status IN ('pending_review', 'approved'));

-- Existing requirements already went live under the old fixed 30% cut;
-- lock that in as their approved margin so they aren't pulled from experts.
UPDATE public.projects
SET margin_percent = 30, margin_status = 'approved'
WHERE margin_percent IS NULL;

COMMENT ON COLUMN public.projects.margin_percent IS 'Platform cut % (0-100) super-admin set for this requirement; expert net = gross * (1 - margin_percent/100).';
COMMENT ON COLUMN public.projects.margin_status IS 'pending_review = awaiting super-admin margin approval, not visible to experts; approved = margin locked, requirement can be open to experts.';
COMMENT ON COLUMN public.projects.margin_set_by IS 'Super-admin id who approved the margin.';
COMMENT ON COLUMN public.projects.margin_set_at IS 'When the margin was approved.';
