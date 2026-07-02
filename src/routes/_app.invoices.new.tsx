import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { createInvoice, type LessonInput } from "@/lib/invoiceService";


export const Route = createFileRoute("/_app/invoices/new")({
  component: NewInvoicePage,
});

type Student = {
  id: string;
  full_name: string;
  hourly_fee: number;
  default_duration: number;
};

function todayISO() { return new Date().toISOString().slice(0, 10); }

function NewInvoicePage() {
  const navigate = useNavigate();
  const { data: students = [] } = useQuery({
    queryKey: ["students-active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("id, full_name, hourly_fee, default_duration").eq("archived", false).order("full_name");
      if (error) throw error;
      return data as Student[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
        <p className="text-sm text-muted-foreground mt-1">Build your invoice manually. Pick a student and add each lesson date.</p>
      </div>

      {students.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Add a student first. <Link to="/students" className="underline">Go to Students</Link>.
        </CardContent></Card>
      ) : (
        <ManualForm students={students} onCreated={(id) => navigate({ to: "/invoices/$id", params: { id } })} />
      )}
    </div>
  );
}


function ManualForm({ students, onCreated }: { students: Student[]; onCreated: (id: string) => void }) {
  const [studentId, setStudentId] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDays, setDueDays] = useState<string>("14");
  const student = students.find(s => s.id === studentId);
  const [lessons, setLessons] = useState<LessonInput[]>([]);

  function addLesson() {
    if (!student) return toast.error("Select a student first");
    setLessons([...lessons, {
      lesson_date: todayISO(),
      duration: Number(student.default_duration),
      hourly_rate: Number(student.hourly_fee),
      description: "Tutoring lesson",
    }]);
  }

  function update(i: number, patch: Partial<LessonInput>) {
    setLessons(lessons.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }
  function remove(i: number) { setLessons(lessons.filter((_, idx) => idx !== i)); }

  const total = lessons.reduce((s, l) => s + Number(l.duration) * Number(l.hourly_rate), 0);

  const create = useMutation({
    mutationFn: async () => {
      if (!studentId) throw new Error("Select a student");
      if (lessons.length === 0) throw new Error("Add at least one lesson");
      const inv = await createInvoice({
        studentId,
        lessons,
        notes,
        paymentDeadlineDays: dueDays ? Number(dueDays) : null,
      });
      return inv.id as string;
    },
    onSuccess: (id) => { toast.success("Invoice created"); onCreated(id); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="grid gap-4 pt-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Student *</Label>
            <Select value={studentId} onValueChange={(v) => { setStudentId(v); setLessons([]); }}>
              <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
              <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Payment deadline (days from today)</Label>
            <Input type="number" value={dueDays} onChange={(e) => setDueDays(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Lessons</Label>
            <Button type="button" size="sm" variant="outline" onClick={addLesson}><Plus className="h-3.5 w-3.5 mr-1" />Add lesson</Button>
          </div>
          {lessons.length === 0 && <p className="text-xs text-muted-foreground">Click "Add lesson" to add lesson dates.</p>}
          {lessons.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-md border bg-card">
              <div className="col-span-12 sm:col-span-3">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={l.lesson_date} onChange={(e) => update(i, { lesson_date: e.target.value })} />
              </div>
              <div className="col-span-6 sm:col-span-4">
                <Label className="text-xs">Description</Label>
                <Input value={l.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Label className="text-xs">Hours</Label>
                <Input type="number" step="0.25" value={l.duration} onChange={(e) => update(i, { duration: Number(e.target.value) })} />
              </div>
              <div className="col-span-3 sm:col-span-2">
                <Label className="text-xs">Rate</Label>
                <Input type="number" step="0.01" value={l.hourly_rate} onChange={(e) => update(i, { hourly_rate: Number(e.target.value) })} />
              </div>
              <div className="col-span-12 sm:col-span-1 flex justify-end">
                <Button size="icon" variant="ghost" onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Invoice notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground tabular-nums">{fmtMoney(total)}</span></div>
          <Button onClick={() => create.mutate()} disabled={create.isPending}>Create invoice</Button>
        </div>
      </CardContent>
    </Card>
  );
}


