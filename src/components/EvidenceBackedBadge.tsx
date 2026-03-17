"use client";

export interface EvidenceBackedBadgeProps {
  evidenceBacked: boolean;
  /** Optional font size (default uses analyst-textSecondary for muted). */
  size?: 14 | 12 | 13;
}

/**
 * "Evidence-backed" (green) or "Not evidence-backed" (muted) label.
 * Reused in map, network, events, entity, EventsTable.
 */
export default function EvidenceBackedBadge({
  evidenceBacked,
  size = 14,
}: EvidenceBackedBadgeProps) {
  if (evidenceBacked) {
    return (
      <span
        style={{
          color: "var(--green)",
          fontWeight: 500,
          fontSize: size,
        }}
      >
        Evidence-backed
      </span>
    );
  }
  return (
    <span
      className="analyst-textSecondary"
      style={size !== 14 ? { fontSize: size } : undefined}
    >
      Not evidence-backed
    </span>
  );
}
