import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Users, FileText, PoundSterling, Clock, Mail,
  CheckCircle2, ArrowRight,
} from "lucide-react";

import { MarketingShell } from "@/components/MarketingShell";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "LessonPaid — Free invoice app for tutors" },
      { name: "description", content: "LessonPaid is the free invoice app for tutors. Manage students, log lessons, and send professional PDF invoices in seconds. 100% free — no subscriptions." },
      { property: "og:title", content: "LessonPaid — Free invoice app for tutors" },
      { property: "og:description", content: "The free invoice app for tutors. Manage students, track earnings and send beautiful invoices. No subscriptions, ever." },
    ],
  }),
});

function Landing() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(60% 50% at 20% 0%, color-mix(in oklab, var(--primary) 18%, transparent), transparent 60%), radial-gradient(50% 40% at 90% 10%, color-mix(in oklab, var(--accent) 35%, transparent), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              100% free for tutors — no subscriptions
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Stop chasing payments.<br />
              <span className="text-primary">Start getting paid.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              Manage students, log lessons in seconds, and send clean PDF invoices.
            </p>
            <p className="mt-3 text-xl font-medium text-foreground max-w-2xl">
              So parents actually pay on time.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/try">
                <Button size="lg" className="gap-2">
                  Try it free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/how-it-works">
                <Button size="lg" variant="outline">See how it works</Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Free to sign up. Free to send invoices. No card required.</p>
            <p className="mt-3 text-xs text-muted-foreground max-w-xl">
              Create a free account before sending your first invoice. Once signed up, your tutor and student details are saved — so every invoice after that is just the hourly rate and the tutoring dates.
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No subscription</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Unlimited invoices</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Ready in 60 seconds</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-16">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Everything you need, nothing you don't</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Most tutors spend hours every month on invoices and chasing payments. LessonPaid fixes that in 60 seconds.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, title: "Student records", body: "Keep names, rates, and parent contacts organised in one place — no spreadsheets needed." },
            { icon: Mic, title: "Voice dictation", body: "Just say \"I taught Emily on Monday and Wednesday, one hour each at £45\" — LessonPaid logs it and builds the invoice automatically." },
            { icon: FileText, title: "Polished PDFs", body: "Branded, itemised invoices your clients can pay without friction." },
            { icon: PoundSterling, title: "Earnings tracker", body: "See monthly income per student with a clean line chart." },
            { icon: Clock, title: "Built for speed", body: "From lesson to sent invoice in under a minute. Really." },
            { icon: Mail, title: "Send by email", body: "Email a professional PDF invoice directly to parents from inside LessonPaid — no downloading and attaching needed." },
          ].map(({ icon: Icon, title, body }) => (
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
        <div className="mt-6">
          <Link to="/features" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            See all features <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/40 border-y border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">From lesson to paid in three steps</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: "1", title: "Add your students", body: "Save names, rates, and parent contact details once." },
              { n: "2", title: "Log lessons", body: "Type or dictate dates — totals calculate automatically." },
              { n: "3", title: "Send the PDF", body: "Email a clean branded invoice and track when it's paid." },
            ].map((s) => (
              <div key={s.n} className="rounded-xl border border-border bg-card p-5">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-semibold text-sm">{s.n}</div>
                <h3 className="font-semibold mt-3">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/how-it-works" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Walk through it in detail <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonial */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-secondary/60 to-card p-8 sm:p-10">
          <blockquote className="text-xl sm:text-2xl font-medium text-foreground leading-relaxed max-w-3xl">
            "I used to spend Sunday evenings doing invoices. Now it takes me two minutes."
          </blockquote>
          <div className="mt-4 text-sm text-muted-foreground">
            — Roxana S., maths tutor, London
          </div>
        </div>
      </section>

      {/* Free forever */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Free for tutors. Forever.</h2>
            <p className="text-muted-foreground mt-2">
              No subscriptions, no per-invoice fees, no hidden charges. LessonPaid stays
              free because we take a small 1% platform fee only when parents choose to
              pay an invoice by card — handled automatically through Stripe.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Prefer bank transfer? That stays 100% free too.
            </p>
            <div className="mt-5">
              <Link to="/try"><Button className="gap-2">Get started free <ArrowRight className="h-4 w-4" /></Button></Link>
            </div>
          </div>
          <Card className="border-border/60">
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground">LessonPaid</div>
              <div className="mt-1 text-3xl font-semibold">£0<span className="text-base font-normal text-muted-foreground"> / forever</span></div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Unlimited students &amp; invoices</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Voice dictation &amp; quick-create</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Branded PDF export</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Earnings dashboard</li>
                <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> Card payments via Stripe (1% platform fee)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Offer */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary p-8 sm:p-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Free forever
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            Send unlimited invoices, free.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Sign up takes 30 seconds — no card, no trial, no subscription. Just a free invoice app made for tutors.
          </p>
          <div className="mt-6">
            <Link to="/try">
              <Button size="lg" className="gap-2">
                Try it free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
