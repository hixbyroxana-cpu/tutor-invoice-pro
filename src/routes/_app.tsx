import { Link, Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Users, FilePlus, Receipt, Settings, LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const navItems = [
  { to: "/dashboard" as const, label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/students" as const, label: "Students", icon: Users, exact: false },
  { to: "/invoices/new" as const, label: "New Invoice", icon: FilePlus, exact: false },
  { to: "/invoices" as const, label: "Invoices", icon: Receipt, exact: true },
  { to: "/settings" as const, label: "Settings", icon: Settings, exact: false },
];

function AppLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setStatus(session ? "in" : "out");
      setEmail(session?.user.email ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setStatus(data.session ? "in" : "out");
      setEmail(data.session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (status === "out") navigate({ to: "/login" as string });
  }, [status, navigate]);

  if (status !== "in") {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="md:w-60 md:shrink-0 border-b md:border-b-0 md:border-r bg-sidebar text-sidebar-foreground flex flex-col">
          <div className="px-5 py-5 border-b border-sidebar-border">
            <h1 className="text-lg font-semibold tracking-tight">TutorBook</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Invoices made simple</p>
          </div>
          <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.exact }}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors whitespace-nowrap data-[status=active]:bg-sidebar-primary data-[status=active]:text-sidebar-primary-foreground"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:block border-t border-sidebar-border p-3 space-y-2">
            {email && <p className="text-xs text-muted-foreground truncate">{email}</p>}
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />Sign out
            </Button>
          </div>
        </aside>
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
            <Outlet />
          </div>
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
