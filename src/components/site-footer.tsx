import { Link } from "@tanstack/react-router";
import { Sparkles, Github, Twitter, Linkedin } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-hairline overflow-hidden">
      {/* meteor background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40">
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            className="absolute h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse-glow"
            style={{
              top: `${(i * 47) % 100}%`,
              left: `${(i * 31) % 100}%`,
              transform: `rotate(${-45 + (i % 3) * 5}deg)`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-gradient">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </span>
              <span className="text-lg">
                Recruit<span className="text-brand-gradient">IQ</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Explainable AI candidate matching for teams who need to defend their hiring decisions.
            </p>
          </div>

          <FooterCol title="Product" items={[
            { label: "How it works", to: "/how-it-works" },
            { label: "Pricing", to: "/pricing" },
            { label: "Security", to: "/security" },
          ]} />
          <FooterCol title="Company" items={[
            { label: "About", to: "/how-it-works" },
            { label: "Careers", to: "/how-it-works" },
            { label: "Contact", to: "/how-it-works" },
          ]} />
          <FooterCol title="Legal" items={[
            { label: "Privacy", to: "/security" },
            { label: "Terms", to: "/security" },
            { label: "Data processing", to: "/security" },
          ]} />
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-hairline pt-8 md:flex-row md:items-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RecruitIQ. Built with care for hiring teams who care about fairness.
          </p>
          <div className="flex gap-3 text-muted-foreground">
            <a aria-label="Twitter" href="#" className="hover:text-foreground"><Twitter className="h-4 w-4" /></a>
            <a aria-label="LinkedIn" href="#" className="hover:text-foreground"><Linkedin className="h-4 w-4" /></a>
            <a aria-label="GitHub" href="#" className="hover:text-foreground"><Github className="h-4 w-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; to: string }[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.label}>
            <Link to={it.to} className="text-sm text-muted-foreground hover:text-foreground">
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
