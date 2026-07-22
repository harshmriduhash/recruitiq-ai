// 4-agent evaluation pipeline. Runs on the server, updates pipeline_runs row-by-row.
import { generateText, Output, embed } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getGateway, MODELS } from "./ai-gateway.server";
import { extractPdfText, sanitizeResumeText, stripBiasSignals } from "./pdf.server";
import { computeScore, verifyEvidence, type Requirement, type Evidence } from "./scoring";

const RequirementsSchema = z.object({
  requirements: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      must_have: z.boolean(),
      weight: z.number(),
      category: z.string().optional(),
    }),
  ),
  role_summary: z.string().optional(),
});

export type ExtractedRequirements = z.infer<typeof RequirementsSchema>;

// AGENT 1 — Requirement extraction from a raw job description.
export async function extractRequirements(jdText: string): Promise<ExtractedRequirements> {
  const gateway = getGateway();
  const { output } = await generateText({
    model: gateway(MODELS.fast),
    output: Output.object({
      schema: RequirementsSchema,
    }),
    prompt: `You are a technical recruiter. From the job description below, extract 5-12 concrete, testable requirements.

For each requirement:
- id: a short kebab-case slug (unique)
- label: 3-8 words describing the requirement in plain language
- must_have: true only if the JD explicitly marks it required / minimum / mandatory
- weight: 1 (nice-to-have) to 5 (critical differentiator)
- category: optional — one of "skill", "experience", "education", "domain", "soft-skill"

Return a role_summary of 1-2 sentences.

JOB DESCRIPTION:
${jdText.slice(0, 8000)}`,
  });
  return output;
}

// AGENT 2 — Evidence finder. Returns per-requirement evidence with source excerpts.
const EvidenceListSchema = z.object({
  evidences: z.array(
    z.object({
      requirement_id: z.string(),
      present: z.enum(["yes", "partial", "no"]),
      excerpt: z.string().optional(),
      confidence: z.enum(["high", "medium", "low"]),
      reasoning: z.string().optional(),
    }),
  ),
});

async function findEvidence(
  requirements: Requirement[],
  resumeText: string,
): Promise<Evidence[]> {
  const gateway = getGateway();
  const reqList = requirements
    .map((r) => `- [${r.id}] ${r.label} ${r.must_have ? "(MUST-HAVE)" : ""} weight=${r.weight}`)
    .join("\n");

  const { output } = await generateText({
    model: gateway(MODELS.fast),
    output: Output.object({ schema: EvidenceListSchema }),
    prompt: `You are an evidence-finding agent. For EACH requirement below, decide whether the resume shows evidence of it, and quote the exact resume text that proves it.

RULES:
- If you cannot find a verbatim excerpt from the resume, mark present="no". Never fabricate.
- excerpt MUST be copied verbatim from the resume, 10-200 chars.
- Return one evidence entry per requirement_id (no more, no less).
- present="yes" only if the excerpt clearly proves the requirement.
- present="partial" if the excerpt hints at it but is not conclusive.

REQUIREMENTS:
${reqList}

RESUME (sanitized):
${resumeText.slice(0, 12000)}`,
  });
  return output.evidences as Evidence[];
}

// AGENT 4 — Plain-language summary.
async function summarize(
  jobTitle: string,
  breakdown: ReturnType<typeof computeScore>,
): Promise<string> {
  const gateway = getGateway();
  const wins = breakdown.requirement_breakdown.filter((r) => r.present === "yes").map((r) => r.label);
  const gaps = breakdown.requirement_breakdown.filter((r) => r.present === "no" && r.must_have).map((r) => r.label);
  const partials = breakdown.requirement_breakdown.filter((r) => r.present === "partial").map((r) => r.label);

  const { text } = await generateText({
    model: gateway(MODELS.fast),
    prompt: `Write a 2-3 sentence plain-language hiring-manager summary for this candidate for the "${jobTitle}" role.
Overall score: ${breakdown.overall_score}/100 (confidence: ${breakdown.overall_confidence})
${breakdown.gated_by_must_have ? "NOTE: A must-have requirement is missing." : ""}
Strengths: ${wins.join(", ") || "none"}
Partial: ${partials.join(", ") || "none"}
Missing must-haves: ${gaps.join(", ") || "none"}

Be honest, avoid hype. Do NOT invent details.`,
  });
  return text.trim();
}

// Split resume text into chunks for embedding.
function chunkText(text: string, size = 800): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.slice(0, 20); // cap
}

export async function runFullPipeline(args: {
  supabase: SupabaseClient<Database>;
  organizationId: string;
  jobRequisitionId: string;
  candidateId: string;
  storagePath: string;
  pipelineRunId: string;
}): Promise<{ evaluationId: string }> {
  const { supabase, organizationId, jobRequisitionId, candidateId, storagePath, pipelineRunId } = args;

  const updateRun = (patch: Database["public"]["Tables"]["pipeline_runs"]["Update"]) =>
    supabase.from("pipeline_runs").update(patch).eq("id", pipelineRunId);

  try {
    await updateRun({ status: "extracting", current_stage: "Downloading resume", progress: 5, started_at: new Date().toISOString() });

    // 1) Download PDF from storage
    const { data: blob, error: dlErr } = await supabase.storage.from("resumes").download(storagePath);
    if (dlErr || !blob) throw new Error(`Storage download failed: ${dlErr?.message}`);
    const buf = await blob.arrayBuffer();

    await updateRun({ current_stage: "Extracting resume text", progress: 15 });
    const rawText = await extractPdfText(buf);
    const sanitized = sanitizeResumeText(rawText);
    const forScoring = stripBiasSignals(sanitized);

    await supabase.from("candidates").update({ raw_resume_text: sanitized }).eq("id", candidateId);

    // 2) Fetch job requirements
    const { data: job, error: jobErr } = await supabase
      .from("job_requisitions")
      .select("title, extracted_requirements")
      .eq("id", jobRequisitionId)
      .single();
    if (jobErr || !job) throw new Error("Job requisition not found");
    const reqs = ((job.extracted_requirements as { requirements?: Requirement[] })?.requirements ?? []) as Requirement[];
    if (reqs.length === 0) throw new Error("No requirements to evaluate against");

    // 3) Agent 2 — evidence
    await updateRun({ current_stage: "Finding evidence in resume", progress: 35 });
    const rawEvidence = await findEvidence(reqs, forScoring);
    const verified = verifyEvidence(rawEvidence, sanitized);

    // 4) Deterministic scoring
    await updateRun({ status: "scoring", current_stage: "Computing weighted score", progress: 65 });
    const breakdown = computeScore(reqs, verified);

    // 5) Agent 4 — summary
    await updateRun({ status: "explaining", current_stage: "Writing summary", progress: 80 });
    const summary = await summarize(job.title, breakdown);

    // 6) Persist evaluation
    const { data: evalRow, error: evalErr } = await supabase
      .from("match_evaluations")
      .insert({
        organization_id: organizationId,
        candidate_id: candidateId,
        job_requisition_id: jobRequisitionId,
        pipeline_run_id: pipelineRunId,
        overall_score: breakdown.overall_score,
        overall_confidence: breakdown.overall_confidence,
        requirement_breakdown: breakdown.requirement_breakdown as never,
        summary_text: summary,
        model_version: `${MODELS.fast}+deterministic-v1`,
        gated_by_must_have: breakdown.gated_by_must_have,
      })
      .select("id")
      .single();
    if (evalErr) throw evalErr;

    // 7) Best-effort embeddings for search
    try {
      await updateRun({ current_stage: "Indexing for search", progress: 92 });
      const gateway = getGateway();
      const chunks = chunkText(sanitized);
      for (let i = 0; i < chunks.length; i++) {
        const { embedding } = await embed({ model: gateway.textEmbeddingModel(MODELS.embed), value: chunks[i] });
        await supabase.from("resume_embeddings").insert({
          organization_id: organizationId,
          candidate_id: candidateId,
          chunk_index: i,
          content: chunks[i],
          embedding: embedding as unknown as string,
        });
      }
    } catch (embErr) {
      console.error("[pipeline] embedding failed (non-fatal):", embErr);
    }

    await updateRun({ status: "complete", current_stage: "Complete", progress: 100, completed_at: new Date().toISOString() });
    return { evaluationId: evalRow.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[pipeline] failed:", err);
    await updateRun({ status: "failed", error_code: "PIPELINE_ERROR", error_message: message, completed_at: new Date().toISOString() });
    throw err;
  }
}
