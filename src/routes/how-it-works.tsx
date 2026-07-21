import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PipelineDiagram } from "@/components/marketing/pipeline-diagram";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — RecruitIQ" },
      {
        name: "description",
        content: "Deep dive into the multi-agent AI pipeline behind every RecruitIQ score. Requirement extraction, evidence finding, deterministic scoring, and plain-language explanation — all auditable.",
      },
      { property: "og:title", content: "How the RecruitIQ score is built" },
      { property: "og:description", content: "Multi-agent pipeline: extract, evidence, score, explain. Every step auditable." },
    ],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="pt-32">
        <section className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <p className="text-xs uppercase tracking-widest text-ai-accent font-mono">How it works</p>
          <h1 className="mt-3 text-balance text-5xl font-bold tracking-tighter sm:text-6xl">
            Four agents. <span className="text-brand-gradient">One defensible score.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Most "AI recruiting" tools are one prompt with a temperature dial. RecruitIQ splits the job into four narrow agents so every step is verifiable — and the actual scoring is deterministic math, not LLM guesswork.
          </p>
        </section>

        <PipelineDiagram />

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          <div className="surface-elevated p-8">
            <h2 className="text-2xl font-bold">The three non-negotiable guardrails</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {[
                {
                  t: "No excerpt, no evidence",
                  d: "Agent 2 is required to output a direct source excerpt for every claim. We post-hoc verify the excerpt actually appears in the resume text. Fabricated evidence is impossible.",
                },
                {
                  t: "Bias mitigation at the source",
                  d: "Names, gender-coded pronouns, and university prestige are stripped from the evidence-extraction prompt unless the job explicitly and defensibly requires them.",
                },
                {
                  t: "Confidence, not false precision",
                  d: "Scores built on mostly-low-confidence evidence get flagged 'Limited evidence — review manually' rather than being presented as a hard number.",
                },
              ].map((g) => (
                <div key={g.t}>
                  <h3 className="font-semibold text-brand-gradient">{g.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{g.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-3xl font-bold">Ready to see it on a real resume?</h2>
          <p className="mt-3 text-muted-foreground">Sample data pre-loaded. Zero setup. Zero credit card.</p>
          <Button asChild size="lg" className="mt-8 bg-brand-gradient text-primary-foreground glow-brand">
            <Link to="/auth" search={{ mode: "signup" }}>
              Try it now <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
