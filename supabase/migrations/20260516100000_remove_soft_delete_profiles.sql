-- Remove soft-delete columns (hard delete only for super-admin profile removal)
DROP INDEX IF EXISTS idx_experts_deleted_at;
DROP INDEX IF EXISTS idx_institutions_deleted_at;
DROP INDEX IF EXISTS idx_site_students_deleted_at;

ALTER TABLE public.experts DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.experts DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE public.institutions DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.institutions DROP COLUMN IF EXISTS deleted_by;

ALTER TABLE public.site_students DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.site_students DROP COLUMN IF EXISTS deleted_by;
