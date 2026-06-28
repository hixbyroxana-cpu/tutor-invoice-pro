
DROP POLICY IF EXISTS "public can read invoice for payment" ON public.invoices;

CREATE OR REPLACE FUNCTION public.get_public_invoice_for_payment(_invoice_id uuid)
RETURNS TABLE (
  id uuid,
  invoice_number text,
  client_name text,
  total numeric,
  status text,
  stripe_checkout_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.invoice_number, i.client_name, i.total, i.status, i.stripe_checkout_url
  FROM public.invoices i
  WHERE i.id = _invoice_id
    AND i.stripe_checkout_url IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_public_invoice_for_payment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_invoice_for_payment(uuid) TO anon, authenticated;
