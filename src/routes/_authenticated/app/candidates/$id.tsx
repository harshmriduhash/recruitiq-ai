import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCandidateWithEvaluation } from "@/lib/candidates.functions";
import { PageHeader } from "@/components/app-shell";
import { ScorePill } from "@/routes/_authenticated/app/dashboard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { VoiceScreenPanel } from "@/components/voice-screen-panel";

export const Route = createFileRoute("/_authenticated/app/candidates/$id")({
  head: () => ({ meta: [{ title: "Candidate — RecruitIQ" }] }),
  component: CandidateDetail,
});

function CandidateDetail() {
  const { id } = Route.useParams();
  const fn = useServerFn(getCandidateWithEvaluation);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["candidate", id],
    queryFn: () => fn({ data: { id } }),
    refetchInterval: (q) => {
      const c = q.state.data as any;
      const run = c?.pipeline_runs?.[0];
      return run && run.status !== "complete" && run.status !== "failed" ? 1500 : false;
    },
  });

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const c: any = data;
  const evalRow = c.match_evaluations?.[0];
  const run = c.pipeline_runs?.[0];

  return (
    <>
      <PageHeader
        title={c.candidate_name || "Anonymous candidate"}
        description={<span>{c.candidate_email ?? "no email"} · <Link to="/app/jobs/$id" params={{ id: c.job_requisition_id }} className="text-violet-300">{c.job_requisitions?.title}</Link></span> as any}
        action={evalRow && <ScorePill score={Number(evalRow.overall_score)} confidence={evalRow.overall_confidence} />}
      />
      <div className="p-8 space-y-6 max-w-4xl">
        {!evalRow && run && (
          <Card className="p-6">
            <div className="text-sm font-medium mb-2">{run.current_stage}</div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all" style={{ width: `${run.progress ?? 0}%` }} />
            </div>
            {run.status === "failed" && <p className="text-sm text-rose-300 mt-3">{run.error_message}</p>}
          </Card>
        )}

        {evalRow && (
          <>
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-2">Summary</h2>
              {evalRow.gated_by_must_have && (
                <div className="mb-3 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  A must-have requirement is missing. Overall score is capped.
                </div>
              )}
              <p className="text-sm leading-relaxed text-foreground/90">{evalRow.summary_text}</p>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Requirement breakdown</h2>
              <ul className="space-y-3">
                {(evalRow.requirement_breakdown as any[]).map((r) => (
                  <li key={r.id} className="rounded-md border border-border/60 p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <PresenceIcon present={r.present} />
                        <span className="text-sm font-medium">{r.label}</span>
                        {r.must_have && <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 border text-[10px]">MUST</Badge>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                        <span className="tabular-nums">weight {r.weight}</span>
                        <span>·</span>
                        <span>{r.confidence}</span>
                      </div>
                    </div>
                    {r.excerpt && (
                      <blockquote className="text-xs text-muted-foreground border-l-2 border-violet-500/40 pl-3 my-2 italic">
                        "{r.excerpt}"
                      </blockquote>
                    )}
                    {r.reasoning && !r.excerpt && (
                      <p className="text-xs text-muted-foreground">{r.reasoning}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          </>
        )}

        <VoiceScreenPanel candidateId={id} />
      </div>
    </>
  );
}

function PresenceIcon({ present }: { present: string }) {
  if (present === "yes") return <CheckCircle2 className="size-4 text-emerald-400" />;
  if (present === "partial") return <MinusCircle className="size-4 text-amber-400" />;
  return <XCircle className="size-4 text-rose-400" />;
}
