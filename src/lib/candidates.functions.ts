import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runFullPipeline } from "./pipeline.server";
import { writeAudit } from "./audit.server";

async function orgIdFor(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", userId).single();
  if (error || !data) throw new Error("Profile missing");
  return data.organization_id as string;
}

// Get a signed upload URL for the resumes bucket, scoped to the caller's org.
export const createResumeUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ jobRequisitionId: z.string().uuid(), filename: z.string().max(255) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${organization_id}/${data.jobRequisitionId}/${crypto.randomUUID()}-${safeName}`;
    const { data: signed, error } = await context.supabase.storage.from("resumes").createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

// After client uploads, create the candidate row and run the full pipeline synchronously.
export const startCandidatePipeline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        jobRequisitionId: z.string().uuid(),
        storagePath: z.string().min(1),
        candidateName: z.string().trim().max(200).optional(),
        candidateEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);
    const { data: candidate, error: cErr } = await context.supabase
      .from("candidates")
      .insert({
        organization_id,
        job_requisition_id: data.jobRequisitionId,
        uploaded_by: context.userId,
        candidate_name: data.candidateName || null,
        candidate_email: data.candidateEmail || null,
        resume_storage_path: data.storagePath,
      })
      .select("id")
      .single();
    if (cErr) throw cErr;

    const { data: run, error: rErr } = await context.supabase
      .from("pipeline_runs")
      .insert({
        organization_id,
        job_requisition_id: data.jobRequisitionId,
        candidate_id: candidate.id,
        status: "queued",
        current_stage: "Queued",
      })
      .select("id")
      .single();
    if (rErr) throw rErr;

    await writeAudit(context.supabase, {
      organization_id,
      actor_user_id: context.userId,
      action: "candidate.uploaded",
      target_type: "candidate",
      target_id: candidate.id,
      metadata: { job_requisition_id: data.jobRequisitionId },
    });

    // Fire pipeline; on server this is awaited so status updates are visible.
    try {
      const { evaluationId } = await runFullPipeline({
        supabase: context.supabase,
        organizationId: organization_id,
        jobRequisitionId: data.jobRequisitionId,
        candidateId: candidate.id,
        storagePath: data.storagePath,
        pipelineRunId: run.id,
      });
      return { candidateId: candidate.id, pipelineRunId: run.id, evaluationId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { candidateId: candidate.id, pipelineRunId: run.id, error: message };
    }
  });

export const getCandidateWithEvaluation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: candidate, error } = await context.supabase
      .from("candidates")
      .select("*, match_evaluations(*), pipeline_runs(id, status, current_stage, progress, error_message, created_at), job_requisitions(id, title, extracted_requirements)")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    return candidate;
  });

export const getPipelineRunStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: run, error } = await context.supabase
      .from("pipeline_runs")
      .select("id, status, current_stage, progress, error_message, error_code, candidate_id")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return run;
  });
