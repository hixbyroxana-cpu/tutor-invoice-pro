
-- Students
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  parent_name TEXT,
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  hourly_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  default_duration NUMERIC(5,2) NOT NULL DEFAULT 1,
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Business settings (singleton)
CREATE TABLE public.business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_name TEXT,
  business_name TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  bank_name TEXT,
  account_holder TEXT,
  sort_code TEXT,
  account_number TEXT,
  payment_notes TEXT,
  invoice_prefix TEXT NOT NULL DEFAULT 'ROX',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.business_settings (tutor_name) VALUES ('');

-- Invoice counter (singleton)
CREATE TABLE public.invoice_counter (
  id INT PRIMARY KEY DEFAULT 1,
  next_number INT NOT NULL DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO public.invoice_counter (id, next_number) VALUES (1, 1);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_title TEXT NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  -- Snapshot of student/client at time of creation
  client_name TEXT NOT NULL,
  client_parent_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_deadline DATE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent | paid | overdue
  notes TEXT,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Invoice items (lessons)
CREATE TABLE public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  lesson_date DATE NOT NULL,
  description TEXT NOT NULL DEFAULT 'Tutoring lesson',
  duration NUMERIC(5,2) NOT NULL DEFAULT 1,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Atomic invoice number generator
CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  n INT;
BEGIN
  UPDATE public.invoice_counter
  SET next_number = next_number + 1
  WHERE id = 1
  RETURNING next_number - 1 INTO n;
  RETURN n;
END;
$$;

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_students_updated BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS: open access (single-user personal tool)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open" ON public.students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON public.business_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON public.invoice_counter FOR ALL USING (true) WITH CHECK (true);
