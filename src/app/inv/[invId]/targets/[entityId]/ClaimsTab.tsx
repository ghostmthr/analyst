"use client";

import { useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import type { CreateClaimInput, UpdateClaimPatch } from "@/lib/claims";
import { getClaimEvidenceIds } from "@/lib/claims";
import { bucketConfidence } from "@/lib/confidence";
import { isAssertionEvidenceBacked } from "@/lib/derived";
import { displayConfidence } from "@/lib/labelRegistry";
import type { CaseFile, Claim, Evidence } from "@/types";

export interface ClaimsTabProps {
  entityId: string;
  invId: string;
  caseFile: CaseFile;
  invEvidence: Evidence[];
  addDrawerOpen: boolean;
  onCloseAddDrawer: () => void;
  onCreate: (input: CreateClaimInput) => Promise<void>;
  onUpdate: (id: string, patch: UpdateClaimPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function ClaimsTab({
  entityId,
  invId,
  caseFile,
  invEvidence,
  addDrawerOpen,
  onCloseAddDrawer,
  onCreate,
  onUpdate,
  onDelete,
}: ClaimsTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [evidenceBackedOnly, setEvidenceBackedOnly] = useState(false);
  const [minConfidencePct, setMinConfidencePct] = useState(0);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [confidencePct, setConfidencePct] = useState(50);
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);
  const [claimsError, setClaimsError] = useState("");

  const score = confidencePct / 100;
  const bucket = bucketConfidence(score);
  const rationaleRequired = score >= 0.75 || score <= 0.35;

  const claimsRaw = caseFile.claims.filter(
    (c) => c.investigation_id === invId && c.entity_ids?.includes(entityId)
  );
  const claims = claimsRaw.filter((c) => {
    if (evidenceBackedOnly && !isAssertionEvidenceBacked(getClaimEvidenceIds(c), caseFile)) return false;
    const s = c.confidence?.score ?? 0;
    if (s < minConfidencePct / 100) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (rationaleRequired && !rationale.trim()) return;
    setClaimsError("");
    setSaving(true);
    try {
      await onCreate({
        invId,
        title: title.trim() || undefined,
        text: text.trim(),
        entity_ids: [entityId],
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        evidence_ids: evidenceIds.length ? evidenceIds : undefined,
        confidence: { score, rationale: rationale.trim() || undefined },
      });
      onCloseAddDrawer();
      setTitle("");
      setText("");
      setTagsStr("");
      setEvidenceIds([]);
      setConfidencePct(50);
      setRationale("");
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : "Failed to save claim.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!text.trim()) return;
    if (rationaleRequired && !rationale.trim()) return;
    setClaimsError("");
    setSaving(true);
    try {
      await onUpdate(id, {
        title: title.trim() || undefined,
        text: text.trim(),
        entity_ids: [entityId],
        tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        evidence_ids: evidenceIds.length ? evidenceIds : undefined,
        confidence: { score, rationale: rationale.trim() || undefined },
      });
      setEditingId(null);
      setTitle("");
      setText("");
      setTagsStr("");
      setEvidenceIds([]);
      setRationale("");
    } catch (err) {
      setClaimsError(err instanceof Error ? err.message : "Failed to update claim.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (claim: Claim) => {
    setEditingId(claim.id);
    setTitle(claim.title ?? "");
    setText(claim.text);
    setTagsStr(claim.tags?.join(", ") ?? "");
    setEvidenceIds(getClaimEvidenceIds(claim));
    setConfidencePct(claim.confidence ? Math.round(claim.confidence.score * 100) : 50);
    setRationale(claim.confidence?.rationale ?? "");
  };

  return (
    <div style={{ marginTop: 16 }}>
      {claimsError && (
        <div style={{ marginBottom: 16, padding: 12, background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 4 }}>
          {claimsError}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 12, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={evidenceBackedOnly} onChange={(e) => setEvidenceBackedOnly(e.target.checked)} />
          Evidence-backed only
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, whiteSpace: "nowrap" }}>
          Min confidence: {minConfidencePct}%
          <input type="range" min={0} max={100} value={minConfidencePct} onChange={(e) => setMinConfidencePct(Number(e.target.value))} style={{ margin: 0 }} />
        </label>
      </div>
      <div className="analyst-tableWrap">
        <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th colSpan={7}>CLAIMS</th>
            </tr>
            <tr>
              <th>TITLE</th>
              <th>DESCRIPTION</th>
              <th>LINKED EVIDENCE</th>
              <th>TAGS</th>
              <th>CONFIDENCE</th>
              <th>UPDATED</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {claims.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, color: "var(--text-muted)" }}>
                  No claims for this target yet.
                </td>
              </tr>
            ) : (
              claims.map((c) => (
                <tr key={c.id}>
                  <td style={{ padding: "12px 14px" }}>{c.title ?? "—"}</td>
                  <td style={{ padding: "12px 14px", maxWidth: 280 }} title={c.text}>
                    {c.text.length > 60 ? c.text.slice(0, 60) + "…" : c.text}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {isAssertionEvidenceBacked(getClaimEvidenceIds(c), caseFile) ? (
                      <EvidenceBackedBadge evidenceBacked />
                    ) : (
                      getClaimEvidenceIds(c).length > 0 ? getClaimEvidenceIds(c).length : "—"
                    )}
                  </td>
                  <td style={{ padding: "12px 14px" }}>{c.tags?.length ? c.tags.join(", ") : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {c.confidence
                      ? `${displayConfidence(c.confidence.bucket)} (${(c.confidence.score * 100).toFixed(0)}%)`
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>{c.updated_at.slice(0, 10)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <button type="button" onClick={() => openEdit(c)} style={{ marginRight: 8 }}>Edit</button>
                    <button type="button" onClick={() => { if (confirm("Delete this claim?")) onDelete(c.id); }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnalystModal
        open={addDrawerOpen || !!editingId}
        onClose={() => { onCloseAddDrawer(); setEditingId(null); }}
        title={editingId ? "Edit claim" : "New claim"}
        wide
        scroll
      >
            <form onSubmit={(e) => { e.preventDefault(); if (editingId) handleUpdate(editingId); else handleCreate(e); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short label for the claim" style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description *</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={3} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Tags (comma-separated)</label>
                <input type="text" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Evidence</label>
                <select multiple value={evidenceIds} onChange={(e) => setEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))} style={{ width: "100%", padding: "8px 12px", minHeight: 80 }}>
                  {invEvidence.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Confidence: {confidencePct}% ({displayConfidence(bucket)})</label>
                <input type="range" min={0} max={100} value={confidencePct} onChange={(e) => setConfidencePct(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Rationale {rationaleRequired && "*"}</label>
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} required={rationaleRequired} rows={2} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => { onCloseAddDrawer(); setEditingId(null); }}>Cancel</button>
              </div>
            </form>
      </AnalystModal>
    </div>
  );
}
