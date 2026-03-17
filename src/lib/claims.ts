/**
 * Claims CRUD — pure functions returning next case file + audit entry.
 * Confidence on claim only; normalize via normalizeConfidence().
 */

import type { AuditEntry } from "@/lib/audit";
import { normalizeConfidence } from "@/lib/confidence";
import { validateEvidenceIdsForInv } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type { CaseFile, Claim, Confidence } from "@/types";

/** Normalize optional evidence_ids for evidence-backed checks and display. */
export function getClaimEvidenceIds(c: Claim): string[] {
  return c.evidence_ids ?? [];
}

export interface CreateClaimInput {
  invId: string;
  title?: string;
  text: string;
  entity_ids?: string[];
  tags?: string[];
  evidence_ids?: string[];
  confidence?: { score: number; bucket?: string; rationale?: string };
}

export function createClaim(
  caseFile: CaseFile,
  input: CreateClaimInput
): { next: CaseFile; auditEntry: AuditEntry } {
  validateEvidenceIdsForInv(caseFile, input.invId, input.evidence_ids);
  const now = nowUtc();
  const id = newId("CLM");
  const confidence = input.confidence
    ? normalizeConfidence({
        score: Math.max(0, Math.min(1, input.confidence.score)),
        bucket: input.confidence.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
        rationale: input.confidence.rationale,
      })
    : undefined;
  const claim: Claim = {
    id,
    investigation_id: input.invId,
    entity_ids: input.entity_ids?.length ? [...input.entity_ids] : undefined,
    title: input.title?.trim() || undefined,
    text: input.text.trim(),
    tags: input.tags?.length ? [...input.tags] : undefined,
    evidence_ids: input.evidence_ids?.length ? [...input.evidence_ids] : undefined,
    confidence,
    created_at: now,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    claims: [...caseFile.claims, claim],
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_CLAIM",
    object_type: "claim",
    object_id: id,
    details: { title: claim.title, text: claim.text.slice(0, 50) },
  };
  return { next, auditEntry };
}

export type UpdateClaimPatch = Partial<
  Pick<Claim, "entity_ids" | "title" | "text" | "tags" | "evidence_ids">
> & { confidence?: Partial<Confidence> };

export function updateClaim(
  caseFile: CaseFile,
  id: string,
  patch: UpdateClaimPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const existing = caseFile.claims.find((c) => c.id === id);
  if (!existing) {
    return {
      next: caseFile,
      auditEntry: { at: now, action: "UPDATE_CLAIM", object_id: id } as AuditEntry,
    };
  }
  if (patch.evidence_ids !== undefined) {
    validateEvidenceIdsForInv(caseFile, existing.investigation_id, patch.evidence_ids);
  }
  const confidence =
    patch.confidence !== undefined
      ? normalizeConfidence(
          typeof patch.confidence.score === "number"
            ? { ...patch.confidence, score: Math.max(0, Math.min(1, patch.confidence.score)) }
            : patch.confidence
        )
      : existing.confidence;
  const updated: Claim = {
    ...existing,
    ...patch,
    title: patch.title !== undefined ? (patch.title?.trim() || undefined) : existing.title,
    text: (patch.text ?? existing.text).trim(),
    tags: patch.tags !== undefined ? patch.tags : existing.tags,
    evidence_ids: patch.evidence_ids !== undefined ? patch.evidence_ids : existing.evidence_ids,
    entity_ids: patch.entity_ids !== undefined ? patch.entity_ids : existing.entity_ids,
    confidence,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    claims: caseFile.claims.map((c) => (c.id === id ? updated : c)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "UPDATE_CLAIM",
    object_type: "claim",
    object_id: id,
    details: { title: updated.title, text: updated.text.slice(0, 50) },
  };
  return { next, auditEntry };
}

export function deleteClaim(
  caseFile: CaseFile,
  id: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const existing = caseFile.claims.find((c) => c.id === id);
  if (!existing) {
    return {
      next: caseFile,
      auditEntry: { at: now, action: "DELETE_CLAIM", object_id: id } as AuditEntry,
    };
  }
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    claims: caseFile.claims.filter((c) => c.id !== id),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "DELETE_CLAIM",
    object_type: "claim",
    object_id: id,
    details: { text: existing.text.slice(0, 50) },
  };
  return { next, auditEntry };
}
