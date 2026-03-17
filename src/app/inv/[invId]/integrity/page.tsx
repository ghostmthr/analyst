"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/Banner";
import { useCase } from "@/contexts/CaseContext";
import { canonicalStringify } from "@/lib/canonical";
import { appendAudit } from "@/lib/caseIO";
import { nowUtc } from "@/lib/ids";
import { type IntegrityIssue,scanCaseIntegrity, type ScanIntegrityResult } from "@/lib/integrity/scanIntegrity";

export default function IntegrityPage() {
  const params = useParams();
  const invId = params.invId as string;
  const { caseFile, caseFolderHandle } = useCase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanIntegrityResult | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<"all" | "ERROR" | "WARNING">("all");
  const [filterCode, setFilterCode] = useState<string>("");

  const inv = caseFile?.investigations.find((i) => i.id === invId);

  const handleRunScan = async () => {
    if (!caseFile) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const scanResult = await scanCaseIntegrity(caseFile, {
        invId,
        dir: caseFolderHandle ?? undefined,
      });
      setResult(scanResult);

      if (caseFolderHandle) {
        await appendAudit(caseFolderHandle, {
          at: nowUtc(),
          action: "RUN_INTEGRITY_SCAN",
          details: {
            errors: scanResult.errors.length,
            warnings: scanResult.warnings.length,
            attachment_verified: scanResult.stats.attachment_verified ?? 0,
          },
        });
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Integrity scan failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyReportJson = () => {
    if (!result) return;
    const report = {
      ok: result.ok,
      errors: result.errors,
      warnings: result.warnings,
      stats: result.stats,
      scanned_at: new Date().toISOString(),
    };
    navigator.clipboard.writeText(canonicalStringify(report));
  };

  const allIssues: IntegrityIssue[] = result
    ? [...result.errors, ...result.warnings]
    : [];
  const filtered = allIssues.filter((issue) => {
    if (filterSeverity !== "all" && issue.severity !== filterSeverity) return false;
    if (filterCode && issue.code !== filterCode) return false;
    return true;
  });
  const codes = [...new Set(allIssues.map((i) => i.code))].sort();

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← {inv.title}
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>Case Integrity</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 14, marginTop: 4 }}>
          Scan for dangling references, orphan records, and attachment verification.
        </p>
      </div>

      {!caseFolderHandle && (
        <Banner variant="warn">
          Open a case folder to run attachment verification. Reference checks will still run.
        </Banner>
      )}

      {error && <Banner variant="error">{error}</Banner>}

      <section style={{ marginBottom: 24 }}>
        <button
          type="button"
          className="analyst-button analyst-button--primary"
          onClick={handleRunScan}
          disabled={loading}
        >
          {loading && <span className="analyst-spinner" />}
          {loading ? "Working…" : "Run integrity scan"}
        </button>
      </section>

      {result && (
        <>
          <section className="analyst-panel" style={{ marginBottom: 24 }}>
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Summary</h2>
            <p style={{ marginBottom: 8 }}>
              <strong>Errors:</strong> {result.errors.length} —{" "}
              <strong>Warnings:</strong> {result.warnings.length}
            </p>
            {result.stats.attachment_verified !== undefined && result.stats.attachment_verified > 0 && (
              <p style={{ marginBottom: 0, fontSize: 14, color: "var(--text-secondary)" }}>
                Attachments verified: {result.stats.attachment_verified}
              </p>
            )}
            {result.ok && result.errors.length === 0 && (
              <p style={{ marginTop: 12, color: "var(--green)", fontWeight: 500 }}>No errors found.</p>
            )}
            <button
              type="button"
              className="analyst-button"
              onClick={copyReportJson}
              style={{ marginTop: 12 }}
            >
              Copy report JSON
            </button>
          </section>

          {allIssues.length > 0 && (
            <section className="analyst-panel" style={{ marginBottom: 24 }}>
              <h2 style={{ marginTop: 0, marginBottom: 16 }}>Issues</h2>
              <div style={{ marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
                <label>
                  Severity:{" "}
                  <select
                    value={filterSeverity}
                    onChange={(e) => setFilterSeverity(e.target.value as "all" | "ERROR" | "WARNING")}
                  >
                    <option value="all">All</option>
                    <option value="ERROR">Error</option>
                    <option value="WARNING">Warning</option>
                  </select>
                </label>
                <label>
                  Code:{" "}
                  <select
                    value={filterCode}
                    onChange={(e) => setFilterCode(e.target.value)}
                  >
                    <option value="">All</option>
                    {codes.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="analyst-tableWrap" style={{ overflowX: "auto" }}>
                <table className="analyst-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Code</th>
                      <th>Message</th>
                      <th>Object</th>
                      <th>Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((issue, i) => (
                      <tr key={i}>
                        <td>
                          <span
                            style={{
                              color: issue.severity === "ERROR" ? "var(--danger)" : "var(--text-muted)",
                              fontWeight: 500,
                            }}
                          >
                            {issue.severity}
                          </span>
                        </td>
                        <td className="analyst-mono" style={{ fontSize: 12 }}>{issue.code}</td>
                        <td>{issue.message}</td>
                        <td style={{ fontSize: 12 }}>{issue.object_type ?? "—"} {issue.object_id ?? ""}</td>
                        <td className="analyst-mono" style={{ fontSize: 12 }}>{issue.path ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
