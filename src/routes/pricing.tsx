import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingShell } from "@/components/MarketingShell";
import { CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — TutorBook" },
      { name: "description", content: "Simple, tutor-friendly pricing. Start free with your first invoice on us. Upgrade to Pro for unlimited invoices, voice dictation and earnings analytics." },
      { property: "og:title", content: "Pricing — TutorBook" },
      { property: "og:description", content: "Free to start. Pro for serious tutors. No per-invoice fees." },
    ],
  }),
});

type Plan = {
  name: string;
  price: string;
  period: string;
  blurb: string;
  cta: string;
  to: string;
  features: string[];
  highlight?: boolean;
};

const plans: Plan[] = [
  {
    name: "Starter",
    price: "£0",
    period: "/forever",
    blurb: "Try TutorBook with no commitment.",
    cta: "Get started free",
    to: "/try",
    features: [
      "Your first invoice free",
      "PDF download",
      "Live invoice preview",
    ],
  },
  {
    name: "Pro",
    price: "£6",
    period: "/month",
    blurb: "Everything a working tutor needs.",
    cta: "Start free trial",
    to: "/login",
    highlight: true,
    features: [
      "Unlimited students & invoices",
      "Voice dictation",
      "Quick-create from dates",
      "Earnings dashboard & charts",
      "Status tracking (Sent / Paid / Overdue)",
      "Branded PDF with bank details",
    ],
  },
  {
    name: "Pro — Yearly",
    price: "£60",
    period: "/year",
    blurb: "Save £12 vs monthly. Everything in Pro.",
    cta: "Start free trial",
    to: "/login",
    features: [
      "Everything in Pro",
      "2 months free vs monthly billing",
      "Best value for full-time tutors",
    ],
  },
];


function PricingPage() {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" /> First invoice free
          </div>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">Simple pricing for tutors</h1>
          <p className="text-muted-foreground mt-3">
            Pay for the time it saves you, not per invoice. Cancel anytime.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 mt-10">
          {plans.map((p) => (
            <Card
              key={p.name}
              className={p.highlight ? "border-primary shadow-lg relative" : "border-border/60"}
            >
              {p.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground">{p.name}</div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{p.price}</span>
                  <span className="text-sm text-muted-foreground">{p.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{p.blurb}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Link to={p.to} className="block">
                    <Button className="w-full gap-2" variant={p.highlight ? "default" : "outline"}>
                      {p.cta} <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-14 max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <div className="mt-4 divide-y border rounded-xl">
            {[
              { q: "Do I need a credit card to start?", a: "No. The free Starter plan and the try-it-free builder need no card." },
              { q: "What happens after my first free invoice?", a: "You can keep using Starter for up to 3 students, or upgrade to Pro any time for unlimited invoices and voice dictation." },
              { q: "Can I cancel anytime?", a: "Yes. Cancel in one click from Settings — no questions, no fees." },
              { q: "Is my data private?", a: "Each tutor only sees their own students, invoices and bank details. Your data is encrypted and never sold." },
            ].map((f) => (
              <div key={f.q} className="p-4">
                <div className="font-medium">{f.q}</div>
                <p className="text-sm text-muted-foreground mt-1">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
