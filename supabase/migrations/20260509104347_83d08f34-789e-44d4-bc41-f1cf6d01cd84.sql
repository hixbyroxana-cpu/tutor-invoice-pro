
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS INT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n INT;
BEGIN
  UPDATE public.invoice_counter SET next_number = next_number + 1
  WHERE id = 1 RETURNING next_number - 1 INTO n;
  RETURN n;
END; $$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
