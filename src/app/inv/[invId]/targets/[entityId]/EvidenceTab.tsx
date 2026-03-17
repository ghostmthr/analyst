"use client";

import Link from "next/link";
import { useEffect,useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import type { IngestEvidenceParams } from "@/lib/caseIO";
import type { UpdateEntityPatch } from "@/lib/entities";
import {
  displayEvidenceSourceType,
  displayEvidenceType,
  EVIDENCE_SOURCE_TYPE_OPTIONS,
  EVIDENCE_TYPE_OPTIONS,
} from "@/lib/labelRegistry";
import type { CaseFile, Entity, Evidence, EvidenceType } from "@/types";

const EVIDENCE_METHODS = ["download", "screenshot", "archive", "manual"] as const;

export interface EvidenceTabProps {
  entity: Entity;
  entityId: string;
  invId: string;
  caseFile: CaseFile;
  onUpdateEntity: (entityId: string, patch: UpdateEntityPatch) => Promise<void>;
  onIngestAndLink: (params: IngestEvidenceParams, entityId: string) => Promise<{ next: CaseFile; evidenceId: string } | null>;
  addDrawerOpen: boolean;
  linkDrawerOpen: boolean;
  onCloseAddDrawer: () => void;
  onCloseLinkDrawer: () => void;
}

function evidenceConfidenceLabel(ev: Evidence): string {
  const r = ev.reliability;
  if (!r || (r.source_quality == null && r.credibility == null)) return "—";
  const a = r.source_quality != null ? r.source_quality : r.credibility!;
  const b = r.credibility != null ? r.credibility : r.source_quality!;
  const avg = (a + b) / 2;
  return `${(avg * 100).toFixed(0)}%`;
}

export default function EvidenceTab({
  entity,
  entityId,
  invId,
  caseFile,
  onUpdateEntity,
  onIngestAndLink,
  addDrawerOpen,
  linkDrawerOpen,
  onCloseAddDrawer,
  onCloseLinkDrawer,
}: EvidenceTabProps) {
  const [savingLinks, setSavingLinks] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [linkSearch, setLinkSearch] = useState("");

  useEffect(() => {
    if (linkDrawerOpen) {
      setPendingIds(new Set(entity.evidence_ids ?? []));
      setLinkSearch("");
    }
  }, [linkDrawerOpen, entity.evidence_ids]);

  const [evType, setEvType] = useState<EvidenceType>("DOCUMENT");
  const [evTitle, setEvTitle] = useState("");
  const [evDescription, setEvDescription] = useState("");
  const [evSourceUrl, setEvSourceUrl] = useState("");
  const [evSourceType, setEvSourceType] = useState<import("@/types").EvidenceSourceType>("WEBSITE");
  const [evMethod, setEvMethod] = useState<typeof EVIDENCE_METHODS[number]>("download");
  const [evCapturedAt, setEvCapturedAt] = useState(() => new Date().toISOString().slice(0, 19) + "Z");
  const [evFile, setEvFile] = useState<File | null>(null);
  const [evSourceQuality, setEvSourceQuality] = useState("");
  const [evCredibility, setEvCredibility] = useState("");
  const [evAnalystNote, setEvAnalystNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evError, setEvError] = useState("");

  const requiresFile = evType === "DOCUMENT" || evType === "IMAGE";
  const capturedAtIso = evCapturedAt.includes("Z") ? evCapturedAt : evCapturedAt + "Z";

  const resetAddForm = () => {
    setEvType("DOCUMENT");
    setEvTitle("");
    setEvDescription("");
    setEvSourceUrl("");
    setEvSourceType("WEBSITE");
    setEvMethod("download");
    setEvCapturedAt(new Date().toISOString().slice(0, 19) + "Z");
    setEvFile(null);
    setEvSourceQuality("");
    setEvCredibility("");
    setEvAnalystNote("");
    setEvError("");
  };

  const directIds = new Set(entity.evidence_ids ?? []);

  const allLinkedIds = new Set<string>();
  (entity.evidence_ids ?? []).forEach((id) => allLinkedIds.add(id));
  (entity.image_evidence_ids ?? []).forEach((id) => allLinkedIds.add(id));
  caseFile.claims
    .filter((c) => c.investigation_id === invId && c.entity_ids?.includes(entityId))
    .forEach((c) => (c.evidence_ids ?? []).forEach((id) => allLinkedIds.add(id)));
  caseFile.relationships
    .filter(
      (r) =>
        r.investigation_id === invId &&
        (r.from_entity_id === entityId || r.to_entity_id === entityId)
    )
    .forEach((r) => (r.evidence_ids ?? []).forEach((id) => allLinkedIds.add(id)));
  const evidenceList = Array.from(allLinkedIds)
    .map((id) => caseFile.evidence.find((e) => e.id === id))
    .filter(Boolean) as Evidence[];

  const allInvEvidence = caseFile.evidence.filter((e) => e.investigation_id === invId);

  const togglePending = (id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveLinks = async () => {
    setSavingLinks(true);
    try {
      await onUpdateEntity(entityId, {
        evidence_ids: pendingIds.size > 0 ? Array.from(pendingIds) : undefined,
      });
      onCloseLinkDrawer();
    } finally {
      setSavingLinks(false);
    }
  };

  const handleUnlink = async (evidenceId: string) => {
    const next = (entity.evidence_ids ?? []).filter((id) => id !== evidenceId);
    await onUpdateEntity(entityId, {
      evidence_ids: next.length > 0 ? next : undefined,
    });
  };

  const filteredInvEvidence = linkSearch.trim()
    ? allInvEvidence.filter((ev) =>
        ev.title.toLowerCase().includes(linkSearch.trim().toLowerCase()) ||
        displayEvidenceSourceType(ev.source.source_type).toLowerCase().includes(linkSearch.trim().toLowerCase()) ||
        displayEvidenceType(ev.type).toLowerCase().includes(linkSearch.trim().toLowerCase())
      )
    : allInvEvidence;

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setEvError("");
    if (!evTitle.trim()) { setEvError("Title is required."); return; }
    if (requiresFile && !evFile) { setEvError("File is required for Document and Image evidence."); return; }
    setSubmitting(true);
    try {
      const result = await onIngestAndLink({
        investigation_id: invId,
        type: evType,
        title: evTitle.trim(),
        description: evDescription.trim() || undefined,
        source_url: evSourceUrl.trim() || undefined,
        source_type: evSourceType,
        captured_at: capturedAtIso,
        method: evMethod,
        file: evFile!,
        reliability:
          evSourceQuality !== "" || evCredibility !== ""
            ? {
                source_quality: evSourceQuality === "" ? undefined : Number(evSourceQuality),
                credibility: evCredibility === "" ? undefined : Number(evCredibility),
              }
            : undefined,
        analyst_note: evAnalystNote.trim() || undefined,
      }, entityId);
      if (!result) { setEvError("Failed to ingest evidence."); return; }
      onCloseAddDrawer();
      resetAddForm();
    } catch {
      setEvError("Failed to ingest evidence.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="analyst-tableWrap">
        <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th colSpan={6}>EVIDENCE</th>
            </tr>
            <tr>
              <th>TITLE</th>
              <th>TYPE</th>
              <th>SOURCE</th>
              <th>CONFIDENCE</th>
              <th>CAPTURED</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {evidenceList.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, color: "var(--text-muted)" }}>
                  No evidence linked to this target yet.
                </td>
              </tr>
            ) : (
              evidenceList.map((ev) => {
                const isDirectLink = directIds.has(ev.id);
                return (
                  <tr key={ev.id}>
                    <td style={{ padding: "12px 14px" }}>
                      <Link href={`/inv/${invId}/evidence/${ev.id}`} style={{ fontWeight: 500 }}>
                        {ev.title}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{displayEvidenceType(ev.type)}</td>
                    <td style={{ padding: "12px 14px" }}>{displayEvidenceSourceType(ev.source.source_type)}</td>
                    <td style={{ padding: "12px 14px" }}>{evidenceConfidenceLabel(ev)}</td>
                    <td style={{ padding: "12px 14px" }}>{ev.source.captured_at.slice(0, 10)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {isDirectLink ? (
                        <button
                          type="button"
                          onClick={() => handleUnlink(ev.id)}
                          style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
                        >
                          Unlink
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <AnalystModal
        open={linkDrawerOpen}
        onClose={onCloseLinkDrawer}
        title="Link evidence to target"
        scroll
        maxWidth={520}
      >
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 12px" }}>
              Select evidence from this investigation to link to this target.
            </p>
            <input
              type="text"
              placeholder="Search evidence…"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", marginBottom: 12 }}
            />
            {allInvEvidence.length === 0 ? (
              <p style={{ color: "var(--text-muted)" }}>No evidence in this investigation yet.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", maxHeight: 360, overflow: "auto" }}>
                {filteredInvEvidence.map((ev) => (
                  <li key={ev.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={pendingIds.has(ev.id)}
                        onChange={() => togglePending(ev.id)}
                        style={{ marginTop: 3 }}
                      />
                      <div>
                        <span style={{ fontWeight: 500 }}>{ev.title}</span>
                        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {displayEvidenceType(ev.type)} · {displayEvidenceSourceType(ev.source.source_type)} · {ev.source.captured_at.slice(0, 10)}
                        </div>
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={handleSaveLinks} disabled={savingLinks}>
                {savingLinks ? "Saving…" : `Save (${pendingIds.size} linked)`}
              </button>
              <button type="button" onClick={onCloseLinkDrawer}>Cancel</button>
            </div>
      </AnalystModal>

      <AnalystModal
        open={addDrawerOpen}
        onClose={onCloseAddDrawer}
        title="Add evidence"
        scroll
        maxWidth={520}
      >
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 12px" }}>
              Ingest new evidence and automatically link it to this target.
            </p>
            {evError && <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>{evError}</p>}
            <form onSubmit={handleIngest} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type *</label>
                <select value={evType} onChange={(e) => setEvType(e.target.value as EvidenceType)} style={{ width: "100%", padding: "8px 12px" }}>
                  {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Title *</label>
                <input type="text" value={evTitle} onChange={(e) => setEvTitle(e.target.value)} required style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
                <textarea value={evDescription} onChange={(e) => setEvDescription(e.target.value)} rows={2} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Source URL</label>
                <input type="url" value={evSourceUrl} onChange={(e) => setEvSourceUrl(e.target.value)} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Source type *</label>
                <select value={evSourceType} onChange={(e) => setEvSourceType(e.target.value as import("@/types").EvidenceSourceType)} style={{ width: "100%", padding: "8px 12px" }}>
                  {EVIDENCE_SOURCE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Captured at (UTC)</label>
                <input
                  type="datetime-local"
                  value={evCapturedAt.slice(0, 16)}
                  onChange={(e) => { if (e.target.value) setEvCapturedAt(e.target.value.slice(0, 19) + "Z"); }}
                  style={{ width: "100%", padding: "8px 12px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Method</label>
                <select value={evMethod} onChange={(e) => setEvMethod(e.target.value as typeof evMethod)} style={{ width: "100%", padding: "8px 12px" }}>
                  {EVIDENCE_METHODS.map((m) => (
                    <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Attach file {requiresFile && "*"}</label>
                <input type="file" onChange={(e) => setEvFile(e.target.files?.[0] ?? null)} required={requiresFile} style={{ width: "100%" }} />
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Source quality (0–1)</label>
                  <input type="number" min={0} max={1} step={0.1} value={evSourceQuality} onChange={(e) => setEvSourceQuality(e.target.value)} placeholder="0.5" style={{ width: "100%", padding: "8px 12px" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Credibility (0–1)</label>
                  <input type="number" min={0} max={1} step={0.1} value={evCredibility} onChange={(e) => setEvCredibility(e.target.value)} placeholder="0.5" style={{ width: "100%", padding: "8px 12px" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Analyst note</label>
                <textarea value={evAnalystNote} onChange={(e) => setEvAnalystNote(e.target.value)} rows={2} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={submitting}>{submitting ? "Ingesting…" : "Ingest evidence"}</button>
                <button type="button" onClick={onCloseAddDrawer}>Cancel</button>
              </div>
            </form>
      </AnalystModal>
    </div>
  );
}
