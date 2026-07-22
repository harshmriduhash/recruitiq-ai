import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { createJob } from "@/lib/jobs.functions";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/jobs/new")({
  head: () => ({ meta: [{ title: "New job — RecruitIQ" }] }),
  component: NewJobPage,
});

function NewJobPage() {
  const [title, setTitle] = useState("");
  const [jd, setJd] = useState("");
  const [creating, setCreating] = useState(false);
  const fn = useServerFn(createJob);
  const navigate = useNavigate();

  async function submit() {
    setCreating(true);
    try {
      const { id } = await fn({ data: { title, raw_jd_text: jd } });
      toast.success("Job created");
      navigate({ to: "/app/jobs/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create job");
      setCreating(false);
    }
  }

  return (
    <>
      <PageHeader title="New job" description="Paste a job description. We'll extract structured requirements." />
      <div className="p-8 max-w-3xl">
        <Card className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="Senior Full-Stack Engineer" />
          </div>
          <div>
            <label className="text-sm font-medium">Job description</label>
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={16} className="mt-1 font-mono text-xs" placeholder="Paste the full JD here…" />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} disabled={creating || title.trim().length < 2 || jd.trim().length < 50}>
              {creating ? <><Loader2 className="size-4 mr-2 animate-spin" /> Extracting…</> : "Extract & create"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
