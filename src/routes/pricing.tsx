import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { PricingCards } from "@/components/marketing/pricing-cards";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — RecruitIQ" },
      {
        name: "description",
        content: "Simple, transparent pricing for RecruitIQ. Free tier for solo recruiters, $99 Starter for small teams, $299 Growth for scale, custom Scale plan for enterprise.",
      },
      { property: "og:title", content: "Pricing — RecruitIQ" },
      { property: "og:description", content: "Free to start. $99 Starter, $299 Growth, custom Scale for enterprise." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteNav />
      <main className="pt-32">
        <section className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-xs uppercase tracking-widest text-ai-accent font-mono">Pricing</p>
          <h1 className="mt-3 text-balance text-5xl font-bold tracking-tighter sm:text-6xl">
            Fair pricing. <span className="text-brand-gradient">Zero surprises.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Per-team pricing with a candidate-quota model — so you never pay for seats you don't use, and you never get a surprise bill from a hiring surge.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <PricingCards />
        </section>

        <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
          <h2 className="text-2xl font-bold">Frequently asked</h2>
          <div className="mt-6 space-y-4">
            {[
              { q: "What counts as a 'candidate'?", a: "One resume evaluated against one job requisition. Re-running the same resume against a new job counts separately." },
              { q: "Can I change plans mid-cycle?", a: "Yes — upgrades are prorated instantly, downgrades take effect at the next cycle." },
              { q: "What happens if I go over the quota?", a: "New pipeline runs pause with a clear warning; existing evaluations remain viewable. You can upgrade in one click." },
              { q: "Do you offer a discount for annual billing?", a: "Yes — 2 months free on annual for Starter and Growth. Book a call for Scale pricing." },
            ].map((f) => (
              <details key={f.q} className="group rounded-lg border border-hairline bg-surface-1/70 p-4 backdrop-blur">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
