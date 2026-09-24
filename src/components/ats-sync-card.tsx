import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCandidateAtsLink, syncAtsCandidate } from "@/lib/ats.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, RefreshCw, Plug } from "lucide-react";

export function AtsSyncCard({ candidateId, onSynced }: { candidateId: string; onSynced?: () => void }) {
  const linkFn = useServerFn(getCandidateAtsLink);
  const syncFn = useServerFn(syncAtsCandidate);

  const { data: link, refetch } = useQuery({
    queryKey: ["ats-link", candidateId],
    queryFn: () => linkFn({ data: { candidateId } }),
  });

  const sync = useMutation({
    mutationFn: () => syncFn({ data: { candidateId } }),
    onSuccess: (r: any) => {
      if (r?.ok) {
        toast.success(r.stage ? `Synced — current stage: ${r.stage}` : "Synced from your ATS");
        refetch();
        onSynced?.();
      } else {
        toast.error(r?.error ?? "Sync failed");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Sync failed"),
  });

  if (!link) return null;

  return (
    <Card className="p-5 flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <Plug className="size-4 text-violet-300 shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-medium capitalize">
            Imported from {(link as any).provider}
            {(link as any).external_stage && (
              <Badge className="ml-2 bg-white/5 border border-border/60 text-[10px] text-muted-foreground">
                {(link as any).external_stage}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {(link as any).last_synced_at
              ? `Last synced ${new Date((link as any).last_synced_at).toLocaleString()}`
              : "Never synced since import"}
          </div>
        </div>
      </div>
      <Button size="sm" variant="outline" className="gap-2" disabled={sync.isPending} onClick={() => sync.mutate()}>
        {sync.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        Sync from ATS
      </Button>
    </Card>
  );
}
