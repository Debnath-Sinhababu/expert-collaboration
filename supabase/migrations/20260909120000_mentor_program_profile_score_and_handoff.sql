-- Mentor Program (Calxbook): profile score + Join/Switch to Calxbook handoff tracking.
--
-- profile_score feeds Calxbook's live-course level eligibility (fixed 100/200/400 thresholds
-- there); it keeps syncing to Calxbook on every experts pull, unlike the rest of an expert's
-- profile which Calxbook only copies once at join time. mentor_score_config is a singleton
-- table (not env/code constants) so the weights can be tuned from an admin screen without a
-- redeploy.
--
-- calxbook_mentor_linked_at tracks whether this expert has completed the handoff, purely so
-- the expert's own profile page can show "Join Calxbook" vs "Switch to Calxbook" without an
-- extra round trip to Calxbook on every render.

alter table experts
  add column if not exists profile_score numeric not null default 0,
  add column if not exists profile_score_updated_at timestamptz,
  add column if not exists calxbook_mentor_linked_at timestamptz;

create table if not exists mentor_score_config (
  id int primary key default 1 check (id = 1),
  rating_weight numeric not null default 1,
  rating_cap numeric not null default 150,
  experience_weight numeric not null default 15,
  experience_cap numeric not null default 150,
  training_weight numeric not null default 10,
  training_cap numeric not null default 200,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into mentor_score_config (id)
values (1)
on conflict (id) do nothing;
