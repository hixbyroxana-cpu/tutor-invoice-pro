import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingShell } from "@/components/MarketingShell";
import {
  Users, Mic, FileText, PoundSterling, Clock, ShieldCheck,
  Calendar, Calculator, Download, Repeat, BarChart3, CheckCircle2, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/features")({
  component: FeaturesPage,
  head: () => ({
    meta: [
      { title: "Features — TutorBook" },
      { name: "description", content: "Student CRM, voice dictation, automatic totals, PDF export, earnings tracking and more — every feature designed for self-employed tutors." },
      { property: "og:title", content: "Features — TutorBook" },
      { property: "og:description", content: "Every feature designed for self-employed tutors." },
    ],
  }),
});

const features = [
  { icon: Users, title: "Student database", body: "Store each student's rate, default lesson length, and parent contact details — reuse them across every invoice." },
  { icon: Mic, title: "Voice dictation", body: 'Say "Invoice John Smith for May 6 and May 13" and TutorBook drafts it for you.' },
  { icon: Calendar, title: "Quick-create from dates", body: "Type a name and lesson dates — invoice lines are generated automatically." },
  { icon: Calculator, title: "Automatic totals", body: "Hourly rate × duration, recalculated live as you edit. No spreadsheets." },
  { icon: FileText, title: "Live PDF preview", body: "See exactly what your client will receive before you send it." },
  { icon: Download, title: "Branded PDF export", body: "Your business name, address and contact details on every invoice — with a Pay Now link for card payments." },
  { icon: Repeat, title: "Status tracking", body: "Mark invoices Draft, Sent, Paid or Overdue — and see what's outstanding at a glance." },
  { icon: BarChart3, title: "Earnings dashboard", body: "Monthly line chart, per-student breakdown, and filterable date ranges." },
  { icon: PoundSterling, title: "Multi-currency ready", body: "Set your symbol once — works for £, €, $ and beyond." },
  { icon: Clock, title: "Fast on mobile", body: "Log a lesson the moment it ends, from your phone." },
  { icon: ShieldCheck, title: "Private by default", body: "Each tutor only sees their own students, invoices and bank details." },
];

function FeaturesPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Features built around how tutors actually work</h1>
          <p className="text-muted-foreground mt-3">
            No accountant jargon. No clutter. Just the tools you need to invoice students and get paid faster.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-10">
          {features.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="border-border/60">
              <CardContent className="p-5">
                <div className="h-9 w-9 rounded-md bg-accent text-accent-foreground grid place-items-center mb-3">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-border bg-secondary/40 p-6 sm:p-8 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Try the invoice builder — no account needed</h2>
          <p className="text-sm text-muted-foreground mt-2">Create a free account before sending your first invoice.</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No credit card</li>
            <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Free forever</li>
          </ul>
          <div className="mt-5">
            <Link to="/try"><Button className="gap-2">Try it free <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
