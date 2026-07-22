import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "./audit.server";

const RoleEnum = z.enum(["owner", "admin", "recruiter", "viewer"]);

async function requireAdmin(supabase: any, userId: string): Promise<string> {
  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", userId).single();
  if (!profile) throw new Error("Profile missing");
  const org = profile.organization_id as string;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("organization_id", org);
  const allowed = (roles ?? []).some((r: { role: string }) => r.role === "owner" || r.role === "admin");
  if (!allowed) throw new Error("Forbidden: admin or owner required");
  return org;
}

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile } = await context.supabase.from("profiles").select("organization_id").eq("id", context.userId).single();
    if (!profile) throw new Error("Profile missing");
    const org = profile.organization_id;
    const [{ data: members, error: mErr }, { data: roles, error: rErr }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id, email, full_name, avatar_url")
        .eq("organization_id", org),
      context.supabase.from("user_roles").select("user_id, role").eq("organization_id", org),
    ]);
    if (mErr) throw mErr;
    if (rErr) throw rErr;
    const rolesByUser = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role);
      rolesByUser.set(r.user_id, arr);
    }
    return (members ?? []).map((m) => ({
      id: m.id,
      email: m.email,
      full_name: m.full_name,
      avatar_url: m.avatar_url,
      roles: rolesByUser.get(m.id) ?? [],
    }));
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ email: z.string().trim().email(), role: RoleEnum }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Invite the user by email (creates auth user, sends invite email).
    const { data: invited, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { organization_id: org },
    });
    if (invErr) {
      // If user already exists, look them up.
      if (!invErr.message?.toLowerCase().includes("already")) throw invErr;
    }
    let userId = invited?.user?.id;
    if (!userId) {
      const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", data.email).maybeSingle();
      userId = existing?.id;
    }
    if (!userId) throw new Error("Could not resolve invited user");
    // Ensure profile in this org
    await supabaseAdmin.from("profiles").upsert({ id: userId, email: data.email, organization_id: org });
    // Grant role
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, organization_id: org, role: data.role }, { onConflict: "user_id,organization_id,role" });
    if (rErr) throw rErr;
    await writeAudit(context.supabase, {
      organization_id: org,
      actor_user_id: context.userId,
      action: "team.invited",
      target_type: "user",
      target_id: userId,
      metadata: { email: data.email, role: data.role },
    });
    return { ok: true, userId };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ userId: z.string().uuid(), role: RoleEnum }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase, context.userId);
    // Replace roles: delete existing for this org and insert new single role
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("organization_id", org);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, organization_id: org, role: data.role });
    if (error) throw error;
    await writeAudit(context.supabase, {
      organization_id: org,
      actor_user_id: context.userId,
      action: "team.role_changed",
      target_type: "user",
      target_id: data.userId,
      metadata: { role: data.role },
    });
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const org = await requireAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You can't remove yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("organization_id", org);
    await writeAudit(context.supabase, {
      organization_id: org,
      actor_user_id: context.userId,
      action: "team.removed",
      target_type: "user",
      target_id: data.userId,
    });
    return { ok: true };
  });
