import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

type Settings = {
  id: string;
  tutor_name: string | null;
  business_name: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  bank_name: string | null;
  account_holder: string | null;
  sort_code: string | null;
  account_number: string | null;
  payment_notes: string | null;
  invoice_prefix: string;
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as Settings;
    },
  });

  const [form, setForm] = useState<Partial<Settings>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const payload = {
        user_id: u.user.id,
        tutor_name: form.tutor_name ?? null,
        business_name: form.business_name ?? null,
        address: form.address ?? null,
        email: form.email ?? null,
        phone: form.phone ?? null,
        bank_name: form.bank_name ?? null,
        account_holder: form.account_holder ?? null,
        sort_code: form.sort_code ?? null,
        account_number: form.account_number ?? null,
        payment_notes: form.payment_notes ?? null,
        invoice_prefix: (form.invoice_prefix || "ROX").toUpperCase().slice(0, 6),
      };
      const { error } = await supabase.from("business_settings")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Settings saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Your details appear automatically on every invoice.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Business details</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tutor name"><Input value={form.tutor_name ?? ""} onChange={(e) => setForm({ ...form, tutor_name: e.target.value })} /></Field>
            <Field label="Business name (optional)"><Input value={form.business_name ?? ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></Field>
          </div>
          <Field label="Address"><Textarea rows={2} value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          </div>
          <Field label="Invoice prefix (e.g. ROX)">
            <Input value={form.invoice_prefix ?? ""} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} className="max-w-32" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment methods</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add the ways clients can pay you. These details appear on every invoice.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Bank name"><Input value={form.bank_name ?? ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></Field>
            <Field label="Account holder"><Input value={form.account_holder ?? ""} onChange={(e) => setForm({ ...form, account_holder: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Sort code / routing number"><Input value={form.sort_code ?? ""} onChange={(e) => setForm({ ...form, sort_code: e.target.value })} /></Field>
            <Field label="Account number / IBAN"><Input value={form.account_number ?? ""} onChange={(e) => setForm({ ...form, account_number: e.target.value })} /></Field>
          </div>
          <Field label="Other payment methods">
            <Textarea
              rows={4}
              placeholder={`PayPal: name@example.com\nRevolut: @yourname\nCash accepted in person\nPlease reference the invoice number when paying.`}
              value={form.payment_notes ?? ""}
              onChange={(e) => setForm({ ...form, payment_notes: e.target.value })}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save settings</Button>
      </div>
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
