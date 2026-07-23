import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listAtsConnections, createAtsConnection, deleteAtsConnection,
  listRemoteJobs, importCandidatesForJob,
} from "@/lib/ats.functions";
import { listJobs } from "@/lib/jobs.functions";
import { Plug, Trash2, Loader2, CheckCircle2, AlertCircle, DownloadCloud } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  head: () => ({ meta: [{ title: "Integrations — RecruitIQ" }, { name: "description", content: "Connect Greenhouse, Lever, or Ashby to import candidates into RecruitIQ." }] }),
  component: IntegrationsPage,
});

const PROVIDERS = [
  { id: "greenhouse", label: "Greenhouse", hint: "Create a Harvest API key with candidate + job read scopes." },
  { id: "lever", label: "Lever", hint: "Generate an API key from Settings → Integrations & API." },
  { id: "ashby", label: "Ashby", hint: "Create an API key with 'Read' scopes for jobs, applications, and candidates." },
] as const;

function IntegrationsPage() {
  const listFn = useServerFn(listAtsConnections);
  const { data: connections, refetch } = useQuery({ queryKey: ["ats-connections"], queryFn: () => listFn() });

  return (
    <>
      <PageHeader title="Integrations" description="Connect your ATS to sync candidates into RecruitIQ. Growth-tier feature." />
      <div className="p-8 space-y-8 max-w-5xl">
        <NewConnectionCard onCreated={() => refetch()} />

        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Connected ATS accounts</h2>
          {(connections ?? []).length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground text-center">No ATS connections yet.</Card>
          )}
          {(connections ?? []).map((c: any) => (
            <ConnectionRow key={c.id} conn={c} onChange={() => refetch()} />
          ))}
        </div>
      </div>
    </>
  );
}

function NewConnectionCard({ onCreated }: { onCreated: () => void }) {
  const [provider, setProvider] = useState<"greenhouse" | "lever" | "ashby">("greenhouse");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const createFn = useServerFn(createAtsConnection);
  const m = useMutation({
    mutationFn: () => createFn({ data: { provider, displayName: name || provider, apiKey: key } }),
    onSuccess: (r: any) => {
      if (r.ok) { setName(""); setKey(""); onCreated(); }
      else alert("Could not connect: " + r.error);
    },
  });
  const meta = PROVIDERS.find((p) => p.id === provider)!;
  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="size-4 text-violet-300" />
        <h2 className="text-lg font-semibold">Connect an ATS</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Nickname</Label>
          <Input placeholder="Main Greenhouse" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>API key</Label>
          <Input type="password" placeholder="Paste your API key" value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{meta.hint} Your key is stored encrypted at rest and only visible to Owners and Admins.</p>
      <div>
        <Button onClick={() => m.mutate()} disabled={!key || m.isPending} className="bg-violet-500 hover:bg-violet-500/90 text-white gap-2">
          {m.isPending && <Loader2 className="size-4 animate-spin" />} Validate &amp; connect
        </Button>
      </div>
    </Card>
  );
}

function ConnectionRow({ conn, onChange }: { conn: any; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const delFn = useServerFn(deleteAtsConnection);
  const qc = useQueryClient();
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon status={conn.status} />
          <div>
            <div className="text-sm font-medium">{conn.display_name}</div>
            <div className="text-xs text-muted-foreground capitalize">{conn.provider} · {conn.last_sync_at ? `synced ${new Date(conn.last_sync_at).toLocaleString()}` : "never synced"}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide" : "Import candidates"}
          </Button>
          <Button size="sm" variant="ghost" onClick={async () => {
            if (!confirm("Disconnect this ATS?")) return;
            await delFn({ data: { id: conn.id } });
            qc.invalidateQueries({ queryKey: ["ats-connections"] });
            onChange();
          }}>
            <Trash2 className="size-4 text-rose-300" />
          </Button>
        </div>
      </div>
      {conn.last_error && <p className="text-xs text-rose-300 mt-3">{conn.last_error}</p>}
      {expanded && <ImportPanel conn={conn} />}
    </Card>
  );
}

function ImportPanel({ conn }: { conn: any }) {
  const jobsFn = useServerFn(listRemoteJobs);
  const localJobsFn = useServerFn(listJobs);
  const importFn = useServerFn(importCandidatesForJob);
  const [selectedRemote, setSelectedRemote] = useState<string>("");
  const [selectedLocal, setSelectedLocal] = useState<string>("");

  const remote = useQuery({ queryKey: ["ats-remote-jobs", conn.id], queryFn: () => jobsFn({ data: { connectionId: conn.id } }) });
  const local = useQuery({ queryKey: ["jobs"], queryFn: () => localJobsFn() });

  const imp = useMutation({
    mutationFn: () => importFn({ data: { connectionId: conn.id, externalJobId: selectedRemote, jobRequisitionId: selectedLocal } }),
    onSuccess: (r: any) => alert(r.ok ? `Imported ${r.imported} candidates (${r.skipped} skipped).` : "Import failed: " + r.error),
  });

  return (
    <div className="mt-5 border-t border-border/60 pt-5 grid md:grid-cols-3 gap-4 items-end">
      <div className="space-y-2">
        <Label>ATS job</Label>
        {remote.isLoading ? (
          <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> Loading…</div>
        ) : remote.isError ? (
          <div className="text-xs text-rose-300">{(remote.error as any)?.message}</div>
        ) : (
          <Select value={selectedRemote} onValueChange={setSelectedRemote}>
            <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
            <SelectContent>
              {(remote.data ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.title}{j.location ? ` — ${j.location}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label>RecruitIQ requisition</Label>
        <Select value={selectedLocal} onValueChange={setSelectedLocal}>
          <SelectTrigger><SelectValue placeholder="Select requisition" /></SelectTrigger>
          <SelectContent>
            {(local.data ?? []).map((j: any) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={() => imp.mutate()} disabled={!selectedRemote || !selectedLocal || imp.isPending} className="gap-2">
        {imp.isPending ? <Loader2 className="size-4 animate-spin" /> : <DownloadCloud className="size-4" />}
        Import candidates
      </Button>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "active") return <CheckCircle2 className="size-5 text-emerald-400" />;
  if (status === "error") return <AlertCircle className="size-5 text-rose-400" />;
  return <Plug className="size-5 text-muted-foreground" />;
}
