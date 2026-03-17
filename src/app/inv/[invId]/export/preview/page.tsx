"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef,useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { exportReportHtml } from "@/lib/export/exportReportHtml";
import { exportReportPdf, PdfExportError } from "@/lib/export/exportReportPdf";

export default function ReportPreviewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invId = params.invId as string;
  const format = searchParams.get("format"); // "html" = HTML fallback; otherwise PDF
  const useHtml = format === "html";

  const { caseFile, caseFolderHandle } = useCase();
  const [html, setHtml] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!caseFile) return;

    if (useHtml) {
      setPdfUrl(null);
      setError(null);
      exportReportHtml({
        caseFile,
        invId,
        dir: caseFolderHandle ?? undefined,
        logAction: "preview",
      })
        .then(({ html: h }) => setHtml(h))
        .catch((e) => setError(e instanceof Error ? e.message : "Failed to build report."));
      return;
    }

    // PDF preview (default)
    setHtml(null);
    setError(null);
    exportReportPdf({
      caseFile,
      invId,
      dir: caseFolderHandle ?? undefined,
    })
      .then(({ blob }) => {
        const url = URL.createObjectURL(blob);
        pdfUrlRef.current = url;
        setPdfUrl(url);
      })
      .catch((e) => {
        setError(
          e instanceof PdfExportError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Failed to generate PDF preview."
        );
      });

    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, [caseFile, invId, caseFolderHandle, useHtml]);

  const inv = caseFile?.investigations.find((i) => i.id === invId);

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  if (useHtml) {
    if (error) return <p style={{ color: "var(--danger)" }}>{error}</p>;
    if (!html) return <p>Generating report…</p>;
    return (
      <>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "8px 16px", background: "var(--panel)", borderBottom: "1px solid var(--border)", zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/inv/${invId}/export`} style={{ fontSize: 14, color: "var(--text-muted)" }}>← Back to Export</Link>
          <span style={{ fontSize: 14, color: "var(--text-muted)" }}>HTML Report Preview</span>
          <Link href={`/inv/${invId}/export/preview`} style={{ fontSize: 14, color: "var(--text-muted)" }}>Preview PDF instead</Link>
        </div>
        <iframe
          srcDoc={html}
          title="Report preview"
          style={{ position: "fixed", top: 48, left: 0, right: 0, bottom: 0, width: "100%", height: "calc(100% - 48px)", border: "none" }}
        />
      </>
    );
  }

  if (error) {
    return (
      <>
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "8px 16px", background: "var(--panel)", borderBottom: "1px solid var(--border)", zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href={`/inv/${invId}/export`} style={{ fontSize: 14, color: "var(--text-muted)" }}>← Back to Export</Link>
        </div>
        <div style={{ padding: 48, maxWidth: 480 }}>
          <p style={{ color: "var(--danger)", marginBottom: 16 }}>{error}</p>
          <Link href={`/inv/${invId}/export/preview?format=html`} className="analyst-button">
            Preview as HTML instead
          </Link>
        </div>
      </>
    );
  }

  if (!pdfUrl) return <p>Generating PDF…</p>;

  return (
    <>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, padding: "8px 16px", background: "var(--panel)", borderBottom: "1px solid var(--border)", zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <Link href={`/inv/${invId}/export`} style={{ fontSize: 14, color: "var(--text-muted)" }}>← Back to Export</Link>
        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>PDF Report Preview</span>
        <Link href={`/inv/${invId}/export/preview?format=html`} style={{ fontSize: 14, color: "var(--text-muted)" }}>Preview as HTML</Link>
      </div>
      <embed
        src={pdfUrl}
        type="application/pdf"
        title="PDF report preview"
        style={{ position: "fixed", top: 48, left: 0, right: 0, bottom: 0, width: "100%", height: "calc(100% - 48px)", border: "none" }}
      />
    </>
  );
}
