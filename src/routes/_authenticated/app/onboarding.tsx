import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createJob } from "@/lib/jobs.functions";
import { completeOnboarding } from "@/lib/org.functions";
import { createResumeUploadUrl, startCandidatePipeline } from "@/lib/candidates.functions";
import { supabase } from "@/integrations/supabase/client";
import { pipelineErrorMessage } from "@/lib/pipeline-errors";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SAMPLE_JD = `Senior Full-Stack Engineer

We're hiring a senior full-stack engineer to lead our platform team. Required: 5+ years of production TypeScript, deep React expertise, experience shipping SaaS at scale, and comfort with Postgres. You'll own our API layer, mentor two junior engineers, and partner with product on quarterly roadmap. Nice to have: TanStack Router, edge runtimes, prior fintech experience. Remote-first, US or EU timezones.`;

export const Route = createFileRoute("/_authenticated/app/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — RecruitIQ" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("Senior Full-Stack Engineer");
  const [jd, setJd] = useState(SAMPLE_JD);
  const [creating, setCreating] = useState(false);
  const createFn = useServerFn(createJob);
  const completeFn = useServerFn(completeOnboarding);
  const navigate = useNavigate();
  const uploadFn = useServerFn(createResumeUploadUrl);
  const startFn = useServerFn(startCandidatePipeline);
  const [jobId, setJobId] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);

  async function scoreResume(file: Blob, filename: string, candidateName?: string) {
    if (!jobId) return;
    setScoring(true);
    try {
      const { path, token } = await uploadFn({ data: { jobRequisitionId: jobId, filename } });
      const { error } = await supabase.storage.from("resumes").uploadToSignedUrl(path, token, file, { contentType: "application/pdf" });
      if (error) throw error;
      const res = await startFn({ data: { jobRequisitionId: jobId, storagePath: path, candidateName } });
      if (res.error) toast.error(pipelineErrorMessage((res as any).errorCode, res.error));
      navigate({ to: "/app/candidates/$id", params: { id: res.candidateId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
      setScoring(false);
    }
  }

  async function trySample() {
    const blob = await (await fetch("/sample-resume.pdf")).blob();
    await scoreResume(blob, "sample-resume.pdf", "Alex Morgan (sample)");
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const { id } = await createFn({ data: { title, raw_jd_text: jd } });
      await completeFn();
      toast.success("Job created — requirements extracted");
      setJobId(id);
      setStep(3);
      setCreating(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader title="Set up your first job" description="Paste a JD. We'll extract requirements and set up your scoring rubric." />
      <div className="p-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-violet-500" : "bg-white/10"}`} />
          ))}
        </div>

        {step === 0 && (
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-1">Welcome to RecruitIQ</h2>
              <p className="text-sm text-muted-foreground">
                In under 2 minutes you'll create a job requisition, extract structured requirements with AI,
                and be ready to score your first candidate.
              </p>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-400 mt-0.5" /> Paste any job description</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-400 mt-0.5" /> AI extracts must-haves and nice-to-haves</li>
              <li className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-400 mt-0.5" /> Every score comes with cited evidence</li>
            </ul>
            <div className="flex justify-end">
              <Button onClick={() => setStep(1)}>Get started</Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-6 space-y-4">
            <div>
              <label className="text-sm font-medium">Job title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Job description</label>
              <Textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={14} className="mt-1 font-mono text-xs" />
              <p className="text-xs text-muted-foreground mt-1">We've filled in a sample — replace it with your own or edit inline.</p>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={title.trim().length < 2 || jd.trim().length < 50}>Continue</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Ready to extract</h2>
            <p className="text-sm text-muted-foreground">
              We'll analyze your JD, extract 5-12 requirements (weighted 1-5, marked must-have or nice-to-have),
              and create the scoring rubric your candidates will be measured against.
            </p>
            <div className="rounded-md bg-white/5 border border-white/10 p-3 text-sm">
              <div className="font-medium mb-1">{title}</div>
              <div className="text-muted-foreground line-clamp-3 text-xs">{jd}</div>
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} disabled={creating}>Back</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <><Loader2 className="size-4 mr-2 animate-spin" /> Extracting…</> : "Extract & create job"}
              </Button>
            </div>
          </Card>
        )}
        {step === 3 && jobId && (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold">Score your first candidate</h2>
            <p className="text-sm text-muted-foreground">
              Upload a resume (PDF) or try a sample one. You'll see the full match report with cited evidence in about 15 seconds.
            </p>
            {scoring ? (
              <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Running the 4-step match — reading, finding evidence, scoring, summarizing…</div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex">
                  <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) scoreResume(f, f.name); }} />
                  <span className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground cursor-pointer hover:bg-primary/90">Upload a resume</span>
                </label>
                <Button variant="outline" onClick={trySample}>Try with sample resume</Button>
                <Button variant="ghost" onClick={() => navigate({ to: "/app/jobs/$id", params: { id: jobId } })}>Skip for now</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </>
  );
}
