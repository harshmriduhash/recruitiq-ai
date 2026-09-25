// Human-friendly messages for pipeline error codes (browser-safe).
const MESSAGES: Record<string, string> = {
  PDF_NO_TEXT:
    "This resume looks like a scanned or image-based PDF, so there's no text to read. Try re-uploading a text-based PDF (export from Word or Google Docs).",
  PDF_UNREADABLE: "We couldn't open this PDF. It may be corrupted or password-protected — try saving it again and re-uploading.",
  STORAGE_DOWNLOAD_FAILED: "The uploaded file couldn't be retrieved after 3 attempts. Please upload it again.",
  EVIDENCE_FAILED: "Evidence extraction failed after 3 attempts. This is usually temporary — please retry in a minute.",
  SUMMARY_FAILED: "The score was computed but the written summary failed after 3 attempts. Please retry.",
  JOB_NOT_FOUND: "The job this candidate belongs to no longer exists.",
  NO_REQUIREMENTS: "This job has no requirements yet. Edit the job to re-extract requirements, then retry.",
};

export function pipelineErrorMessage(code?: string | null, fallback?: string | null): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  return fallback || "Something went wrong while scoring this resume. Please try again.";
}
