import { Brain, ShieldCheck, Scale, FileSearch } from "lucide-react";

const FEATURES = [
  {
    icon: Brain,
    title: "Multi-agent pipeline",
    desc: "Four specialized agents: extract requirements, find evidence, score deterministically, generate explanation. Not one black-box prompt.",
  },
  {
    icon: FileSearch,
    title: "Source-cited evidence",
    desc: "Every claim links back to a direct excerpt from the resume. If we can't cite it, we don't score it.",
  },
  {
    icon: Scale,
    title: "Deterministic scoring",
    desc: "Weighted math, not LLM guesswork. Must-haves gate the score. Reproducible across runs — auditable for compliance.",
  },
  {
    icon: ShieldCheck,
    title: "Bias-mitigated by design",
    desc: "Names, gender-coded pronouns, and university prestige stripped before scoring unless explicitly required by the role.",
  },
];

export function Features() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6">
      {/* ambient stars behind grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-50">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-primary/40 animate-pulse-glow"
            style={{
              top: `${(i * 89) % 100}%`,
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i % 5) * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <p className="text-xs uppercase tracking-widest text-ai-accent font-mono">Built for trust</p>
        <h2 className="mt-3 text-balance text-4xl font-bold tracking-tighter sm:text-5xl">
          Not just <span className="line-through text-muted-foreground/70">faster</span>.{" "}
          <span className="text-brand-gradient">Defensible.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Existing AI matchers give you a score. RecruitIQ gives you a decision you can screenshot into a Slack thread and defend to a hiring manager, a candidate, or a regulator.
        </p>
      </div>

      <div className="relative mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-xl border border-hairline bg-surface-1/70 p-6 backdrop-blur transition-all hover:border-primary/40 hover:-translate-y-0.5"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: "radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), oklch(0.7 0.22 295 / 0.15), transparent 60%)",
              }}
            />
            <div className="relative">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-md bg-brand-gradient/20 border border-primary/30">
                <f.icon className="h-5 w-5 text-brand" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
