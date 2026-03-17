/**
 * Unified PDF report export — picks backend from config, returns { blob, sha256, size_bytes }.
 * Logging: EXPORT_REPORT_PDF + custody only when dir exists and success;
 * EXPORT_REPORT_PDF_FAILED (with backend, code, message) when dir exists and failure.
 */

import { computeStateId } from "@/lib/canonical";
import { appendAudit, appendCustody } from "@/lib/caseIO";
import { getPdfBackend } from "@/lib/config";
import { hashBlobSha256 } from "@/lib/evidence";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

import { exportReportPdfRemote } from "./pdfRemote";
import { renderReportHtml } from "./renderReportHtml";
import type { ReportParams } from "./reportModel";
import { buildReportModel } from "./reportModel";

const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5MB

export interface ExportReportPdfParams {
  caseFile: CaseFile;
  invId: string;
  dir?: FileSystemDirectoryHandle;
  params?: ReportParams;
}

export interface ExportReportPdfResult {
  blob: Blob;
  sha256: string;
  size_bytes: number;
}

export class PdfExportError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "PdfExportError";
  }
}

/**
 * Single entrypoint: picks backend from getPdfBackend(), returns uniform result or throws.
 */
export async function exportReportPdf(
  options: ExportReportPdfParams
): Promise<ExportReportPdfResult> {
  const { caseFile, invId, dir, params } = options;
  const backend = getPdfBackend();
  const now = nowUtc();

  if (backend === "disabled") {
    throw new PdfExportError(
      "PDF export is disabled. Set ANALYST_PDF_BACKEND=local_playwright or configure remote_service.",
      "PDF_DISABLED"
    );
  }

  const stateId = await computeStateId(caseFile);
  const _inv = caseFile.investigations.find((i) => i.id === invId);
  const metadata = {
    schema_version: caseFile.schema_version,
    system_version: caseFile.system_version,
    generated_at: now,
    case_id: caseFile.case.id,
    investigation_id: invId,
    state_id: stateId,
  };
  const model = buildReportModel(caseFile, invId, params ?? {}, metadata);
  const rawHtml = renderReportHtml(model);
  const normalizedHtml = rawHtml.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const htmlBytes = new TextEncoder().encode(normalizedHtml).length;

  if (htmlBytes > MAX_HTML_BYTES) {
    if (dir) {
      await appendAudit(dir, {
        at: now,
        action: "EXPORT_REPORT_PDF_FAILED",
        details: { inv_id: invId, backend, code: "HTML_TOO_LARGE", message: `HTML exceeds ${MAX_HTML_BYTES / 1024 / 1024}MB limit` },
      });
    }
    throw new PdfExportError(
      `Report HTML exceeds 5MB limit (${(htmlBytes / 1024 / 1024).toFixed(2)}MB). Reduce content or use HTML export.`,
      "HTML_TOO_LARGE",
      413
    );
  }

  let blob: Blob;

  if (backend === "remote_service") {
    try {
      const result = await exportReportPdfRemote(normalizedHtml);
      blob = result.blob;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Remote PDF failed.";
      const code = (e as { code?: string })?.code ?? "REMOTE_PDF_FAILED";
      const status = (e as { status?: number })?.status;
      if (dir) {
        await appendAudit(dir, {
          at: now,
          action: "EXPORT_REPORT_PDF_FAILED",
          details: { inv_id: invId, backend: "remote_service", code, message },
        });
      }
      throw new PdfExportError(message, code, status);
    }
  } else {
    const res = await fetch("/api/export/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html: normalizedHtml }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const code = err?.code ?? "PDF_RENDER_FAILED";
      const message = err?.message ?? err?.error ?? `PDF export failed: ${res.status}`;
      if (dir) {
        await appendAudit(dir, {
          at: now,
          action: "EXPORT_REPORT_PDF_FAILED",
          details: { inv_id: invId, backend: "local_playwright", code, message },
        });
      }
      throw new PdfExportError(message, code, res.status);
    }
    blob = await res.blob();
  }

  const sha256 = await hashBlobSha256(blob);

  if (dir) {
    await appendAudit(dir, {
      at: now,
      action: "EXPORT_REPORT_PDF",
      details: { inv_id: invId },
    });
    await appendCustody(dir, {
      at: now,
      action: "EXPORT_REPORT_PDF",
      artifact: "download:analyst-brief.pdf",
      sha256,
      details: { inv_id: invId, size_bytes: blob.size },
    });
  }

  return { blob, sha256, size_bytes: blob.size };
}
