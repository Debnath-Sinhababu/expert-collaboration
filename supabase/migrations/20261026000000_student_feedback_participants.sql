-- Student feedback form reused for corporate participants (e.g. HID Global Pvt Ltd).
-- Idempotent: safe to re-run.

-- 1) Participant designation (name/ID/phone/email reuse student_name, roll_number, mobile, email;
--    organization reuses universities, which login creates on demand).
ALTER TABLE students ADD COLUMN IF NOT EXISTS designation text;

-- 2) Allow the new batches on students.batch. NOT VALID keeps any legacy rows
--    from blocking the migration while still enforcing the list for new writes.
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_batch_check;
ALTER TABLE students ADD CONSTRAINT students_batch_check CHECK (
  batch IN ('ET', 'PROMPT_ENGINEERING', 'SALESFORCE',
            'ORACLE_FUSION_FINANCIAL', 'ORACLE_PLM', 'ORACLE_DBA_GOVERNANCE_DATA')
) NOT VALID;

-- 3) Drop any CHECK constraint on feedback_sessions.session_type so new program types can be added.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.feedback_sessions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%session_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.feedback_sessions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- 4) One session per new batch (the form lists sessions by matching session_type to the batch).
INSERT INTO feedback_sessions (session_type, session_date, expert_name, topic)
SELECT v.session_type, CURRENT_DATE, 'Oracle Training', v.topic
FROM (VALUES
  ('ORACLE_FUSION_FINANCIAL',    'Oracle Fusion Financial (US Training)'),
  ('ORACLE_PLM',                 'Oracle PLM'),
  ('ORACLE_DBA_GOVERNANCE_DATA', 'Oracle DBA Governance Data')
) AS v(session_type, topic)
WHERE NOT EXISTS (
  SELECT 1 FROM feedback_sessions fs WHERE fs.session_type = v.session_type
);

-- Optional (not applied): hard uniqueness for email/mobile. The API already enforces it;
-- run only after confirming there are no duplicates.
-- CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique  ON students (lower(email)) WHERE email IS NOT NULL;
-- CREATE UNIQUE INDEX IF NOT EXISTS students_mobile_unique ON students (mobile)       WHERE mobile IS NOT NULL;
