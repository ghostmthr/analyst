"use client";

import Link from "next/link";
import { useState } from "react";

import { exportBaselineZip } from "@/lib/export/exportBaselineZip";
import { exportExhibitsZip } from "@/lib/export/exportExhibitsZip";
import { exportPatchZip } from "@/lib/export/exportPatchZip";
import { downloadBlob } from "@/lib/export/zip";
import type { CaseFile, Evidence } from "@/types";

export interface ExportSectionZipProps {
  caseFile: CaseFile;
  caseFolderHandle: FileSystemDirectoryHandle | null;
  invId: string;
  invEvidence: Evidence[];
  loading: string | null;
  setLoading: (s: string | null) => void;
  setError: (msg: string) => void;
}

export default function ExportSectionZip({
  caseFile,
  caseFolderHandle,
  invId,
  invEvidence,
  loading,
  setLoading,
  setError,
}: ExportSectionZipProps) {
  const [baselineIncludeAttachments, setBaselineIncludeAttachments] = useState(false);
  const [baselineResult, setBaselineResult] = useState<{ sha256: string; size: number } | null>(null);
  const [exhibitIds, setExhibitIds] = useState<string[]>([]);
  const [exhibitsResult, setExhibitsResult] = useState<{ sha256: string; size: number; count: number } | null>(null);
  const [patchDescription, setPatchDescription] = useState("");
  const [patchOpsJson, setPatchOpsJson] = useState("[]");
  const [patchResult, setPatchResult] = useState<{ sha256: string; size: number } | null>(null);

  const toggleExhibit = (id: string) => {
    setExhibitIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBaseline = async () => {
    setError("");
    setBaselineResult(null);
    setLoading("baseline");
    try {
      const { blob, sha256 } = await exportBaselineZip({
        dir: caseFolderHandle ?? undefined,
        caseFile,
        invId,
        includeAttachments: caseFolderHandle ? baselineIncludeAttachments : false,
      });
      downloadBlob(blob, `baseline-${invId}-${Date.now()}.zip`);
      setBaselineResult({ sha256, size: blob.size });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export baseline ZIP.");
    } finally {
      setLoading(null);
    }
  };

  const handleExhibits = async () => {
    if (!caseFolderHandle) {
      setError("No case folder open.");
      return;
    }
    setError("");
    setExhibitsResult(null);
    setLoading("exhibits");
    try {
      const { blob, sha256 } = await exportExhibitsZip({
        dir: caseFolderHandle,
        caseFile,
        evidenceIds: exhibitIds,
        invId,
      });
      downloadBlob(blob, `exhibits-${invId}-${Date.now()}.zip`);
      setExhibitsResult({ sha256, size: blob.size, count: exhibitIds.length });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export exhibits ZIP.");
    } finally {
      setLoading(null);
    }
  };

  const handlePatch = async () => {
    setError("");
    setPatchResult(null);
    let ops: unknown[];
    try {
      ops = JSON.parse(patchOpsJson);
      if (!Array.isArray(ops)) ops = [];
    } catch {
      setError("Invalid JSON in patch ops.");
      return;
    }
    setLoading("patch");
    try {
      const { blob, sha256 } = await exportPatchZip({
        dir: caseFolderHandle ?? undefined,
        caseFile,
        patchOps: ops,
        description: patchDescription,
      });
      downloadBlob(blob, `patch-${Date.now()}.zip`);
      setPatchResult({ sha256, size: blob.size });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to export patch ZIP.");
    } finally {
      setLoading(null);
    }
  };

  const anyLoading = loading !== null;

  return (
    <section className="analyst-panel analyst-gap32">
      <h2 className="analyst-h2Section">ZIP Exports</h2>

      <div className="analyst-gap24">
        <h3 className="analyst-h3Sub">Baseline ZIP</h3>
        <p className="analyst-textSecondary analyst-gap12">
          Case metadata, logs, and optional attachments. Small by default.
        </p>
        {!caseFolderHandle && (
          <p className="analyst-detailLineSmallMuted analyst-gap12">
            Attachments require case folder access. Open a case folder to include them.
          </p>
        )}
        <label className="analyst-checkboxRow analyst-gap12" style={{ marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={baselineIncludeAttachments}
            onChange={(e) => setBaselineIncludeAttachments(e.target.checked)}
            disabled={!caseFolderHandle}
          />
          <span className="analyst-labelText">Include attachments</span>
        </label>
        <button
          type="button"
          className="analyst-button analyst-mr12"
          onClick={handleBaseline}
          disabled={anyLoading}
        >
          {loading === "baseline" && <span className="analyst-spinner" />}
          {loading === "baseline" ? "Working…" : "Download Baseline ZIP"}
        </button>
        {baselineResult && (
          <p className="analyst-textSecondary analyst-mt12">
            SHA-256: <code className="analyst-mono analyst-monoSmall">{baselineResult.sha256}</code> · {(baselineResult.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>

      <div className="analyst-gap24">
        <h3 className="analyst-h3Sub">Exhibits ZIP</h3>
        <p className="analyst-textSecondary analyst-gap12">
          Selected evidence attachments with manifest. Hash-verified. Requires case folder.
        </p>
        {!caseFolderHandle && (
          <p className="analyst-detailLineSmallMuted analyst-gap12">
            Open a case folder to export exhibits (attachments are read from disk).
          </p>
        )}
        <div className="analyst-formInput analyst-gap12" style={{ maxHeight: 200, overflowY: "auto", padding: 8 }}>
          {invEvidence.length === 0 ? (
            <p className="analyst-textSecondary">No evidence in this investigation.</p>
          ) : (
            invEvidence.map((ev) => (
              <label key={ev.id} className="analyst-checkboxRow analyst-gap12" style={{ marginBottom: 6, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={exhibitIds.includes(ev.id)}
                  onChange={() => toggleExhibit(ev.id)}
                />
                <span className="analyst-labelText">{ev.title}</span>
                {ev.file?.path && <span className="analyst-mono analyst-monoSmall analyst-detailLineSmallMuted">({ev.file.sha256.slice(0, 8)}…)</span>}
              </label>
            ))
          )}
        </div>
        <button
          type="button"
          className="analyst-button analyst-mr12"
          onClick={handleExhibits}
          disabled={anyLoading || exhibitIds.length === 0 || !caseFolderHandle}
          title={!caseFolderHandle ? "Case folder required for exhibits" : undefined}
        >
          {loading === "exhibits" && <span className="analyst-spinner" />}
          {loading === "exhibits" ? "Working…" : "Download Exhibits ZIP"}
        </button>
        {exhibitsResult && (
          <p className="analyst-textSecondary analyst-mt12">
            SHA-256: <code className="analyst-mono analyst-monoSmall">{exhibitsResult.sha256}</code> · {(exhibitsResult.size / 1024).toFixed(1)} KB · {exhibitsResult.count} evidence
          </p>
        )}
      </div>

      <div>
        <h3 className="analyst-h3Sub">Patch ZIP</h3>
        <p className="analyst-textSecondary analyst-gap12">
          Package patch operations for later apply.{" "}
          <Link href={`/inv/${invId}/patches`} style={{ color: "var(--accent)" }}>Import Patch ZIP</Link> to apply.
        </p>
        <div className="analyst-gap12">
          <label className="analyst-formLabel">Description</label>
          <textarea
            value={patchDescription}
            onChange={(e) => setPatchDescription(e.target.value)}
            rows={2}
            className="analyst-formInput"
            style={{ maxWidth: 400, marginBottom: 12 }}
            placeholder="Optional description"
          />
        </div>
        <div className="analyst-gap12">
          <label className="analyst-formLabel">Patch ops (JSON array)</label>
          <textarea
            value={patchOpsJson}
            onChange={(e) => setPatchOpsJson(e.target.value)}
            rows={4}
            className="analyst-mono analyst-formInput"
            style={{ maxWidth: 400, fontSize: 12 }}
            placeholder='[]'
          />
        </div>
        <div className="analyst-actionsRow">
          <button
            type="button"
            className="analyst-button"
            onClick={() => setPatchOpsJson("[]")}
            disabled={anyLoading}
          >
            Generate empty patch
          </button>
          <button
            type="button"
            className="analyst-button"
            onClick={handlePatch}
            disabled={anyLoading}
          >
            {loading === "patch" ? "Generating…" : "Download Patch ZIP"}
          </button>
        </div>
        {patchResult && (
          <p className="analyst-textSecondary analyst-mt12">
            SHA-256: <code className="analyst-mono analyst-monoSmall">{patchResult.sha256}</code> · {(patchResult.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    </section>
  );
}
