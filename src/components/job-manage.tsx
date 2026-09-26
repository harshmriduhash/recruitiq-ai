import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateJob, deleteJob, findSimilarJobs } from "@/lib/jobs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Loader2, History } from "lucide-react";
import { toast } from "sonner";

type Job = { id: string; title: string; raw_jd_text: string };

export function JobManageActions({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(job.title);
  const [jd, setJd] = useState(job.raw_jd_text);
  const [reextract, setReextract] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateFn = useServerFn(updateJob);
  const deleteFn = useServerFn(deleteJob);
  const navigate = useNavigate();

  async function save() {
    setSaving(true);
    try {
      await updateFn({ data: { id: job.id, title, raw_jd_text: jd, reextract } });
      toast.success(reextract ? "Job updated — requirements re-extracted" : "Job updated");
      setOpen(false);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Pencil className="size-4 mr-1" /> Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline"><Trash2 className="size-4 mr-1" /> Delete</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              The job and its candidate list will be hidden from your team. Match reports are kept for your audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteFn({ data: { id: job.id } });
                  toast.success("Job deleted");
                  navigate({ to: "/app/jobs" });
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Delete failed");
                }
              }}
            >
              Delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit job</DialogTitle>
            <DialogDescription>Existing match reports stay as they were scored.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={12} className="font-mono text-xs" />
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={reextract} onCheckedChange={(v) => setReextract(!!v)} />
              Re-extract requirements from the updated description
            </label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || title.trim().length < 1 || jd.trim().length < 50}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SimilarJobsCard({ title, excludeId }: { title: string; excludeId?: string }) {
  const fn = useServerFn(findSimilarJobs);
  const enabled = title.trim().length >= 3;
  const { data } = useQuery({
    queryKey: ["similar-jobs", title, excludeId],
    queryFn: () => fn({ data: { title, excludeId } }),
    enabled,
  });
  if (!enabled || !data?.length) return null;
  return (
    <Card className="p-6">
      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <History className="size-4 text-muted-foreground" /> Similar past jobs
      </h2>
      <ul className="space-y-3">
        {data.map((j) => (
          <li key={j.id}>
            <Link to="/app/jobs/$id" params={{ id: j.id }} className="text-sm font-medium hover:underline">
              {j.title}
            </Link>
            <div className="text-xs text-muted-foreground">
              {new Date(j.created_at).toLocaleDateString()} · {j.requirements.map((r) => r.label).slice(0, 3).join(", ")}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
