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

/* ------------------------------------------------------------------ */
/* Per-candidate sync + voice → ATS mapping                            */
/* ------------------------------------------------------------------ */

type RemoteCandidate = { name: string | null; email: string | null; stage: string | null };

async function fetchRemoteCandidate(provider: string, apiKey: string, externalId: string): Promise<RemoteCandidate> {
  const auth = "Basic " + btoa(`${apiKey}:`);
  if (provider === "greenhouse") {
    const r = await fetch(`https://harvest.greenhouse.io/v1/candidates/${encodeURIComponent(externalId)}`, { headers: { Authorization: auth } });
    if (!r.ok) throw new Error(`Greenhouse ${r.status}: ${await r.text()}`);
    const c: any = await r.json();
    return {
      name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || null,
      email: c.email_addresses?.[0]?.value ?? null,
      stage: c.applications?.[0]?.current_stage?.name ?? null,
    };
  }
  if (provider === "lever") {
    const r = await fetch(`https://api.lever.co/v1/opportunities/${encodeURIComponent(externalId)}`, { headers: { Authorization: auth } });
    if (!r.ok) throw new Error(`Lever ${r.status}: ${await r.text()}`);
    const j: any = await r.json();
    const c = j.data ?? {};
    return { name: c.name ?? null, email: c.emails?.[0] ?? null, stage: c.stage?.text ?? c.stage ?? null };
  }
  if (provider === "ashby") {
    const r = await fetch("https://api.ashbyhq.com/candidate.info", {
      method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ id: externalId }),
    });
    if (!r.ok) throw new Error(`Ashby ${r.status}: ${await r.text()}`);
    const j: any = await r.json();
    const c = j.results ?? {};
    return { name: c.name ?? null, email: c.primaryEmailAddress?.value ?? null, stage: c.applicationIds?.length ? "Active" : null };
  }
  throw new Error("Unknown provider");
}

/** Where does this candidate come from in the ATS (if anywhere)? */
export const getCandidateAtsLink = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ candidateId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("ats_imports")
      .select("id, provider, external_candidate_id, external_job_id, external_stage, last_synced_at, connection_id, created_at")
      .eq("candidate_id", data.candidateId)
      .maybeSingle();
    return row ?? null;
  });

/** Pull the latest name / email / stage for one imported candidate. */
export const syncAtsCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ candidateId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { organization_id } = await ctx(context.supabase, context.userId);

    const { data: link } = await context.supabase
      .from("ats_imports")
      .select("id, connection_id, provider, external_candidate_id")
      .eq("candidate_id", data.candidateId)
      .maybeSingle();
    if (!link) return { ok: false, error: "This candidate was not imported from an ATS." };

    const { data: conn } = await context.supabase
      .from("ats_connections")
      .select("id, provider, api_key")
      .eq("id", link.connection_id)
      .maybeSingle();
    if (!conn) return { ok: false, error: "ATS connection not found or you lack access." };

    try {
      const remote = await fetchRemoteCandidate(conn.provider, conn.api_key, link.external_candidate_id);
      const patch: { candidate_name?: string; candidate_email?: string } = {};
      if (remote.name) patch.candidate_name = remote.name;
      if (remote.email) patch.candidate_email = remote.email;
      if (Object.keys(patch).length) {
        await context.supabase.from("candidates").update(patch).eq("id", data.candidateId);
      }
      await context.supabase
        .from("ats_imports")
        .update({ last_synced_at: new Date().toISOString(), external_stage: remote.stage })
        .eq("id", link.id);
      await context.supabase
        .from("ats_connections")
        .update({ last_sync_at: new Date().toISOString(), status: "active", last_error: null })
        .eq("id", conn.id);

      await writeAudit(context.supabase, {
        organization_id, actor_user_id: context.userId, action: "ats.candidate_synced",
        target_type: "candidate", target_id: data.candidateId, metadata: { provider: conn.provider, stage: remote.stage },
      });
      return { ok: true, name: remote.name, email: remote.email, stage: remote.stage };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase.from("ats_connections").update({ status: "error", last_error: msg }).eq("id", conn.id);
      return { ok: false, error: msg };
    }
  });

function voiceNoteBody(screen: any, candidateName: string | null) {
  const n = screen.structured_notes ?? {};
  const lines: string[] = [];
  lines.push(`RecruitIQ voice pre-screen${candidateName ? ` — ${candidateName}` : ""}`);
  if (screen.summary) lines.push("", screen.summary);
  if (n.recommendation) lines.push("", `Recommendation: ${n.recommendation}`);
  const meta = [
    n.compensation ? `Compensation: ${n.compensation}` : null,
    n.start_date ? `Start date: ${n.start_date}` : null,
    n.work_authorization ? `Work authorization: ${n.work_authorization}` : null,
  ].filter(Boolean) as string[];
  if (meta.length) lines.push("", ...meta);
  if (Array.isArray(n.answers) && n.answers.length) {
    lines.push("", "Q&A:");
    for (const qa of n.answers) lines.push(`- ${qa.question}`, `  ${qa.answer}`);
  }
  if (screen.recruiter_notes) lines.push("", `Recruiter notes: ${screen.recruiter_notes}`);
  return lines.join("\n");
}

/** Map a completed voice pre-screen onto the candidate's ATS record as a note. */
export const pushVoiceScreenToAts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ screenId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { organization_id } = await ctx(context.supabase, context.userId);

    const { data: screen } = await context.supabase
      .from("voice_screens")
      .select("id, candidate_id, status, summary, structured_notes, recruiter_notes, review_status")
      .eq("id", data.screenId)
      .maybeSingle();
    if (!screen) return { ok: false, error: "Pre-screen not found" };
    if (screen.status !== "complete") return { ok: false, error: "Finish the pre-screen before sending it to your ATS." };

    const { data: link } = await context.supabase
      .from("ats_imports")
      .select("connection_id, provider, external_candidate_id")
      .eq("candidate_id", screen.candidate_id)
      .maybeSingle();
    if (!link) return { ok: false, error: "This candidate was not imported from an ATS, so there is nothing to sync to." };

    const { data: conn } = await context.supabase
      .from("ats_connections")
      .select("id, provider, api_key, config")
      .eq("id", link.connection_id)
      .maybeSingle();
    if (!conn) return { ok: false, error: "ATS connection not found or you lack access." };

    const { data: cand } = await context.supabase
      .from("candidates").select("candidate_name").eq("id", screen.candidate_id).maybeSingle();

    const body = voiceNoteBody(screen, cand?.candidate_name ?? null);
    const auth = "Basic " + btoa(`${conn.api_key}:`);
    const cfg = (conn.config ?? {}) as Record<string, any>;

    try {
      let externalNoteId: string | null = null;
      if (conn.provider === "greenhouse") {
        const onBehalfOf = cfg.on_behalf_of_user_id;
        if (!onBehalfOf) throw new Error("Greenhouse needs an 'On-Behalf-Of' user id saved on the connection before notes can be created.");
        const r = await fetch(`https://harvest.greenhouse.io/v1/candidates/${encodeURIComponent(link.external_candidate_id)}/activity_feed/notes`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json", "On-Behalf-Of": String(onBehalfOf) },
          body: JSON.stringify({ user_id: Number(onBehalfOf), body, visibility: "admin_only" }),
        });
        if (!r.ok) throw new Error(`Greenhouse ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        externalNoteId = j?.id ? String(j.id) : null;
      } else if (conn.provider === "lever") {
        const performAs = cfg.perform_as_user_id;
        const qs = performAs ? `?perform_as=${encodeURIComponent(String(performAs))}` : "";
        const r = await fetch(`https://api.lever.co/v1/opportunities/${encodeURIComponent(link.external_candidate_id)}/notes${qs}`, {
          method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ value: body }),
        });
        if (!r.ok) throw new Error(`Lever ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        externalNoteId = j?.data?.id ? String(j.data.id) : null;
      } else if (conn.provider === "ashby") {
        const r = await fetch("https://api.ashbyhq.com/candidate.createNote", {
          method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: link.external_candidate_id, note: { type: "text/plain", value: body } }),
        });
        if (!r.ok) throw new Error(`Ashby ${r.status}: ${await r.text()}`);
        const j: any = await r.json();
        if (j?.success === false) throw new Error(`Ashby: ${JSON.stringify(j.errors ?? j)}`);
        externalNoteId = j?.results?.id ? String(j.results.id) : null;
      }

      await context.supabase.from("voice_screens").update({
        ats_synced_at: new Date().toISOString(),
        ats_external_note_id: externalNoteId,
        ats_sync_error: null,
      }).eq("id", screen.id);

      await writeAudit(context.supabase, {
        organization_id, actor_user_id: context.userId, action: "voice_screen.synced_to_ats",
        target_type: "voice_screen", target_id: screen.id, metadata: { provider: conn.provider },
      });
      return { ok: true, provider: conn.provider, externalNoteId };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await context.supabase.from("voice_screens").update({ ats_sync_error: msg }).eq("id", screen.id);
      return { ok: false, error: msg };
    }
  });
