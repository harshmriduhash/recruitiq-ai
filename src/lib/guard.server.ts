// Server-only: per-plan rate limiting, job embeddings, and error event capture.
import { embed } from "ai";
import { getGateway, MODELS } from "./ai-gateway.server";

export async function enforceRateLimit(supabase: any, bucket: string) {
  const { data, error } = await supabase.rpc("check_rate_limit", { _bucket: bucket, _window_seconds: 60 });
  if (error) {
    console.error("[rate-limit]", error);
    return; // fail open on infra errors
  }
  const r = data as { allowed: boolean; limit: number; plan: string };
  if (!r?.allowed) {
    throw new Error(
      `Rate limit reached: your ${r?.plan ?? ""} plan allows ${r?.limit} ${bucket} requests per minute. Please wait a moment and try again.`,
    );
  }
}

export function jobEmbeddingText(title: string, extracted: any): string {
  const reqs = (extracted?.requirements ?? []) as { label: string; must_have?: boolean }[];
  return `${title}\n${reqs.map((r) => `${r.must_have ? "MUST" : "NICE"}: ${r.label}`).join("\n")}`.slice(0, 8000);
}

export async function embedText(text: string): Promise<string | null> {
  try {
    const { embedding } = await embed({ model: getGateway().textEmbeddingModel(MODELS.embed), value: text });
    return `[${(embedding as number[]).join(",")}]`;
  } catch (e) {
    console.error("[embed] failed (non-fatal)", e);
    return null;
  }
}

export async function recordErrorEvent(
  supabase: any,
  args: { userId: string; organizationId?: string | null; requestId: string; source: string; message: string; metadata?: Record<string, unknown> },
) {
  try {
    await supabase.from("error_events").insert({
      user_id: args.userId,
      organization_id: args.organizationId ?? null,
      request_id: args.requestId,
      source: args.source,
      message: args.message.slice(0, 2000),
      metadata: args.metadata ?? {},
    });
  } catch (e) {
    console.error("[error-events] insert failed", e);
  }
}
