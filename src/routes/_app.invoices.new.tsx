import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Mic, MicOff, Lock } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { createInvoice, type LessonInput } from "@/lib/invoiceService";
import { parseDictation } from "@/lib/parseDictation";


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
        <p className="text-sm text-muted-foreground mt-1">Build your invoice manually, or tap the microphone to dictate lessons.</p>
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


// Minimal Web Speech API typings (browser-only, feature-detected at runtime).
type SpeechRecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type SpeechRecognitionEvent = { resultIndex: number; results: ArrayLike<SpeechRecognitionResult> };
type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};


function ManualForm({ students, onCreated }: { students: Student[]; onCreated: (id: string) => void }) {
  const [studentId, setStudentId] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDays, setDueDays] = useState<string>("14");
  const student = students.find(s => s.id === studentId);
  const [lessons, setLessons] = useState<LessonInput[]>([]);

  // Voice dictation state
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [gateOpen, setGateOpen] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Stripe gate — dictation only available once Stripe is connected & ready.
  const { data: stripeReady } = useQuery({
    queryKey: ["stripe-ready-for-dictation"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_settings")
        .select("stripe_account_id, stripe_charges_enabled")
        .maybeSingle();
      return Boolean(data?.stripe_account_id && data?.stripe_charges_enabled);
    },
  });

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  function addLesson() {
    if (!student) return toast.error("Select a student first");
    setLessons(prev => [...prev, {
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

  function applyTranscript(text: string) {
    if (!text.trim()) return;
    const parsed = parseDictation(text);

    // Match student by name (case-insensitive, first/last word)
    let matchedStudent: Student | undefined;
    if (parsed.studentName) {
      const q = parsed.studentName.toLowerCase();
      matchedStudent = students.find(s => s.full_name.toLowerCase().includes(q))
        || students.find(s => s.full_name.toLowerCase().split(/\s+/).some(p => p === q));
    }
    const activeStudent = matchedStudent ?? student;
    if (matchedStudent) setStudentId(matchedStudent.id);

    if (!activeStudent) {
      toast.error("Say the student's name, or select one first.");
      return;
    }

    const rate = parsed.hourlyRate ?? Number(activeStudent.hourly_fee);
    const duration = parsed.duration ?? Number(activeStudent.default_duration);
    const dates = parsed.dates.length ? parsed.dates : [todayISO()];

    const newLessons: LessonInput[] = dates.map(date => ({
      lesson_date: date,
      duration,
      hourly_rate: rate,
      description: "Tutoring lesson",
    }));

    setLessons(prev => [...prev, ...newLessons]);
    toast.success(`Added ${newLessons.length} lesson${newLessons.length === 1 ? "" : "s"} from dictation`);
  }

  function toggleDictation() {
    if (!stripeReady) { setGateOpen(true); return; }

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance;
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice dictation isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.continuous = false;
    rec.interimResults = true;
    setTranscript("");

    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      toast.error(`Dictation error: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      if (finalText.trim()) applyTranscript(finalText.trim());
    };

    recognitionRef.current = rec;
    setListening(true);
    try { rec.start(); } catch { setListening(false); }
  }

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
    <>
      <Card>
        <CardContent className="grid gap-4 pt-6">
          {/* Voice dictation control */}
          <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3">
            <Button
              type="button"
              variant={listening ? "destructive" : "secondary"}
              size="sm"
              onClick={toggleDictation}
              aria-label={listening ? "Stop dictation" : "Start voice dictation"}
            >
              {stripeReady === false ? <Lock className="h-4 w-4 mr-2" /> :
                listening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
              {listening ? "Listening… tap to stop" : "Dictate lessons"}
            </Button>
            <p className="text-xs text-muted-foreground flex-1 min-w-[220px]">
              {listening
                ? (transcript || "Say something like: \"I taught Emily on Monday and Wednesday, one hour each at £45\"")
                : "Speak the student, days, duration and rate — we'll fill the fields for you."}
            </p>
          </div>

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
            {lessons.length === 0 && <p className="text-xs text-muted-foreground">Click "Add lesson" to add lesson dates, or tap the microphone to dictate.</p>}
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

      <Dialog open={gateOpen} onOpenChange={setGateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Stripe to use voice dictation</DialogTitle>
            <DialogDescription>
              Voice dictation is available for tutors who accept card payments through LessonPaid. Connect your Stripe account in Settings — it takes a couple of minutes — then come back to dictate lessons hands-free.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setGateOpen(false)}>Not now</Button>
            <Button asChild>
              <Link to="/settings">Go to Settings</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
