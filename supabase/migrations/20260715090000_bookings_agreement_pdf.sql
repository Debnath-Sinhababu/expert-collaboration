-- Optional post-booking agreement PDF uploaded by the institution.
-- Non-blocking: booking confirmation / attendance / completion do not depend on this.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS agreement_pdf_url text,
  ADD COLUMN IF NOT EXISTS agreement_pdf_public_id text;

COMMENT ON COLUMN public.bookings.agreement_pdf_url IS
  'Optional Cloudinary URL for institution-uploaded booking agreement PDF';
COMMENT ON COLUMN public.bookings.agreement_pdf_public_id IS
  'Cloudinary public id for agreement_pdf_url (for replace/delete)';
