# Product Checklist

## Marketing
- ✅ Landing (`/`) — hero, features, pipeline diagram, pricing, footer
- ✅ `/pricing`, `/how-it-works`, `/security`
- ✅ Per-route unique title / meta / OG tags
- ✅ `sitemap.xml` + `robots.txt`

## Auth
- ✅ Email + password sign-in / sign-up
- ✅ Google OAuth (configured)
- ✅ `/forgot-password`, `/reset-password`
- ✅ Root `onAuthStateChange` invalidates router on sign-in/out

## Onboarding
- ✅ 3-step wizard (`/app/onboarding`)
- ✅ Enforced before `/app/dashboard`
- ✅ Writes `organizations.onboarding_completed_at`
- ✅ Post-onboarding dashboard walkthrough (4 steps, live progress, dismissible)

## App shell
- ✅ Sidebar nav: Dashboard, Jobs, Candidates, Team, Integrations
- ✅ Auth-guarded `_authenticated` route group
- ✅ Sign-out flow

## Jobs
- ✅ Create requisition (title, description)
- ✅ Requirement-extraction agent (Gemini 3 Flash → JSON rubric)
- ✅ Job detail with rubric + candidate list
- ✅ Per-job progress aggregation

## Candidates
- ✅ Upload resume (signed upload URL, org-scoped path)
- ✅ Match breakdown UI (score, must-have gate, per-requirement evidence)
- ✅ Live pipeline progress (polling)
- ✅ Global search (`/app/candidates`) — hybrid FTS + embeddings
- ✅ Voice pre-screen panel on candidate detail (record, review, edit, send to ATS)
- ✅ ATS origin card with one-click re-sync
- 🚧 PDF export of match report

## Team
- ✅ Invite by email (owner/admin only)
- ✅ Role editor: owner / admin / recruiter / viewer

## Accessibility
- ✅ `prefers-reduced-motion` respected in `styles.css`
- ✅ Focus rings on interactive controls
- ✅ Semantic headings; single H1 per route
