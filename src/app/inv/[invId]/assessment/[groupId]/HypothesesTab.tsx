"use client";

import { useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import type { CreateHypothesisInput, UpdateHypothesisPatch } from "@/lib/assessment";
import { bucketConfidence } from "@/lib/confidence";
import { displayConfidence } from "@/lib/labelRegistry";
import { requiresRationale, validateConfidence } from "@/lib/validation";
import type { Claim, Evidence, Hypothesis, HypothesisStatus } from "@/types";

const HYP_STATUSES: HypothesisStatus[] = ["ACTIVE", "PARKED", "REJECTED", "SUPPORTED", "ARCHIVED"];

export interface HypothesesTabProps {
  groupId: string;
  hypotheses: Hypothesis[];
  invEvidence: Evidence[];
  invClaims: Claim[];
  onCreate: (input: CreateHypothesisInput) => Promise<void>;
  onUpdate: (id: string, patch: UpdateHypothesisPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenAdd: () => void;
  onOpenEdit: (id: string) => void;
  onClose: () => void;
  editingId: string | null;
  drawerOpen: boolean;
}

export default function HypothesesTab({
  groupId,
  hypotheses,
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
}: HypothesesTabProps) {
  const [label, setLabel] = useState("H1");
  const [statement, setStatement] = useState("");
  const [status, setStatus] = useState<HypothesisStatus>("ACTIVE");
  const [priorPct, setPriorPct] = useState(50);
  const [rationale, setRationale] = useState("");
  const [disconfirmingEvIds, setDisconfirmingEvIds] = useState<string[]>([]);
  const [disconfirmingClaimIds, setDisconfirmingClaimIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [priorRationaleError, setPriorRationaleError] = useState("");

  const priorScore = priorPct / 100;
  const bucket = bucketConfidence(priorScore);
  const priorRationaleRequired = requiresRationale(priorScore);

  const openEdit = (h: Hypothesis) => {
    onOpenEdit(h.id);
    setLabel(h.label);
    setStatement(h.statement);
    setStatus(h.status);
    setPriorPct(h.prior_confidence ? Math.round(h.prior_confidence.score * 100) : 50);
    setRationale(h.prior_confidence?.rationale ?? "");
    setDisconfirmingEvIds(h.disconfirming?.evidence_ids ?? []);
    setDisconfirmingClaimIds(h.disconfirming?.claim_ids ?? []);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>Hypotheses</h2>
        <button type="button" onClick={onOpenAdd}>Add hypothesis</button>
      </div>
      <div className="analyst-tableWrap">
      <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Label</th>
            <th>Statement</th>
            <th>Status</th>
            <th>Prior</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {hypotheses.map((h) => (
            <tr key={h.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "12px" }}>{h.label}</td>
              <td style={{ padding: "12px", maxWidth: 320 }}>{h.statement.slice(0, 60)}{h.statement.length > 60 ? "…" : ""}</td>
              <td style={{ padding: "12px" }}>{h.status}</td>
              <td style={{ padding: "12px" }}>{h.prior_confidence ? `${displayConfidence(h.prior_confidence.bucket)} (${(h.prior_confidence.score * 100).toFixed(0)}%)` : "—"}</td>
              <td style={{ padding: "12px" }}>
                <button type="button" onClick={() => openEdit(h)} style={{ marginRight: 8 }}>Edit</button>
                <button type="button" onClick={() => onDelete(h.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {hypotheses.length === 0 && <p style={{ color: "var(--text-muted)" }}>No hypotheses. Add one to get started.</p>}

      <AnalystModal
        open={drawerOpen || !!editingId}
        onClose={onClose}
        title={editingId ? "Edit hypothesis" : "New hypothesis"}
        wide
        scroll
      >
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setPriorRationaleError("");
                if (!statement.trim()) return;
                const v = validateConfidence({ score: priorScore, rationale });
                if (!v.ok) {
                  setPriorRationaleError(v.message ?? "Rationale required for extreme prior confidence.");
                  return;
                }
                setSaving(true);
                try {
                  if (editingId) {
                    await onUpdate(editingId, {
                      label,
                      statement: statement.trim(),
                      status,
                      prior_confidence: { score: priorScore, rationale: rationale.trim() || undefined },
                      disconfirming: (disconfirmingEvIds.length || disconfirmingClaimIds.length)
                        ? { evidence_ids: disconfirmingEvIds.length ? disconfirmingEvIds : undefined, claim_ids: disconfirmingClaimIds.length ? disconfirmingClaimIds : undefined }
                        : undefined,
                    });
                  } else {
                    await onCreate({
                      hypothesisGroupId: groupId,
                      label,
                      statement: statement.trim(),
                      status,
                      prior_confidence: { score: priorScore, rationale: rationale.trim() || undefined },
                      disconfirming: (disconfirmingEvIds.length || disconfirmingClaimIds.length)
                        ? { evidence_ids: disconfirmingEvIds.length ? disconfirmingEvIds : undefined, claim_ids: disconfirmingClaimIds.length ? disconfirmingClaimIds : undefined }
                        : undefined,
                    });
                  }
                } finally {
                  setSaving(false);
                }
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div>
                <label className="analyst-formLabel">Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} className="analyst-formInput" />
              </div>
              <div>
                <label className="analyst-formLabel">Statement *</label>
                <textarea value={statement} onChange={(e) => setStatement(e.target.value)} required rows={3} className="analyst-formInput" />
              </div>
              <div>
                <label className="analyst-formLabel">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as HypothesisStatus)} className="analyst-formInput">
                  {HYP_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="analyst-formLabel">Prior confidence: {priorPct}% ({bucket})</label>
                <input type="range" min={0} max={100} value={priorPct} onChange={(e) => setPriorPct(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label className="analyst-formLabel">Rationale {priorRationaleRequired && "*"}</label>
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} rows={2} className="analyst-formInput" style={{ borderColor: priorRationaleError ? "var(--danger)" : undefined }} />
                {priorRationaleError && <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--danger)" }}>{priorRationaleError}</p>}
              </div>
              <div>
                <label className="analyst-formLabel">Disconfirming evidence</label>
                <select multiple value={disconfirmingEvIds} onChange={(e) => setDisconfirmingEvIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="analyst-formInput" style={{ minHeight: 60 }}>
                  {invEvidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
              <div>
                <label className="analyst-formLabel">Disconfirming claims</label>
                <select multiple value={disconfirmingClaimIds} onChange={(e) => setDisconfirmingClaimIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="analyst-formInput" style={{ minHeight: 60 }}>
                  {invClaims.map((c) => <option key={c.id} value={c.id}>{(c.title ?? c.text).slice(0, 50)}…</option>)}
                </select>
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
