"use client";

import { useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import type { CreateDiagnosticClaimInput, UpdateDiagnosticClaimPatch } from "@/lib/assessment";
import { requiresRationale, validateConfidence } from "@/lib/validation";
import type { Claim, DiagnosticClaim, Evidence } from "@/types";

export interface DiagnosticClaimsTabProps {
  groupId: string;
  diagnosticClaims: DiagnosticClaim[];
  invEvidence: Evidence[];
  invClaims: Claim[];
  onCreate: (input: CreateDiagnosticClaimInput) => Promise<void>;
  onUpdate: (id: string, patch: UpdateDiagnosticClaimPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenAdd: () => void;
  onOpenEdit: (id: string) => void;
  onClose: () => void;
  editingId: string | null;
  drawerOpen: boolean;
}

export default function DiagnosticClaimsTab({
  groupId,
  diagnosticClaims,
  invEvidence,
  invClaims,
  onCreate,
  onUpdate,
  onDelete,
  onOpenAdd,
  onOpenEdit,
  onClose,
  editingId,
  drawerOpen,
}: DiagnosticClaimsTabProps) {
  const [text, setText] = useState("");
  const [claimIds, setClaimIds] = useState<string[]>([]);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [diagnosticity, setDiagnosticity] = useState<1 | 2 | 3>(2);
  const [reliability, setReliability] = useState(0.6);
  const [credibility, setCredibility] = useState(0.6);
  const [confidencePct, setConfidencePct] = useState(60);
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const [dclmRationaleError, setDclmRationaleError] = useState("");

  const confidenceScore = confidencePct / 100;
  const dclmRationaleRequired = requiresRationale(confidenceScore);

  const openEdit = (d: DiagnosticClaim) => {
    onOpenEdit(d.id);
    setText(d.text);
    setClaimIds(d.claim_ids ?? []);
    setEvidenceIds(d.evidence_ids ?? []);
    setDiagnosticity(d.weights.diagnosticity);
    setReliability(d.weights.reliability);
    setCredibility(d.weights.credibility);
    setConfidencePct(d.confidence ? Math.round(d.confidence.score * 100) : 60);
    setRationale(d.confidence?.rationale ?? "");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Diagnostic claims</h2>
        <button type="button" onClick={onOpenAdd}>Add row</button>
      </div>
      <div className="analyst-tableWrap">
      <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Text</th>
            <th>Weights (D/R/C)</th>
            <th>Confidence</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {diagnosticClaims.map((d) => (
            <tr key={d.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "12px", maxWidth: 320 }}>{d.text.slice(0, 60)}{d.text.length > 60 ? "…" : ""}</td>
              <td style={{ padding: "12px" }}>{d.weights.diagnosticity} / {d.weights.reliability.toFixed(2)} / {d.weights.credibility.toFixed(2)}</td>
              <td style={{ padding: "12px" }}>{d.confidence ? `${(d.confidence.score * 100).toFixed(0)}%` : "—"}</td>
              <td style={{ padding: "12px" }}>
                <button type="button" onClick={() => openEdit(d)} style={{ marginRight: 8 }}>Edit</button>
                <button type="button" onClick={() => onDelete(d.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {diagnosticClaims.length === 0 && <p style={{ color: "var(--text-muted)" }}>No diagnostic claims. Add rows for the ACH matrix.</p>}

      <AnalystModal
        open={drawerOpen || !!editingId}
        onClose={onClose}
        title={editingId ? "Edit diagnostic claim" : "New diagnostic claim"}
        wide
        scroll
      >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setDclmRationaleError("");
                if (!text.trim()) return;
                const v = validateConfidence({ score: confidenceScore, rationale });
                if (!v.ok) {
                  setDclmRationaleError(v.message ?? "Rationale required for extreme confidence.");
                  return;
                }
                setSaving(true);
                try {
                  const weights = { diagnosticity, reliability, credibility };
                  const confidence = { score: confidenceScore, rationale: rationale.trim() || undefined };
                  if (editingId) {
                    await onUpdate(editingId, { text: text.trim(), claim_ids: claimIds.length ? claimIds : undefined, evidence_ids: evidenceIds.length ? evidenceIds : undefined, weights, confidence });
                  } else {
                    await onCreate({ hypothesisGroupId: groupId, text: text.trim(), claimIds: claimIds.length ? claimIds : undefined, evidenceIds: evidenceIds.length ? evidenceIds : undefined, weights, confidence });
                  }
                } finally {
                  setSaving(false);
                }
              }}
              className="analyst-formStack"
            >
              <div>
                <label className="analyst-formLabel">Text *</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3} className="analyst-formInput" />
              </div>
              <div>
                <label className="analyst-formLabel">Claims</label>
                <select multiple value={claimIds} onChange={(e) => setClaimIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="analyst-formInput" style={{ minHeight: 60 }}>
                  {invClaims.map((c) => <option key={c.id} value={c.id}>{(c.title ?? c.text).slice(0, 50)}…</option>)}
                </select>
              </div>
              <div>
                <label className="analyst-formLabel">Evidence</label>
                <select multiple value={evidenceIds} onChange={(e) => setEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="analyst-formInput" style={{ minHeight: 60 }}>
                  {invEvidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
              <div>
                <label className="analyst-formLabel">Diagnosticity (1-3)</label>
                <select value={diagnosticity} onChange={(e) => setDiagnosticity(Number(e.target.value) as 1 | 2 | 3)} className="analyst-formInput">
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div>
                <label className="analyst-formLabel">Reliability 0-1</label>
                <input type="number" min={0} max={1} step={0.1} value={reliability} onChange={(e) => setReliability(Number(e.target.value))} className="analyst-formInput" />
              </div>
              <div>
                <label className="analyst-formLabel">Credibility 0-1</label>
                <input type="number" min={0} max={1} step={0.1} value={credibility} onChange={(e) => setCredibility(Number(e.target.value))} className="analyst-formInput" />
              </div>
              <div>
                <label className="analyst-formLabel">Confidence: {confidencePct}%</label>
                <input type="range" min={0} max={100} value={confidencePct} onChange={(e) => setConfidencePct(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label className="analyst-formLabel">Rationale {dclmRationaleRequired && "*"}</label>
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} className="analyst-formInput" style={{ borderColor: dclmRationaleError ? "var(--danger)" : undefined }} />
                {dclmRationaleError && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--danger)" }}>{dclmRationaleError}</p>}
              </div>
              <div className="analyst-actionsRow">
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button type="button" onClick={onClose}>Cancel</button>
              </div>
            </form>
      </AnalystModal>
    </div>
  );
}
