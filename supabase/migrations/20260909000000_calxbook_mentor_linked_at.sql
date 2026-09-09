-- Marks when a verified expert last completed the "Join Calxbook" / "Switch to
-- Calxbook" handoff on their ClaxMap profile, linking their ClaxMap expert
-- profile to a real Calxbook mentor account. Null means they have never
-- completed the handoff.
alter table public.experts
  add column if not exists calxbook_mentor_linked_at timestamptz;
