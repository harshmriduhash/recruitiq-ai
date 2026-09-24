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
- ✅ Recruiter review & edit (summary, own notes, recommendation override, mark reviewed)
- ✅ Review state audit-logged (`voice_screen.reviewed` / `voice_screen.edited`)
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
- ✅ Per-candidate re-sync (name / email / current ATS stage) from candidate detail
- ✅ Voice pre-screen pushed back to the ATS as a candidate note
      (Greenhouse activity feed, Lever notes, Ashby `candidate.createNote`)
- ✅ Sync bookkeeping: `ats_imports.last_synced_at`, `external_stage`,
      `voice_screens.ats_synced_at` / `ats_external_note_id` / `ats_sync_error`
- ⏳ Webhook-based incremental sync (post-MVP)
- ⏳ Push match scores back to the ATS (post-MVP)

## Auth providers
- ✅ Google OAuth
- ⏳ SAML SSO (Scale tier)
