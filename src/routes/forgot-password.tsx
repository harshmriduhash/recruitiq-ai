import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — RecruitIQ" },
      { name: "description", content: "Reset your RecruitIQ password. We'll email you a secure link." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgotPassword,
});

const schema = z.object({ email: z.string().trim().email().max(255) });

function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.currentTarget);
      const { email } = schema.parse({ email: fd.get("email") });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent", { description: "Check your inbox." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold">Reset password</h1>
          {sent ? (
            <p className="mt-4 text-sm text-muted-foreground">
              If an account exists for that email, we've sent a reset link. The link expires in 15 minutes.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-muted-foreground">Enter your email and we'll send you a secure reset link.</p>
              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-brand-gradient text-primary-foreground">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            </>
          )}
          <div className="mt-6 text-center text-sm">
            <Link to="/auth" className="text-muted-foreground hover:text-foreground">← Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
