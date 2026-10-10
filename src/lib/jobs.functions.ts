import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { extractRequirements } from "./pipeline.server";
import { writeAudit } from "./audit.server";
import { enforceRateLimit, embedText, jobEmbeddingText } from "./guard.server";

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
    await enforceRateLimit(context.supabase, "ai");
    const extracted = await extractRequirements(data.raw_jd_text);
    const requirements_embedding = await embedText(jobEmbeddingText(data.title, extracted));
    const { data: job, error } = await context.supabase
      .from("job_requisitions")
      .insert({
        organization_id,
        created_by: context.userId,
        title: data.title,
        raw_jd_text: data.raw_jd_text,
        extracted_requirements: extracted as never,
        requirements_embedding,
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

export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        raw_jd_text: z.string().trim().min(50).max(20000),
        reextract: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);
    const patch: Record<string, unknown> = { title: data.title, raw_jd_text: data.raw_jd_text };
    if (data.reextract) {
      await enforceRateLimit(context.supabase, "ai");
      patch.extracted_requirements = await extractRequirements(data.raw_jd_text);
    }
    const { data: cur } = await context.supabase.from("job_requisitions").select("extracted_requirements").eq("id", data.id).single();
    const emb = await embedText(jobEmbeddingText(data.title, patch.extracted_requirements ?? cur?.extracted_requirements));
    if (emb) patch.requirements_embedding = emb;
    const { error } = await context.supabase.from("job_requisitions").update(patch as never).eq("id", data.id);
    if (error) throw error;
    await writeAudit(context.supabase, {
      organization_id,
      actor_user_id: context.userId,
      action: "job.updated",
      target_type: "job_requisition",
      target_id: data.id,
      metadata: { reextracted: !!data.reextract },
    });
    return { ok: true };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const organization_id = await orgIdFor(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("job_requisitions")
      .update({ deleted_at: new Date().toISOString(), status: "archived" })
      .eq("id", data.id);
    if (error) throw error;
    await writeAudit(context.supabase, {
      organization_id,
      actor_user_id: context.userId,
      action: "job.deleted",
      target_type: "job_requisition",
      target_id: data.id,
      metadata: {},
    });
    return { ok: true };
  });

const STOP = new Set(["senior", "junior", "lead", "staff", "principal", "the", "and", "for", "with", "remote", "sr", "jr"]);

/** Past jobs with overlapping title keywords — used to reuse rubrics for repeat roles. */
export const findSimilarJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ title: z.string().trim().min(2).max(200), excludeId: z.string().uuid().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // Semantic first: embed the title and compare against stored requirement embeddings.
    const vec = await embedText(data.title);
    if (vec) {
      const { data: sem, error: semErr } = await context.supabase.rpc("match_similar_jobs", {
        _embedding: vec, _exclude: data.excludeId ?? undefined, _limit: 3,
      } as never);
      const rows = (sem ?? []) as any[];
      if (!semErr && rows.length) {
        return rows
          .filter((j) => j.similarity > 0.35)
          .map((j) => ({
            id: j.id, title: j.title, created_at: j.created_at, overlap: Math.round(j.similarity * 100),
            requirements: ((j.extracted_requirements?.requirements ?? []) as any[]).slice(0, 6),
          }));
      }
    }
    const words = data.title
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
      .slice(0, 5);
    if (!words.length) return [];
    let q = context.supabase
      .from("job_requisitions")
      .select("id, title, created_at, extracted_requirements")
      .is("deleted_at", null)
      .or(words.map((w) => `title.ilike.%${w.replace(/[,()%]/g, "")}%`).join(","))
      .order("created_at", { ascending: false })
      .limit(10);
    if (data.excludeId) q = q.neq("id", data.excludeId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return (rows ?? [])
      .map((j) => {
        const t = j.title.toLowerCase();
        const overlap = words.filter((w) => t.includes(w)).length;
        const reqs = ((j.extracted_requirements as { requirements?: { label: string; must_have: boolean }[] })?.requirements ?? []);
        return { id: j.id, title: j.title, created_at: j.created_at, overlap, requirements: reqs.slice(0, 6) };
      })
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3);
  });
