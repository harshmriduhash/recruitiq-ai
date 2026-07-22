// Server-only PDF text extraction using unpdf (edge-compatible).
import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n\n") : String(text ?? "");
}

// Basic prompt-injection sanitization: strip instruction-like sequences, control chars.
export function sanitizeResumeText(raw: string): string {
  return raw
    .replace(/\u0000/g, "")
    // Strip common injection triggers ("ignore previous instructions", role tags, etc.)
    .replace(/(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts?|context)/gi, "[redacted]")
    .replace(/\b(?:system|assistant|developer)\s*:\s*/gi, "")
    .replace(/<\|(?:im_start|im_end|system|user|assistant)\|>/gi, "")
    // Collapse excessive whitespace
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Basic bias-mitigation: strip common PII proxies before scoring.
// (Names/emails still stored on candidate row for display.)
export function stripBiasSignals(text: string): string {
  return text
    // Common gendered pronouns
    .replace(/\b(he|she|him|her|his|hers)\b/gi, "they")
    // Email addresses
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]")
    // Phone numbers (loose)
    .replace(/\b\+?\d[\d\s\-().]{7,}\d\b/g, "[phone]");
}
