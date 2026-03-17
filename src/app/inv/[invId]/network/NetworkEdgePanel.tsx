"use client";

import Link from "next/link";

import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import { isAssertionEvidenceBacked } from "@/lib/derived";
import { displayConfidence, displayEvidenceSourceType,displayLinkSource, displayLinkType } from "@/lib/labelRegistry";
import type { CaseFile, Evidence, Relationship } from "@/types";

export interface NetworkEdgePanelProps {
  relationship: Relationship;
  caseFile: CaseFile;
  invId: string;
  evidenceList: Evidence[];
}

export default function NetworkEdgePanel({
  relationship,
  caseFile,
  invId,
  evidenceList,
}: NetworkEdgePanelProps) {
  const fromEntity = caseFile.entities.find((e) => e.id === relationship.from_entity_id);
  const toEntity = caseFile.entities.find((e) => e.id === relationship.to_entity_id);
  const evidenceBacked = isAssertionEvidenceBacked(relationship.evidence_ids, caseFile);

  return (
    <div>
      <h3 className="analyst-modalTitle analyst-detailLine">Relationship</h3>
      <p style={{ margin: "0 0 4px", fontWeight: 500 }}>
        {fromEntity?.name ?? relationship.from_entity_id} → {toEntity?.name ?? relationship.to_entity_id}
      </p>
      <p className="analyst-detailLineMuted">
        Type: {displayLinkType(relationship.type)} · Source: {displayLinkSource(relationship.source)}
      </p>
      {relationship.confidence && (
        <p className="analyst-detailLine">
          Confidence: {displayConfidence(relationship.confidence.bucket)} (
          {(relationship.confidence.score * 100).toFixed(0)}%)
          {relationship.confidence.rationale && (
            <span className="analyst-detailLineSmallMuted" style={{ display: "block", marginTop: 4 }}>
              {relationship.confidence.rationale}
            </span>
          )}
        </p>
      )}
      <EvidenceBackedBadge evidenceBacked={evidenceBacked} size={14} />
      {evidenceList.length > 0 && (
        <div className="analyst-mt12">
          <p className="analyst-detailLine" style={{ fontWeight: 500 }}>Evidence</p>
          <ul className="analyst-listReset">
            {evidenceList.map((ev) => (
              <li
                key={ev.id}
                style={{
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 13,
                }}
              >
                <Link href={`/inv/${invId}/evidence/${ev.id}`} style={{ fontWeight: 500 }}>
                  {ev.title}
                </Link>
                <div className="analyst-monoSmall analyst-detailLineSmallMuted">
                  {displayEvidenceSourceType(ev.source.source_type)} · {ev.source.captured_at.slice(0, 10)}
                  {ev.file?.sha256 && ` · ${ev.file.sha256.slice(0, 16)}…`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="analyst-actionsRow analyst-mt12">
        <Link href={`/inv/${invId}/targets/${relationship.from_entity_id}`} className="analyst-backLink" style={{ fontSize: 14 }}>
          Open Target A
        </Link>
        <Link href={`/inv/${invId}/targets/${relationship.to_entity_id}`} className="analyst-backLink" style={{ fontSize: 14 }}>
          Open Target B
        </Link>
      </div>
    </div>
  );
}
