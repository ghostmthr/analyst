"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { displayEvidenceSourceType, displayEvidenceType, EVIDENCE_TYPE_OPTIONS } from "@/lib/labelRegistry";

export default function EvidenceListPage() {
  const params = useParams();
  const invId = params.invId as string;
  const { caseFile } = useCase();

  const [searchText, setSearchText] = useState("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const invEntities = useMemo(
    () => caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.entities, invId]
  );
  const allItems = useMemo(
    () => caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.evidence, invId]
  );

  const entityEvidenceMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const ent of invEntities) {
      const ids = new Set<string>();
      (ent.evidence_ids ?? []).forEach((id) => ids.add(id));
      (ent.image_evidence_ids ?? []).forEach((id) => ids.add(id));
      map.set(ent.id, ids);
    }
    if (caseFile) {
      for (const c of caseFile.claims) {
        if (c.investigation_id !== invId) continue;
        for (const entId of c.entity_ids ?? []) {
          const ids = map.get(entId) ?? new Set();
          (c.evidence_ids ?? []).forEach((id) => ids.add(id));
          map.set(entId, ids);
        }
      }
      for (const r of caseFile.relationships) {
        if (r.investigation_id !== invId) continue;
        for (const entId of [r.from_entity_id, r.to_entity_id]) {
          const ids = map.get(entId) ?? new Set();
          (r.evidence_ids ?? []).forEach((id) => ids.add(id));
          map.set(entId, ids);
        }
      }
    }
    return map;
  }, [caseFile, invEntities, invId]);

  const items = useMemo(() => {
    let list = allItems;
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description ?? "").toLowerCase().includes(q) ||
          displayEvidenceSourceType(e.source.source_type).toLowerCase().includes(q)
      );
    }
    if (selectedTypes.size > 0) {
      list = list.filter((e) => selectedTypes.has(e.type));
    }
    if (selectedEntityId) {
      list = list.filter((e) => entityEvidenceMap.get(selectedEntityId)?.has(e.id));
    }
    return list;
  }, [allItems, searchText, selectedTypes, selectedEntityId, entityEvidenceMap]);

  const linkedEntitiesForEvidence = (evidenceId: string): string[] => {
    const names: string[] = [];
    for (const ent of invEntities) {
      if (entityEvidenceMap.get(ent.id)?.has(evidenceId)) {
        names.push(ent.name);
      }
    }
    return names;
  };

  function evidenceConfidenceLabel(ev: (typeof allItems)[0]): string {
    const r = ev.reliability;
    if (!r || (r.source_quality == null && r.credibility == null)) return "—";
    const a = r.source_quality != null ? r.source_quality : r.credibility!;
    const b = r.credibility != null ? r.credibility : r.source_quality!;
    const avg = (a + b) / 2;
    return `${(avg * 100).toFixed(0)}%`;
  }

  const hasActiveFilters = searchText.trim() || selectedTypes.size > 0 || selectedEntityId;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>Evidence</h1>
          {inv && (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              {inv.title} — {allItems.length} item{allItems.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link
          href={`/inv/${invId}/evidence/new`}
          style={{
            padding: "8px 16px",
            background: "var(--blue)",
            color: "white",
            borderRadius: 4,
            fontWeight: 500,
          }}
        >
          Add evidence
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          marginBottom: 16,
          padding: "12px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <input
          type="text"
          className="analyst-filterControl"
          placeholder="Search evidence"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: 200 }}
          aria-label="Search evidence"
        />
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Type:</span>
          {EVIDENCE_TYPE_OPTIONS.map((opt) => (
            <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              <input
                type="checkbox"
                checked={selectedTypes.has(opt.key)}
                onChange={() => {
                  setSelectedTypes((prev) => {
                    const next = new Set(prev);
                    if (next.has(opt.key)) next.delete(opt.key);
                    else next.add(opt.key);
                    return next;
                  });
                }}
              />
              {opt.label}
            </label>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Target:</span>
          <select
            className="analyst-filterControl"
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            style={{ minWidth: 160 }}
            aria-label="Target"
          >
            <option value="">All targets</option>
            {invEntities.map((ent) => (
              <option key={ent.id} value={ent.id}>
                {ent.name}
              </option>
            ))}
          </select>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => { setSearchText(""); setSelectedTypes(new Set()); setSelectedEntityId(""); }}
            style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "1px solid var(--border)", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
          >
            Clear filters
          </button>
        )}
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)" }}>
        {items.length} result{items.length !== 1 ? "s" : ""}
        {hasActiveFilters ? ` (filtered from ${allItems.length})` : ""}
      </p>

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
              <th>LINKED TO</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, color: "var(--text-muted)" }}>
                  {hasActiveFilters ? "No evidence matches filters." : "No evidence yet."}
                </td>
              </tr>
            ) : (
              items.map((evd) => {
                const linkedTargets = linkedEntitiesForEvidence(evd.id);
                return (
                  <tr key={evd.id}>
                    <td style={{ padding: "12px 14px" }}>
                      <Link href={`/inv/${invId}/evidence/${evd.id}`} style={{ fontWeight: 500 }}>
                        {evd.title}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 14px" }}>{displayEvidenceType(evd.type)}</td>
                    <td style={{ padding: "12px 14px" }}>{displayEvidenceSourceType(evd.source.source_type)}</td>
                    <td style={{ padding: "12px 14px" }}>{evidenceConfidenceLabel(evd)}</td>
                    <td style={{ padding: "12px 14px" }}>{evd.source.captured_at.slice(0, 10)}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {linkedTargets.length > 0 ? linkedTargets.join(", ") : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
