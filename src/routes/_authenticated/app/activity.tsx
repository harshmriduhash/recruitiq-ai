import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listActivity } from "@/lib/activity.functions";

export const Route = createFileRoute("/_authenticated/app/activity")({
  head: () => ({
    meta: [
      { title: "Activity & audit log — RecruitIQ" },
      { name: "description", content: "Audit trail and error reports for your RecruitIQ workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ActivityPage,
});

function toCsv(rows: any[]) {
  const head = ["created_at", "action", "target_type", "target_id", "actor_user_id", "metadata"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [head.join(","), ...rows.map((r) => head.map((h) => esc(h === "metadata" ? JSON.stringify(r[h]) : r[h])).join(","))].join("\n");
}

function ActivityPage() {
  const fn = useServerFn(listActivity);
  const { data, isLoading } = useQuery({ queryKey: ["activity"], queryFn: () => fn() });

  const exportCsv = () => {
    const blob = new Blob([toCsv(data?.audit ?? [])], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `recruitiq-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every important action in your workspace, plus recent errors."
        action={
          <Button variant="outline" className="gap-2" onClick={exportCsv} disabled={!data?.audit.length}>
            <Download className="size-4" /> Export CSV
          </Button>
        }
      />
      <div className="p-8 space-y-8 max-w-5xl">
        {isLoading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Recent errors</h2>
              {data?.errors.length ? (
                data.errors.map((e: any) => (
                  <Card key={e.id} className="p-4 text-sm">
                    <div className="text-destructive">{e.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(e.created_at).toLocaleString()} · ref {e.request_id.slice(0, 8)}
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="p-4 text-sm text-muted-foreground">No errors recorded. (Only owners and admins can see errors.)</Card>
              )}
            </section>
            <section className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Audit log</h2>
              <Card className="divide-y divide-border/60">
                {(data?.audit ?? []).map((a: any) => (
                  <div key={a.id} className="flex justify-between gap-4 p-3 text-sm">
                    <span className="font-mono text-xs">{a.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                ))}
                {!data?.audit.length && <div className="p-4 text-sm text-muted-foreground">No activity yet.</div>}
              </Card>
            </section>
          </>
        )}
      </div>
    </>
  );
}
