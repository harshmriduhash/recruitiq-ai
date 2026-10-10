import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Owners/admins: audit log + recent errors. RLS limits audit/error reads to the org.
export const listActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: audit } = await context.supabase
      .from("audit_logs")
      .select("id, action, target_type, target_id, metadata, created_at, actor_user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    const { data: errors } = await context.supabase
      .from("error_events")
      .select("id, request_id, source, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return { audit: audit ?? [], errors: errors ?? [] };
  });
