"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/Banner";
import { useCase } from "@/contexts/CaseContext";
import type { AchRelation } from "@/types";

export default function AchPage() {
  const params = useParams();
  const invId = params.invId as string;
  const groupId = params.groupId as string;
  const {
    caseFile,
    createAchMatrix,
    setAchCell,
    computeAch,
    computeAchSensitivityRemoveEvidence,
    saveAchSensitivitySummary,
  } = useCase();

  const [sensitivityEvidenceId, setSensitivityEvidenceId] = useState("");
  const [sensitivityResult, setSensitivityResult] = useState<import("@/lib/ach").SensitivityResult | null>(null);
  const [error, setError] = useState("");
  const [savingSummary, setSavingSummary] = useState(false);

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const group = caseFile?.analysis?.hypothesis_groups?.find((g) => g.id === groupId);
  const hypotheses = (caseFile?.analysis?.hypotheses ?? []).filter((h) => h.hypothesis_group_id === groupId);
  const diagnosticClaims = (caseFile?.analysis?.diagnostic_claims ?? []).filter((d) => d.hypothesis_group_id === groupId);
  const achMatrices = (caseFile?.analysis?.ach_matrices ?? []).filter((m) => m.hypothesis_group_id === groupId);
  const invEvidence = caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [];

  const ach = achMatrices[0];
  const cellMap = new Map(
    (ach?.cells ?? []).map((c) => [`${c.diagnostic_claim_id}:${c.hypothesis_id}`, c])
  );

  const handleCreateMatrix = async () => {
    if (hypotheses.length === 0 || diagnosticClaims.length === 0) {
      setError("Add at least one hypothesis and one diagnostic claim first.");
      return;
    }
    setError("");
    try {
      await createAchMatrix({
        hypothesisGroupId: groupId,
        hypothesisIds: hypotheses.map((h) => h.id),
        diagnosticClaimIds: diagnosticClaims.map((d) => d.id),
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleSetCell = async (
    diagnosticClaimId: string,
    hypothesisId: string,
    relation: AchRelation,
    analystNote?: string
  ) => {
    if (!ach) return;
    setError("");
    try {
      await setAchCell(ach.id, { diagnosticClaimId, hypothesisId, relation, analystNote });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleCompute = async () => {
    if (!ach) return;
    setError("");
    try {
      await computeAch(ach.id, { storeComputed: true });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed");
    }
  };

  const handleSensitivity = () => {
    if (!ach || !sensitivityEvidenceId) return;
    const result = computeAchSensitivityRemoveEvidence(ach.id, sensitivityEvidenceId);
    setSensitivityResult(result);
  };

  const handleSaveSensitivitySummary = async () => {
    if (!ach || !sensitivityResult || !sensitivityEvidenceId) return;
    setError("");
    setSavingSummary(true);
    try {
      await saveAchSensitivitySummary(ach.id, {
        evidenceId: sensitivityEvidenceId,
        rankFlipped: sensitivityResult.impact.rankFlipped,
        separationDrop: sensitivityResult.impact.separationDrop,
        impactedDiagnosticClaimIds: sensitivityResult.impact.impactedDiagnosticClaimIds,
      });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save sensitivity summary.");
    } finally {
      setSavingSummary(false);
    }
  };

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv || !group) return <p>Not found.</p>;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}/assessment/${groupId}`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← {group.name}
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>ACH matrix</h1>
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      {!ach ? (
        <div>
          <p style={{ marginBottom: 16 }}>No ACH matrix yet. Create one from this group&apos;s hypotheses and diagnostic claims.</p>
          <button type="button" onClick={handleCreateMatrix} disabled={hypotheses.length === 0 || diagnosticClaims.length === 0}>
            Create ACH matrix
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <button type="button" onClick={handleCompute} style={{ marginRight: 8 }}>
              Recompute
            </button>
          </div>

          {ach.computed && (
            <div style={{ marginBottom: 24, padding: 16, background: "var(--panel)", borderRadius: 4 }}>
              <h3 style={{ marginTop: 0 }}>Results</h3>
              <div className="analyst-tableWrap" style={{ marginBottom: 12 }}>
                <table className="analyst-table" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Hypothesis</th>
                      <th>Penalty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ach.computed.results.map((r) => {
                      const hyp = hypotheses.find((h) => h.id === r.hypothesis_id);
                      return (
                        <tr key={r.hypothesis_id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px 12px" }}>{r.rank}</td>
                          <td style={{ padding: "8px 12px" }}>{hyp?.label ?? r.hypothesis_id}</td>
                          <td style={{ padding: "8px 12px" }}>{r.penalty.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ margin: 0, fontSize: 14 }}>
                Separation: {(ach.computed.separation * 100).toFixed(1)}% · Evidence coverage: {(ach.computed.evidence_coverage * 100).toFixed(1)}% · ARC: {(ach.computed.arc * 100).toFixed(1)}%
              </p>
            </div>
          )}

          <div className="analyst-tableWrap" style={{ overflowX: "auto", marginBottom: 24 }}>
            <table className="analyst-table" style={{ borderCollapse: "collapse", minWidth: 400 }}>
              <thead>
                <tr>
                  <th style={{ minWidth: 120 }}>Diagnostic claim</th>
                  {hypotheses.map((h) => (
                    <th key={h.id} style={{ textAlign: "center", minWidth: 80 }}>{h.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diagnosticClaims.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "8px 12px", fontSize: 12 }}>{d.text.slice(0, 40)}…</td>
                    {hypotheses.map((h) => {
                      const cell = cellMap.get(`${d.id}:${h.id}`);
                      return (
                        <td key={h.id} style={{ padding: "4px" }}>
                          <select
                            value={cell?.relation ?? "NA"}
                            onChange={(e) => handleSetCell(d.id, h.id, e.target.value as AchRelation)}
                            style={{ width: "100%", padding: "4px" }}
                          >
                            <option value="C">C</option>
                            <option value="I">I</option>
                            <option value="NA">NA</option>
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section style={{ marginTop: 32, padding: 16, border: "1px solid var(--border)", borderRadius: 4 }}>
            <h3 style={{ marginTop: 0 }}>Sensitivity — Remove evidence</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 12 }}>Select evidence to remove and compare baseline vs modified results.</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
              <select
                value={sensitivityEvidenceId}
                onChange={(e) => setSensitivityEvidenceId(e.target.value)}
                style={{ padding: "8px 12px", minWidth: 200 }}
              >
                <option value="">— Select evidence —</option>
                {invEvidence.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
              <button type="button" onClick={handleSensitivity} disabled={!sensitivityEvidenceId}>
                Remove evidence
              </button>
            </div>
            {sensitivityResult && (
              <div style={{ marginTop: 16 }}>
                <p><strong>Rank flipped:</strong> {sensitivityResult.impact.rankFlipped ? "Yes" : "No"}</p>
                <p><strong>Separation drop:</strong> {sensitivityResult.impact.separationDrop.toFixed(4)}</p>
                <p><strong>Impacted rows:</strong> {sensitivityResult.impact.impactedDiagnosticClaimIds.length}</p>
                <button
                  type="button"
                  onClick={handleSaveSensitivitySummary}
                  disabled={savingSummary}
                  style={{ marginTop: 12 }}
                >
                  {savingSummary ? "Saving…" : "Save sensitivity summary"}
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
