-- Allow partial_paid as a first-class finance payment status.
-- Previously partial collections were stored as invoiced; money stayed accurate via paid_amount,
-- but counts/filters/status labels conflated unpaid invoices with partial payments.

ALTER TABLE public.finance_payment_records
  DROP CONSTRAINT IF EXISTS finance_payment_records_status_check;

ALTER TABLE public.finance_payment_records
  ADD CONSTRAINT finance_payment_records_status_check
  CHECK (status IN ('pending', 'invoiced', 'partial_paid', 'paid', 'cancelled'));

-- Backfill open invoices that already have a partial collection.
UPDATE public.finance_payment_records
SET
  status = 'partial_paid',
  updated_at = now()
WHERE status = 'invoiced'
  AND COALESCE(paid_amount, 0) > 0
  AND COALESCE(paid_amount, 0) + 0.001 < GREATEST(
    COALESCE(NULLIF(invoice_amount, 0), 0),
    COALESCE(calculated_amount, 0)
  );

-- Backfill rows that were already fully paid but still tagged as invoiced.
UPDATE public.finance_payment_records
SET
  status = 'paid',
  updated_at = now()
WHERE status IN ('invoiced', 'partial_paid')
  AND COALESCE(paid_amount, 0) > 0
  AND COALESCE(paid_amount, 0) + 0.001 >= GREATEST(
    COALESCE(NULLIF(invoice_amount, 0), 0),
    COALESCE(calculated_amount, 0)
  )
  AND GREATEST(
    COALESCE(NULLIF(invoice_amount, 0), 0),
    COALESCE(calculated_amount, 0)
  ) > 0;
