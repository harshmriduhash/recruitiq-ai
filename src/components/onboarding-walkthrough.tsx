import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, X, Sparkles } from "lucide-react";

const KEY = "recruitiq.walkthrough.dismissed";

type Stats = { jobs?: number; candidates?: number; evaluations?: number } | undefined;

/** Post-onboarding guided walkthrough: shows the next best action until the first match lands. */
export function OnboardingWalkthrough({ stats, hasVoiceOrAts }: { stats: Stats; hasVoiceOrAts?: boolean }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1");
  }, []);

  const steps = [
    { label: "Create your first job requisition", done: (stats?.jobs ?? 0) > 0, to: "/app/jobs/new", cta: "Create job" },
    { label: "Upload a resume to score a candidate", done: (stats?.candidates ?? 0) > 0, to: "/app/jobs", cta: "Open a job" },
    { label: "Review your first evidence-backed match report", done: (stats?.evaluations ?? 0) > 0, to: "/app/candidates", cta: "View candidates" },
    { label: "Connect your ATS or run a voice pre-screen", done: !!hasVoiceOrAts, to: "/app/integrations", cta: "Open integrations" },
  ];

  const complete = steps.every((s) => s.done);
  if (dismissed || complete) return null;

  const next = steps.find((s) => !s.done)!;
  const doneCount = steps.filter((s) => s.done).length;

  function dismiss() {
    window.localStorage.setItem(KEY, "1");
    setDismissed(true);
  }

  return (
    <Card className="p-6 relative border-violet-500/30 bg-violet-500/[0.04]">
      <button
        onClick={dismiss}
        aria-label="Dismiss walkthrough"
        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-violet-300" />
        <h2 className="text-lg font-semibold">Get to your first match</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{doneCount} of {steps.length} steps complete</p>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden mb-5">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 motion-safe:transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ul className="space-y-2.5 mb-5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2 text-sm">
            {s.done ? (
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="size-4 text-muted-foreground shrink-0" />
            )}
            <span className={s.done ? "text-muted-foreground line-through" : "text-foreground/90"}>{s.label}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="bg-violet-500 hover:bg-violet-500/90 text-white">
          <Link to={next.to}>{next.cta}</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>Skip walkthrough</Button>
      </div>
    </Card>
  );
}
