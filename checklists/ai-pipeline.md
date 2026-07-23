# AI Pipeline Checklist

## Agents
- ✅ Agent 1 — Requirement extraction (Gemini 3 Flash) → structured rubric
- ✅ Agent 2 — Evidence finder (Gemini 3 Pro) with source excerpts
- ✅ Agent 3 — **Deterministic** scorer (must-haves gate; weighted sum)
- ✅ Agent 4 — Plain-language explanation (Gemini 3 Flash)

## Guardrails
- ✅ Excerpt verification: each cited excerpt must appear in the resume text
- ✅ Confidence per requirement + overall
- ✅ Must-have violation caps overall score and surfaces a warning banner

## Sanitization
- ✅ Instruction overrides ("ignore all previous instructions…") stripped
- ✅ PII redaction before scoring
- ✅ Character caps on transcript / resume text sent to LLM

## Retrieval
- ✅ Resume embeddings (`text-embedding-3-small`, 1536-dim)
- ✅ Chunked into `resume_embeddings` with cosine index
- ✅ Hybrid search: Postgres FTS (`search_candidates` RPC) + pgvector fallback

## Voice
- ✅ Transcription: `openai/gpt-4o-mini-transcribe`
- ✅ Structured summary: Gemini 3 Flash JSON output
  (`summary`, `answers[]`, `flags`, `strengths`, `compensation`, `start_date`, `work_authorization`, `recommendation`)

## Observability
- ✅ `pipeline_runs` tracks stage + progress + error
- ✅ `audit_logs` records candidate uploads, voice screens, ATS syncs
- 🚧 LLM-as-judge eval harness (post-MVP)
