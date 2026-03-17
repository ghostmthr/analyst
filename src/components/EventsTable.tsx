"use client";

import Link from "next/link";

import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import { isEvidenceBacked } from "@/lib/evidence";
import { displayConfidence, humanizeKey } from "@/lib/labelRegistry";
import type { CaseFile, TimelineEvent } from "@/types";

export type EventsTableVariant = "full" | "targetProfile";

export interface EventsTableProps {
  events: TimelineEvent[];
  invId: string;
  invEntities: { id: string; name: string }[];
  caseFile: CaseFile | null;
  variant: EventsTableVariant;
  emptyMessage: string;
}

export default function EventsTable({
  events,
  invId,
  invEntities,
  caseFile,
  variant,
  emptyMessage,
}: EventsTableProps) {
  const showSectionHeader = variant === "targetProfile";
  const showEntities = variant === "full";
  const showEvidence = variant === "full";
  const showConfidence = variant === "full";

  const colCount =
    4 + (showEntities ? 1 : 0) + (showEvidence ? 1 : 0) + (showConfidence ? 1 : 0) + 1;

  return (
    <div className="analyst-tableWrap">
      <table className="analyst-table">
        <thead>
          {showSectionHeader && (
            <tr>
              <th colSpan={colCount}>EVENTS</th>
            </tr>
          )}
          <tr>
            <th>DATE</th>
            <th>TYPE</th>
            <th>TITLE</th>
            <th>TEXT</th>
            {showEntities && <th>ENTITIES</th>}
            {showEvidence && <th>EVIDENCE</th>}
            {showConfidence && <th>CONFIDENCE</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {events.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="analyst-emptyCell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            events.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.date}</td>
                <td>{humanizeKey(ev.type)}</td>
                <td style={{ maxWidth: 200 }}>{ev.title ?? "—"}</td>
                <td style={{ maxWidth: 320 }}>
                  {ev.text.length > 80 ? ev.text.slice(0, 80) + "…" : ev.text}
                </td>
                {showEntities && (
                  <td style={{ maxWidth: 200 }}>
                    {(ev.entity_ids ?? []).length === 0 ? (
                      "—"
                    ) : (
                      (ev.entity_ids ?? []).map((id, i) => {
                        const ent = invEntities.find((e) => e.id === id);
                        return (
                          <span key={id}>
                            {i > 0 && ", "}
                            <Link href={`/inv/${invId}/targets/${id}`}>
                              {ent?.name ?? id}
                            </Link>
                          </span>
                        );
                      })
                    )}
                    {ev.location && (
                      <span style={{ marginLeft: 8 }} title="Has location">
                        📍
                      </span>
                    )}
                  </td>
                )}
                {showEvidence && (
                  <td>
                    {ev.evidence_ids?.length ?? 0}
                    {caseFile && isEvidenceBacked(ev.evidence_ids, caseFile) && (
                      <span style={{ marginLeft: 6 }}>
                        <EvidenceBackedBadge evidenceBacked size={12} />
                      </span>
                    )}
                  </td>
                )}
                {showConfidence && (
                  <td>
                    {ev.confidence
                      ? `${displayConfidence(ev.confidence.bucket)} (${(ev.confidence.score * 100).toFixed(0)}%)`
                      : "—"}
                  </td>
                )}
                <td>
                  <Link href={`/inv/${invId}/events/${ev.id}`}>View</Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
