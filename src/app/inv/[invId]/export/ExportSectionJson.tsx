"use client";

import { useState } from "react";

import { exportCaseJson, exportInvestigationJson } from "@/lib/export/exportJson";
import { downloadBlob } from "@/lib/export/zip";
import type { CaseFile } from "@/types";

export interface ExportSectionJsonProps {
  caseFile: CaseFile;
  caseFolderHandle: FileSystemDirectoryHandle | null;
  invId: string;
  loading: string | null;
  setLoading: (s: string | null) => void;
  setError: (msg: string) => void;
}

export default function ExportSectionJson({
  caseFile,
  caseFolderHandle,
  invId,
  loading,
  setLoading,
  setError,
}: ExportSectionJsonProps) {
  const [caseJsonResult, setCaseJsonResult] = useState<{ sha256: string; size: number } | null>(null);
  const [invJsonResult, setInvJsonResult] = useState<{ sha256: string; size: number } | null>(null);

  const handleCaseJson = async () => {
    setError("");
    setCaseJsonResult(null);
    setLoading("caseJson");
    try {
      const { blob, sha256, size_bytes } = await exportCaseJson(caseFile, caseFolderHandle ?? undefined);
      downloadBlob(blob, `case-${caseFile.case.id}-${Date.now()}.json`);
      setCaseJsonResult({ sha256, size: size_bytes });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export case JSON.");
    } finally {
      setLoading(null);
    }
  };

  const handleInvJson = async () => {
    setError("");
    setInvJsonResult(null);
    setLoading("invJson");
    try {
      const { blob, sha256, size_bytes } = await exportInvestigationJson(caseFile, invId, caseFolderHandle ?? undefined);
      downloadBlob(blob, `investigation-${invId}-${Date.now()}.json`);
      setInvJsonResult({ sha256, size: size_bytes });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export investigation JSON.");
    } finally {
      setLoading(null);
    }
  };

  const anyLoading = loading !== null;

  return (
    <section className="analyst-panel analyst-gap32">
      <h2 className="analyst-h2Section">JSON Exports</h2>
      <div className="analyst-gap24">
        <h3 className="analyst-h3Sub">Case JSON</h3>
        <p className="analyst-textSecondary analyst-gap12">
          Full case file as canonical JSON.
        </p>
        <button type="button" className="analyst-button analyst-mr12" onClick={handleCaseJson} disabled={anyLoading}>
          {loading === "caseJson" && <span className="analyst-spinner" />}
          {loading === "caseJson" ? "Working…" : "Download Case JSON"}
        </button>
        {caseJsonResult && (
          <p className="analyst-textSecondary analyst-mt12">
            SHA-256: <code className="analyst-mono analyst-monoSmall">{caseJsonResult.sha256}</code> · {(caseJsonResult.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
      <div>
        <h3 className="analyst-h3Sub">Investigation JSON</h3>
        <p className="analyst-textSecondary analyst-gap12">
          Investigation-scoped bundle: entities, evidence, claims, relationships, events, analysis.
        </p>
        <button type="button" className="analyst-button analyst-mr12" onClick={handleInvJson} disabled={anyLoading}>
          {loading === "invJson" && <span className="analyst-spinner" />}
          {loading === "invJson" ? "Working…" : "Download Investigation JSON"}
        </button>
        {invJsonResult && (
          <p className="analyst-textSecondary analyst-mt12">
            SHA-256: <code className="analyst-mono analyst-monoSmall">{invJsonResult.sha256}</code> · {(invJsonResult.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    </section>
  );
}
