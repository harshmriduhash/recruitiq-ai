import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROTATING = [
  "staffing firms",
  "in-house TA teams",
  "RPOs",
  "hiring managers",
];

export function Hero() {
  const [idx, setIdx] = useState(0);
  const [assembled, setAssembled] = useState(false);
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setAssembled(true), 100);
    const iv = setInterval(() => setIdx((v) => (v + 1) % ROTATING.length), 2600);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
    };
  }, []);

  useEffect(() => {
    const el = spotlightRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--x", `${e.clientX - rect.left}px`);
      el.style.setProperty("--y", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const headline = "Every AI match score. Fully explained.";
  const words = headline.split(" ");

  return (
    <section
      ref={spotlightRef}
      className="relative isolate overflow-hidden pt-32 pb-20 sm:pt-40 grid-pattern"
      style={{
        // Spotlight follows cursor
        backgroundImage:
          "radial-gradient(500px circle at var(--x, 50%) var(--y, 30%), oklch(0.7 0.22 295 / 0.15), transparent 60%)",
      }}
    >
      {/* background lines */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            style={{ top: `${10 + i * 12}%`, transform: `translateX(${-20 + i * 5}%)` }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-1/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur animate-fade-up">
          <ShieldCheck className="h-3.5 w-3.5 text-ai-accent" />
          <span>Auditable · Explainable · Bias-mitigated</span>
        </div>

        <h1 className="mt-6 text-balance text-5xl font-bold leading-[1.05] tracking-tighter sm:text-6xl md:text-7xl">
          {words.map((w, i) => (
            <span
              key={i}
              className={`inline-block transition-all duration-700 ${
                assembled ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              } ${w === "explained." ? "text-brand-gradient" : ""}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              {w}&nbsp;
            </span>
          ))}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "600ms" }}>
          The first AI recruiting-match tool that shows its work — for{" "}
          <span key={idx} className="inline-block text-foreground animate-fade-up">{ROTATING[idx]}</span>
          . Every score comes with per-requirement evidence a hiring manager can defend in seconds.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row animate-fade-up" style={{ animationDelay: "800ms" }}>
          <Button asChild size="lg" className="group relative overflow-hidden bg-brand-gradient text-primary-foreground glow-brand hover:opacity-95">
            <Link to="/auth" search={{ mode: "signup" }}>
              <span className="relative z-10 flex items-center">
                Start free — no credit card
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="border border-hairline bg-surface-1/60 backdrop-blur">
            <Link to="/how-it-works">
              <Play className="mr-2 h-4 w-4" /> See how it works
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Trusted by staffing firms, in-house TA teams, and RPOs who screen 200+ resumes/week.
        </p>

        {/* Score demo card */}
        <div className="mx-auto mt-16 max-w-4xl animate-fade-up" style={{ animationDelay: "1000ms" }}>
          <ScoreDemoCard />
        </div>
      </div>
    </section>
  );
}

function ScoreDemoCard() {
  const [score, setScore] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const target = 87;
    const dur = 1400;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / dur, 1);
      setScore(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    const timer = setTimeout(() => (raf = requestAnimationFrame(step)), 800);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="relative surface-elevated p-1">
      <div className="rounded-[calc(var(--radius-lg)-2px)] bg-background/60 p-6 backdrop-blur">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div className="text-left">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Match evaluation</div>
            <div className="mt-1 font-semibold">Priya S. → Senior React Engineer</div>
          </div>
          <div className="text-right">
            <div className="font-mono text-5xl font-bold text-brand-gradient tabular-nums">{score}</div>
            <div className="text-xs text-muted-foreground">of 100 · high confidence</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-left sm:grid-cols-3">
          {[
            { label: "5+ yrs React", state: "match", detail: "6 yrs @ Acme, Stripe" },
            { label: "TypeScript", state: "match", detail: "3 yrs stated" },
            { label: "GraphQL", state: "partial", detail: "REST only — inferable" },
          ].map((r) => (
            <div key={r.label} className="rounded-md border border-hairline bg-surface-1/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{r.label}</span>
                <StatePill state={r.state} />
              </div>
              <div className="mt-1.5 text-xs text-foreground">{r.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-left text-sm text-foreground">
          <span className="font-medium text-brand-gradient">Summary:</span>{" "}
          Strong React/TS experience with senior tenure. GraphQL gap is minor — REST expertise transfers cleanly.
          Recommend advancing to technical interview.
        </div>
      </div>
    </div>
  );
}

function StatePill({ state }: { state: string }) {
  const map: Record<string, { color: string; label: string }> = {
    match: { color: "bg-confidence-high/20 text-confidence-high border-confidence-high/30", label: "Match" },
    partial: { color: "bg-confidence-medium/20 text-confidence-medium border-confidence-medium/30", label: "Partial" },
    miss: { color: "bg-confidence-low/20 text-confidence-low border-confidence-low/30", label: "Miss" },
  };
  const s = map[state] ?? map.match;
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase ${s.color}`}>
      {s.label}
    </span>
  );
}
