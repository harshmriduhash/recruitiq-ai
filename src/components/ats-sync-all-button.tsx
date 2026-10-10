import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncAllAtsCandidates } from "@/lib/ats.functions";

export function SyncAllButton({ connectionId, onDone }: { connectionId: string; onDone?: () => void }) {
  const fn = useServerFn(syncAllAtsCandidates);
  const m = useMutation({
    mutationFn: () => fn({ data: { connectionId } }),
    onSuccess: (r: any) => {
      if (r.ok) toast.success(`Synced ${r.synced} candidate(s)${r.failed ? `, ${r.failed} failed` : ""}`);
      else toast.error(r.error);
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Sync failed"),
  });
  return (
    <Button size="sm" variant="outline" className="gap-2" disabled={m.isPending} onClick={() => m.mutate()}>
      {m.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Sync all
    </Button>
  );
}

