import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Download, Lock, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { InvoicePreview } from "@/components/InvoicePreview";
import { generateInvoicePdf, type InvoiceForPdf, type Settings } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, padNum, slug } from "@/lib/format";

export const Route = createFileRoute("/try")({
  component: TryPage,
  head: () => ({
    meta: [
      { title: "Try TutorBook free — Create your first tutor invoice" },
      { name: "description", content: "Build a professional tutoring invoice in seconds. No signup required to try — create a free account before sending your first invoice. Your tutor and student details are saved, so future invoices are just rate and dates." },
    ],
  }),
});

const STORAGE_KEY = "tutorbook.try.invoice";
const PENDING_KEY = "tutorbook.try.pendingDownload";

type TryLesson = { lesson_date: string; description: string; duration: number; hourly_rate: number };
type TryState = {
  tutor_name: string;
  business_name: string;
  address: string;
  email: string;
  phone: string;
  bank_name: string;
  account_holder: string;
  sort_code: string;
  account_number: string;
  payment_notes: string;
  client_name: string;
  client_parent_name: string;
  client_email: string;
  client_address: string;
  invoice_date: string;
  payment_deadline: string;
  notes: string;
  lessons: TryLesson[];
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

const DEFAULT_STATE: TryState = {
  tutor_name: "",
  business_name: "",
  address: "",
  email: "",
  phone: "",
  bank_name: "",
  account_holder: "",
  sort_code: "",
  account_number: "",
  payment_notes: "",
  client_name: "",
  client_parent_name: "",
  client_email: "",
  client_address: "",
  invoice_date: todayISO(),
  payment_deadline: plusDaysISO(14),
  notes: "",
  lessons: [
    { lesson_date: todayISO(), description: "Tutoring lesson", duration: 1, hourly_rate: 40 },
  ],
};

function loadState(): TryState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function buildInvoice(s: TryState): InvoiceForPdf {
  const items = s.lessons.map((l) => ({
    lesson_date: l.lesson_date,
    description: l.description?.trim() || "Tutoring lesson",
    duration: Number(l.duration) || 0,
    hourly_rate: Number(l.hourly_rate) || 0,
    amount: +(Number(l.duration) * Number(l.hourly_rate)).toFixed(2),
  }));
  const total = +items.reduce((sum, i) => sum + i.amount, 0).toFixed(2);
  const year = new Date(s.invoice_date || todayISO()).getFullYear();
  const namePart = s.client_name ? slug(s.client_name) : "student";
  return {
    invoice_number: `ROX-${year}-${padNum(1)}`,
    invoice_title: `Invoice-ROX-${year}-${padNum(1)}-${namePart}`,
    invoice_date: s.invoice_date || todayISO(),
    payment_deadline: s.payment_deadline || null,
    client_name: s.client_name || "Student name",
    client_parent_name: s.client_parent_name || null,
    client_email: s.client_email || null,
    client_phone: null,
    client_address: s.client_address || null,
    notes: s.notes || null,
    total,
    items,
  };
}

function buildSettings(s: TryState): Settings {
  return {
    tutor_name: s.tutor_name || null,
    business_name: s.business_name || null,
    address: s.address || null,
    email: s.email || null,
    phone: s.phone || null,
    bank_name: s.bank_name || null,
    account_holder: s.account_holder || null,
    sort_code: s.sort_code || null,
    account_number: s.account_number || null,
    payment_notes: s.payment_notes || null,
  };
}

function TryPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<TryState>(DEFAULT_STATE);
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(loadState());
    setReady(true);
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setAuthed(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Persist
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, ready]);

  // Resume download after sign-in
  useEffect(() => {
    if (!ready || !authed) return;
    if (window.sessionStorage.getItem(PENDING_KEY) === "1") {
      window.sessionStorage.removeItem(PENDING_KEY);
      const inv = buildInvoice(state);
      const settings = buildSettings(state);
      generateInvoicePdf(inv, settings);
      toast.success("Invoice downloaded — welcome to TutorBook!");
    }
  }, [authed, ready, state]);

  function patch(p: Partial<TryState>) { setState((s) => ({ ...s, ...p })); }
  function patchLesson(i: number, p: Partial<TryLesson>) {
    setState((s) => ({ ...s, lessons: s.lessons.map((l, idx) => idx === i ? { ...l, ...p } : l) }));
  }
  function addLesson() {
    setState((s) => ({
      ...s,
      lessons: [...s.lessons, { lesson_date: todayISO(), description: "Tutoring lesson", duration: 1, hourly_rate: s.lessons.at(-1)?.hourly_rate ?? 40 }],
    }));
  }
  function removeLesson(i: number) {
    setState((s) => ({ ...s, lessons: s.lessons.filter((_, idx) => idx !== i) }));
  }

  const invoice = buildInvoice(state);
  const settings = buildSettings(state);

  function handleDownload() {
    if (!state.client_name.trim()) {
      toast.error("Add the student's name first.");
      return;
    }
    if (state.lessons.length === 0) {
      toast.error("Add at least one lesson.");
      return;
    }
    if (!authed) {
      window.sessionStorage.setItem(PENDING_KEY, "1");
      toast.message("Create a free account to download your invoice.", {
        description: "Your invoice is saved — you'll get it as soon as you sign up.",
      });
      navigate({ to: "/login" });
      return;
    }
    generateInvoicePdf(invoice, settings);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">T</div>
            <span className="font-semibold tracking-tight">TutorBook</span>
          </Link>
          <nav className="flex items-center gap-2">
            {authed ? (
              <Link to="/dashboard"><Button size="sm" variant="outline">Go to dashboard</Button></Link>
            ) : (
              <Link to="/login"><Button size="sm" variant="ghost">Sign in</Button></Link>
            )}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-3 w-3 mr-1" /> Back to home
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Try TutorBook — build a free invoice</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Fill in the details and preview your invoice live. No account needed until you download.
            </p>
          </div>
          <Button onClick={handleDownload} className="gap-2">
            {authed ? <Download className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {authed ? "Download PDF" : "Sign up & download"}
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Your details</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <Field label="Your name"><Input value={state.tutor_name} onChange={(e) => patch({ tutor_name: e.target.value })} placeholder="Jane Tutor" /></Field>
                <Field label="Business name (optional)"><Input value={state.business_name} onChange={(e) => patch({ business_name: e.target.value })} /></Field>
                <Field label="Email"><Input type="email" value={state.email} onChange={(e) => patch({ email: e.target.value })} /></Field>
                <Field label="Phone"><Input value={state.phone} onChange={(e) => patch({ phone: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} value={state.address} onChange={(e) => patch({ address: e.target.value })} /></Field></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Student / billed to</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <Field label="Student name *"><Input value={state.client_name} onChange={(e) => patch({ client_name: e.target.value })} placeholder="John Smith" /></Field>
                <Field label="Parent name (optional)"><Input value={state.client_parent_name} onChange={(e) => patch({ client_parent_name: e.target.value })} /></Field>
                <Field label="Client email"><Input type="email" value={state.client_email} onChange={(e) => patch({ client_email: e.target.value })} /></Field>
                <Field label="Invoice date"><Input type="date" value={state.invoice_date} onChange={(e) => patch({ invoice_date: e.target.value })} /></Field>
                <Field label="Payment due"><Input type="date" value={state.payment_deadline} onChange={(e) => patch({ payment_deadline: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Billing address"><Textarea rows={2} value={state.client_address} onChange={(e) => patch({ client_address: e.target.value })} /></Field></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Lessons</CardTitle>
                <Button size="sm" variant="outline" onClick={addLesson}><Plus className="h-3.5 w-3.5 mr-1" />Add lesson</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {state.lessons.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border bg-card">
                    <div className="col-span-12 sm:col-span-3"><Field label="Date"><Input type="date" value={l.lesson_date} onChange={(e) => patchLesson(i, { lesson_date: e.target.value })} /></Field></div>
                    <div className="col-span-6 sm:col-span-4"><Field label="Description"><Input value={l.description} onChange={(e) => patchLesson(i, { description: e.target.value })} /></Field></div>
                    <div className="col-span-3 sm:col-span-2"><Field label="Hours"><Input type="number" step="0.25" value={l.duration} onChange={(e) => patchLesson(i, { duration: Number(e.target.value) })} /></Field></div>
                    <div className="col-span-3 sm:col-span-2"><Field label="Rate"><Input type="number" step="0.01" value={l.hourly_rate} onChange={(e) => patchLesson(i, { hourly_rate: Number(e.target.value) })} /></Field></div>
                    <div className="col-span-12 sm:col-span-1 flex justify-end">
                      <Button size="icon" variant="ghost" onClick={() => removeLesson(i)} disabled={state.lessons.length === 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end text-sm pt-2 border-t">
                  <span className="text-muted-foreground mr-3">Total</span>
                  <span className="font-semibold tabular-nums">{fmtMoney(invoice.total)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Payment details (optional)</CardTitle></CardHeader>
              <CardContent className="grid sm:grid-cols-2 gap-3">
                <Field label="Bank name"><Input value={state.bank_name} onChange={(e) => patch({ bank_name: e.target.value })} /></Field>
                <Field label="Account holder"><Input value={state.account_holder} onChange={(e) => patch({ account_holder: e.target.value })} /></Field>
                <Field label="Sort code / routing"><Input value={state.sort_code} onChange={(e) => patch({ sort_code: e.target.value })} /></Field>
                <Field label="Account no. / IBAN"><Input value={state.account_number} onChange={(e) => patch({ account_number: e.target.value })} /></Field>
                <div className="sm:col-span-2"><Field label="Payment notes"><Textarea rows={2} value={state.payment_notes} onChange={(e) => patch({ payment_notes: e.target.value })} /></Field></div>
                <div className="sm:col-span-2"><Field label="Invoice notes"><Textarea rows={2} value={state.notes} onChange={(e) => patch({ notes: e.target.value })} /></Field></div>
              </CardContent>
            </Card>

            <div className="rounded-lg border bg-accent/40 p-4 text-sm flex items-start gap-3">
              <Lock className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Free to try — sign up to download.</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Your details are saved in this browser. Create a free account when you're ready to export the PDF and unlock student management, earnings tracking and more.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="text-xs font-medium text-muted-foreground mb-2">Live preview</div>
            <InvoicePreview invoice={invoice} settings={settings} />
          </div>
        </div>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
