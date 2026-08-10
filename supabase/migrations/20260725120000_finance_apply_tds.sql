-- Optional TDS on expert finance payouts (institution TDS remains always-on in calculation).
ALTER TABLE public.finance_payment_records
  ADD COLUMN IF NOT EXISTS apply_tds boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.finance_payment_records.apply_tds IS
  'When true on expert payouts, add 10% TDS on base before invoice total. Institutions always apply TDS in calculation regardless of this flag.';
