# Integrations Checklist

## Voice AI pre-screen
- ✅ `voice_screens` table + RLS
- ✅ Private `voice-recordings` bucket + org-scoped RLS
- ✅ Browser MediaRecorder → signed upload URL
- ✅ Transcription via Lovable AI Gateway (`openai/gpt-4o-mini-transcribe`)
- ✅ Structured summary via Gemini 3 Flash
  (recommendation, Q&A, compensation, start date, work auth)
- ✅ Playback of stored recordings via short-lived signed URL
- ✅ Live status polling (`pending → transcribing → summarizing → complete`)
- ⏳ Twilio outbound telephony (post-MVP — currently browser-recorded)

## ATS integrations
- ✅ `ats_connections` table (per-org API keys, Owner/Admin RLS)
- ✅ `ats_imports` de-duplication log
- ✅ **Greenhouse** — Harvest API (`/v1/jobs`, `/v1/candidates`)
- ✅ **Lever** — v1 API (`/postings`, `/opportunities`)
- ✅ **Ashby** — REST API (`job.list`, `application.list`)
- ✅ Live validation on connect (ping remote API before storing key)
- ✅ Job picker → RecruitIQ requisition mapping
- ✅ Configurable at `/app/integrations`
- ✅ Sync status + last error surfaced per connection
- ⏳ Webhook-based incremental sync (post-MVP)
- ⏳ Push scores back to ATS as candidate notes (post-MVP)

## Auth providers
- ✅ Google OAuth
- ⏳ SAML SSO (Scale tier)
