import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const TIERS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    tag: "Try it",
    features: ["1 job requisition", "20 candidates / month", "Full explainability", "1 seat"],
    cta: { label: "Start free", to: "/auth", search: { mode: "signup" } },
    highlighted: false,
  },
  {
    name: "Starter",
    price: "$99",
    period: "/mo",
    tag: "For small teams",
    features: ["5 job requisitions", "200 candidates / month", "3 seats", "Audit log", "Email support"],
    cta: { label: "Start Starter", to: "/auth", search: { mode: "signup", plan: "starter" } },
    highlighted: false,
  },
  {
    name: "Growth",
    price: "$299",
    period: "/mo",
    tag: "Most popular",
    features: [
      "Unlimited job requisitions",
      "1,000 candidates / month",
      "10 seats",
      "Team roles & RBAC",
      "ATS integration (coming soon)",
      "Priority support",
    ],
    cta: { label: "Start Growth", to: "/auth", search: { mode: "signup", plan: "growth" } },
    highlighted: true,
  },
  {
    name: "Scale",
    price: "Custom",
    period: "",
    tag: "Enterprise",
    features: ["Unlimited everything", "SAML SSO", "Audit-log export", "Dedicated CSM", "SLA + DPA"],
    cta: { label: "Contact sales", to: "/how-it-works", search: undefined },
    highlighted: false,
  },
];

export function PricingCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid gap-6 ${compact ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2 lg:grid-cols-4"}`}>
      {TIERS.map((t) => (
        <div
          key={t.name}
          className={`relative rounded-xl border p-6 backdrop-blur transition-all ${
            t.highlighted
              ? "border-primary/50 bg-surface-2/80 -translate-y-1 glow-brand"
              : "border-hairline bg-surface-1/70 hover:-translate-y-0.5"
          }`}
        >
          {t.highlighted && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground">
              {t.tag}
            </div>
          )}
          {!t.highlighted && (
            <div className="text-[10px] font-semibold uppercase tracking-widest text-ai-accent font-mono">{t.tag}</div>
          )}
          <h3 className="mt-3 text-2xl font-bold">{t.name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-4xl font-bold tracking-tighter">{t.price}</span>
            <span className="text-sm text-muted-foreground">{t.period}</span>
          </div>
          <ul className="mt-6 space-y-2.5">
            {t.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-ai-accent" />
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <Button
              asChild
              className={`w-full ${
                t.highlighted
                  ? "bg-brand-gradient text-primary-foreground hover:opacity-90"
                  : "border border-hairline bg-surface-2 text-foreground hover:bg-surface-3"
              }`}
              variant={t.highlighted ? "default" : "ghost"}
            >
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Link to={t.cta.to as any} search={t.cta.search as any}>{t.cta.label}</Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
