"use client";

import Link from "next/link";

import type { EntityAssertionSummary } from "@/lib/derived";
import { displayEntityType } from "@/lib/labelRegistry";
import { getRiskFlagLabel } from "@/lib/riskFlagLookup";
import type { Entity } from "@/types";

export interface NetworkNodePanelProps {
  entity: Entity;
  invId: string;
  assertionSummary: EntityAssertionSummary | null;
}

export default function NetworkNodePanel({
  entity,
  invId,
  assertionSummary,
}: NetworkNodePanelProps) {
  return (
    <div>
      <h3 className="analyst-modalTitle analyst-detailLine">{entity.name}</h3>
      <p className="analyst-detailLineMuted">{displayEntityType(entity.type)}</p>
      {entity.description && (
        <p className="analyst-detailLine">{entity.description}</p>
      )}
      {entity.risk_tags?.length ? (
        <p className="analyst-detailLineSmall analyst-gap12">
          Risk tags: {entity.risk_tags.map(getRiskFlagLabel).join(", ")}
        </p>
      ) : null}
      {assertionSummary && (
        <p className="analyst-detailLineSmallMuted analyst-gap12">
          Claims: {assertionSummary.claims_total} (
          {assertionSummary.claims_evidence_backed}
          evidence-backed) · Relationships: {assertionSummary.relationships_total} (
          {assertionSummary.relationships_evidence_backed} evidence-backed) · High
          confidence: {assertionSummary.high_confidence_total}
        </p>
      )}
      <Link href={`/inv/${invId}/targets/${entity.id}`} className="analyst-btnPrimary">
        Open Target
      </Link>
    </div>
  );
}
