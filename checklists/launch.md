# Launch Checklist

## Build & CI
- ✅ TypeScript strict mode
- ✅ `bunx tsgo --noEmit` clean
- ✅ Playwright E2E — public journey
- 🚧 Authenticated recruiter E2E — written, needs `E2E_USER` / `E2E_PASS` test account
- 🚧 Scoring engine unit tests

## Deploy
- ✅ TanStack Start on Cloudflare Workers via Lovable
- ✅ Stable preview URL for external services (ATS webhooks, cron)
- ⏳ Custom domain

## Data
- ✅ All migrations applied
- ✅ RLS + GRANTs verified per table
- ✅ Storage buckets created (`resumes`, `voice-recordings`)

## Documentation
- ✅ `README.md` (HLD, LLD, roadmap, tech stack, security posture)
- ✅ `/security` page in-app
- ✅ Five launch checklists in `/checklists/`
- 🚧 Screenshots (post-first-tenant)

## Monitoring
- ✅ `pipeline_runs.error_message` + `error_code` populated on failure
- ✅ `audit_logs` writes on candidate upload, voice screen completion, ATS sync
- ⏳ PostHog funnel
- ⏳ Error monitoring + request-ID tracing

## Billing
- ⏳ Stripe checkout + webhook
- ⏳ Plan quota enforcement (`monthly_candidate_quota`)
- ⏳ Per-plan rate limits
- ⏳ Cancel → read-only free tier
