import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// MOCK BILLING — no real payment gateway. Plan changes are applied directly
// by security-definer DB functions (owner/admin only) and logged as mock
// billing_events. Swap these for real checkout + webhook when payments go live.

export const getBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await context.supabase.rpc("apply_due_cancellation");
    const { data: profile } = await context.supabase.from("profiles").select("organization_id").eq("id", context.userId).single();
    if (!profile) throw new Error("Profile not found");
    const { data: org } = await context.supabase
      .from("organizations")
      .select("name, plan, monthly_candidate_quota, candidates_used_this_period, subscription_status, current_period_end, cancel_at_period_end")
      .eq("id", profile.organization_id)
      .single();
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("organization_id", profile.organization_id);
    const { data: events } = await context.supabase
      .from("billing_events")
      .select("id, event_type, from_plan, to_plan, amount_cents, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    const canManage = (roles ?? []).some((r) => r.role === "owner" || r.role === "admin");
    return { org, events: events ?? [], canManage };
  });

const errMsg = (m: string) => m.replace(/^FORBIDDEN:\s*/, "");

export const mockCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ plan: z.enum(["starter", "growth"]), cardLast4: z.string().regex(/^\d{4}$/) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Mock decline card: 0002 simulates a failed payment.
    if (data.cardLast4 === "0002") return { ok: false, error: "Your card was declined (test card)." };
    const { error } = await context.supabase.rpc("mock_change_plan", { _plan: data.plan });
    if (error) return { ok: false, error: errMsg(error.message) };
    return { ok: true };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      reason: z.string().trim().min(1).max(200),
      feedback: z.string().trim().max(2000).optional(),
      immediate: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("mock_cancel_subscription", {
      _reason: data.reason, _feedback: data.feedback ?? undefined, _immediate: data.immediate,
    });
    if (error) return { ok: false, error: errMsg(error.message) };
    return { ok: true };
  });

export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.rpc("mock_resume_subscription");
    if (error) return { ok: false, error: errMsg(error.message) };
    return { ok: true };
  });
