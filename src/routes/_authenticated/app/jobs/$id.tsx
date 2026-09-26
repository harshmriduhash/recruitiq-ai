import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { getJob } from "@/lib/jobs.functions";
import { JobManageActions, SimilarJobsCard } from "@/components/job-manage";
import { pipelineErrorMessage } from "@/lib/pipeline-errors";
import { createResumeUploadUrl, startCandidatePipeline } from "@/lib/candidates.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-shell";
import { ScorePill } from "@/routes/_authenticated/app/dashboard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/jobs/$id")({
  head: () => ({ meta: [{ title: "Job — RecruitIQ" }] }),
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getJob);
  const uploadFn = useServerFn(createResumeUploadUrl);
  const startFn = useServerFn(startCandidatePipeline);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["job", id], queryFn: () => getFn({ data: { id } }) });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const { path, token } = await uploadFn({ data: { jobRequisitionId: id, filename: file.name } });
      const { error: upErr } = await supabase.storage.from("resumes").uploadToSignedUrl(path, token, file, { contentType: file.type || "application/pdf" });
      if (upErr) throw upErr;
      toast.info("Resume uploaded — running 4-agent pipeline…");
      const res = await startFn({ data: { jobRequisitionId: id, storagePath: path, candidateName: name, candidateEmail: email } });
      if (res.error) toast.error(pipelineErrorMessage((res as any).errorCode, res.error));
      else toast.success("Match evaluation complete");
      setName(""); setEmail("");
      if (fileRef.current) fileRef.current.value = "";
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  const job = data.job;
  const reqs = (job.extracted_requirements as any)?.requirements ?? [];

  return (
    <>
      <PageHeader title={job.title} description={`${reqs.length} requirements · ${job.status}`} action={<JobManageActions job={job as any} onSaved={() => refetch()} />} />
      <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Candidates</h2>
              <span className="text-xs text-muted-foreground">{data.candidates.length} total</span>
            </div>
            {!data.candidates.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Upload a resume on the right to score your first candidate.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {data.candidates.map((c: any) => {
                  const ev = c.match_evaluations?.[0];
                  return (
                    <li key={c.id}>
                      <Link to="/app/candidates/$id" params={{ id: c.id }} className="py-3 flex items-center justify-between hover:bg-white/5 rounded px-2 -mx-2">
                        <div>
                          <div className="font-medium text-sm">{c.candidate_name || "Anonymous candidate"}</div>
                          <div className="text-xs text-muted-foreground">{c.candidate_email ?? "no email"} · {new Date(c.created_at).toLocaleDateString()}</div>
                        </div>
                        {ev ? (
                          <div className="flex items-center gap-2">
                            {ev.gated_by_must_have && <Badge variant="destructive" className="text-[10px]">Must-have gap</Badge>}
                            <ScorePill score={Number(ev.overall_score)} confidence={ev.overall_confidence} />
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Processing…</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Extracted requirements</h2>
            <ul className="space-y-2">
              {reqs.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between gap-4 py-2 border-b border-border/40 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.must_have && <Badge className="bg-rose-500/15 text-rose-300 border-rose-500/30 border text-[10px]">MUST</Badge>}
                    <span className="text-sm truncate">{r.label}</span>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">weight {r.weight}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <SimilarJobsCard title={job.title} excludeId={job.id} />
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-3">Add candidate</h2>
            <div className="space-y-3">
              <Input placeholder="Candidate name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
              <Input placeholder="candidate@email.com (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                className="hidden"
              />
              <Button className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Running pipeline…</> : <><Upload className="size-4 mr-2" /> Upload resume PDF</>}
              </Button>
              <p className="text-xs text-muted-foreground">PDF only. Text is extracted, sanitized, and scored against the rubric.</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
