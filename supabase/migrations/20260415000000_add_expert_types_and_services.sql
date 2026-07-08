-- Add expert types and expert services arrays to experts table
ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS expert_types text[] DEFAULT '{}'::text[];

ALTER TABLE public.experts
  ADD COLUMN IF NOT EXISTS expert_services text[] DEFAULT '{}'::text[];
