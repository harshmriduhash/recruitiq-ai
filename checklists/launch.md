# Launch Checklist

## Build & CI
- ✅ TypeScript strict mode
- ✅ `bunx tsgo --noEmit` clean
- ✅ Playwright E2E (`bun run test:e2e`) — public journey + authenticated recruiter flow
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

## Billing
- ⏳ Stripe checkout + webhook (Turn 6)
- ⏳ Plan quota enforcement (`monthly_candidate_quota`)
