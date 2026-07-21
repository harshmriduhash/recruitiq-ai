import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Menu, X, Sparkles } from "lucide-react";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all ${
        scrolled
          ? "border-b border-hairline bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="relative flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient glow-brand">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </span>
          <span className="text-lg">
            Recruit<span className="text-brand-gradient">IQ</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/how-it-works" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            How it works
          </Link>
          <Link to="/pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
          <Link to="/security" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Security
          </Link>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn === null ? null : signedIn ? (
            <Button asChild className="bg-brand-gradient text-primary-foreground hover:opacity-90">
              <Link to="/">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-foreground hover:bg-surface-2">
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild className="bg-brand-gradient text-primary-foreground hover:opacity-90 glow-brand">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-hairline"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-hairline bg-background/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4">
            <Link to="/how-it-works" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">How it works</Link>
            <Link to="/pricing" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">Pricing</Link>
            <Link to="/security" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">Security</Link>
            <Link to="/auth" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-surface-2">Sign in</Link>
            <Link to="/auth" search={{ mode: "signup" }} onClick={() => setOpen(false)} className="rounded-md bg-brand-gradient px-3 py-2 text-sm font-medium text-primary-foreground">Start free</Link>
          </div>
        </div>
      )}
    </header>
  );
}
