import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function writeAudit(
  supabase: SupabaseClient<Database>,
  args: { organization_id: string; actor_user_id: string; action: string; target_type: string; target_id?: string; metadata?: Record<string, unknown> },
) {
  const { error } = await supabase.from("audit_logs").insert({
    organization_id: args.organization_id,
    actor_user_id: args.actor_user_id,
    action: args.action,
    target_type: args.target_type,
    target_id: args.target_id ?? null,
    metadata: (args.metadata ?? {}) as never,
  });
  if (error) console.error("[audit]", error);
}
