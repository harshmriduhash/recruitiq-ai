import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Briefcase, Users, Search, LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const items = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/jobs", label: "Jobs", icon: Briefcase },
  { to: "/app/candidates", label: "Candidates", icon: Search },
  { to: "/app/team", label: "Team", icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background text-foreground grid grid-cols-[240px_1fr]">
      <aside className="border-r border-border/60 bg-card/40 backdrop-blur flex flex-col">
        <Link to="/" className="flex items-center gap-2 px-5 py-5 border-b border-border/60">
          <div className="size-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 grid place-items-center">
            <Sparkles className="size-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">RecruitIQ</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {items.map((it) => {
            const active = pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-violet-500/15 text-violet-200 border border-violet-500/30"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          className="mx-3 mb-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <header className="border-b border-border/60 px-8 py-6 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </header>
  );
}
