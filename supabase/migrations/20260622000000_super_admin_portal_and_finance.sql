create extension if not exists pgcrypto;

create table if not exists public.super_admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  email text not null unique,
  name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  disabled_message text null,
  permissions jsonb not null default '[]'::jsonb,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_super_admin_users_email
  on public.super_admin_users (email);

create index if not exists idx_super_admin_users_status
  on public.super_admin_users (status);

create table if not exists public.finance_payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,
  expert_id uuid null references public.experts(id) on delete set null,
  institution_id uuid null references public.institutions(id) on delete set null,
  party_type text not null check (party_type in ('expert', 'institution')),
  direction text not null check (direction in ('payable', 'receivable')),
  approved_hours numeric(10,2) not null default 0,
  hourly_rate_snapshot numeric(12,2) not null default 0,
  calculated_amount numeric(12,2) not null default 0,
  invoice_amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'invoiced', 'paid', 'cancelled')),
  invoice_id uuid null,
  paid_amount numeric(12,2) not null default 0,
  paid_at timestamptz null,
  notes text null,
  created_by uuid null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_finance_payment_records_booking_party
  on public.finance_payment_records (booking_id, party_type);

create index if not exists idx_finance_payment_records_party_status
  on public.finance_payment_records (party_type, status);

create index if not exists idx_finance_payment_records_expert
  on public.finance_payment_records (expert_id, status);

create index if not exists idx_finance_payment_records_institution
  on public.finance_payment_records (institution_id, status);

create table if not exists public.finance_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  payment_record_id uuid not null references public.finance_payment_records(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  recipient_type text not null check (recipient_type in ('expert', 'institution')),
  recipient_email text not null,
  recipient_name text not null,
  amount numeric(12,2) not null default 0,
  approved_hours numeric(10,2) not null default 0,
  hourly_rate_snapshot numeric(12,2) not null default 0,
  pdf_url text not null,
  pdf_public_id text null,
  sent_at timestamptz null,
  sent_by uuid null,
  email_status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_invoices_payment_record
  on public.finance_invoices (payment_record_id);

create index if not exists idx_finance_invoices_recipient
  on public.finance_invoices (recipient_type, sent_at desc);

create sequence if not exists public.finance_invoice_number_seq start 1;

create or replace function public.next_finance_invoice_number()
returns text
language plpgsql
as $$
declare
  next_num bigint;
  fy_suffix text;
begin
  next_num := nextval('public.finance_invoice_number_seq');
  fy_suffix := to_char(now(), 'YY');
  return 'CM-FY' || fy_suffix || '-' || lpad(next_num::text, 6, '0');
end;
$$;

alter table public.finance_payment_records
  drop constraint if exists finance_payment_records_invoice_fk;

alter table public.finance_payment_records
  add constraint finance_payment_records_invoice_fk
  foreign key (invoice_id) references public.finance_invoices(id) on delete set null;
