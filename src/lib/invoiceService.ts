import { supabase } from "@/integrations/supabase/client";
import { padNum, slug } from "./format";
import { requireUserId } from "./auth";
import { createInvoiceCheckout } from "./stripe.functions";


export type LessonInput = {
  lesson_date: string; // YYYY-MM-DD
  description?: string;
  duration: number;
  hourly_rate: number;
  notes?: string | null;
};

export async function createInvoice(opts: {
  studentId: string;
  lessons: LessonInput[];
  notes?: string;
  paymentDeadlineDays?: number | null;
}) {
  const userId = await requireUserId();
  const { data: student, error: sErr } = await supabase
    .from("students").select("*").eq("id", opts.studentId).single();
  if (sErr || !student) throw new Error("Student not found");

  const { data: settings } = await supabase
    .from("business_settings").select("invoice_prefix").limit(1).maybeSingle();
  const prefix = settings?.invoice_prefix || "ROX";

  const { data: counterData, error: cErr } = await supabase.rpc("next_invoice_number");
  if (cErr) throw cErr;
  const num = counterData as number;
  const year = new Date().getFullYear();
  const invoiceNumber = `${prefix}-${year}-${padNum(num)}`;
  const invoiceTitle = `Invoice-${prefix}-${year}-${padNum(num)}-${slug(student.full_name)}`;

  const items = opts.lessons.map((l, i) => ({
    lesson_date: l.lesson_date,
    description: l.description?.trim() || `Tutoring lesson`,
    duration: Number(l.duration),
    hourly_rate: Number(l.hourly_rate),
    amount: +(Number(l.duration) * Number(l.hourly_rate)).toFixed(2),
    notes: l.notes?.trim() || null,
    position: i,
  }));
  const total = +items.reduce((s, i) => s + i.amount, 0).toFixed(2);

  const today = new Date();
  const due = opts.paymentDeadlineDays != null
    ? new Date(today.getTime() + opts.paymentDeadlineDays * 86400000).toISOString().slice(0, 10)
    : null;

  const { data: inv, error: iErr } = await supabase.from("invoices").insert({
    user_id: userId,
    invoice_number: invoiceNumber,
    invoice_title: invoiceTitle,
    student_id: student.id,
    client_name: student.full_name,
    client_parent_name: student.parent_name,
    client_email: student.email,
    client_phone: student.phone,
    client_address: student.billing_address,
    hourly_rate: student.hourly_fee,
    invoice_date: today.toISOString().slice(0, 10),
    payment_deadline: due,
    status: "draft",
    notes: opts.notes?.trim() || null,
    total,
  }).select().single();
  if (iErr) throw iErr;

  const { error: itErr } = await supabase.from("invoice_items").insert(
    items.map(it => ({ ...it, invoice_id: inv.id, user_id: userId }))
  );
  if (itErr) throw itErr;

  // Auto-generate Stripe Pay Now link so it can be embedded in the PDF/email.
  // Silently ignore if Stripe isn't connected yet — the tutor can connect later
  // and regenerate from the invoice page.
  try {
    await createInvoiceCheckout({ data: { invoiceId: inv.id } });
  } catch {
    /* Stripe not connected or temporarily unavailable — continue. */
  }

  return inv;
}


export async function recalculateInvoiceTotal(invoiceId: string) {
  const { data: items, error } = await supabase
    .from("invoice_items").select("amount").eq("invoice_id", invoiceId);
  if (error) throw error;
  const total = +(items || []).reduce((s, i) => s + Number(i.amount), 0).toFixed(2);
  const { error: uErr } = await supabase.from("invoices").update({ total }).eq("id", invoiceId);
  if (uErr) throw uErr;
  return total;
}
