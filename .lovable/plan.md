
# RecruitIQ MVP — Build Plan

Full PRD adapted to Lovable stack (TanStack Start + Lovable Cloud/Supabase + Lovable AI Gateway + pgvector). Built across multiple turns because the scope (10 route groups, 4-agent AI pipeline, RBAC, billing, RAG, animated marketing site, security/audit) exceeds a single turn's safe surface area. Each turn ships a working, deployable slice.

## Stack Adaptation (PRD → Lovable)

| PRD | Lovable equivalent |
|---|---|
| NestJS API | TanStack `createServerFn` + server routes |
| Prisma + Postgres | Supabase Postgres + migrations |
| Auth (JWT + refresh) | Supabase Auth (email/password + Google OAuth via broker) |
| BullMQ / Redis queue | Synchronous pipeline with per-stage progress polling from `pipeline_runs` table (small-scale; batches processed candidate-at-a-time server-side) |
| Pinecone | Postgres `pgvector` (halfvec, HNSW) — Lovable-native |
| OpenAI GPT-4o | Lovable AI Gateway: `google/gemini-3-flash-preview` (extraction/summary), `google/gemini-3.1-pro-preview` (evidence reasoning) — same multi-agent split, just cheaper/faster defaults |
| Stripe (BYOK) | Lovable built-in Stripe payments |
| Resend | Supabase Auth built-in emails (custom SMTP later) |
| Sentry | Console + `lovable-error-reporting` (already wired) |
| PostHog | Deferred to post-MVP |
| RBAC via app code | Postgres `user_roles` table + `has_role()` SECURITY DEFINER + RLS |
| Multi-tenant `organization_id` | Same; RLS-enforced |

## Turn-by-Turn Roadmap

### Turn 1 (this turn) — Foundations
- Enable Lovable Cloud
- Provision `LOVABLE_API_KEY`
- Design system in `src/styles.css` (Bold Tech: violet #8b5cf6 / cyan #22d3ee / navy #0f172a, Inter + Fira Code, dark-first)
- Root layout: real head metadata, `onAuthStateChange` root subscriber, sign-in affordance in nav
- DB migrations: `organizations`, `profiles`, `app_role` enum, `user_roles`, `has_role()`, `job_requisitions`, `candidates`, `match_evaluations`, `pipeline_runs`, `audit_logs`, `resume_embeddings` (pgvector 1536-dim via `text-embedding-3-small`), all RLS + GRANTs + indexes
- Signup trigger auto-creates `organizations` row + `profiles` row + `owner` role
- Storage bucket for resume PDFs
- Public routes: `/` landing (layered hero, features, pipeline diagram, pricing teaser, footer — Aceternity-style but implemented with lightweight custom CSS/Framer to keep bundle sane), `/pricing`, `/how-it-works`, `/security`
- Auth routes: `/auth` (login+signup+Google OAuth), `/forgot-password`, `/reset-password`
- `sitemap.xml`, `robots.txt`
- `LAUNCH_CHECKLIST.md`, `README.md` (initial)

### Turn 2 — Onboarding + Job Requisitions + Requirement Extraction Agent
- `_authenticated/route.tsx` (integration-managed gate)
- `/onboarding` 3-step wizard (JD paste/upload → requirement extraction with Multi-Step Loader → sample resumes CTA)
- `/app/dashboard` (open reqs, recent matches, activity)
- `/app/jobs` list + `/app/jobs/$id`
- Server fn: `extractRequirements` — Gemini flash structured output (must-have, nice-to-have, years-exp, skills)
- Audit log writes on create/update/delete

### Turn 3 — Candidate Upload + Full 4-Agent Pipeline + Match Breakdown UI
- Resume upload to Supabase Storage (PDF/DOCX, size/type validation)
- PDF text extraction (pdf-parse or unpdf) inside server fn
- Server fn `runMatchPipeline`:
  1. Evidence extraction (Gemini pro, structured output, requires `source_excerpt` verified via string match — hallucination guardrail)
  2. Deterministic scoring function (weighted sum, must-haves gate, unit-tested)
  3. Explanation summary (Gemini flash)
  4. Persist to `match_evaluations` + update `pipeline_runs` stage
- `/app/jobs/$id/candidates/$candidateId` — full breakdown UI (per-requirement evidence with excerpt highlights, confidence flags, score meter, plain-language summary)
- Prompt-injection sanitization pass on resume text
- Confidence flagging on low-evidence scores

### Turn 4 — Team RBAC + Global Candidate Search + RAG
- `/app/team` — invite (Supabase Auth admin), role change (owner/admin/recruiter/viewer), remove
- `/app/candidates` global search — hybrid: pgvector cosine + Postgres FTS
- Resume embeddings written during pipeline (embed via `openai/text-embedding-3-small` through Lovable Gateway)
- Semantic "find similar candidates" on job req page

### Turn 5 — Billing + Settings + Rate Limits + Quotas
- Lovable Stripe payments (Starter $99, Growth $299)
- Per-plan candidate-quota enforcement at API layer (checked before pipeline enqueue)
- `/app/settings/profile`, `/app/settings/billing`, `/app/settings/api-keys`
- Account deletion with 14-day soft-delete
- Subscription cancellation → read-only free tier

### Turn 6 — Production Hardening
- Playwright E2E: signup, onboarding, upload+match, delete
- Scoring function unit tests (property-based must-have gating)
- Multi-step loader wired to `pipeline_runs` polling with helpful error taxonomy
- `prefers-reduced-motion` audit across landing animations
- Fill checklists (LAUNCH_CHECKLIST, PRODUCTION_CHECKLIST, EXECUTION_CHECKLIST, MVP_LAUNCH_CHECKLIST, READY_CHECKLIST)
- Attractive README with HLD/LLD Mermaid diagrams, problem/solution/ROI narrative, roadmap section (built/pending/next)

## Deliberate Deferrals (documented, not silently dropped)

- **Voice AI (PRD §9.3)** — deferred to Phase 2 per PRD
- **BullMQ queue** — replaced by synchronous pipeline + progress polling. Extraction/scoring for one candidate takes 5–15s which is acceptable in-request; batches processed one-at-a-time server-side. Migration to queue is a swap of the pipeline runner, not schema.
- **ClamAV virus scan** — file type + size validation only at MVP; magic-byte check added. Full AV scan flagged in checklist.
- **SAML SSO (Scale tier)** — marketed on pricing page, not implemented; "Contact sales" CTA
- **ATS integration (Growth tier)** — marketed, not implemented; "Coming soon" badge
- **Audit log export UI** — table written, export deferred
- **LLM-as-judge eval infra (§9.5)** — scoring function unit tests + manual scenario suite at MVP; LLM-judge deferred

## Turn 1 File Manifest

New:
- `supabase/migrations/*` (one migration with full schema)
- `src/routes/index.tsx` (rewrite)
- `src/routes/pricing.tsx`, `src/routes/how-it-works.tsx`, `src/routes/security.tsx`
- `src/routes/auth.tsx`, `src/routes/forgot-password.tsx`, `src/routes/reset-password.tsx`
- `src/routes/sitemap[.]xml.ts`, `public/robots.txt`
- `src/components/marketing/*` (Hero, PipelineDiagram, FeatureGrid, PricingCards, Footer, Nav)
- `src/components/ui/multi-step-loader.tsx`
- `LAUNCH_CHECKLIST.md`, `PRODUCTION_CHECKLIST.md`, `EXECUTION_CHECKLIST.md`, `MVP_LAUNCH_CHECKLIST.md`, `READY_CHECKLIST.md`
- `README.md` (initial with roadmap)

Modified:
- `src/styles.css` (design tokens)
- `src/routes/__root.tsx` (metadata, nav, auth state subscriber, session-aware sign-in button)

After you approve, I'll execute Turn 1 immediately and each subsequent turn on your "continue".
