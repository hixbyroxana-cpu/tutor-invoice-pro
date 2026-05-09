import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Archive, ArchiveRestore, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/students")({
  component: StudentsPage,
});

type Student = {
  id: string;
  full_name: string;
  parent_name: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  hourly_fee: number;
  default_duration: number;
  notes: string | null;
  archived: boolean;
};

function StudentsPage() {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: students = [] } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").order("full_name");
      if (error) throw error;
      return data as Student[];
    },
  });

  const filtered = students.filter((s) => {
    if (!showArchived && s.archived) return false;
    if (showArchived && !s.archived) return false;
    if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleArchive = useMutation({
    mutationFn: async (s: Student) => {
      const { error } = await supabase.from("students").update({ archived: !s.archived }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("Updated"); },
  });

  const deleteStudent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["students"] }); toast.success("Deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your student database.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add student</Button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showArchived} onCheckedChange={setShowArchived} />
          Show archived
        </label>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground p-8 text-center">No students {showArchived ? "archived" : "yet"}.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {s.parent_name && <>Parent: {s.parent_name} · </>}
                      {s.email || s.phone || "No contact"}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {fmtMoney(Number(s.hourly_fee))}/h · {Number(s.default_duration)}h default
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(s); setOpen(true); }} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toggleArchive.mutate(s)} title={s.archived ? "Restore" : "Archive"}>
                      {s.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" title="Delete"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this student?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently deletes {s.full_name}. Past invoices will keep their snapshot details. Consider archiving instead.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteStudent.mutate(s.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StudentDialog open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}

function StudentDialog({ open, onOpenChange, editing }: { open: boolean; onOpenChange: (b: boolean) => void; editing: Student | null }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Student>>({});

  // reset form when dialog opens
  if (open && (form as { _id?: string })._id !== (editing?.id ?? "new")) {
    setForm({
      full_name: editing?.full_name ?? "",
      parent_name: editing?.parent_name ?? "",
      email: editing?.email ?? "",
      phone: editing?.phone ?? "",
      billing_address: editing?.billing_address ?? "",
      hourly_fee: editing?.hourly_fee ?? 30,
      default_duration: editing?.default_duration ?? 1,
      notes: editing?.notes ?? "",
      ...({ _id: editing?.id ?? "new" } as object),
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name?.trim() || "",
        parent_name: form.parent_name?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        billing_address: form.billing_address?.trim() || null,
        hourly_fee: Number(form.hourly_fee) || 0,
        default_duration: Number(form.default_duration) || 1,
        notes: form.notes?.trim() || null,
      };
      if (!payload.full_name) throw new Error("Name is required");
      if (editing) {
        const { error } = await supabase.from("students").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students"] });
      toast.success(editing ? "Student updated" : "Student added");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <Field label="Full name *">
            <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Parent / client name"><Input value={form.parent_name ?? ""} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Phone"><Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hourly fee"><Input type="number" step="0.01" value={form.hourly_fee ?? ""} onChange={(e) => setForm({ ...form, hourly_fee: Number(e.target.value) })} /></Field>
              <Field label="Default hrs"><Input type="number" step="0.25" value={form.default_duration ?? ""} onChange={(e) => setForm({ ...form, default_duration: Number(e.target.value) })} /></Field>
            </div>
          </div>
          <Field label="Billing address"><Textarea rows={2} value={form.billing_address ?? ""} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} /></Field>
          <Field label="Notes"><Textarea rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>{editing ? "Save" : "Add student"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
