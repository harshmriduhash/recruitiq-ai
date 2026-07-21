import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/marketing/hero";
import { Features } from "@/components/marketing/features";
import { PipelineDiagram } from "@/components/marketing/pipeline-diagram";
import { PricingCards } from "@/components/marketing/pricing-cards";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Quote } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main>
        <Hero />

        {/* Trust strip */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-mono">
            Built for teams who screen 200+ resumes a week
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                q: "Finally, an AI score I can actually defend to my client without hand-waving.",
                a: "Priya S. · Staffing Firm Owner",
              },
              {
                q: "Our hiring managers stopped asking 'why is this person ranked here.' The answer is just… on the page.",
                a: "Marcus T. · TA Lead, Series B",
              },
              {
                q: "We replaced two hours of first-pass screening with a fifteen-second review of a defensible breakdown.",
                a: "Amanda K. · RPO Director",
              },
            ].map((t) => (
              <blockquote
                key={t.a}
                className="group relative rounded-xl border border-hairline bg-surface-1/70 p-6 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-primary/40"
              >
                <Quote className="h-5 w-5 text-brand/60" />
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.q}"</p>
                <footer className="mt-4 text-xs text-muted-foreground">{t.a}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <Features />
        <PipelineDiagram />

        {/* Pricing teaser */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-ai-accent font-mono">Pricing</p>
            <h2 className="mt-3 text-balance text-4xl font-bold tracking-tighter sm:text-5xl">
              Start free. Scale when your pipeline does.
            </h2>
          </div>
          <div className="mt-12">
            <PricingCards />
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <div className="surface-elevated relative overflow-hidden p-12">
            <div className="pointer-events-none absolute inset-0 grid-pattern opacity-40" />
            <div className="relative">
              <h2 className="text-balance text-4xl font-bold tracking-tighter sm:text-5xl">
                Stop rubber-stamping AI scores.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                See a full match breakdown on a real resume in under a minute. No credit card. No sales call.
              </p>
              <Button asChild size="lg" className="mt-8 bg-brand-gradient text-primary-foreground glow-brand hover:opacity-90">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start free <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
