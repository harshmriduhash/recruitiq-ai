import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyOrg = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id, full_name, email")
      .eq("id", context.userId)
      .single();
    if (!profile) throw new Error("Profile not found");
    const { data: org } = await context.supabase
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("organization_id", profile.organization_id);
    return {
      user: { id: context.userId, email: profile.email, name: profile.full_name },
      organization: org,
      roles: (roles ?? []).map((r) => r.role),
    };
  });

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", context.userId)
      .single();
    if (!profile) throw new Error("Profile not found");
    const { error } = await context.supabase
      .from("organizations")
      .update({ onboarding_completed_at: new Date().toISOString() })
      .eq("id", profile.organization_id);
    if (error) throw error;
    return { ok: true };
  });

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ count: jobs }, { count: candidates }, { count: evals }, { data: recent }] = await Promise.all([
      context.supabase.from("job_requisitions").select("*", { count: "exact", head: true }).is("deleted_at", null),
      context.supabase.from("candidates").select("*", { count: "exact", head: true }).is("deleted_at", null),
      context.supabase.from("match_evaluations").select("*", { count: "exact", head: true }),
      context.supabase
        .from("match_evaluations")
        .select("id, overall_score, overall_confidence, created_at, candidate_id, job_requisition_id, candidates(candidate_name), job_requisitions(title)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    return {
      jobs: jobs ?? 0,
      candidates: candidates ?? 0,
      evaluations: evals ?? 0,
      recent: recent ?? [],
    };
  });
