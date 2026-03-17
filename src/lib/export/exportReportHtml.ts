/**
 * HTML report export — build model, render, optionally log.
 */

import { computeStateId } from "@/lib/canonical";
import { appendAudit, appendCustody } from "@/lib/caseIO";
import { hashStringSha256 } from "@/lib/evidence";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

import { renderReportHtml } from "./renderReportHtml";
import type { ReportParams } from "./reportModel";
import { buildReportModel } from "./reportModel";

export interface ExportReportHtmlParams {
  caseFile: CaseFile;
  invId: string;
  dir?: FileSystemDirectoryHandle;
  params?: ReportParams;
  /** When dir is set, log this action. "download" = EXPORT_REPORT_HTML, "preview" = EXPORT_REPORT_HTML_PREVIEW */
  logAction?: "download" | "preview";
}

export interface ExportReportHtmlResult {
  html: string;
  blob: Blob;
}

export async function exportReportHtml(
  options: ExportReportHtmlParams
): Promise<ExportReportHtmlResult> {
  const { caseFile, invId, dir, params, logAction = "download" } = options;
  const now = nowUtc();
  const stateId = await computeStateId(caseFile);
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
  const sha256 = await hashStringSha256(normalizedHtml);
  const blob = new Blob([normalizedHtml], { type: "text/html;charset=utf-8" });

  if (dir && logAction === "download") {
    await appendAudit(dir, {
      at: now,
      action: "EXPORT_REPORT_HTML",
      details: { inv_id: invId },
    });
    await appendCustody(dir, {
      at: now,
      action: "EXPORT_REPORT_HTML",
      artifact: "download:analyst-brief.html",
      sha256,
      details: { inv_id: invId, size_bytes: blob.size },
    });
  } else if (dir && logAction === "preview") {
    await appendAudit(dir, {
      at: now,
      action: "EXPORT_REPORT_HTML_PREVIEW",
      details: { inv_id: invId },
    });
    await appendCustody(dir, {
      at: now,
      action: "EXPORT_REPORT_HTML_PREVIEW",
      artifact: "preview:analyst-brief.html",
      sha256,
      details: { inv_id: invId, size_bytes: blob.size },
    });
  }

  return { html: normalizedHtml, blob };
}
