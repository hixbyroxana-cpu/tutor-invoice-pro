import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Receipt, FilePlus, PoundSterling } from "lucide-react";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EarningsPanel } from "@/components/EarningsPanel";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [studentsRes, invoicesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("archived", false),
        supabase.from("invoices").select("id, total, status, invoice_date, invoice_number, client_name, invoice_title").order("created_at", { ascending: false }),
      ]);
      const invoices = invoicesRes.data || [];
      const outstanding = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + Number(i.total), 0);
      const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
      return {
        studentCount: studentsRes.count || 0,
        invoiceCount: invoices.length,
        outstanding,
        paid,
        recent: invoices.slice(0, 5),
      };
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Overview of your tutoring business.</p>
        </div>
        <Button asChild>
          <Link to="/invoices/new"><FilePlus className="h-4 w-4 mr-2" />New invoice</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Active students" value={String(stats?.studentCount ?? "—")} />
        <StatCard icon={<Receipt className="h-4 w-4" />} label="Invoices" value={String(stats?.invoiceCount ?? "—")} />
        <StatCard icon={<PoundSterling className="h-4 w-4" />} label="Outstanding" value={stats ? fmtMoney(stats.outstanding) : "—"} accent="warning" />
        <StatCard icon={<PoundSterling className="h-4 w-4" />} label="Paid (lifetime)" value={stats ? fmtMoney(stats.paid) : "—"} accent="success" />
      </div>

      <EarningsPanel />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent.length ? (
            <div className="divide-y">
              {stats.recent.map((inv) => (
                <Link
                  key={inv.id}
                  to="/invoices/$id"
                  params={{ id: inv.id }}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-accent/50 -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{inv.invoice_title}</div>
                    <div className="text-xs text-muted-foreground">{inv.client_name} • {fmtDate(inv.invoice_date)}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={inv.status} />
                    <div className="font-medium tabular-nums w-20 text-right">{fmtMoney(Number(inv.total))}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No invoices yet. <Link to="/invoices/new" className="underline">Create one</Link>.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: "success" | "warning" }) {
  const color = accent === "success" ? "text-success" : accent === "warning" ? "text-warning" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-wide">
          <span>{label}</span>
          {icon}
        </div>
        <div className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "Draft", cls: "bg-muted text-muted-foreground" },
    sent: { label: "Sent", cls: "bg-primary/15 text-primary" },
    paid: { label: "Paid", cls: "bg-success/15 text-success" },
    overdue: { label: "Overdue", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status] || map.draft;
  return <Badge variant="outline" className={`border-0 ${m.cls}`}>{m.label}</Badge>;
}
