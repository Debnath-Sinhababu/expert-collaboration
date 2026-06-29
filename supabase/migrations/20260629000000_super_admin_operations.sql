create extension if not exists pgcrypto;

create table if not exists public.super_admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null,
  actor_admin_id uuid null references public.super_admin_users(id) on delete set null,
  actor_email text null,
  action text not null,
  entity_type text null,
  entity_id text null,
  requirement_type text null check (requirement_type in ('project', 'internship', 'freelance')),
  requirement_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text null,
  user_agent text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_super_admin_activity_actor_date
  on public.super_admin_activity_logs (actor_user_id, created_at desc);

create index if not exists idx_super_admin_activity_admin_date
  on public.super_admin_activity_logs (actor_admin_id, created_at desc);

create index if not exists idx_super_admin_activity_action_date
  on public.super_admin_activity_logs (action, created_at desc);

create index if not exists idx_super_admin_activity_requirement
  on public.super_admin_activity_logs (requirement_type, requirement_id, created_at desc);

create table if not exists public.requirement_admin_assignments (
  id uuid primary key default gen_random_uuid(),
  requirement_type text not null check (requirement_type in ('project', 'internship', 'freelance')),
  requirement_id uuid not null,
  admin_user_id uuid not null,
  admin_record_id uuid null references public.super_admin_users(id) on delete set null,
  assigned_by_user_id uuid null,
  assigned_by_admin_id uuid null references public.super_admin_users(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'unassigned')),
  notes text null,
  assigned_at timestamptz not null default now(),
  unassigned_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_requirement_admin_assignments_one_active
  on public.requirement_admin_assignments (requirement_type, requirement_id)
  where status = 'active';

create index if not exists idx_requirement_admin_assignments_admin
  on public.requirement_admin_assignments (admin_user_id, status, assigned_at desc);

create index if not exists idx_requirement_admin_assignments_requirement
  on public.requirement_admin_assignments (requirement_type, requirement_id, status);

create table if not exists public.requirement_documents (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid null references public.requirement_admin_assignments(id) on delete set null,
  requirement_type text not null check (requirement_type in ('project', 'internship', 'freelance')),
  requirement_id uuid not null,
  document_type text not null default 'daily_report' check (document_type in ('daily_report', 'requirement_note', 'supporting_document')),
  admin_user_id uuid not null,
  admin_record_id uuid null references public.super_admin_users(id) on delete set null,
  document_date date not null default current_date,
  title text null,
  notes text null,
  file_url text not null,
  file_public_id text null,
  original_filename text null,
  mime_type text null,
  file_size bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_requirement_documents_requirement
  on public.requirement_documents (requirement_type, requirement_id, document_type, document_date desc);

create index if not exists idx_requirement_documents_admin_date
  on public.requirement_documents (admin_user_id, document_type, document_date desc);

create index if not exists idx_requirement_documents_assignment
  on public.requirement_documents (assignment_id, document_type, document_date desc);
