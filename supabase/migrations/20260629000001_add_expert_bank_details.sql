alter table public.experts
  add column if not exists bank_account_number text,
  add column if not exists bank_name text,
  add column if not exists ifsc_code text,
  add column if not exists cancelled_cheque_url text,
  add column if not exists cancelled_cheque_public_id text;

