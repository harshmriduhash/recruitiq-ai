import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "./audit.server";

const DEFAULT_QUESTIONS = [
  "Briefly walk me through your current role and the most recent project you shipped.",
  "What are you looking for in your next opportunity, and what would make you leave your current role?",
  "What is your target compensation range and earliest available start date?",
  "Are you authorized to work in the role's location, and do you require visa sponsorship?",
  "Is there anything on your resume you'd like to clarify or expand on?",
];

async function orgIdFor(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", userId).single();
  if (error || !data) throw new Error("Profile missing");
  return data.organization_id as string;
}

/** Create a voice pre-screen record with a signed upload URL for the recording. */
export const createVoiceScreen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        candidateId: z.string().uuid(),
        questions: z.array(z.string().min(3).max(500)).max(10).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);

    // Fetch candidate to get job req
    const { data: cand, error: cErr } = await context.supabase
      .from("candidates")
      .select("id, job_requisition_id, organization_id")
      .eq("id", data.candidateId)
      .single();
    if (cErr || !cand) throw new Error("Candidate not found");
    if (cand.organization_id !== organization_id) throw new Error("Forbidden");

    const questions = data.questions?.length ? data.questions : DEFAULT_QUESTIONS;

    const { data: screen, error: sErr } = await context.supabase
      .from("voice_screens")
      .insert({
        organization_id,
        candidate_id: cand.id,
        job_requisition_id: cand.job_requisition_id,
        created_by: context.userId,
        questions,
        status: "pending",
      })
      .select("id, questions")
      .single();
    if (sErr) throw sErr;

    const path = `${organization_id}/${cand.id}/${screen.id}.webm`;
    const { data: signed, error: uErr } = await context.supabase.storage
      .from("voice-recordings")
      .createSignedUploadUrl(path);
    if (uErr) throw uErr;

    return { screenId: screen.id, storagePath: path, signedUrl: signed.signedUrl, token: signed.token, questions: screen.questions };
  });

/** Finalize a voice screen: transcribe uploaded audio via Lovable AI Gateway and generate structured summary. */
export const finalizeVoiceScreen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        screenId: z.string().uuid(),
        storagePath: z.string(),
        durationSeconds: z.number().int().nonnegative().max(60 * 60),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { data: screen, error: sErr } = await context.supabase
      .from("voice_screens")
      .select("id, organization_id, candidate_id, job_requisition_id, questions")
      .eq("id", data.screenId)
      .single();
    if (sErr || !screen) throw new Error("Screen not found");
    if (screen.organization_id !== organization_id) throw new Error("Forbidden");

    await context.supabase.from("voice_screens").update({
      status: "transcribing",
      recording_storage_path: data.storagePath,
      duration_seconds: data.durationSeconds,
    }).eq("id", screen.id);

    try {
      // Download audio from storage
      const { data: file, error: dErr } = await context.supabase.storage
        .from("voice-recordings")
        .download(data.storagePath);
      if (dErr || !file) throw new Error(`Recording not available: ${dErr?.message}`);

      // Transcribe
      const form = new FormData();
      form.append("file", file, "recording.webm");
      form.append("model", "openai/gpt-4o-mini-transcribe");
      const tRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Lovable-API-Key": key },
        body: form,
      });
      if (!tRes.ok) throw new Error(`Transcription failed [${tRes.status}]: ${await tRes.text()}`);
      const tJson: any = await tRes.json();
      const transcript = (tJson.text || "").toString();

      await context.supabase.from("voice_screens").update({
        status: "summarizing",
        transcript_text: transcript,
      }).eq("id", screen.id);

      // Summarize into structured notes
      const summaryPrompt = `You are analyzing a recorded recruiter pre-screen call transcript.

Questions asked:
${(screen.questions as string[]).map((q, i) => `${i + 1}. ${q}`).join("\n")}

Transcript:
"""
${transcript.slice(0, 12000)}
"""

Return STRICT JSON only with this shape:
{
  "summary": "3-sentence recruiter-facing summary",
  "answers": [ { "question": "...", "answer": "candidate's answer (or 'not addressed')" } ],
  "flags": [ "short concerns" ],
  "strengths": [ "short positives" ],
  "compensation": "quoted range or null",
  "start_date": "quoted start date or null",
  "work_authorization": "quoted status or null",
  "recommendation": "advance" | "hold" | "reject"
}`;

      const sRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You return only strict JSON. No prose." },
            { role: "user", content: summaryPrompt },
          ],
          temperature: 0.2,
        }),
      });
      if (!sRes.ok) throw new Error(`Summary failed [${sRes.status}]: ${await sRes.text()}`);
      const sJson: any = await sRes.json();
      const raw = sJson.choices?.[0]?.message?.content?.toString() ?? "{}";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      let structured: any = {};
      try { structured = JSON.parse(cleaned); } catch { structured = { summary: cleaned }; }

      await context.supabase.from("voice_screens").update({
        status: "complete",
        summary: structured.summary ?? null,
        structured_notes: structured,
      }).eq("id", screen.id);

      await writeAudit(context.supabase, {
        organization_id,
        actor_user_id: context.userId,
        action: "voice_screen.completed",
        target_type: "voice_screen",
        target_id: screen.id,
      });

      return { ok: true, screenId: screen.id };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await context.supabase.from("voice_screens").update({
        status: "failed",
        error_message: message,
      }).eq("id", screen.id);
      return { ok: false, error: message };
    }
  });

export const listVoiceScreens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ candidateId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("voice_screens")
      .select("id, status, summary, structured_notes, questions, duration_seconds, transcript_text, created_at, recording_storage_path, error_message, review_status, reviewed_at, reviewed_by, recruiter_notes, ats_synced_at, ats_sync_error, ats_external_note_id")
      .eq("candidate_id", data.candidateId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return rows;
  });

export const getVoiceRecordingUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ path: z.string() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("voice-recordings")
      .createSignedUrl(data.path, 300);
    if (error) throw error;
    return { url: signed.signedUrl };
  });
