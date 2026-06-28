import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

type PaySearch = { paid?: string; cancelled?: string };

export const Route = createFileRoute("/pay/$invoiceId")({
  validateSearch: (s: Record<string, unknown>): PaySearch => ({
    paid: s.paid as string | undefined,
    cancelled: s.cancelled as string | undefined,
  }),
  component: PayPage,
});

type PublicInvoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  total: number;
  status: string;
  stripe_checkout_url: string | null;
};

function PayPage() {
  const { invoiceId } = Route.useParams();
  const search = useSearch({ from: "/pay/$invoiceId" }) as PaySearch;
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabasePublic = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    supabasePublic
      .from("invoices")
      .select("id, invoice_number, client_name, total, status, stripe_checkout_url")
      .eq("id", invoiceId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else if (!data) setError("Invoice not found or no payment link available yet.");
        else setInvoice(data as PublicInvoice);
      });
  }, [invoiceId]);

  // Auto-redirect to Stripe Checkout if not paid and not a success/cancel return.
  useEffect(() => {
    if (!invoice) return;
    if (search.paid || search.cancelled) return;
    if (invoice.status === "paid") return;
    if (invoice.stripe_checkout_url) {
      window.location.href = invoice.stripe_checkout_url;
    }
  }, [invoice, search.paid, search.cancelled]);

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Pay your invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {!error && !invoice && <p className="text-sm text-muted-foreground">Loading…</p>}
          {invoice && (
            <>
              <div className="text-sm">
                <div className="font-mono text-muted-foreground">{invoice.invoice_number}</div>
                <div className="font-medium">{invoice.client_name}</div>
                <div className="text-2xl font-semibold mt-2">{fmtMoney(Number(invoice.total))}</div>
              </div>

              {invoice.status === "paid" || search.paid ? (
                <div className="flex items-center gap-2 text-sm rounded-md border border-green-200 bg-green-50 text-green-900 p-3">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Paid — thank you!</span>
                </div>
              ) : search.cancelled ? (
                <>
                  <p className="text-sm text-muted-foreground">Payment cancelled. You can try again below.</p>
                  {invoice.stripe_checkout_url && (
                    <Button asChild className="w-full">
                      <a href={invoice.stripe_checkout_url}>
                        Pay now <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Redirecting you to secure checkout…</p>
              )}

              <p className="text-xs text-muted-foreground pt-2 border-t">
                Payments are processed securely by Stripe.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
