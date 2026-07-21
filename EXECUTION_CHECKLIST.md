# Execution Checklist — RecruitIQ MVP Build

Turn-by-turn build sequence.

## Turn 1 — Foundations ✅ DONE
See `LAUNCH_CHECKLIST.md` for detail.

## Turn 2 — Onboarding + Jobs
1. Create `src/routes/_authenticated/route.tsx` (auto-managed by Lovable)
2. `/onboarding` wizard: paste JD → extract → sample resumes CTA
3. Multi-step loader component polling `pipeline_runs`
4. `src/lib/jobs.functions.ts` → `createJob`, `extractRequirements`, `listJobs`, `getJob`
5. Route: `/app/jobs`, `/app/jobs/$id`
6. Audit log helper

## Turn 3 — Full Pipeline
1. `src/lib/pdf.server.ts` — PDF text extraction (unpdf)
2. `src/lib/pipeline.server.ts` — 4-agent runner
3. Deterministic `computeScore(evidence, requirements)` — unit-tested
4. Prompt-injection sanitizer
5. Server fn `uploadCandidate` (signed URL → upload → enqueue)
6. Server fn `runMatchPipeline` (blocking, updates pipeline_runs)
7. UI: `/app/jobs/$id/candidates/$candidateId` breakdown

## Turn 4 — Team + RAG
1. Embed resume chunks during pipeline
2. Hybrid search fn (pgvector cosine + FTS on `raw_resume_text`)
3. `/app/team` invites via `supabaseAdmin.auth.admin.inviteUserByEmail`
4. Role management UI + audit log entries
5. `/app/candidates` global search

## Turn 5 — Billing
1. Enable Lovable Stripe payments
2. Product/price IDs → plan mapping
3. Webhook → update `organizations.plan` + quota
4. Quota check middleware on pipeline server fn
5. `/app/settings/*` pages
6. Account deletion flow with re-auth confirmation

## Turn 6 — Hardening
1. Playwright E2E
2. Scoring unit tests
3. Reduced-motion audit
4. Fill all checklists
5. README with HLD/LLD diagrams
