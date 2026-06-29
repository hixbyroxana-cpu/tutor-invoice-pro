import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { createInvoice, type LessonInput } from "@/lib/invoiceService";
import { parseQuickInvoice } from "@/lib/parseQuickInvoice";


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
        <p className="text-sm text-muted-foreground mt-1">Generate an invoice in seconds. Your student details are saved, so just pick a student and the lesson dates.</p>
      </div>

      {students.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          Add a student first. <Link to="/students" className="underline">Go to Students</Link>.
        </CardContent></Card>
      ) : (
        <Tabs defaultValue="quick">
          <TabsList>
            <TabsTrigger value="quick"><Sparkles className="h-3.5 w-3.5 mr-1" />Quick create</TabsTrigger>
            <TabsTrigger value="manual">Manual entry</TabsTrigger>
          </TabsList>
          <TabsContent value="quick" className="mt-4">
            <QuickForm students={students} onCreated={(id) => navigate({ to: "/invoices/$id", params: { id } })} />
          </TabsContent>
          <TabsContent value="manual" className="mt-4">
            <ManualForm students={students} onCreated={(id) => navigate({ to: "/invoices/$id", params: { id } })} />
          </TabsContent>
        </Tabs>
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

function QuickForm({ students, onCreated }: { students: Student[]; onCreated: (id: string) => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<{ student: Student; dates: Date[] } | null>(null);
  const [error, setError] = useState("");

  function check() {
    setError("");
    setPreview(null);
    const parsed = parseQuickInvoice(text);
    if (!parsed) return setError("Couldn't parse — use format: \"Name: 6 May, 13 May, 20 May\"");
    const lower = parsed.name.toLowerCase();
    const student = students.find(s => s.full_name.toLowerCase() === lower)
      || students.find(s => s.full_name.toLowerCase().includes(lower));
    if (!student) return setError(`No student matching "${parsed.name}"`);
    setPreview({ student, dates: parsed.dates });
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!preview) throw new Error("Preview first");
      const lessons: LessonInput[] = preview.dates.map((d) => ({
        lesson_date: d.toISOString().slice(0, 10),
        duration: Number(preview.student.default_duration),
        hourly_rate: Number(preview.student.hourly_fee),
        description: "Tutoring lesson",
      }));
      const inv = await createInvoice({ studentId: preview.student.id, lessons, paymentDeadlineDays: 14 });
      return inv.id as string;
    },
    onSuccess: (id) => { toast.success("Invoice created"); onCreated(id); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick create</CardTitle>
        <p className="text-xs text-muted-foreground">Type one line: <code className="bg-muted px-1.5 py-0.5 rounded">John Smith: 6 May, 13 May, 20 May</code></p>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="John Smith: 6 May, 13 May, 20 May, 27 May" />
        {error && <p className="text-sm text-destructive">{error}</p>}
        {preview && (
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{preview.student.full_name}</span></div>
            <div><span className="text-muted-foreground">Lessons:</span> {preview.dates.length} × {Number(preview.student.default_duration)}h @ {fmtMoney(Number(preview.student.hourly_fee))}/h</div>
            <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{fmtMoney(preview.dates.length * Number(preview.student.default_duration) * Number(preview.student.hourly_fee))}</span></div>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={check}>Preview</Button>
          <Button onClick={() => create.mutate()} disabled={!preview || create.isPending}>Create invoice</Button>
        </div>
      </CardContent>
    </Card>
  );
}

type Parsed = {
  student: Student;
  lessons: { date: string; duration_hours?: number }[];
  notes?: string;
};

function DictateForm({ students, onCreated }: { students: Student[]; onCreated: (id: string) => void }) {
  const sr = useSpeechRecognition("en-GB");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  const liveText = (text + (sr.interim ? " " + sr.interim : "")).trim();

  function toggleMic() {
    if (sr.listening) { sr.stop(); return; }
    if (!sr.supported) { setError("Voice input isn't supported in this browser. Try Chrome or Safari, or use Quick create."); return; }
    setError(""); setParsed(null); setText("");
    sr.start();
  }

  // Sync finalized speech into our editable text buffer
  useEffect(() => {
    if (sr.transcript) setText(sr.transcript);
  }, [sr.transcript]);

  async function parseNow() {
    const transcript = liveText.trim();
    if (!transcript) { setError("Say something first — e.g. \"Invoice for John Smith for May 6, May 13 and May 20\"."); return; }
    setError(""); setParsing(true); setParsed(null);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error("Please sign in again before using dictation.");

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-dictation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          transcript,
          students: students.map(s => ({ full_name: s.full_name })),
          today: new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Parsing failed");
      const match = students.find(s => s.full_name === data.student_full_name);
      if (!match) throw new Error(`Couldn't match a student. Heard: "${transcript}"`);
      if (!Array.isArray(data.lessons) || data.lessons.length === 0) throw new Error("No lesson dates detected.");
      setParsed({ student: match, lessons: data.lessons, notes: data.notes });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parsing failed");
    } finally {
      setParsing(false);
    }
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("Parse first");
      const lessons: LessonInput[] = parsed.lessons.map(l => ({
        lesson_date: l.date,
        duration: Number(l.duration_hours ?? parsed.student.default_duration),
        hourly_rate: Number(parsed.student.hourly_fee),
        description: "Tutoring lesson",
      }));
      const inv = await createInvoice({
        studentId: parsed.student.id,
        lessons,
        notes: parsed.notes,
        paymentDeadlineDays: 14,
      });
      return inv.id as string;
    },
    onSuccess: (id) => { toast.success("Invoice created"); onCreated(id); },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewTotal = parsed
    ? parsed.lessons.reduce((s, l) => s + Number(l.duration_hours ?? parsed.student.default_duration) * Number(parsed.student.hourly_fee), 0)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dictate an invoice</CardTitle>
        <p className="text-xs text-muted-foreground">
          Tap the mic and say something like: <span className="italic">"Invoice for John Smith for May 6, May 13 and May 20."</span>
          You can mention duration too — e.g. <span className="italic">"a two hour lesson on May 27"</span>.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!sr.supported && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Voice input is not available in this browser. Open the live app in Chrome or Safari, or use Quick create.
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={sr.listening ? "destructive" : "default"}
            onClick={toggleMic}
            disabled={!sr.supported}
            className="gap-2"
          >
            {sr.listening ? <><MicOff className="h-4 w-4" />Stop</> : <><Mic className="h-4 w-4" />{liveText ? "Record again" : "Start dictation"}</>}
          </Button>
          {sr.listening && (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              Listening…
            </span>
          )}
        </div>

        <div className="grid gap-1.5">
          <Label className="text-xs">Transcript (you can edit before parsing)</Label>
          <Textarea
            rows={3}
            value={liveText}
            onChange={(e) => { setText(e.target.value); }}
            placeholder="Your spoken words will appear here…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {parsed && (
          <div className="rounded-md border p-3 text-sm space-y-2">
            <div><span className="text-muted-foreground">Student:</span> <span className="font-medium">{parsed.student.full_name}</span></div>
            <div className="text-muted-foreground">Lessons:</div>
            <ul className="text-xs space-y-1">
              {parsed.lessons.map((l, i) => (
                <li key={i} className="flex justify-between gap-3 border-b last:border-0 pb-1">
                  <span>{fmtDate(l.date)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(l.duration_hours ?? parsed.student.default_duration)}h × {fmtMoney(Number(parsed.student.hourly_fee))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between pt-1 border-t">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">{fmtMoney(previewTotal)}</span>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={parseNow} disabled={parsing || !liveText}>
            {parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Parsing</> : "Parse"}
          </Button>
          <Button onClick={() => create.mutate()} disabled={!parsed || create.isPending}>
            Create invoice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
