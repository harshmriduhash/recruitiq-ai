import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listJobs } from "@/lib/jobs.functions";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/jobs/")({
  head: () => ({ meta: [{ title: "Jobs — RecruitIQ" }] }),
  component: JobsIndex,
});

function JobsIndex() {
  const fn = useServerFn(listJobs);
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: () => fn() });
  return (
    <>
      <PageHeader
        title="Jobs"
        description="Every job carries its own weighted scoring rubric."
        action={<Button asChild><Link to="/app/jobs/new">New job</Link></Button>}
      />
      <div className="p-8">
        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading…</div>
        ) : !jobs?.length ? (
          <Card className="p-12 text-center">
            <Briefcase className="size-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold mb-1">No jobs yet</h2>
            <p className="text-sm text-muted-foreground mb-4">Create your first job to start scoring candidates.</p>
            <Button asChild><Link to="/app/jobs/new">Create job</Link></Button>
          </Card>
        ) : (
          <div className="grid gap-3">
            {jobs.map((j) => (
              <Link key={j.id} to="/app/jobs/$id" params={{ id: j.id }}>
                <Card className="p-5 flex items-center justify-between hover:border-violet-500/40 transition-colors">
                  <div>
                    <div className="font-medium">{j.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {j.requirement_count} requirements · {j.status} · {new Date(j.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <span className="text-sm text-violet-300">Open →</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
