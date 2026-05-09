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
import { Plus, Trash2, Download, ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
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
      const { error: iErr } = await supabase.from("invoice_items").insert(
        items.map((it, idx) => ({
          invoice_id: id,
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

  function exportPdf() {
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4 mr-2" />Save</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Invoice details</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Invoice title"><Input value={i.invoice_title} onChange={(e) => setField("invoice_title", e.target.value)} /></Field>
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
            <Field label="Invoice date"><Input type="date" value={i.invoice_date} onChange={(e) => setField("invoice_date", e.target.value)} /></Field>
            <Field label="Payment deadline"><Input type="date" value={i.payment_deadline ?? ""} onChange={(e) => setField("payment_deadline", e.target.value)} /></Field>
            <Field label="Default hourly rate"><Input type="number" step="0.01" value={i.hourly_rate} onChange={(e) => setField("hourly_rate", Number(e.target.value))} /></Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Client (this invoice only)</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Student / client name"><Input value={i.client_name} onChange={(e) => setField("client_name", e.target.value)} /></Field>
            <Field label="Parent name"><Input value={i.client_parent_name ?? ""} onChange={(e) => setField("client_parent_name", e.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Email"><Input value={i.client_email ?? ""} onChange={(e) => setField("client_email", e.target.value)} /></Field>
            <Field label="Phone"><Input value={i.client_phone ?? ""} onChange={(e) => setField("client_phone", e.target.value)} /></Field>
          </div>
          <Field label="Billing address"><Textarea rows={2} value={i.client_address ?? ""} onChange={(e) => setField("client_address", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lessons</CardTitle>
          <Button size="sm" variant="outline" onClick={addLesson}><Plus className="h-3.5 w-3.5 mr-1" />Add lesson</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border bg-card">
              <div className="col-span-12 sm:col-span-3">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={it.lesson_date} onChange={(e) => updItem(idx, { lesson_date: e.target.value })} />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Label className="text-xs">Description</Label>
                <Input value={it.description} onChange={(e) => updItem(idx, { description: e.target.value })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Label className="text-xs">Hours</Label>
                <Input type="number" step="0.25" value={it.duration} onChange={(e) => updItem(idx, { duration: Number(e.target.value) })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Label className="text-xs">Rate</Label>
                <Input type="number" step="0.01" value={it.hourly_rate} onChange={(e) => updItem(idx, { hourly_rate: Number(e.target.value) })} />
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          <Textarea rows={3} value={i.notes ?? ""} onChange={(e) => setField("notes", e.target.value)} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 sticky bottom-4">
        <Button variant="outline" onClick={() => navigate({ to: "/invoices" })}>Back</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save changes</Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
