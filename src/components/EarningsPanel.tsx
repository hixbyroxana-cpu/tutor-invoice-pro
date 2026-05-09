import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney } from "@/lib/format";
import { TrendingUp } from "lucide-react";

const RANGES = [
  { value: "1", label: "Last month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "24", label: "Last 2 years" },
  { value: "all", label: "All time" },
];

export function EarningsPanel() {
  const [range, setRange] = useState("3");
  const [mode, setMode] = useState<"paid" | "billed">("paid");

  const sinceISO = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    d.setMonth(d.getMonth() - Number(range));
    return d.toISOString().slice(0, 10);
  }, [range]);

  const { data, isLoading } = useQuery({
    queryKey: ["earnings", range, mode],
    queryFn: async () => {
      let q = supabase
        .from("invoices")
        .select("id, total, status, invoice_date, client_name, student_id");
      if (sinceISO) q = q.gte("invoice_date", sinceISO);
      const { data: invoices } = await q;
      const list = (invoices || []).filter(i => mode === "billed" ? true : i.status === "paid");

      const byStudent = new Map<string, { name: string; total: number; count: number }>();
      let total = 0;
      for (const inv of list) {
        const amt = Number(inv.total);
        total += amt;
        const key = inv.student_id || inv.client_name;
        const existing = byStudent.get(key) || { name: inv.client_name, total: 0, count: 0 };
        existing.total += amt;
        existing.count += 1;
        byStudent.set(key, existing);
      }
      const breakdown = Array.from(byStudent.values()).sort((a, b) => b.total - a.total);
      return { total, count: list.length, breakdown };
    },
  });

  const max = data?.breakdown[0]?.total || 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Earnings
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === "paid" ? "Total received from paid invoices" : "Total billed across all invoices"}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={mode} onValueChange={(v) => setMode(v as "paid" | "billed")}>
            <SelectTrigger className="h-9 w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="billed">Billed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RANGES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div className="text-3xl font-semibold tabular-nums">
            {isLoading ? "—" : fmtMoney(data?.total ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground">
            {data?.count ?? 0} invoice{data?.count === 1 ? "" : "s"}
          </div>
        </div>

        {data && data.breakdown.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">By student</div>
            <div className="space-y-2">
              {data.breakdown.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{s.name}</span>
                    <span className="tabular-nums font-medium">{fmtMoney(s.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(s.total / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !isLoading && <p className="text-sm text-muted-foreground py-4 text-center">No earnings in this period.</p>
        )}
      </CardContent>
    </Card>
  );
}
