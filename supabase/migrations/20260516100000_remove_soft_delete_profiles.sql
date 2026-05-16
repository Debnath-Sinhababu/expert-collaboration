-- Remove soft-delete columns (revert 20260516000000 if applied)
DROP INDEX IF EXISTS idx_experts_deleted_at;
DROP INDEX IF EXISTS idx_institutions_deleted_at;
DROP INDEX IF EXISTS idx_site_students_deleted_at;

ALTER TABLE public.experts DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.experts DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE public.institutions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.institutions DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE public.site_students DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.site_students DROP COLUMN IF EXISTS deleted_by;
