/**
 * Remote PDF service — POST HTML to external service.
 * Contract: POST ${ANALYST_PDF_SERVICE_URL}, body { html: string }, response application/pdf.
 * Errors: JSON { code, message } or HTTP status.
 */

import { getPdfBackend, getPdfRemoteServiceUrl } from "@/lib/config";

/** Timeout for remote PDF export (ms). */
export const REMOTE_PDF_EXPORT_TIMEOUT_MS = 60_000;

export interface PdfRemoteResult {
  blob: Blob;
  ok: true;
}

/**
 * Send HTML to remote PDF service. Returns PDF blob or throws.
 * Caller must enforce 5MB HTML limit before calling.
 */
export async function exportReportPdfRemote(
  html: string,
  options?: { timeoutMs?: number }
): Promise<PdfRemoteResult> {
  if (getPdfBackend() !== "remote_service") {
    throw new Error("Remote PDF backend is not configured.");
  }
  const url = getPdfRemoteServiceUrl();
  if (!url) {
    throw new Error("ANALYST_PDF_SERVICE_URL is not set. Remote PDF backend requires this env var.");
  }
  const timeoutMs = options?.timeoutMs ?? REMOTE_PDF_EXPORT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const code = err?.code ?? "REMOTE_PDF_FAILED";
    const message = err?.message ?? err?.error ?? `Remote PDF failed: ${res.status}`;
    const e = new Error(message) as Error & { code?: string; status?: number };
    e.code = code;
    e.status = res.status;
    throw e;
  }
  const blob = await res.blob();
  return { blob, ok: true };
}
