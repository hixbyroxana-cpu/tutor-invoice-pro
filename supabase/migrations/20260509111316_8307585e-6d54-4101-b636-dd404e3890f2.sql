
-- 1. Add owner columns
ALTER TABLE public.students ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_items ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.business_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Wipe orphan demo data
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;
DELETE FROM public.students;
DELETE FROM public.business_settings;

ALTER TABLE public.students ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.invoices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.invoice_items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.business_settings ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.business_settings ADD CONSTRAINT business_settings_user_unique UNIQUE (user_id);

CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_user ON public.invoice_items(user_id);

-- 3. Per-user invoice counter
DROP TABLE public.invoice_counter;
CREATE TABLE public.invoice_counter (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  next_number integer NOT NULL DEFAULT 1
);
ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

-- 4. Replace open RLS with per-user policies
DROP POLICY IF EXISTS "open" ON public.students;
DROP POLICY IF EXISTS "open" ON public.invoices;
DROP POLICY IF EXISTS "open" ON public.invoice_items;
DROP POLICY IF EXISTS "open" ON public.business_settings;

CREATE POLICY "tutor manages own students" ON public.students
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor manages own invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor manages own invoice items" ON public.invoice_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor manages own business settings" ON public.business_settings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tutor manages own counter" ON public.invoice_counter
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Per-user next invoice number
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 6. Auto-provision settings + counter on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.business_settings (user_id) VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.invoice_counter (user_id, next_number) VALUES (NEW.id, 1)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
