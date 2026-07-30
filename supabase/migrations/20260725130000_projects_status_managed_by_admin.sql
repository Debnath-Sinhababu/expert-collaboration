-- When superadmin manually sets projects.status, date-based auto-sync must not override it.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status_managed_by_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.status_managed_by_admin IS
  'When true, auto open→running / →completed sync skips this project so admin can set any canonical status.';
