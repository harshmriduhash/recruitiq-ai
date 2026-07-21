import { FileText, Search, Calculator, MessageSquareText } from "lucide-react";

const STAGES = [
  {
    icon: FileText,
    name: "1. Extract",
    agent: "requirement_extractor",
    model: "gemini-3-flash",
    detail: "Parses the JD into structured must-haves, nice-to-haves, years of experience, and specific skills.",
  },
  {
    icon: Search,
    name: "2. Evidence",
    agent: "evidence_finder",
    model: "gemini-3.1-pro",
    detail: "Maps every requirement to direct excerpts from the resume. No excerpt → not counted. Zero hallucinated matches.",
  },
  {
    icon: Calculator,
    name: "3. Score",
    agent: "deterministic_scorer",
    model: "pure math",
    detail: "Weighted sum, must-haves gate the score. Runs identically every time — the LLM never invents the number.",
  },
  {
    icon: MessageSquareText,
    name: "4. Explain",
    agent: "summary_writer",
    model: "gemini-3-flash",
    detail: "Turns the structured breakdown into a plain-language summary a hiring manager reads in 15 seconds.",
  },
];

export function PipelineDiagram() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-ai-accent font-mono">The pipeline</p>
        <h2 className="mt-3 text-balance text-4xl font-bold tracking-tighter sm:text-5xl">
          How the score is built
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Four specialized agents, each with one job. Deterministic where correctness matters. Explainable at every step.
        </p>
      </div>

      <div className="relative mt-16">
        {/* connecting beam (desktop) */}
        <svg
          aria-hidden
          className="absolute left-0 right-0 top-1/2 hidden -translate-y-1/2 lg:block"
          height="60"
          viewBox="0 0 1200 60"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="beam" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="oklch(0.7 0.22 295)" stopOpacity="0" />
              <stop offset="50%" stopColor="oklch(0.82 0.14 210)" stopOpacity="1" />
              <stop offset="100%" stopColor="oklch(0.7 0.22 295)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 0 30 Q 300 10 600 30 T 1200 30"
            stroke="url(#beam)"
            strokeWidth="2"
            fill="none"
            strokeDasharray="6 6"
          />
        </svg>

        <div className="relative grid gap-6 lg:grid-cols-4">
          {STAGES.map((s, i) => (
            <div
              key={s.name}
              className="group relative rounded-xl border border-hairline bg-surface-1/70 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-ai-accent/40"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-ai-accent/30 bg-ai-accent/10">
                  <s.icon className="h-5 w-5 text-ai-accent" />
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">STAGE {i + 1}/4</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.name}</h3>
              <div className="mt-1 font-mono text-xs text-brand">{s.agent}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{s.model}</div>
              <p className="mt-3 text-sm text-muted-foreground">{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
