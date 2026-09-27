import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email, organization_id, deleted_at")
      .eq("id", context.userId)
      .single();
    if (!profile) throw new Error("Profile not found");
    const { data: org } = await context.supabase
      .from("organizations")
      .select("name, plan, monthly_candidate_quota, candidates_used_this_period, period_started_at")
      .eq("id", profile.organization_id)
      .single();
    return { profile, org };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ fullName: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// PRD §5.2 — soft delete with 14-day grace period. Signing back in within 14 days restores the account.
export const requestAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .single();
    const { error } = await context.supabase
      .from("profiles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", context.userId);
    if (error) throw error;
    if (profile) {
      await context.supabase.from("audit_logs").insert({
        organization_id: profile.organization_id,
        actor_user_id: context.userId,
        action: "account.deletion_requested",
        target_type: "profile",
        target_id: context.userId,
        metadata: { grace_days: 14 },
      });
    }
    return { ok: true };
  });

export const cancelAccountDeletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ deleted_at: null })
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
