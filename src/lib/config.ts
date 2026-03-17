/**
 * Analyst configuration — env-driven, client + server aware.
 */

export type PdfBackend = "local_playwright" | "disabled" | "remote_service";

/**
 * Get the PDF backend mode.
 * Client: reads NEXT_PUBLIC_ANALYST_PDF_BACKEND
 * Server: reads ANALYST_PDF_BACKEND, then NEXT_PUBLIC_ANALYST_PDF_BACKEND
 * Default: "local_playwright" (dev-friendly)
 */
export function getPdfBackend(): PdfBackend {
  const raw =
    (typeof process !== "undefined" && process.env?.ANALYST_PDF_BACKEND) ||
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_ANALYST_PDF_BACKEND) ||
    "";
  const v = raw.toLowerCase().trim();
  if (v === "disabled") return "disabled";
  if (v === "remote_service") return "remote_service";
  return "local_playwright";
}

/**
 * URL for remote PDF service (when backend === "remote_service").
 */
export function getPdfRemoteServiceUrl(): string | undefined {
  return typeof process !== "undefined"
    ? process.env.ANALYST_PDF_SERVICE_URL || process.env.NEXT_PUBLIC_ANALYST_PDF_SERVICE_URL
    : undefined;
}
