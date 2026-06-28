import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles, Users, FileText, PoundSterling, Clock, ShieldCheck,
  Mic, CheckCircle2, ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "TutorBook — Invoice app for tutors. First invoice free." },
      { name: "description", content: "TutorBook is the simple invoice app for tutors. Manage students, track earnings, and send professional PDF invoices in seconds. Sign up and create your first invoice free." },
      { property: "og:title", content: "TutorBook — Invoice app for tutors" },
      { property: "og:description", content: "The simple invoice app for tutors. Manage students, track earnings and send beautiful invoices. Your first invoice is on us." },

    ],
  }),
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">T</div>
            <span className="font-semibold tracking-tight">TutorBook</span>
          </div>
          <nav className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/login"><Button size="sm">Get started</Button></Link>
          </nav>
        </div>
      </header>

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
              First invoice on us — no card required
            </div>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              The invoice app<br />
              <span className="text-primary">built for tutors.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-2xl">
              Manage students, log lessons by voice, and send clean PDF invoices
              that parents actually pay on time.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/try">
                <Button size="lg" className="gap-2">
                  Create your free invoice <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">Sign in</Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">No signup needed to try — only when you download.</p>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> No credit card</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Cancel anytime</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-success" /> Ready in 60 seconds</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Users, title: "Student CRM", body: "Keep rates, contacts and notes for every student in one tidy place." },
            { icon: Mic, title: "Voice dictation", body: "Speak a lesson list and TutorBook drafts the invoice for you." },
            { icon: FileText, title: "Polished PDFs", body: "Branded, itemised invoices your clients can pay without friction." },
            { icon: PoundSterling, title: "Earnings tracker", body: "See monthly income per student with a clean line chart." },
            { icon: Clock, title: "Built for speed", body: "From lesson to sent invoice in under a minute. Really." },
            { icon: ShieldCheck, title: "Private by default", body: "Your data is yours. Encrypted, isolated, never sold." },
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
      </section>

      {/* Offer */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-secondary p-8 sm:p-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> Launch offer
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            Your first invoice is free.
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Sign up, add a student, and send your first professional invoice — completely free,
            no payment details required.
          </p>
          <div className="mt-6">
            <Link to="/try">
              <Button size="lg" className="gap-2">
                Claim my free invoice <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TutorBook. Made for tutors.</p>
          <Link to="/login" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
