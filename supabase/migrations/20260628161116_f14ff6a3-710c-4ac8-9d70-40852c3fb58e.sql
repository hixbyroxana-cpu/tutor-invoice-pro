
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at timestamptz;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_checkout_url text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_to_parent_at timestamptz;

-- Allow anonymous parents to fetch only the payment-relevant fields for an invoice.
-- RLS still blocks all other access; column-level grants restrict which columns anon can read.
GRANT SELECT (id, invoice_number, client_name, total, status, stripe_checkout_url)
  ON public.invoices TO anon;

DROP POLICY IF EXISTS "public can read invoice for payment" ON public.invoices;
CREATE POLICY "public can read invoice for payment"
  ON public.invoices
  FOR SELECT
  TO anon
  USING (stripe_checkout_url IS NOT NULL);
