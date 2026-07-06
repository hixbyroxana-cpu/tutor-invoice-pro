import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const go = () => {
      if (next) window.location.assign(next);
      else navigate({ to: "/dashboard" });
    };
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) go();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate, next]);


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "signup") {
        const emailRedirectTo = next
          ? `${window.location.origin}${next}`
          : `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo },
        });

        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>LessonPaid</CardTitle>
          <p className="text-sm text-muted-foreground">Sign in to manage your students and invoices.</p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <form onSubmit={submit} className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input type="email" value={email} required onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Password</Label>
                  <Input type="password" value={password} required minLength={6} onChange={(e) => setPassword(e.target.value)}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"} />
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Please wait…" : tab === "signup" ? "Create account" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            <Link to="/" className="underline">Back to home</Link>
          </p>
        </CardContent>
      </Card>
      <Toaster richColors position="top-right" />
    </div>
  );
}
