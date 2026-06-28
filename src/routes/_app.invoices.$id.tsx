import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, ArrowLeft, Save, Eye, EyeOff, Copy } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { generateInvoicePdf } from "@/lib/pdf";
import { InvoicePreview } from "@/components/InvoicePreview";


export const Route = createFileRoute("/_app/invoices/$id")({
  component: InvoiceEditPage,
});

type Item = {
  id?: string;
  lesson_date: string;
  description: string;
  duration: number;
  hourly_rate: number;
  amount: number;
  notes: string | null;
  position: number;
};

function InvoiceEditPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [invRes, itemsRes, settingsRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", id).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", id).order("position"),
        supabase.from("business_settings").select("*").limit(1).maybeSingle(),
      ]);
      if (invRes.error) throw invRes.error;
      return { invoice: invRes.data, items: (itemsRes.data || []) as Item[], settings: settingsRes.data };
    },
  });

  const [inv, setInv] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (data) {
      setInv(data.invoice as Record<string, unknown>);
      setItems(data.items.map(it => ({
        ...it,
        duration: Number(it.duration),
        hourly_rate: Number(it.hourly_rate),
        amount: Number(it.amount),
      })));
    }
  }, [data]);

  if (isLoading || !inv) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const locked = Boolean((inv as { pdf_exported_at?: string | null }).pdf_exported_at);
  const total = items.reduce((s, it) => s + Number(it.duration) * Number(it.hourly_rate), 0);

  function setField<K extends string>(field: K, value: unknown) {
    setInv((p) => p ? { ...p, [field]: value } : p);
  }


  function addLesson() {
    setItems([...items, {
      lesson_date: new Date().toISOString().slice(0, 10),
      description: "Tutoring lesson",
      duration: 1,
      hourly_rate: Number((inv as { hourly_rate: number }).hourly_rate) || 0,
      amount: 0,
      notes: null,
      position: items.length,
    }]);
  }

  function updItem(i: number, patch: Partial<Item>) {
    setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  }
  function removeItem(i: number) { setItems(items.filter((_, idx) => idx !== i)); }

  const save = useMutation({
    mutationFn: async () => {
      const i = inv as {
        invoice_title: string; status: string; notes: string | null; payment_deadline: string | null;
        invoice_date: string; client_name: string; client_parent_name: string | null; client_email: string | null;
        client_phone: string | null; client_address: string | null; hourly_rate: number;
      };

      if (locked) {
        // Locked invoices: only status changes are persisted.
        const { error: sErr } = await supabase.from("invoices").update({ status: i.status }).eq("id", id);
        if (sErr) throw sErr;
        return;
      }

      const newTotal = +items.reduce((s, it) => s + Number(it.duration) * Number(it.hourly_rate), 0).toFixed(2);
      const { error: uErr } = await supabase.from("invoices").update({
        invoice_title: i.invoice_title,
        status: i.status,
        notes: i.notes,
        payment_deadline: i.payment_deadline || null,
        invoice_date: i.invoice_date,
        client_name: i.client_name,
        client_parent_name: i.client_parent_name,
        client_email: i.client_email,
        client_phone: i.client_phone,
        client_address: i.client_address,
        hourly_rate: i.hourly_rate,
        total: newTotal,
      }).eq("id", id);
      if (uErr) throw uErr;

      // Delete & re-insert items (simplest)
      const { error: dErr } = await supabase.from("invoice_items").delete().eq("invoice_id", id);
      if (dErr) throw dErr;
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error: iErr } = await supabase.from("invoice_items").insert(
        items.map((it, idx) => ({
          invoice_id: id,
          user_id: u.user!.id,
          lesson_date: it.lesson_date,
          description: it.description?.trim() || "Tutoring lesson",
          duration: Number(it.duration),
          hourly_rate: Number(it.hourly_rate),
          amount: +(Number(it.duration) * Number(it.hourly_rate)).toFixed(2),
          notes: it.notes,
          position: idx,
        })),
      );
      if (iErr) throw iErr;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoice", id] }); qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: numRes, error: nErr } = await supabase.rpc("next_invoice_number");
      if (nErr) throw nErr;
      const settings = data?.settings as { invoice_prefix?: string } | null;
      const prefix = settings?.invoice_prefix || "INV";
      const src = inv as Record<string, unknown>;
      const { data: newInv, error: cErr } = await supabase.from("invoices").insert({
        user_id: u.user.id,
        invoice_number: `${prefix}-${String(numRes).padStart(4, "0")}`,
        invoice_title: `${src.invoice_title} (copy)`,
        student_id: src.student_id as string | null,
        client_name: src.client_name as string,
        client_parent_name: src.client_parent_name as string | null,
        client_email: src.client_email as string | null,
        client_phone: src.client_phone as string | null,
        client_address: src.client_address as string | null,
        hourly_rate: src.hourly_rate as number,
        invoice_date: new Date().toISOString().slice(0, 10),
        status: "draft",
        notes: src.notes as string | null,
        total: 0,
      }).select().single();
      if (cErr) throw cErr;
      if (items.length) {
        const { error: itErr } = await supabase.from("invoice_items").insert(
          items.map((it, idx) => ({
            invoice_id: newInv.id,
            user_id: u.user!.id,
            lesson_date: it.lesson_date,
            description: it.description,
            duration: Number(it.duration),
            hourly_rate: Number(it.hourly_rate),
            amount: +(Number(it.duration) * Number(it.hourly_rate)).toFixed(2),
            notes: it.notes,
            position: idx,
          })),
        );
        if (itErr) throw itErr;
        const newTotal = +items.reduce((s, it) => s + Number(it.duration) * Number(it.hourly_rate), 0).toFixed(2);
        await supabase.from("invoices").update({ total: newTotal }).eq("id", newInv.id);
      }
      return newInv.id as string;
    },
    onSuccess: (newId) => { toast.success("Duplicated as new draft"); navigate({ to: "/invoices/$id", params: { id: newId } }); },
    onError: (e: Error) => toast.error(e.message),
  });


  async function exportPdf() {
    const i = inv as Record<string, unknown>;
    generateInvoicePdf({
      invoice_number: String(i.invoice_number),
      invoice_title: String(i.invoice_title),
      invoice_date: String(i.invoice_date),
      payment_deadline: (i.payment_deadline as string) || null,
      client_name: String(i.client_name),
      client_parent_name: (i.client_parent_name as string) || null,
      client_email: (i.client_email as string) || null,
      client_phone: (i.client_phone as string) || null,
      client_address: (i.client_address as string) || null,
      notes: (i.notes as string) || null,
      total: +items.reduce((s, it) => s + Number(it.duration) * Number(it.hourly_rate), 0).toFixed(2),
      items: items.map(it => ({
        lesson_date: it.lesson_date,
        description: it.description,
        duration: Number(it.duration),
        hourly_rate: Number(it.hourly_rate),
        amount: +(Number(it.duration) * Number(it.hourly_rate)).toFixed(2),
      })),
    }, (data?.settings ?? {}) as Parameters<typeof generateInvoicePdf>[1]);

    if (!locked) {
      const stamp = new Date().toISOString();
      const { error } = await supabase.from("invoices").update({ pdf_exported_at: stamp }).eq("id", id);
      if (!error) {
        setInv((p) => p ? { ...p, pdf_exported_at: stamp } : p);
        qc.invalidateQueries({ queryKey: ["invoice", id] });
        qc.invalidateQueries({ queryKey: ["invoices"] });
        toast.message("Invoice locked", { description: "On the free plan, invoices become read-only after the PDF is exported. Duplicate it to make changes." });
      }
    }
  }


  const i = inv as {
    invoice_number: string; invoice_title: string; status: string; invoice_date: string;
    payment_deadline: string | null; client_name: string; client_parent_name: string | null;
    client_email: string | null; client_phone: string | null; client_address: string | null;
    hourly_rate: number; notes: string | null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon"><Link to="/invoices"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight truncate">{i.invoice_title}</h1>
            <p className="text-xs text-muted-foreground font-mono">{i.invoice_number}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowPreview(s => !s)}>
            {showPreview ? <><EyeOff className="h-4 w-4 mr-2" />Hide preview</> : <><Eye className="h-4 w-4 mr-2" />Show preview</>}
          </Button>
          <Button variant="outline" onClick={exportPdf}><Download className="h-4 w-4 mr-2" />{locked ? "Re-download PDF" : "Export PDF"}</Button>
          {locked && (
            <Button variant="outline" onClick={() => duplicate.mutate()} disabled={duplicate.isPending}>
              <Copy className="h-4 w-4 mr-2" />Duplicate to edit
            </Button>
          )}
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="h-4 w-4 mr-2" />{locked ? "Save status" : "Save"}
          </Button>
        </div>
      </div>

      {locked && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <Lock className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-300 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-900 dark:text-amber-100">Invoice locked</p>
            <p className="text-amber-800/90 dark:text-amber-200/90 text-xs mt-0.5">
              On the free plan, an invoice becomes read-only after the PDF is exported. You can still change its status (Sent / Paid / Overdue) or duplicate it as a new editable draft.{" "}
              <Link to="/pricing" className="underline">Upgrade</Link> for unlimited edits after export.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Invoice details</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Invoice title"><Input disabled={locked} value={i.invoice_title} onChange={(e) => setField("invoice_title", e.target.value)} /></Field>
            <Field label="Status">
              <Select value={i.status} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Invoice date"><Input disabled={locked} type="date" value={i.invoice_date} onChange={(e) => setField("invoice_date", e.target.value)} /></Field>
            <Field label="Payment deadline"><Input disabled={locked} type="date" value={i.payment_deadline ?? ""} onChange={(e) => setField("payment_deadline", e.target.value)} /></Field>
            <Field label="Default hourly rate"><Input disabled={locked} type="number" step="0.01" value={i.hourly_rate} onChange={(e) => setField("hourly_rate", Number(e.target.value))} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Client (this invoice only)</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Student / client name"><Input disabled={locked} value={i.client_name} onChange={(e) => setField("client_name", e.target.value)} /></Field>
            <Field label="Parent name"><Input disabled={locked} value={i.client_parent_name ?? ""} onChange={(e) => setField("client_parent_name", e.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Email"><Input disabled={locked} value={i.client_email ?? ""} onChange={(e) => setField("client_email", e.target.value)} /></Field>
            <Field label="Phone"><Input disabled={locked} value={i.client_phone ?? ""} onChange={(e) => setField("client_phone", e.target.value)} /></Field>
          </div>
          <Field label="Billing address"><Textarea disabled={locked} rows={2} value={i.client_address ?? ""} onChange={(e) => setField("client_address", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lessons</CardTitle>
          {!locked && <Button size="sm" variant="outline" onClick={addLesson}><Plus className="h-3.5 w-3.5 mr-1" />Add lesson</Button>}
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border bg-card">
              <div className="col-span-12 sm:col-span-3">
                <Label className="text-xs">Date</Label>
                <Input disabled={locked} type="date" value={it.lesson_date} onChange={(e) => updItem(idx, { lesson_date: e.target.value })} />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Label className="text-xs">Description</Label>
                <Input disabled={locked} value={it.description} onChange={(e) => updItem(idx, { description: e.target.value })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Label className="text-xs">Hours</Label>
                <Input disabled={locked} type="number" step="0.25" value={it.duration} onChange={(e) => updItem(idx, { duration: Number(e.target.value) })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Label className="text-xs">Rate</Label>
                <Input disabled={locked} type="number" step="0.01" value={it.hourly_rate} onChange={(e) => updItem(idx, { hourly_rate: Number(e.target.value) })} />
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                {!locked && <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-2 text-sm">
            <div className="text-muted-foreground">Total: <span className="font-semibold text-foreground tabular-nums text-base">{fmtMoney(total)}</span></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea disabled={locked} rows={3} value={i.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
        </CardContent>
      </Card>


      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preview</CardTitle>
            <p className="text-xs text-muted-foreground">How the invoice will look when exported as PDF. Unsaved edits are reflected here.</p>
          </CardHeader>
          <CardContent className="bg-muted/40 p-4 sm:p-6 rounded-b-md">
            <InvoicePreview
              invoice={{
                invoice_number: i.invoice_number,
                invoice_title: i.invoice_title,
                invoice_date: i.invoice_date,
                payment_deadline: i.payment_deadline,
                client_name: i.client_name,
                client_parent_name: i.client_parent_name,
                client_email: i.client_email,
                client_phone: i.client_phone,
                client_address: i.client_address,
                notes: i.notes,
                total: +items.reduce((s, it) => s + Number(it.duration) * Number(it.hourly_rate), 0).toFixed(2),
                items: items.map(it => ({
                  lesson_date: it.lesson_date,
                  description: it.description,
                  duration: Number(it.duration),
                  hourly_rate: Number(it.hourly_rate),
                  amount: +(Number(it.duration) * Number(it.hourly_rate)).toFixed(2),
                })),
              }}
              settings={(data?.settings ?? {}) as Partial<Parameters<typeof generateInvoicePdf>[1]>}
            />
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button variant="outline" onClick={() => navigate({ to: "/invoices" })}>Back</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{locked ? "Save status" : "Save changes"}</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
