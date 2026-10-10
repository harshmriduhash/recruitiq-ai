import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";

// Server-function error monitoring: tags every call with a request ID and
// records failures to error_events (visible to owners/admins on /app/activity).
export const errorMonitoringMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const requestId = crypto.randomUUID();
  try {
    setResponseHeader("x-request-id", requestId);
  } catch {
    /* header already sent */
  }
  try {
    return await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[req ${requestId}]`, message);
    try {
      const auth = getRequest()?.headers.get("authorization") ?? "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
      if (token && !message.startsWith("Rate limit")) {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: u } = await supabaseAdmin.auth.getUser(token);
        if (u?.user) {
          const { data: p } = await supabaseAdmin.from("profiles").select("organization_id").eq("id", u.user.id).maybeSingle();
          await supabaseAdmin.from("error_events").insert({
            user_id: u.user.id,
            organization_id: p?.organization_id ?? null,
            request_id: requestId,
            source: "server_fn",
            message: message.slice(0, 2000),
            metadata: { url: getRequest()?.url ?? null },
          });
        }
      }
    } catch (logErr) {
      console.error("[monitoring] failed to record", logErr);
    }
    throw err;
  }
});
