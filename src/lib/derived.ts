/**
 * Derived/computed views — read-only from case file.
 * Do NOT write onto Entity or any canonical store.
 */

import { isEvidenceBacked } from "@/lib/evidence";
import type { CaseFile } from "@/types";

/**
 * Assertion is evidence-backed iff evidence ids exist and each evidence record is complete.
 * Delegates to existing isEvidenceBacked().
 */
export function isAssertionEvidenceBacked(
  evidenceIds: string[] | undefined,
  caseFile: CaseFile
): boolean {
  return isEvidenceBacked(evidenceIds, caseFile);
}

export interface EntityAssertionSummary {
  claims_total: number;
  claims_evidence_backed: number;
  relationships_total: number;
  relationships_evidence_backed: number;
  high_confidence_total: number;
}

/**
 * Computed summary for an entity: claim/relationship counts and evidence-backed/high-confidence.
 * high_confidence_total = count of claims + relationships with confidence.score >= 0.75.
 */
export function getEntityAssertionSummary(
  caseFile: CaseFile,
  invId: string,
  entityId: string
): EntityAssertionSummary {
  const claims = caseFile.claims.filter(
    (c) => c.investigation_id === invId && c.entity_ids?.includes(entityId)
  );
  const relationships = caseFile.relationships.filter(
    (r) =>
      r.investigation_id === invId &&
      (r.from_entity_id === entityId || r.to_entity_id === entityId)
  );
  let claimsEvidenceBacked = 0;
  let relationshipsEvidenceBacked = 0;
  let highConfidenceTotal = 0;
  for (const c of claims) {
    if (isEvidenceBacked(c.evidence_ids, caseFile)) claimsEvidenceBacked++;
    if (c.confidence && c.confidence.score >= 0.75) highConfidenceTotal++;
  }
  for (const r of relationships) {
    if (isEvidenceBacked(r.evidence_ids, caseFile)) relationshipsEvidenceBacked++;
    if (r.confidence && r.confidence.score >= 0.75) highConfidenceTotal++;
  }
  return {
    claims_total: claims.length,
    claims_evidence_backed: claimsEvidenceBacked,
    relationships_total: relationships.length,
    relationships_evidence_backed: relationshipsEvidenceBacked,
    high_confidence_total: highConfidenceTotal,
  };
}
