
-- Make next_invoice_number SECURITY INVOKER (relies on RLS on invoice_counter)
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE n INT; uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.invoice_counter (user_id, next_number)
    VALUES (uid, 1)
    ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.invoice_counter
    SET next_number = next_number + 1
    WHERE user_id = uid
    RETURNING next_number - 1 INTO n;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
