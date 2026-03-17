"use client";

import { useState } from "react";

import { Banner } from "@/components/Banner";
import { exportReportHtml } from "@/lib/export/exportReportHtml";
import { exportReportPdf, PdfExportError } from "@/lib/export/exportReportPdf";
import { downloadBlob } from "@/lib/export/zip";
import type { CaseFile } from "@/types";

export interface ExportSectionHtmlProps {
  caseFile: CaseFile;
  caseFolderHandle: FileSystemDirectoryHandle | null;
  invId: string;
  loading: string | null;
  setLoading: (s: string | null) => void;
  setError: (msg: string) => void;
  onOpenPreview: () => void;
  pdfBackend: string;
  remotePdfUrl: string | undefined;
  pdfUnavailable: boolean | null;
  pdfFallbackBanner: boolean;
  setPdfFallbackBanner: (v: boolean) => void;
  setPdfUnavailable: (v: boolean) => void;
}

export default function ExportSectionHtml({
  caseFile,
  caseFolderHandle,
  invId,
  loading,
  setLoading,
  setError,
  onOpenPreview,
  pdfBackend,
  remotePdfUrl,
  pdfUnavailable,
  pdfFallbackBanner,
  setPdfFallbackBanner,
  setPdfUnavailable,
}: ExportSectionHtmlProps) {
  const [reportResult, setReportResult] = useState<{ size: number } | null>(null);
  const [pdfResult, setPdfResult] = useState<{ sha256: string; size: number } | null>(null);

  const remotePdfConfigured = pdfBackend !== "remote_service" || Boolean(remotePdfUrl);
  const pdfDisabled = pdfBackend === "disabled" || pdfUnavailable === true || !remotePdfConfigured;

  const handleDownloadReport = async () => {
    setError("");
    setReportResult(null);
    setLoading("reportHtml");
    try {
      const { blob } = await exportReportHtml({
        caseFile,
        invId,
        dir: caseFolderHandle ?? undefined,
        logAction: "download",
      });
      downloadBlob(blob, "analyst-brief.html");
      setReportResult({ size: blob.size });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export HTML report.");
    } finally {
      setLoading(null);
    }
  };

  const handleDownloadPdf = async () => {
    setError("");
    setPdfResult(null);
    setPdfFallbackBanner(false);
    setLoading("reportPdf");
    try {
      const { blob, sha256, size_bytes } = await exportReportPdf({
        caseFile,
        invId,
        dir: caseFolderHandle ?? undefined,
      });
      downloadBlob(blob, "analyst-brief.pdf");
      setPdfResult({ sha256, size: size_bytes });
    } catch (e) {
      console.error(e);
      const isUnavailable =
        e instanceof PdfExportError &&
        (e.code === "PLAYWRIGHT_UNAVAILABLE" || e.status === 501);
      if (isUnavailable) {
        setPdfFallbackBanner(true);
        setPdfUnavailable(true);
      }
      const message =
        e instanceof Error && e.name === "AbortError"
          ? "PDF export timed out. Try again or use Download HTML and print to PDF."
          : e instanceof Error
            ? e.message
            : "Failed to export PDF report.";
      setError(message);
    } finally {
      setLoading(null);
    }
  };

  const anyLoading = loading !== null;

  return (
    <section className="analyst-panel analyst-gap32">
      <h2 className="analyst-h2Section">HTML Report</h2>
      <p className="analyst-textSecondary analyst-gap12">
        Printable brief with targets, timeline, assessment, and evidence appendix.
      </p>
      {(pdfBackend === "remote_service" && !remotePdfUrl) && (
        <Banner variant="warn">
          <p style={{ margin: 0, fontWeight: 500 }}>
            Remote PDF backend is selected but ANALYST_PDF_SERVICE_URL is not set. Set it to the URL of your PDF service, or use local_playwright / disabled.
          </p>
        </Banner>
      )}
      {(pdfFallbackBanner || (pdfDisabled && pdfUnavailable !== null && remotePdfConfigured)) && (
        <Banner variant="warn">
          <p className="analyst-gap12" style={{ margin: 0, fontWeight: 500 }}>
            {pdfBackend === "disabled"
              ? "PDF export is disabled. Set ANALYST_PDF_BACKEND=local_playwright to enable."
              : "PDF generation isn't available in this environment. Use Download HTML and print to PDF."}
          </p>
          <div className="analyst-actionsRow">
            <button type="button" className="analyst-button" onClick={handleDownloadReport} disabled={anyLoading}>
              Download HTML report
            </button>
            <button type="button" className="analyst-button" onClick={onOpenPreview}>
              Open Preview (print)
            </button>
          </div>
        </Banner>
      )}
      <div className="analyst-actionsRow">
        <button type="button" className="analyst-button" onClick={onOpenPreview}>
          Preview PDF report
        </button>
        <button type="button" className="analyst-button" onClick={handleDownloadReport} disabled={anyLoading}>
          {loading === "reportHtml" && <span className="analyst-spinner" />}
          {loading === "reportHtml" ? "Working…" : "Download HTML report"}
        </button>
        {pdfBackend !== "disabled" && (
          <button
            type="button"
            className="analyst-button analyst-button--primary"
            onClick={handleDownloadPdf}
            disabled={anyLoading || (pdfBackend === "local_playwright" && pdfDisabled)}
            title={pdfDisabled ? "PDF unavailable in this environment" : undefined}
          >
            {loading === "reportPdf" && <span className="analyst-spinner" />}
            {loading === "reportPdf" ? "Working…" : "Download PDF report"}
          </button>
        )}
        {pdfBackend === "remote_service" && remotePdfUrl && pdfUnavailable === false && (
          <span style={{ fontSize: 12, color: "var(--success-text)" }}>Remote PDF backend reachable</span>
        )}
        {pdfBackend === "remote_service" && remotePdfUrl && pdfUnavailable === true && (
          <span style={{ fontSize: 12, color: "var(--warning-text)" }}>Remote PDF unreachable — check ANALYST_PDF_SERVICE_URL</span>
        )}
        {pdfBackend === "remote_service" && !remotePdfUrl && (
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Remote PDF backend requires ANALYST_PDF_SERVICE_URL</span>
        )}
      </div>
      {reportResult && (
        <p className="analyst-textSecondary analyst-mt12">
          Downloaded analyst-brief.html · {(reportResult.size / 1024).toFixed(1)} KB
        </p>
      )}
      {pdfResult && (
        <p className="analyst-textSecondary analyst-mt12">
          Downloaded analyst-brief.pdf · SHA-256: <code className="analyst-mono analyst-monoSmall">{pdfResult.sha256}</code> · {(pdfResult.size / 1024).toFixed(1)} KB
        </p>
      )}
    </section>
  );
}
