# RecruitIQ — Launch Checklist

Master pre-launch checklist. See also: `MVP_LAUNCH_CHECKLIST.md`, `PRODUCTION_CHECKLIST.md`, `EXECUTION_CHECKLIST.md`, `READY_CHECKLIST.md`.

## Turn 1 (Foundations) — DONE ✅
- [x] Lovable Cloud enabled
- [x] LOVABLE_API_KEY provisioned
- [x] Design system (Bold Tech: violet + cyan + navy, Inter + Fira Code, dark-first)
- [x] Root layout with real metadata, session-aware nav, root auth subscriber
- [x] Full DB schema (organizations, profiles, user_roles, jobs, candidates, matches, pipeline_runs, audit_logs, resume_embeddings) with RLS + GRANTs
- [x] Signup trigger auto-creates workspace + owner role
- [x] Storage bucket `resumes` (private, org-scoped)
- [x] Public routes: `/`, `/pricing`, `/how-it-works`, `/security`
- [x] Auth routes: `/auth`, `/forgot-password`, `/reset-password`
- [x] Google OAuth enabled via Lovable-managed provider
- [x] `sitemap.xml` + `robots.txt`

## Turn 2 (Onboarding + Jobs) — PENDING
- [ ] `_authenticated` gate
- [ ] `/onboarding` 3-step wizard with Multi-Step Loader
- [ ] `/app/dashboard`, `/app/jobs`, `/app/jobs/$id`
- [ ] `extractRequirements` server fn (Gemini flash structured output)
- [ ] Audit log writes on job CRUD

## Turn 3 (Full pipeline) — PENDING
- [ ] Resume upload (PDF/DOCX) with magic-byte validation
- [ ] PDF text extraction server fn
- [ ] `runMatchPipeline` server fn (4-agent, deterministic scorer, prompt-injection sanitization, source-excerpt verification)
- [ ] `/app/jobs/$id/candidates/$candidateId` match breakdown UI
- [ ] Confidence flag on low-evidence matches

## Turn 4 (Team + RAG) — PENDING
- [ ] `/app/team` invite/RBAC (owner/admin/recruiter/viewer)
- [ ] `/app/candidates` global hybrid search (pgvector + FTS)
- [ ] Resume embeddings pipeline

## Turn 5 (Billing) — PENDING
- [ ] Stripe payments (Starter/Growth)
- [ ] Candidate quota enforcement
- [ ] `/app/settings/{profile,billing,api-keys}`
- [ ] Account deletion (14-day soft-delete)
- [ ] Subscription cancellation → read-only free tier

## Turn 6 (Hardening) — PENDING
- [ ] Playwright E2E (signup, onboarding, upload+match, delete)
- [ ] Scoring function unit tests (must-have gating, property-based)
- [ ] `prefers-reduced-motion` audit
- [ ] All checklists populated
- [ ] Attractive README with HLD/LLD

## Pre-public-launch gate (from PRD §10.6)
- [ ] All auth edge cases tested (expired reset token, concurrent session revocation)
- [ ] Rate limiting verified under load
- [ ] AI pipeline cost-per-run confirmed against financial model
- [ ] Backup restore drill completed
- [ ] Sentry-equivalent error tracking firing on test error
- [ ] Legal review: privacy policy + ToS (candidate resume data compliance)
- [ ] ClamAV or hosted equivalent virus scan on resume uploads (currently type + size only)
- [ ] Password HIBP check enabled in Cloud Auth Settings
