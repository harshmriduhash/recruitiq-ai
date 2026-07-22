import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getDashboardStats, getMyOrg } from "@/lib/org.functions";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, FileCheck2, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — RecruitIQ" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const statsFn = useServerFn(getDashboardStats);
  const orgFn = useServerFn(getMyOrg);
  const { data: org } = useQuery({ queryKey: ["me"], queryFn: () => orgFn() });
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => statsFn() });

  useEffect(() => {
    if (org && !org.organization?.onboarding_completed_at) {
      navigate({ to: "/app/onboarding" });
    }
  }, [org, navigate]);

  return (
    <>
      <PageHeader
        title={`Welcome back${org?.user.name ? `, ${org.user.name.split(" ")[0]}` : ""}`}
        description="Every match score with evidence. Every decision, defensible."
        action={
          <Button asChild>
            <Link to="/app/jobs/new">New job</Link>
          </Button>
        }
      />
      <div className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="Open jobs" value={stats?.jobs ?? 0} icon={<Briefcase className="size-5" />} to="/app/jobs" />
          <StatCard label="Candidates" value={stats?.candidates ?? 0} icon={<Users className="size-5" />} to="/app/candidates" />
          <StatCard label="Evaluations" value={stats?.evaluations ?? 0} icon={<FileCheck2 className="size-5" />} to="/app/candidates" />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent evaluations</h2>
            <Link to="/app/candidates" className="text-sm text-violet-300 hover:text-violet-200 inline-flex items-center gap-1">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </div>
          {stats?.recent?.length ? (
            <ul className="divide-y divide-border/60">
              {stats.recent.map((e: any) => (
                <li key={e.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{e.candidates?.candidate_name ?? "Anonymous candidate"}</div>
                    <div className="text-muted-foreground text-xs">{e.job_requisitions?.title}</div>
                  </div>
                  <ScorePill score={Number(e.overall_score)} confidence={e.overall_confidence} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No evaluations yet. <Link to="/app/jobs/new" className="text-violet-300">Create your first job →</Link>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function StatCard({ label, value, icon, to }: { label: string; value: number; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to}>
      <Card className="p-6 hover:border-violet-500/40 transition-colors">
        <div className="flex items-center justify-between mb-3 text-muted-foreground">
          <span className="text-sm">{label}</span>
          {icon}
        </div>
        <div className="text-3xl font-semibold tabular-nums">{value}</div>
      </Card>
    </Link>
  );
}

export function ScorePill({ score, confidence }: { score: number; confidence?: string | null }) {
  const color = score >= 75 ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : score >= 50 ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
    : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs tabular-nums ${color}`}>
      {score.toFixed(0)}/100
      {confidence && <span className="opacity-70">· {confidence}</span>}
    </span>
  );
}
