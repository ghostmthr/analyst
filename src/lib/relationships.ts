/**
 * Relationships (Links) CRUD — pure functions returning next case file + audit entry.
 * Validation: from !== to; EVIDENCE source requires evidenceIds length >= 1.
 */

import type { AuditEntry } from "@/lib/audit";
import { normalizeConfidence } from "@/lib/confidence";
import { validateEvidenceIdsForInv } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type {
  CaseFile,
  Confidence,
  Relationship,
  RelationshipSource,
  RelationshipType,
} from "@/types";

export interface CreateRelationshipInput {
  invId: string;
  fromEntityId: string;
  toEntityId: string;
  type: RelationshipType;
  source: RelationshipSource;
  evidence_ids?: string[];
  confidence?: { score: number; bucket?: string; rationale?: string };
  time?: { from: string | null; to: string | null };
}

export function createRelationship(
  caseFile: CaseFile,
  input: CreateRelationshipInput
): { next: CaseFile; auditEntry: AuditEntry } {
  if (input.fromEntityId === input.toEntityId) {
    const now = nowUtc();
    return {
      next: caseFile,
      auditEntry: {
        at: now,
        action: "CREATE_RELATIONSHIP",
        object_type: "relationship",
        details: { error: "from_entity_id must not equal to_entity_id" },
      } as AuditEntry,
    };
  }
  if (input.source === "EVIDENCE" && (!input.evidence_ids || input.evidence_ids.length < 1)) {
    const now = nowUtc();
    return {
      next: caseFile,
      auditEntry: {
        at: now,
        action: "CREATE_RELATIONSHIP",
        object_type: "relationship",
        details: { error: "evidence_ids required when source is EVIDENCE" },
      } as AuditEntry,
    };
  }
  validateEvidenceIdsForInv(caseFile, input.invId, input.evidence_ids);
  const now = nowUtc();
  const id = newId("REL");
  const confidence = input.confidence
    ? normalizeConfidence({
        score: Math.max(0, Math.min(1, input.confidence.score)),
        bucket: input.confidence.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
        rationale: input.confidence.rationale,
      })
    : undefined;
  const rel: Relationship = {
    id,
    investigation_id: input.invId,
    from_entity_id: input.fromEntityId,
    to_entity_id: input.toEntityId,
    type: input.type,
    source: input.source,
    evidence_ids: input.evidence_ids?.length ? [...input.evidence_ids] : undefined,
    time: input.time,
    confidence,
    created_at: now,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    relationships: [...caseFile.relationships, rel],
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_RELATIONSHIP",
    object_type: "relationship",
    object_id: id,
    details: { from: input.fromEntityId, to: input.toEntityId, type: input.type },
  };
  return { next, auditEntry };
}

export type UpdateRelationshipPatch = Partial<
  Pick<
    Relationship,
    "from_entity_id" | "to_entity_id" | "type" | "source" | "evidence_ids" | "time"
  >
> & { confidence?: Partial<Confidence> };

export function updateRelationship(
  caseFile: CaseFile,
  id: string,
  patch: UpdateRelationshipPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const existing = caseFile.relationships.find((r) => r.id === id);
  if (!existing) {
    return {
      next: caseFile,
      auditEntry: { at: now, action: "UPDATE_RELATIONSHIP", object_id: id } as AuditEntry,
    };
  }
  const from = patch.from_entity_id ?? existing.from_entity_id;
  const to = patch.to_entity_id ?? existing.to_entity_id;
  if (from === to) {
    return {
      next: caseFile,
      auditEntry: {
        at: now,
        action: "UPDATE_RELATIONSHIP",
        object_type: "relationship",
        object_id: id,
        details: { error: "from_entity_id must not equal to_entity_id" },
      } as AuditEntry,
    };
  }
  const source = patch.source ?? existing.source;
  const evidenceIds = patch.evidence_ids !== undefined ? patch.evidence_ids : existing.evidence_ids;
  if (source === "EVIDENCE" && (!evidenceIds || evidenceIds.length < 1)) {
    return {
      next: caseFile,
      auditEntry: {
        at: now,
        action: "UPDATE_RELATIONSHIP",
        object_type: "relationship",
        object_id: id,
        details: { error: "evidence_ids required when source is EVIDENCE" },
      } as AuditEntry,
    };
  }
  if (evidenceIds?.length) {
    validateEvidenceIdsForInv(caseFile, existing.investigation_id, evidenceIds);
  }
  // When source changes EVIDENCE → ANALYST: keep evidence_ids unless user cleared; log retention
  const sourceChangedToAnalyst =
    existing.source === "EVIDENCE" && source === "ANALYST" && (evidenceIds?.length ?? 0) > 0;
  const confidence =
    patch.confidence !== undefined
      ? normalizeConfidence(
          typeof patch.confidence.score === "number"
            ? { ...patch.confidence, score: Math.max(0, Math.min(1, patch.confidence.score)) }
            : patch.confidence
        )
      : existing.confidence;
  const updated: Relationship = {
    ...existing,
    ...patch,
    from_entity_id: from,
    to_entity_id: to,
    source,
    evidence_ids: evidenceIds,
    confidence,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    relationships: caseFile.relationships.map((r) => (r.id === id ? updated : r)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "UPDATE_RELATIONSHIP",
    object_type: "relationship",
    object_id: id,
    details: {
      type: updated.type,
      ...(sourceChangedToAnalyst && {
        source_changed_to_analyst: true,
        evidence_ids_retained_count: evidenceIds?.length ?? 0,
      }),
    },
  };
  return { next, auditEntry };
}

export function deleteRelationship(
  caseFile: CaseFile,
  id: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const existing = caseFile.relationships.find((r) => r.id === id);
  if (!existing) {
    return {
      next: caseFile,
      auditEntry: { at: now, action: "DELETE_RELATIONSHIP", object_id: id } as AuditEntry,
    };
  }
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    relationships: caseFile.relationships.filter((r) => r.id !== id),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "DELETE_RELATIONSHIP",
    object_type: "relationship",
    object_id: id,
    details: { from: existing.from_entity_id, to: existing.to_entity_id },
  };
  return { next, auditEntry };
}
