-- Adds human-readable searchable IDs (e.g. PROJAAA1, FREEAAA1, INTRAAA1) to
-- projects, freelance_projects, and internships so super-admin can look up a
-- specific engagement by a short code instead of its UUID. Existing rows are
-- backfilled in creation order; new rows get a code automatically via trigger.

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS unique_code TEXT;
ALTER TABLE public.freelance_projects ADD COLUMN IF NOT EXISTS unique_code TEXT;
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS unique_code TEXT;

CREATE SEQUENCE IF NOT EXISTS public.project_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.freelance_code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.internship_code_seq START 1;

-- Turns the next value of `seq_name` into `prefix` + a 3-letter base-26 block
-- (AAA, AAB, ... AAZ, ABA, ...) + a single digit 1-9, e.g. PROJAAA1 .. PROJAAA9,
-- PROJAAB1 .. PROJZZZ9 (~158k codes per prefix).
CREATE OR REPLACE FUNCTION public.generate_entity_code(prefix text, seq_name text)
RETURNS text AS $$
DECLARE
  seq_val bigint;
  block bigint;
  num int;
  letters text := '';
  n bigint;
  i int;
BEGIN
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO seq_val;
  block := (seq_val - 1) / 9;
  num := ((seq_val - 1) % 9) + 1;
  n := block;
  FOR i IN 1..3 LOOP
    letters := chr(65 + (n % 26)::int) || letters;
    n := n / 26;
  END LOOP;
  RETURN prefix || letters || num::text;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.set_entity_code()
RETURNS trigger AS $$
DECLARE
  prefix text := TG_ARGV[0];
  seq_name text := TG_ARGV[1];
BEGIN
  IF NEW.unique_code IS NULL THEN
    NEW.unique_code := public.generate_entity_code(prefix, seq_name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_set_code ON public.projects;
CREATE TRIGGER trg_projects_set_code
  BEFORE INSERT ON public.projects
  FOR EACH ROW
  WHEN (NEW.unique_code IS NULL)
  EXECUTE FUNCTION public.set_entity_code('PROJ', 'project_code_seq');

DROP TRIGGER IF EXISTS trg_freelance_projects_set_code ON public.freelance_projects;
CREATE TRIGGER trg_freelance_projects_set_code
  BEFORE INSERT ON public.freelance_projects
  FOR EACH ROW
  WHEN (NEW.unique_code IS NULL)
  EXECUTE FUNCTION public.set_entity_code('FREE', 'freelance_code_seq');

DROP TRIGGER IF EXISTS trg_internships_set_code ON public.internships;
CREATE TRIGGER trg_internships_set_code
  BEFORE INSERT ON public.internships
  FOR EACH ROW
  WHEN (NEW.unique_code IS NULL)
  EXECUTE FUNCTION public.set_entity_code('INTR', 'internship_code_seq');

-- Backfill existing rows in creation order, advancing the same sequences the
-- triggers use so future inserts continue the numbering without gaps/clashes.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.projects WHERE unique_code IS NULL ORDER BY created_at, id LOOP
    UPDATE public.projects SET unique_code = public.generate_entity_code('PROJ', 'project_code_seq') WHERE id = r.id;
  END LOOP;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.freelance_projects WHERE unique_code IS NULL ORDER BY created_at, id LOOP
    UPDATE public.freelance_projects SET unique_code = public.generate_entity_code('FREE', 'freelance_code_seq') WHERE id = r.id;
  END LOOP;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.internships WHERE unique_code IS NULL ORDER BY created_at, id LOOP
    UPDATE public.internships SET unique_code = public.generate_entity_code('INTR', 'internship_code_seq') WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_unique_code ON public.projects(unique_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_freelance_projects_unique_code ON public.freelance_projects(unique_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_internships_unique_code ON public.internships(unique_code);

ALTER TABLE public.projects ALTER COLUMN unique_code SET NOT NULL;
ALTER TABLE public.freelance_projects ALTER COLUMN unique_code SET NOT NULL;
ALTER TABLE public.internships ALTER COLUMN unique_code SET NOT NULL;
