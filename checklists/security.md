# Security Checklist

## Row-Level Security
- ✅ RLS enabled on every table in `public`
- ✅ `GRANT` statements in the same migration as every `CREATE TABLE`
- ✅ Tenant isolation via `public.is_org_member(org_id)`
- ✅ Role checks via `public.has_role(user_id, org_id, role)` (SECURITY DEFINER)

## Roles
- ✅ Roles stored in a **separate** `user_roles` table (not on `profiles`)
- ✅ `app_role` enum: owner / admin / recruiter / viewer
- ✅ RBAC-guarded server functions (`assertAdmin` for ATS + team invites)

## Storage
- ✅ `resumes` bucket — private, org-scoped path RLS
- ✅ `voice-recordings` bucket — private, org-scoped path RLS
- ✅ Signed upload URLs, never anon uploads

## Secrets
- ✅ `LOVABLE_API_KEY` server-only (`process.env`, read inside handler)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` used only inside `.server.ts` modules
- ✅ ATS API keys stored in `ats_connections.api_key`
  (SELECT restricted to Owner/Admin via RLS)
- ✅ No secrets logged, echoed, or shipped to the client bundle

## AI safety
- ✅ Prompt-injection sanitization strips instruction overrides from resume text
- ✅ PII (name, gender-coded pronouns) stripped before scoring
- ✅ Every match claim must cite exact resume excerpt (verified server-side)
- ✅ Must-have gate caps overall score

## Session
- ✅ Bearer-token client middleware attaches Supabase JWT
- ✅ `requireSupabaseAuth` server middleware validates JWT and provides RLS-scoped client
