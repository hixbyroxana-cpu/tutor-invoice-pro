import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { MarketingShell } from "@/components/MarketingShell";
import { UserPlus, ClipboardList, FileText, Send, CheckCircle2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorks,
  head: () => ({
    meta: [
      { title: "How it works — LessonPaid" },
      { name: "description", content: "See how LessonPaid turns lesson dates into professional PDF invoices in under a minute — add students, log lessons, send invoices, track payments." },
      { property: "og:title", content: "How LessonPaid works" },
      { property: "og:description", content: "Add students, log lessons, send invoices — in under a minute." },
    ],
  }),
});

const steps = [
  { icon: UserPlus, title: "1. Add your students", body: "Store each student's name, parent contact, hourly rate, and default lesson length once. You'll never type them again." },
  { icon: ClipboardList, title: "2. Log lessons", body: "Pick a student and tap the dates you taught. LessonPaid fills in description, hours, and rate automatically." },
  { icon: FileText, title: "3. Review the live preview", body: "Edit any line, add notes, and watch the total update in real time. What you see is what your client gets." },
  { icon: Send, title: "4. Send the PDF", body: "Download a branded PDF or email it straight from the invoice page. Mark it as Sent in one click." },
  { icon: CheckCircle2, title: "5. Track what's paid", body: "Update statuses to Paid or Overdue. Your dashboard always shows what's outstanding and what you've earned." },
];


function HowItWorks() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">How LessonPaid works</h1>
          <p className="text-muted-foreground mt-3">
            From your first student to your first paid invoice — here's exactly what using LessonPaid looks like.
          </p>
        </div>

        <ol className="mt-10 space-y-4">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="rounded-xl border border-border bg-card p-5 flex gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-xs text-muted-foreground max-w-2xl">
          Free to join and send invoices. A 1% platform fee applies only when parents pay by card through LessonPaid. Bank transfer invoices are always free.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link to="/try"><Button size="lg" className="gap-2">Get started free <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link to="/features"><Button size="lg" variant="outline">See features</Button></Link>
        </div>
      </section>
    </MarketingShell>
  );
}
