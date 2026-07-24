import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate, fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { Trash2, Download, FileText, Lock } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_app/bookkeeping")({
  component: BookkeepingPage,
  head: () => ({
    meta: [
      { title: "Bookkeeping · LessonPaid" },
      { name: "description", content: "Automatic income ledger, expense tracking and UK tax year summary for tutors paid through LessonPaid." },
      { property: "og:title", content: "Bookkeeping · LessonPaid" },
      { property: "og:description", content: "Automatic income ledger, expenses, and UK tax year summary." },
    ],
  }),
});

type PaidInvoice = {
  id: string;
  invoice_number: string;
  client_name: string;
  student_id: string | null;
  total: number;
  paid_at: string | null;
  invoice_date: string;
  stripe_session_id: string | null;
};

type Expense = {
  id: string;
  expense_date: string;
  amount: number;
  category: string;
  note: string | null;
  student_id: string | null;
  invoice_id: string | null;
};

type Student = { id: string; full_name: string };
type InvoiceLite = { id: string; invoice_number: string };

const EXPENSE_CATEGORIES = [
  "Materials",
  "Textbooks",
  "Mileage",
  "Software / Subscriptions",
  "Equipment",
  "Training",
  "Marketing",
  "Home office",
  "Other",
];

/** UK tax year runs 6 April → 5 April. Given a date, return the starting year. */
function ukTaxYearStart(d: Date): number {
  const y = d.getFullYear();
  const cutoff = new Date(y, 3, 6); // April is month 3
  return d >= cutoff ? y : y - 1;
}
function ukTaxYearRange(startYear: number): { from: string; to: string; label: string } {
  return {
    from: `${startYear}-04-06`,
    to: `${startYear + 1}-04-05`,
    label: `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`,
  };
}
function ukTerm(d: Date): string {
  const m = d.getMonth() + 1;
  if (m >= 9 && m <= 12) return `Autumn ${d.getFullYear()}`;
  if (m >= 1 && m <= 3) return `Spring ${d.getFullYear()}`;
  if (m === 4) return d.getDate() <= 5 ? `Spring ${d.getFullYear()}` : `Summer ${d.getFullYear()}`;
  return `Summer ${d.getFullYear()}`;
}
function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BookkeepingPage() {
  const [loading, setLoading] = useState(true);
  const [stripeReady, setStripeReady] = useState(false);
  const [invoices, setInvoices] = useState<PaidInvoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceLite[]>([]);

  // Filters for ledger
  const [studentFilter, setStudentFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("12"); // months or "all" or "ty"

  async function loadAll() {
    setLoading(true);
    const { data: settings } = await supabase
      .from("business_settings")
      .select("stripe_charges_enabled, stripe_account_id")
      .maybeSingle();
    const ready = Boolean(settings?.stripe_charges_enabled && settings?.stripe_account_id);
    setStripeReady(ready);

    if (ready) {
      const [invRes, expRes, stuRes, allInvRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, client_name, student_id, total, paid_at, invoice_date, stripe_session_id")
          .eq("status", "paid")
          .not("stripe_session_id", "is", null)
          .order("paid_at", { ascending: false }),
        supabase
          .from("expenses")
          .select("id, expense_date, amount, category, note, student_id, invoice_id")
          .order("expense_date", { ascending: false }),
        supabase.from("students").select("id, full_name").order("full_name"),
        supabase.from("invoices").select("id, invoice_number").order("invoice_date", { ascending: false }),
      ]);
      setInvoices((invRes.data ?? []) as PaidInvoice[]);
      setExpenses((expRes.data ?? []).map((e) => ({ ...e, amount: Number(e.amount) })) as Expense[]);
      setStudents((stuRes.data ?? []) as Student[]);
      setAllInvoices((allInvRes.data ?? []) as InvoiceLite[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (studentFilter !== "all") list = list.filter((i) => i.student_id === studentFilter);
    if (rangeFilter === "ty") {
      const now = new Date();
      const startYear = ukTaxYearStart(now);
      const { from, to } = ukTaxYearRange(startYear);
      list = list.filter((i) => {
        const d = i.paid_at || i.invoice_date;
        return d >= from && d <= to;
      });
    } else if (rangeFilter !== "all") {
      const months = Number(rangeFilter);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      list = list.filter((i) => new Date(i.paid_at || i.invoice_date) >= cutoff);
    }
    return list;
  }, [invoices, studentFilter, rangeFilter]);

  const totalIncome = useMemo(
    () => filteredInvoices.reduce((s, i) => s + Number(i.total), 0),
    [filteredInvoices],
  );
  const totalExpensesAll = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );
  const incomeAllTime = useMemo(
    () => invoices.reduce((s, i) => s + Number(i.total), 0),
    [invoices],
  );

  // Ledger groupings
  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of filteredInvoices) {
      const d = new Date(i.paid_at || i.invoice_date);
      const k = ymKey(d);
      m.set(k, (m.get(k) || 0) + Number(i.total));
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filteredInvoices]);

  const byStudent = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of filteredInvoices) {
      m.set(i.client_name, (m.get(i.client_name) || 0) + Number(i.total));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredInvoices]);

  const byTerm = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of filteredInvoices) {
      const d = new Date(i.paid_at || i.invoice_date);
      const k = ukTerm(d);
      m.set(k, (m.get(k) || 0) + Number(i.total));
    }
    return Array.from(m.entries());
  }, [filteredInvoices]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading bookkeeping…</div>;
  }

  if (!stripeReady) {
    return (
      <div className="p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Bookkeeping is a platform-payments feature</CardTitle>
            </div>
            <CardDescription>
              The income ledger, expense tracker, and tax year export are available once you
              accept card payments through LessonPaid's Stripe Connect integration. Only invoices
              paid through the platform are auto-logged, so your books stay accurate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Every platform-paid invoice appears automatically in your income ledger</li>
              <li>Log expenses (materials, mileage, textbooks…) against students or invoices</li>
              <li>One-click UK tax year (6 Apr–5 Apr) summary as PDF or CSV</li>
            </ul>
            <Button asChild>
              <Link to="/settings">Connect Stripe to unlock</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookkeeping</h1>
        <p className="text-sm text-muted-foreground">
          Automatic ledger of platform payments, expense tracking, and UK tax year summary.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Platform income (filtered)" value={fmtMoney(totalIncome)} />
        <StatCard label="Expenses logged (all time)" value={fmtMoney(totalExpensesAll)} />
        <StatCard
          label="Net (income − expenses)"
          value={fmtMoney(totalIncome - totalExpensesAll)}
          emphasis
        />
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ledger">Income ledger</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="pnl">P&amp;L summary</TabsTrigger>
          <TabsTrigger value="tax">Tax year export</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="min-w-[180px]">
              <Label className="text-xs">Student</Label>
              <Select value={studentFilter} onValueChange={setStudentFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[180px]">
              <Label className="text-xs">Range</Label>
              <Select value={rangeFilter} onValueChange={setRangeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last month</SelectItem>
                  <SelectItem value="3">Last 3 months</SelectItem>
                  <SelectItem value="6">Last 6 months</SelectItem>
                  <SelectItem value="12">Last 12 months</SelectItem>
                  <SelectItem value="ty">Current tax year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto self-end">
              <Button variant="outline" size="sm" onClick={() => exportLedgerCsv(filteredInvoices)}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Platform-paid invoices</CardTitle>
              <CardDescription>
                Only invoices paid through Stripe on LessonPaid are auto-logged here.
                Off-platform payments are not included.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No platform payments in this range yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paid</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((i) => {
                      const d = new Date(i.paid_at || i.invoice_date);
                      return (
                        <TableRow key={i.id}>
                          <TableCell>{fmtDate(i.paid_at || i.invoice_date)}</TableCell>
                          <TableCell>
                            <Link to="/invoices/$id" params={{ id: i.id }} className="underline">
                              {i.invoice_number}
                            </Link>
                          </TableCell>
                          <TableCell>{i.client_name}</TableCell>
                          <TableCell className="text-muted-foreground">{ukTerm(d)}</TableCell>
                          <TableCell className="text-right font-medium">{fmtMoney(Number(i.total))}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold">{fmtMoney(totalIncome)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <BreakdownCard title="By month" rows={byMonth.map(([k, v]) => [ymLabel(k), v])} />
            <BreakdownCard title="By student" rows={byStudent} />
          </div>
          <BreakdownCard title="By term" rows={byTerm} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTab
            expenses={expenses}
            students={students}
            invoices={allInvoices}
            onChange={loadAll}
          />
        </TabsContent>

        <TabsContent value="pnl">
          <PnlTab income={incomeAllTime} expenses={expenses} invoices={invoices} />
        </TabsContent>

        <TabsContent value="tax">
          <TaxYearTab invoices={invoices} expenses={expenses} students={students} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold mt-1 ${emphasis ? "text-primary" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: [string, number][] }) {
  const total = rows.reduce((s, [, v]) => s + v, 0);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data.</p>
        ) : (
          <Table>
            <TableBody>
              {rows.map(([label, v]) => (
                <TableRow key={label}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right">{fmtMoney(v)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell className="text-right font-semibold">{fmtMoney(total)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------------- Expenses ---------------- */

function ExpensesTab({
  expenses,
  students,
  invoices,
  onChange,
}: {
  expenses: Expense[];
  students: Student[];
  invoices: InvoiceLite[];
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    expense_date: new Date().toISOString().slice(0, 10),
    amount: "",
    category: "Materials",
    note: "",
    student_id: "none",
    invoice_id: "none",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      toast.error("Enter an amount greater than zero");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData.user?.id;
    if (!user_id) {
      setSaving(false);
      toast.error("Not signed in");
      return;
    }
    const { error } = await supabase.from("expenses").insert({
      user_id,
      expense_date: form.expense_date,
      amount: amt,
      category: form.category,
      note: form.note.trim() || null,
      student_id: form.student_id === "none" ? null : form.student_id,
      invoice_id: form.invoice_id === "none" ? null : form.invoice_id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Expense logged");
    setForm({ ...form, amount: "", note: "" });
    onChange();
  }

  async function del(id: string) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChange();
  }

  const invoiceMap = new Map(invoices.map((i) => [i.id, i.invoice_number]));
  const studentMap = new Map(students.map((s) => [s.id, s.full_name]));

  return (
    <div className="grid gap-4 md:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Log an expense</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.expense_date}
                  onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required />
              </div>
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" min="0" step="0.01" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </div>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Student (optional)</Label>
              <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Invoice (optional)</Label>
              <Select value={form.invoice_id} onValueChange={(v) => setForm({ ...form, invoice_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.invoice_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea rows={2} value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : "Add expense"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Expenses</CardTitle>
            <CardDescription>Deducted from income in your P&amp;L summary.</CardDescription>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => exportExpensesCsv(expenses, studentMap, invoiceMap)}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Linked</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{fmtDate(e.expense_date)}</TableCell>
                    <TableCell>{e.category}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {e.student_id ? studentMap.get(e.student_id) : ""}
                      {e.student_id && e.invoice_id ? " · " : ""}
                      {e.invoice_id ? invoiceMap.get(e.invoice_id) : ""}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[240px] truncate">{e.note}</TableCell>
                    <TableCell className="text-right">{fmtMoney(Number(e.amount))}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => del(e.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- P&L ---------------- */

function PnlTab({
  income,
  expenses,
  invoices,
}: {
  income: number;
  expenses: Expense[];
  invoices: PaidInvoice[];
}) {
  const expenseByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of expenses) m.set(e.category, (m.get(e.category) || 0) + Number(e.amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [expenses]);
  const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const net = income - totalExp;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Profit &amp; Loss (all time)</CardTitle>
          <CardDescription>Platform income minus logged expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell>Platform income ({invoices.length} paid invoices)</TableCell>
                <TableCell className="text-right">{fmtMoney(income)}</TableCell>
              </TableRow>
              {expenseByCat.map(([c, v]) => (
                <TableRow key={c}>
                  <TableCell className="text-muted-foreground">− {c}</TableCell>
                  <TableCell className="text-right text-muted-foreground">−{fmtMoney(v)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Net</TableCell>
                <TableCell className={`text-right font-semibold ${net >= 0 ? "text-primary" : "text-destructive"}`}>
                  {fmtMoney(net)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------------- Tax year export ---------------- */

function TaxYearTab({
  invoices,
  expenses,
  students,
}: {
  invoices: PaidInvoice[];
  expenses: Expense[];
  students: Student[];
}) {
  const currentStart = ukTaxYearStart(new Date());
  const years = [currentStart, currentStart - 1, currentStart - 2, currentStart - 3];
  const [year, setYear] = useState<number>(currentStart);
  const range = ukTaxYearRange(year);

  const yearInvoices = useMemo(
    () => invoices.filter((i) => {
      const d = i.paid_at || i.invoice_date;
      return d >= range.from && d <= range.to;
    }),
    [invoices, range.from, range.to],
  );
  const yearExpenses = useMemo(
    () => expenses.filter((e) => e.expense_date >= range.from && e.expense_date <= range.to),
    [expenses, range.from, range.to],
  );

  const income = yearInvoices.reduce((s, i) => s + Number(i.total), 0);
  const expTotal = yearExpenses.reduce((s, e) => s + Number(e.amount), 0);

  const byMonth = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of yearInvoices) {
      const d = new Date(i.paid_at || i.invoice_date);
      const k = ymKey(d);
      m.set(k, (m.get(k) || 0) + Number(i.total));
    }
    return Array.from(m.entries()).sort();
  }, [yearInvoices]);

  const byStudent = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of yearInvoices) {
      m.set(i.client_name, (m.get(i.client_name) || 0) + Number(i.total));
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [yearInvoices]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">UK tax year summary</CardTitle>
        <CardDescription>
          Summary for self-assessment purposes only — not formal tax advice. UK tax year runs 6 April to 5 April.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[180px]">
            <Label className="text-xs">Tax year</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{ukTaxYearRange(y).label} ({ukTaxYearRange(y).from} → {ukTaxYearRange(y).to})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm"
            onClick={() => exportTaxYearPdf(range, yearInvoices, yearExpenses, byMonth, byStudent)}>
            <FileText className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => exportTaxYearCsv(range, yearInvoices, byMonth, byStudent)}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={`Income ${range.label}`} value={fmtMoney(income)} />
          <StatCard label="Expenses" value={fmtMoney(expTotal)} />
          <StatCard label="Net" value={fmtMoney(income - expTotal)} emphasis />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <BreakdownCard title="By month" rows={byMonth.map(([k, v]) => [ymLabel(k), v])} />
          <BreakdownCard title="By student" rows={byStudent} />
        </div>
        <p className="text-xs text-muted-foreground">
          Includes only invoices paid through LessonPaid via Stripe. If you also receive
          off-platform payments, add those separately when preparing your return.
          {students.length === 0 && ""}
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------------- Exports ---------------- */

function exportLedgerCsv(rows: PaidInvoice[]) {
  const header = ["Paid date", "Invoice", "Student", "Term", "Amount (GBP)"];
  const lines = [header.join(",")];
  for (const i of rows) {
    const d = new Date(i.paid_at || i.invoice_date);
    lines.push([
      i.paid_at || i.invoice_date,
      i.invoice_number,
      i.client_name,
      ukTerm(d),
      Number(i.total).toFixed(2),
    ].map(csvEscape).join(","));
  }
  downloadFile(`lessonpaid-income-ledger-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"), "text/csv");
}

function exportExpensesCsv(
  rows: Expense[],
  studentMap: Map<string, string>,
  invoiceMap: Map<string, string>,
) {
  const header = ["Date", "Category", "Amount (GBP)", "Student", "Invoice", "Note"];
  const lines = [header.join(",")];
  for (const e of rows) {
    lines.push([
      e.expense_date,
      e.category,
      Number(e.amount).toFixed(2),
      e.student_id ? studentMap.get(e.student_id) || "" : "",
      e.invoice_id ? invoiceMap.get(e.invoice_id) || "" : "",
      e.note || "",
    ].map(csvEscape).join(","));
  }
  downloadFile(`lessonpaid-expenses-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"), "text/csv");
}

function exportTaxYearCsv(
  range: { from: string; to: string; label: string },
  invoices: PaidInvoice[],
  byMonth: [string, number][],
  byStudent: [string, number][],
) {
  const lines: string[] = [];
  lines.push(`UK tax year summary,${range.label} (${range.from} to ${range.to})`);
  lines.push("Note,Summary for self-assessment purposes only — not formal tax advice.");
  lines.push("");
  lines.push("By month");
  lines.push("Month,Income (GBP)");
  for (const [k, v] of byMonth) lines.push([ymLabel(k), v.toFixed(2)].map(csvEscape).join(","));
  lines.push("");
  lines.push("By student");
  lines.push("Student,Income (GBP)");
  for (const [s, v] of byStudent) lines.push([s, v.toFixed(2)].map(csvEscape).join(","));
  lines.push("");
  lines.push("Invoices");
  lines.push("Paid date,Invoice,Student,Amount (GBP)");
  for (const i of invoices) {
    lines.push([
      i.paid_at || i.invoice_date,
      i.invoice_number,
      i.client_name,
      Number(i.total).toFixed(2),
    ].map(csvEscape).join(","));
  }
  const total = invoices.reduce((s, i) => s + Number(i.total), 0);
  lines.push("");
  lines.push(["Total", "", "", total.toFixed(2)].join(","));
  downloadFile(`lessonpaid-tax-year-${range.label.replace("/", "-")}.csv`, lines.join("\n"), "text/csv");
}

function exportTaxYearPdf(
  range: { from: string; to: string; label: string },
  invoices: PaidInvoice[],
  expenses: Expense[],
  byMonth: [string, number][],
  byStudent: [string, number][],
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 40;
  let y = margin;
  doc.setFontSize(18);
  doc.text(`UK tax year summary — ${range.label}`, margin, y);
  y += 22;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Period: ${range.from} to ${range.to}`, margin, y);
  y += 14;
  doc.text("Summary for self-assessment purposes only — not formal tax advice.", margin, y);
  y += 6;
  doc.setTextColor(0);

  const income = invoices.reduce((s, i) => s + Number(i.total), 0);
  const expTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  autoTable(doc, {
    startY: y + 10,
    head: [["Totals", ""]],
    body: [
      ["Platform income", fmtMoney(income)],
      ["Expenses", fmtMoney(expTotal)],
      ["Net", fmtMoney(income - expTotal)],
    ],
    theme: "grid",
    styles: { fontSize: 10 },
  });

  autoTable(doc, {
    head: [["Month", "Income"]],
    body: byMonth.map(([k, v]) => [ymLabel(k), fmtMoney(v)]),
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [120, 100, 180] },
  });

  autoTable(doc, {
    head: [["Student", "Income"]],
    body: byStudent.map(([s, v]) => [s, fmtMoney(v)]),
    theme: "striped",
    styles: { fontSize: 10 },
    headStyles: { fillColor: [120, 100, 180] },
  });

  autoTable(doc, {
    head: [["Paid date", "Invoice", "Student", "Amount"]],
    body: invoices.map((i) => [
      fmtDate(i.paid_at || i.invoice_date),
      i.invoice_number,
      i.client_name,
      fmtMoney(Number(i.total)),
    ]),
    theme: "striped",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [120, 100, 180] },
  });

  if (expenses.length > 0) {
    autoTable(doc, {
      head: [["Date", "Category", "Note", "Amount"]],
      body: expenses.map((e) => [fmtDate(e.expense_date), e.category, e.note || "", fmtMoney(Number(e.amount))]),
      theme: "striped",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [120, 100, 180] },
    });
  }

  doc.save(`lessonpaid-tax-year-${range.label.replace("/", "-")}.pdf`);
}
