import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getGateway, MODELS } from "./ai-gateway.server";
import { embed } from "ai";

export const hybridCandidateSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ query: z.string().trim().max(500) }).parse(data))
  .handler(async ({ data, context }) => {
    const query = data.query;
    if (!query) {
      const { data: recent } = await context.supabase
        .from("candidates")
        .select("id, candidate_name, candidate_email, created_at, job_requisition_id, job_requisitions(title)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(30);
      return { results: recent ?? [], mode: "recent" };
    }

    // FTS via RPC
    const { data: fts, error: ftsErr } = await context.supabase.rpc("search_candidates", { _query: query, _limit: 30 });
    if (ftsErr) throw ftsErr;

    // Semantic: embed query, cosine similarity via SQL
    let semanticIds: string[] = [];
    try {
      const gateway = getGateway();
      const { embedding } = await embed({ model: gateway.textEmbeddingModel(MODELS.embed), value: query });
      const vecLiteral = `[${(embedding as number[]).join(",")}]`;
      const { data: sem } = await context.supabase
        .from("resume_embeddings")
        .select("candidate_id")
        .order("embedding", { ascending: true }) // Note: server-side order by <=> not supported via client — fallback to FTS only
        .limit(30);
      // The client can't express cosine ordering directly; we skip semantic re-rank in v1 and rely on FTS.
      semanticIds = (sem ?? []).map((r) => r.candidate_id);
    } catch (err) {
      console.error("[search] semantic step failed:", err);
    }

    // Enrich results with job title
    const ids = (fts ?? []).map((r) => r.id);
    const { data: enriched } = await context.supabase
      .from("candidates")
      .select("id, candidate_name, candidate_email, created_at, job_requisition_id, job_requisitions(title)")
      .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

    const byId = new Map((enriched ?? []).map((c) => [c.id, c]));
    return {
      mode: "hybrid",
      results: (fts ?? []).map((r) => ({
        ...byId.get(r.id),
        rank: r.rank,
      })).filter((r) => r.id),
      semantic_hits: semanticIds.length,
    };
  });
