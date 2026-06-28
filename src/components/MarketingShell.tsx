import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary text-primary-foreground grid place-items-center font-semibold">T</div>
            <span className="font-semibold tracking-tight">TutorBook</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <Link to="/features" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60">Features</Link>
            <Link to="/how-it-works" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60">How it works</Link>
            <Link to="/pricing" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60">Pricing</Link>
            <Link to="/try" className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/60">Try it free</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/try"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 mt-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid gap-6 sm:grid-cols-2 md:grid-cols-4 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground grid place-items-center text-xs font-semibold">T</div>
              <span className="font-semibold">TutorBook</span>
            </div>
            <p className="text-muted-foreground text-xs mt-2">The invoice app built for tutors.</p>
          </div>
          <FooterCol title="Product" items={[
            { label: "Features", to: "/features" },
            { label: "How it works", to: "/how-it-works" },
            { label: "Pricing", to: "/pricing" },
            { label: "Try free", to: "/try" },
          ]} />
          <FooterCol title="Account" items={[
            { label: "Sign in", to: "/login" },
            { label: "Create account", to: "/login" },
          ]} />
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} TutorBook.
            <br />Made for tutors.
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i.label}>
            <Link to={i.to} className="text-foreground/80 hover:text-foreground text-sm">{i.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
