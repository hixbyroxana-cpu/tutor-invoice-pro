import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FilePlus, Download, Copy, Trash2, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate, fmtMoney } from "@/lib/format";
import { StatusBadge } from "./_app.dashboard";
import { toast } from "sonner";
import { generateInvoicePdf } from "@/lib/pdf";
import { createInvoice } from "@/lib/invoiceService";
import { InvoicePreview } from "@/components/InvoicePreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/invoices/")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: previewData } = useQuery({
    queryKey: ["invoice-preview", previewId],
    enabled: !!previewId,
    queryFn: async () => {
      const [invRes, itemsRes, settingsRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", previewId!).single(),
        supabase.from("invoice_items").select("*").eq("invoice_id", previewId!).order("position"),
        supabase.from("business_settings").select("*").limit(1).maybeSingle(),
      ]);
      if (invRes.error) throw invRes.error;
      return {
        invoice: invRes.data,
        items: (itemsRes.data || []).map((it) => ({
          ...it,
          duration: Number(it.duration),
          hourly_rate: Number(it.hourly_rate),
          amount: Number(it.amount),
        })),
        settings: settingsRes.data || {},
      };
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = invoices.filter((i) => {
    if (status !== "all" && i.status !== status) return false;
    if (search && !i.client_name.toLowerCase().includes(search.toLowerCase()) && !i.invoice_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });




  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Invoice deleted"); },
  });

  const dup = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: orig } = await supabase.from("invoices").select("*").eq("id", invoiceId).single();
      const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId);
      if (!orig || !orig.student_id) throw new Error("Cannot duplicate (student deleted)");
      const inv = await createInvoice({
        studentId: orig.student_id,
        lessons: (items || []).map((it) => ({
          lesson_date: it.lesson_date,
          description: it.description,
          duration: Number(it.duration),
          hourly_rate: Number(it.hourly_rate),
          notes: it.notes,
        })),
        notes: orig.notes ?? undefined,
        paymentDeadlineDays: 14,
      });
      return inv.id as string;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Duplicated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  async function exportPdf(invoiceId: string) {
    const [{ data: inv }, { data: items }, { data: settings }] = await Promise.all([
      supabase.from("invoices").select("*").eq("id", invoiceId).single(),
      supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).order("position"),
      supabase.from("business_settings").select("*").limit(1).maybeSingle(),
    ]);
    if (!inv) return toast.error("Not found");
    generateInvoicePdf(
      { ...inv, items: (items || []).map(it => ({ ...it, duration: Number(it.duration), hourly_rate: Number(it.hourly_rate), amount: Number(it.amount) })) } as Parameters<typeof generateInvoicePdf>[0],
      settings as Parameters<typeof generateInvoicePdf>[1] || {} as Parameters<typeof generateInvoicePdf>[1],
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">All invoices, searchable and editable.</p>
        </div>
        <Button asChild><Link to="/invoices/new"><FilePlus className="h-4 w-4 mr-2" />New invoice</Link></Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or invoice #…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">No invoices match.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Invoice #</th>
                    <th className="text-left font-medium px-4 py-3">Student</th>
                    <th className="text-left font-medium px-4 py-3">Date</th>
                    <th className="text-right font-medium px-4 py-3">Total</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i) => (
                    <tr key={i.id} className="border-b last:border-b-0 hover:bg-accent/30">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link to="/invoices/$id" params={{ id: i.id }} className="hover:underline">{i.invoice_number}</Link>
                      </td>
                      <td className="px-4 py-3">{i.client_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(i.invoice_date)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtMoney(Number(i.total))}</td>
                      <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" title="View" onClick={() => setPreviewId(i.id)}><Eye className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Export PDF" onClick={() => exportPdf(i.id)}><Download className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Duplicate" onClick={() => dup.mutate(i.id)}><Copy className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
                                <AlertDialogDescription>This permanently deletes {i.invoice_number}.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => del.mutate(i.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewId} onOpenChange={(o) => !o && setPreviewId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice preview</DialogTitle>
          </DialogHeader>
          {previewData?.invoice ? (
            <>
              <InvoicePreview
                invoice={{
                  ...(previewData.invoice as Record<string, unknown>),
                  items: previewData.items,
                } as unknown as Parameters<typeof InvoicePreview>[0]["invoice"]}
                settings={previewData.settings as Parameters<typeof InvoicePreview>[0]["settings"]}
                payUrl={(previewData.invoice as { stripe_checkout_url: string | null }).stripe_checkout_url ?? `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${previewId}`}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setPreviewId(null)}>Close</Button>
                <Button onClick={() => previewId && exportPdf(previewId)}>
                  <Download className="h-4 w-4 mr-2" />Download PDF
                </Button>
              </DialogFooter>
            </>
          ) : (
            <p className="text-sm text-muted-foreground p-8 text-center">Loading…</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
