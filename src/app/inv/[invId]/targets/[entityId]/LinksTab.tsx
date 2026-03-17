"use client";

import { useEffect,useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import { isAssertionEvidenceBacked } from "@/lib/derived";
import {
  displayConfidence,
  displayLinkSource,
  displayLinkType,
  LINK_SOURCE_OPTIONS,
  LINK_TYPE_OPTIONS,
} from "@/lib/labelRegistry";
import type { CreateRelationshipInput, UpdateRelationshipPatch } from "@/lib/relationships";
import type { CaseFile, Entity, Relationship, RelationshipSource, RelationshipType } from "@/types";

export interface LinksTabProps {
  entityId: string;
  invId: string;
  caseFile: CaseFile;
  allEntities: Entity[];
  invEvidence: import("@/types").Evidence[];
  addDrawerOpen: boolean;
  onCloseAddDrawer: () => void;
  onCreate: (input: CreateRelationshipInput) => Promise<void>;
  onUpdate: (id: string, patch: UpdateRelationshipPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function LinksTab({
  entityId,
  invId,
  caseFile,
  allEntities,
  invEvidence,
  addDrawerOpen,
  onCloseAddDrawer,
  onCreate,
  onUpdate,
  onDelete,
}: LinksTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fromId, setFromId] = useState(entityId);
  const [toId, setToId] = useState("");
  const [typeSelect, setTypeSelect] = useState<string>("OWNS");
  const [customTypeValue, setCustomTypeValue] = useState("");
  const [source, setSource] = useState<RelationshipSource>("ANALYST");
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [confidencePct, setConfidencePct] = useState(50);
  const [rationale, setRationale] = useState("");
  const [timeFrom, setTimeFrom] = useState("");
  const [timeTo, setTimeTo] = useState("");
  const [timeToPresent, setTimeToPresent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linksError, setLinksError] = useState("");

  useEffect(() => {
    if (addDrawerOpen && !editingId) {
      setFromId(entityId);
      setToId("");
      setTypeSelect("OWNS");
      setCustomTypeValue("");
      setSource("ANALYST");
      setEvidenceIds([]);
      setConfidencePct(50);
      setRationale("");
      setTimeFrom("");
      setTimeTo("");
      setTimeToPresent(false);
    }
  }, [addDrawerOpen, editingId, entityId]);

  const score = confidencePct / 100;
  const rationaleRequired = score >= 0.75 || score <= 0.35;
  const relationshipType: RelationshipType =
    typeSelect === "CUSTOM" && customTypeValue.trim()
      ? (`CUSTOM:${customTypeValue.trim()}` as RelationshipType)
      : (typeSelect as RelationshipType);

  const relationships = caseFile.relationships.filter(
    (r) =>
      r.investigation_id === invId &&
      (r.from_entity_id === entityId || r.to_entity_id === entityId)
  );

  const getDirection = (r: Relationship) => {
    const from = allEntities.find((e) => e.id === r.from_entity_id);
    const to = allEntities.find((e) => e.id === r.to_entity_id);
    const fromName = from?.name ?? r.from_entity_id;
    const toName = to?.name ?? r.to_entity_id;
    const isOut = r.from_entity_id === entityId;
    return isOut ? `${fromName} → ${toName}` : `${fromName} ← ${toName}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toId) return;
    if (fromId === toId) { alert("From and To must be different."); return; }
    if (typeSelect === "CUSTOM" && !customTypeValue.trim()) { alert("Enter a custom type."); return; }
    if (source === "EVIDENCE" && evidenceIds.length < 1) { alert("Evidence required when source is EVIDENCE."); return; }
    if (rationaleRequired && !rationale.trim()) return;
    setLinksError("");
    setSaving(true);
    try {
      await onCreate({
        invId,
        fromEntityId: fromId,
        toEntityId: toId,
        type: relationshipType,
        source,
        evidence_ids: source === "EVIDENCE" ? evidenceIds : undefined,
        confidence: { score, rationale: rationale.trim() || undefined },
        time: timeFrom || timeTo || timeToPresent ? { from: timeFrom || null, to: timeToPresent ? "PRESENT" : (timeTo || null) } : undefined,
      });
      onCloseAddDrawer();
      setToId("");
      setEvidenceIds([]);
      setConfidencePct(50);
      setRationale("");
      setTimeFrom("");
      setTimeTo("");
      setTimeToPresent(false);
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to save link.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!toId) return;
    if (fromId === toId) { alert("From and To must be different."); return; }
    if (typeSelect === "CUSTOM" && !customTypeValue.trim()) { alert("Enter a custom type."); return; }
    if (source === "EVIDENCE" && evidenceIds.length < 1) { alert("Evidence required when source is EVIDENCE."); return; }
    if (rationaleRequired && !rationale.trim()) return;
    setLinksError("");
    setSaving(true);
    try {
      await onUpdate(id, {
        from_entity_id: fromId,
        to_entity_id: toId,
        type: relationshipType,
        source,
        evidence_ids: source === "EVIDENCE" ? evidenceIds : undefined,
        confidence: { score, rationale: rationale.trim() || undefined },
        time: timeFrom || timeTo || timeToPresent ? { from: timeFrom || null, to: timeToPresent ? "PRESENT" : (timeTo || null) } : undefined,
      });
      setEditingId(null);
    } catch (err) {
      setLinksError(err instanceof Error ? err.message : "Failed to update link.");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (rel: Relationship) => {
    setEditingId(rel.id);
    setFromId(rel.from_entity_id);
    setToId(rel.to_entity_id);
    const isCustom = rel.type.startsWith("CUSTOM:");
    setTypeSelect(isCustom ? "CUSTOM" : rel.type);
    setCustomTypeValue(isCustom ? rel.type.slice(7) : "");
    setSource(rel.source);
    setEvidenceIds(rel.evidence_ids ?? []);
    setConfidencePct(rel.confidence ? Math.round(rel.confidence.score * 100) : 50);
    setRationale(rel.confidence?.rationale ?? "");
    setTimeFrom(rel.time?.from ?? "");
    const toIsPresent = rel.time?.to === "PRESENT";
    setTimeToPresent(toIsPresent);
    setTimeTo(toIsPresent ? "" : (rel.time?.to ?? ""));
  };

  return (
    <div style={{ marginTop: 16 }}>
      {linksError && (
        <div style={{ marginBottom: 16, padding: 12, background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 4 }}>
          {linksError}
        </div>
      )}
      <div className="analyst-tableWrap">
        <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th colSpan={7}>LINKS</th>
            </tr>
            <tr>
              <th>DIRECTION</th>
              <th>TYPE</th>
              <th>SOURCE</th>
              <th>EVIDENCE</th>
              <th>CONFIDENCE</th>
              <th>TIME</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {relationships.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, color: "var(--text-muted)" }}>
                  No links for this target yet.
                </td>
              </tr>
            ) : (
              relationships.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "12px 14px" }}>{getDirection(r)}</td>
                  <td style={{ padding: "12px 14px" }}>{displayLinkType(r.type)}</td>
                  <td style={{ padding: "12px 14px" }}>{displayLinkSource(r.source)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <EvidenceBackedBadge
                      evidenceBacked={isAssertionEvidenceBacked(r.evidence_ids, caseFile)}
                    />
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {r.confidence ? `${displayConfidence(r.confidence.bucket)} (${(r.confidence.score * 100).toFixed(0)}%)` : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    {r.time?.from || r.time?.to ? `${r.time.from ?? "—"} / ${r.time.to === "PRESENT" ? "Present" : (r.time.to ?? "—")}` : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <button type="button" onClick={() => openEdit(r)} style={{ marginRight: 8 }}>Edit</button>
                    <button type="button" onClick={() => { if (confirm("Delete this link?")) onDelete(r.id); }}>Delete</button>
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
        title={editingId ? "Edit link" : "New link"}
        wide
        scroll
      >
            <form onSubmit={(e) => { e.preventDefault(); if (editingId) handleUpdate(editingId); else handleCreate(e); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>From entity</label>
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={{ width: "100%", padding: "8px 12px" }}>
                  {allEntities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>To entity *</label>
                <select value={toId} onChange={(e) => setToId(e.target.value)} required style={{ width: "100%", padding: "8px 12px" }}>
                  <option value="">—</option>
                  {allEntities.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type</label>
                <select value={typeSelect} onChange={(e) => setTypeSelect(e.target.value)} style={{ width: "100%", padding: "8px 12px" }}>
                  {LINK_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
                {typeSelect === "CUSTOM" && (
                  <input type="text" placeholder="Custom type" value={customTypeValue} onChange={(e) => setCustomTypeValue(e.target.value)} style={{ width: "100%", padding: "8px 12px", marginTop: 4 }} />
                )}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Source</label>
                <select value={source} onChange={(e) => setSource(e.target.value as RelationshipSource)} style={{ width: "100%", padding: "8px 12px" }}>
                  {LINK_SOURCE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {source === "EVIDENCE" && (
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Evidence *</label>
                  <select multiple value={evidenceIds} onChange={(e) => setEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))} required style={{ width: "100%", padding: "8px 12px", minHeight: 80 }}>
                    {invEvidence.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Confidence: {confidencePct}%</label>
                <input type="range" min={0} max={100} value={confidencePct} onChange={(e) => setConfidencePct(Number(e.target.value))} style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Rationale {rationaleRequired && "*"}</label>
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} required={rationaleRequired} rows={2} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <label style={{ flex: 1 }}>
                  <span style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Time from</span>
                  <input type="date" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} style={{ width: "100%", padding: "8px 12px" }} />
                </label>
                <div style={{ flex: 1 }}>
                  <span style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Time to</span>
                  <input type="date" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} disabled={timeToPresent} style={{ width: "100%", padding: "8px 12px", opacity: timeToPresent ? 0.4 : 1 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={timeToPresent} onChange={(e) => { setTimeToPresent(e.target.checked); if (e.target.checked) setTimeTo(""); }} />
                    Present
                  </label>
                </div>
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
