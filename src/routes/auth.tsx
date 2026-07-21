import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).default("signin").catch("signin"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — RecruitIQ" },
      { name: "description", content: "Sign in to RecruitIQ or create your free account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email" }).max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  fullName: z.string().trim().min(1, "Required").max(100),
});
const signinSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email" }).max(255),
  password: z.string().min(1, "Required").max(72),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => setMode(search.mode), [search.mode]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (mode === "signup") {
        const input = signupSchema.parse({
          email: fd.get("email"),
          password: fd.get("password"),
          fullName: fd.get("fullName"),
        });
        const { error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: input.fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created", { description: "You're signed in." });
        navigate({ to: "/" });
      } else {
        const input = signinSchema.parse({ email: fd.get("email"), password: fd.get("password") });
        const { error } = await supabase.auth.signInWithPassword(input);
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      }
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 self-center font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient glow-brand">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span>Recruit<span className="text-brand-gradient">IQ</span></span>
        </Link>

        <div className="surface-elevated p-8">
          <h1 className="text-2xl font-bold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Free forever for solo recruiters. No credit card." : "Sign in to continue."}
          </p>

          <Button
            type="button"
            onClick={onGoogle}
            disabled={googleLoading}
            className="mt-6 w-full border border-hairline bg-surface-1 text-foreground hover:bg-surface-2"
            variant="ghost"
          >
            {googleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-4 w-4" />
            )}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-hairline" />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">or</span>
            <div className="h-px flex-1 bg-hairline" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="fullName">Your name</Label>
                <Input id="fullName" name="fullName" required maxLength={100} autoComplete="name" placeholder="Priya Sharma" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Work email</Label>
              <Input id="email" name="email" type="email" required maxLength={255} autoComplete="email" placeholder="you@company.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={mode === "signup" ? 8 : 1}
                maxLength={72}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              {mode === "signup" && (
                <p className="mt-1 text-[10px] text-muted-foreground">At least 8 characters. Longer is better.</p>
              )}
            </div>

            {mode === "signin" && (
              <div className="text-right text-xs">
                <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">
                  Forgot password?
                </Link>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-brand-gradient text-primary-foreground glow-brand">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("signin")} className="text-foreground underline underline-offset-2">
                  Sign in
                </button>
              </>
            ) : (
              <>
                New here?{" "}
                <button onClick={() => setMode("signup")} className="text-foreground underline underline-offset-2">
                  Create an account
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/security" className="underline underline-offset-2">Terms</Link> and{" "}
          <Link to="/security" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.75-6-6.15S8.7 5.9 12 5.9c1.9 0 3.15.8 3.87 1.5l2.65-2.55C16.8 3.35 14.6 2.35 12 2.35 6.75 2.35 2.55 6.55 2.55 12s4.2 9.65 9.45 9.65c5.45 0 9.05-3.8 9.05-9.15 0-.62-.07-1.1-.15-1.55L12 10.2z"/>
    </svg>
  );
}
