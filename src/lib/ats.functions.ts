import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { writeAudit } from "./audit.server";

type Provider = "greenhouse" | "lever" | "ashby";

async function ctx(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("organization_id").eq("id", userId).single();
  if (error || !data) throw new Error("Profile missing");
  return { organization_id: data.organization_id as string };
}

async function assertAdmin(supabase: any, userId: string, orgId: string) {
  const { data: owner } = await supabase.rpc("has_role", { _user_id: userId, _org_id: orgId, _role: "owner" });
  if (owner) return;
  const { data: admin } = await supabase.rpc("has_role", { _user_id: userId, _org_id: orgId, _role: "admin" });
  if (!admin) throw new Error("Forbidden — Owner or Admin only");
}

/** Validate API key by making a lightweight call to the provider. */
async function pingProvider(provider: Provider, apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "greenhouse") {
      const auth = "Basic " + btoa(`${apiKey}:`);
      const r = await fetch("https://harvest.greenhouse.io/v1/jobs?per_page=1", { headers: { Authorization: auth } });
      if (!r.ok) return { ok: false, error: `Greenhouse ${r.status}: ${await r.text()}` };
      return { ok: true };
    }
    if (provider === "lever") {
      const auth = "Basic " + btoa(`${apiKey}:`);
      const r = await fetch("https://api.lever.co/v1/postings?limit=1", { headers: { Authorization: auth } });
      if (!r.ok) return { ok: false, error: `Lever ${r.status}: ${await r.text()}` };
      return { ok: true };
    }
    if (provider === "ashby") {
      const auth = "Basic " + btoa(`${apiKey}:`);
      const r = await fetch("https://api.ashbyhq.com/job.list", {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 1 }),
      });
      if (!r.ok) return { ok: false, error: `Ashby ${r.status}: ${await r.text()}` };
      return { ok: true };
    }
    return { ok: false, error: "Unknown provider" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export const listAtsConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("ats_connections")
      .select("id, provider, display_name, status, last_sync_at, last_error, created_at, config")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const createAtsConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        provider: z.enum(["greenhouse", "lever", "ashby"]),
        displayName: z.string().min(1).max(120),
        apiKey: z.string().min(8).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { organization_id } = await ctx(context.supabase, context.userId);
    await assertAdmin(context.supabase, context.userId, organization_id);

    const ping = await pingProvider(data.provider, data.apiKey);
    if (!ping.ok) return { ok: false, error: ping.error };

    const { data: row, error } = await context.supabase
      .from("ats_connections")
      .insert({
        organization_id,
        provider: data.provider,
        display_name: data.displayName,
        api_key: data.apiKey,
        status: "active",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };

    await writeAudit(context.supabase, {
      organization_id,
      actor_user_id: context.userId,
      action: "ats.connected",
      target_type: "ats_connection",
      target_id: row.id,
      metadata: { provider: data.provider },
    });
    return { ok: true, id: row.id };
  });

export const deleteAtsConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { organization_id } = await ctx(context.supabase, context.userId);
    await assertAdmin(context.supabase, context.userId, organization_id);
    const { error } = await context.supabase
      .from("ats_connections")
      .update({ deleted_at: new Date().toISOString(), status: "disabled" })
      .eq("id", data.id);
    if (error) throw error;
    await writeAudit(context.supabase, {
      organization_id, actor_user_id: context.userId, action: "ats.disconnected",
      target_type: "ats_connection", target_id: data.id,
    });
    return { ok: true };
  });

/** List remote jobs from a provider (for the UI to pick from before syncing). */
export const listRemoteJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ connectionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { organization_id } = await ctx(context.supabase, context.userId);
    await assertAdmin(context.supabase, context.userId, organization_id);

    const { data: conn, error } = await context.supabase
      .from("ats_connections")
      .select("id, provider, api_key")
      .eq("id", data.connectionId)
      .single();
    if (error || !conn) throw new Error("Connection not found");

    const auth = "Basic " + btoa(`${conn.api_key}:`);
    try {
      if (conn.provider === "greenhouse") {
        const r = await fetch("https://harvest.greenhouse.io/v1/jobs?per_page=50&status=open", { headers: { Authorization: auth } });
        if (!r.ok) throw new Error(`Greenhouse ${r.status}: ${await r.text()}`);
        const j: any[] = await r.json();
        return j.map((x) => ({ id: String(x.id), title: x.name, location: x.offices?.[0]?.name ?? null }));
      }
      if (conn.provider === "lever") {
        const r = await fetch("https://api.lever.co/v1/postings?state=published&limit=50", { headers: { Authorization: auth } });
        if (!r.ok) throw new Error(`Lever ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        return (j.data ?? []).map((x: any) => ({ id: String(x.id), title: x.text, location: x.categories?.location ?? null }));
      }
      if (conn.provider === "ashby") {
        const r = await fetch("https://api.ashbyhq.com/job.list", {
          method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Open", limit: 50 }),
        });
        if (!r.ok) throw new Error(`Ashby ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        return (j.results ?? []).map((x: any) => ({ id: String(x.id), title: x.title, location: x.locationName ?? null }));
      }
      return [];
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : String(e));
    }
  });

/** Import candidates for a remote job into a target RecruitIQ job requisition. */
export const importCandidatesForJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        connectionId: z.string().uuid(),
        externalJobId: z.string().min(1),
        jobRequisitionId: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { organization_id } = await ctx(context.supabase, context.userId);
    await assertAdmin(context.supabase, context.userId, organization_id);

    const { data: conn, error } = await context.supabase
      .from("ats_connections")
      .select("id, provider, api_key")
      .eq("id", data.connectionId)
      .single();
    if (error || !conn) throw new Error("Connection not found");

    const auth = "Basic " + btoa(`${conn.api_key}:`);
    let remote: Array<{ id: string; name: string; email: string | null }> = [];

    try {
      if (conn.provider === "greenhouse") {
        const r = await fetch(`https://harvest.greenhouse.io/v1/candidates?job_id=${encodeURIComponent(data.externalJobId)}&per_page=100`, { headers: { Authorization: auth } });
        if (!r.ok) throw new Error(`Greenhouse ${r.status}: ${await r.text()}`);
        const j: any[] = await r.json();
        remote = j.map((c) => ({ id: String(c.id), name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Unknown", email: c.email_addresses?.[0]?.value ?? null }));
      } else if (conn.provider === "lever") {
        const r = await fetch(`https://api.lever.co/v1/opportunities?posting_id=${encodeURIComponent(data.externalJobId)}&limit=100`, { headers: { Authorization: auth } });
        if (!r.ok) throw new Error(`Lever ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        remote = (j.data ?? []).map((c: any) => ({ id: String(c.id), name: c.name || "Unknown", email: c.emails?.[0] ?? null }));
      } else if (conn.provider === "ashby") {
        const r = await fetch("https://api.ashbyhq.com/application.list", {
          method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: data.externalJobId, limit: 100 }),
        });
        if (!r.ok) throw new Error(`Ashby ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        remote = (j.results ?? []).map((a: any) => ({
          id: String(a.candidate?.id ?? a.id),
          name: a.candidate?.name || "Unknown",
          email: a.candidate?.primaryEmailAddress?.value ?? null,
        }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase.from("ats_connections").update({ status: "error", last_error: msg }).eq("id", conn.id);
      return { ok: false, error: msg, imported: 0 };
    }

    let imported = 0;
    let skipped = 0;
    for (const cand of remote) {
      // dedupe by connection + external candidate id
      const { data: existing } = await context.supabase
        .from("ats_imports")
        .select("id, candidate_id")
        .eq("connection_id", conn.id)
        .eq("external_candidate_id", cand.id)
        .maybeSingle();

      if (existing) { skipped++; continue; }

      const { data: newCand, error: cErr } = await context.supabase
        .from("candidates")
        .insert({
          organization_id,
          job_requisition_id: data.jobRequisitionId,
          uploaded_by: context.userId,
          candidate_name: cand.name,
          candidate_email: cand.email,
          resume_storage_path: `ats://${conn.provider}/${cand.id}`,
        })
        .select("id")
        .single();
      if (cErr) { skipped++; continue; }

      await context.supabase.from("ats_imports").insert({
        organization_id,
        connection_id: conn.id,
        provider: conn.provider,
        external_job_id: data.externalJobId,
        external_candidate_id: cand.id,
        candidate_id: newCand.id,
        job_requisition_id: data.jobRequisitionId,
        status: "imported",
      });
      imported++;
    }

    await context.supabase.from("ats_connections").update({
      last_sync_at: new Date().toISOString(),
      status: "active",
      last_error: null,
    }).eq("id", conn.id);

    await writeAudit(context.supabase, {
      organization_id,
      actor_user_id: context.userId,
      action: "ats.imported",
      target_type: "ats_connection",
      target_id: conn.id,
      metadata: { imported, skipped, external_job_id: data.externalJobId },
    });

    return { ok: true, imported, skipped };
  });
