import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createVoiceScreen, finalizeVoiceScreen, listVoiceScreens, getVoiceRecordingUrl } from "@/lib/voice.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Loader2, Play, CheckCircle2, AlertCircle } from "lucide-react";

export function VoiceScreenPanel({ candidateId }: { candidateId: string }) {
  const listFn = useServerFn(listVoiceScreens);
  const { data: screens, refetch } = useQuery({
    queryKey: ["voice-screens", candidateId],
    queryFn: () => listFn({ data: { candidateId } }),
    refetchInterval: (q) => {
      const rows = (q.state.data as any[]) || [];
      const active = rows.some((r) => ["pending", "recording", "transcribing", "summarizing"].includes(r.status));
      return active ? 2000 : false;
    },
  });

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Voice pre-screen</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Record a short screening call in the browser. RecruitIQ transcribes it and returns a structured summary.
          </p>
        </div>
        <StartRecordingButton candidateId={candidateId} onDone={() => refetch()} />
      </div>

      <div className="space-y-4">
        {(screens ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground border border-dashed border-border/60 rounded-md p-6 text-center">
            No pre-screens yet.
          </p>
        )}
        {(screens ?? []).map((s: any) => <ScreenRow key={s.id} screen={s} />)}
      </div>
    </Card>
  );
}

function StartRecordingButton({ candidateId, onDone }: { candidateId: string; onDone: () => void }) {
  const createFn = useServerFn(createVoiceScreen);
  const finalizeFn = useServerFn(finalizeVoiceScreen);
  const [state, setState] = useState<"idle" | "prep" | "recording" | "uploading">("idle");
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeRef = useRef<{ screenId: string; storagePath: string; token: string; signedUrl: string } | null>(null);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  async function start() {
    try {
      setState("prep");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const init = await createFn({ data: { candidateId } });
      activeRef.current = init;

      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timerRef.current) window.clearInterval(timerRef.current);
        setState("uploading");
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const duration = Math.round((Date.now() - startedAtRef.current) / 1000);
        const info = activeRef.current!;
        const { error: upErr } = await supabase.storage
          .from("voice-recordings")
          .uploadToSignedUrl(info.storagePath, info.token, blob, { contentType: "audio/webm" });
        if (upErr) { alert("Upload failed: " + upErr.message); setState("idle"); return; }
        await finalizeFn({ data: { screenId: info.screenId, storagePath: info.storagePath, durationSeconds: duration } });
        setState("idle");
        setElapsed(0);
        onDone();
      };
      mediaRef.current = rec;
      startedAtRef.current = Date.now();
      rec.start();
      setState("recording");
      timerRef.current = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)), 500);
    } catch (e) {
      alert("Microphone access failed: " + (e instanceof Error ? e.message : String(e)));
      setState("idle");
    }
  }
  function stop() {
    mediaRef.current?.stop();
  }

  if (state === "recording") {
    return (
      <Button onClick={stop} variant="destructive" className="gap-2">
        <Square className="size-4" /> Stop ({fmt(elapsed)})
      </Button>
    );
  }
  if (state === "prep" || state === "uploading") {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="size-4 animate-spin" /> {state === "prep" ? "Requesting mic…" : "Processing…"}
      </Button>
    );
  }
  return (
    <Button onClick={start} className="gap-2 bg-violet-500 hover:bg-violet-500/90 text-white">
      <Mic className="size-4" /> Start pre-screen
    </Button>
  );
}

function ScreenRow({ screen }: { screen: any }) {
  const urlFn = useServerFn(getVoiceRecordingUrl);
  const play = useMutation({
    mutationFn: async () => {
      const { url } = await urlFn({ data: { path: screen.recording_storage_path } });
      const audio = new Audio(url);
      await audio.play();
    },
  });
  const notes = screen.structured_notes || {};
  const active = ["pending", "recording", "transcribing", "summarizing"].includes(screen.status);
  return (
    <div className="rounded-md border border-border/60 p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {screen.status === "complete" ? <CheckCircle2 className="size-4 text-emerald-400" /> :
           screen.status === "failed" ? <AlertCircle className="size-4 text-rose-400" /> :
           <Loader2 className="size-4 animate-spin text-violet-300" />}
          <span className="text-sm font-medium capitalize">{screen.status}</span>
          {screen.duration_seconds != null && (
            <Badge className="bg-white/5 border border-border/60 text-[10px] text-muted-foreground">{fmt(screen.duration_seconds)}</Badge>
          )}
          {notes.recommendation && (
            <Badge className={`text-[10px] border ${
              notes.recommendation === "advance" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" :
              notes.recommendation === "reject" ? "bg-rose-500/15 border-rose-500/30 text-rose-300" :
              "bg-amber-500/15 border-amber-500/30 text-amber-300"
            }`}>{notes.recommendation}</Badge>
          )}
        </div>
        {screen.recording_storage_path && !active && (
          <Button size="sm" variant="ghost" className="gap-2 h-8" onClick={() => play.mutate()}>
            <Play className="size-3" /> Play
          </Button>
        )}
      </div>

      {screen.status === "failed" && <p className="text-xs text-rose-300">{screen.error_message}</p>}
      {screen.summary && <p className="text-sm text-foreground/90 mb-3">{screen.summary}</p>}

      {notes.answers?.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer text-foreground/80 hover:text-foreground">View Q&amp;A ({notes.answers.length})</summary>
          <ul className="mt-3 space-y-3">
            {notes.answers.map((qa: any, i: number) => (
              <li key={i}>
                <div className="text-foreground/70 font-medium">{qa.question}</div>
                <div className="mt-1">{qa.answer}</div>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <MetaCell label="Compensation" value={notes.compensation} />
            <MetaCell label="Start date" value={notes.start_date} />
            <MetaCell label="Work auth" value={notes.work_authorization} />
          </div>
        </details>
      )}
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xs text-foreground/90 mt-1">{value || "—"}</div>
    </div>
  );
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
