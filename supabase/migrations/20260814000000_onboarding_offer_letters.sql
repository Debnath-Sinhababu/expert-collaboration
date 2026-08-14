-- Onboarding / offer-letter review flow between institution "Onboarding" click,
-- super admin verification, and expert accept/decline.
create table if not exists onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications(id),
  booking_id uuid references bookings(id),
  project_id uuid not null references projects(id),
  expert_id uuid not null references experts(id),
  institution_id uuid not null references institutions(id),
  status text not null default 'pending_review',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  offer_letter_url text,
  offer_letter_public_id text,
  offer_sent_at timestamptz,
  decline_reason text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint onboarding_requests_status_check check (
    status in ('pending_review', 'offer_sent', 'accepted', 'declined')
  )
);

create index if not exists onboarding_requests_status_idx on onboarding_requests(status);
create index if not exists onboarding_requests_application_id_idx on onboarding_requests(application_id);
create index if not exists onboarding_requests_expert_id_idx on onboarding_requests(expert_id);
create index if not exists onboarding_requests_institution_id_idx on onboarding_requests(institution_id);
