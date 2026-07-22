import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractRequirements } from "./pipeline.server";
import { writeAudit } from "./audit.server";

async function orgIdFor(supabase: ReturnType<typeof requireSupabaseAuth extends never ? never : never> | any, userId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", userId).single();
  if (error || !data) throw new Error("Profile missing");
  return data.organization_id as string;
}

const CreateJobInput = z.object({
  title: z.string().trim().min(1).max(200),
  raw_jd_text: z.string().trim().min(50).max(20000),
});

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateJobInput.parse(data))
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);
    const extracted = await extractRequirements(data.raw_jd_text);
    const { data: job, error } = await context.supabase
      .from("job_requisitions")
      .insert({
        organization_id,
        created_by: context.userId,
        title: data.title,
        raw_jd_text: data.raw_jd_text,
        extracted_requirements: extracted as never,
      })
      .select("id")
      .single();
    if (error) throw error;
    await writeAudit(context.supabase, {
      organization_id,
      actor_user_id: context.userId,
      action: "job.created",
      target_type: "job_requisition",
      target_id: job.id,
      metadata: { title: data.title, requirements: extracted.requirements.length },
    });
    return { id: job.id, extracted };
  });

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("job_requisitions")
      .select("id, title, status, created_at, extracted_requirements")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map((j) => ({
      id: j.id,
      title: j.title,
      status: j.status,
      created_at: j.created_at,
      requirement_count: ((j.extracted_requirements as { requirements?: unknown[] })?.requirements ?? []).length,
    }));
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: job, error } = await context.supabase
      .from("job_requisitions")
      .select("*")
      .eq("id", data.id)
      .is("deleted_at", null)
      .single();
    if (error) throw error;
    const { data: candidates } = await context.supabase
      .from("candidates")
      .select("id, candidate_name, candidate_email, created_at, match_evaluations(id, overall_score, overall_confidence, gated_by_must_have)")
      .eq("job_requisition_id", data.id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    return { job, candidates: candidates ?? [] };
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), status: z.enum(["open", "closed", "archived"]) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("job_requisitions")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
