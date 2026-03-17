/**
 * Identifier CRUD — pure functions returning next case file + audit entry.
 * Confidence stored on identifier only; use normalizeConfidence.
 */

import type { AuditEntry } from "@/lib/audit";
import { normalizeConfidence } from "@/lib/confidence";
import { newId, nowUtc } from "@/lib/ids";
import type { CaseFile, Confidence, Identifier } from "@/types";
import type { ExIdentifierType } from "@/types";

export interface CreateIdentifierInput {
  investigation_id: string;
  entity_id: string;
  type: ExIdentifierType;
  value: string;
  source_text?: string;
  source_evidence_ids?: string[];
  first_observed_at?: string;
  last_observed_at?: string | null;
  is_primary?: boolean;
  confidence?: { score: number; bucket?: string; rationale?: string };
}

/**
 * Create identifier with normalized confidence.
 */
export function createIdentifier(
  caseFile: CaseFile,
  input: CreateIdentifierInput
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const id = newId("IDF");
  const confidence = input.confidence
    ? normalizeConfidence({
        score: Math.max(0, Math.min(1, input.confidence.score)),
        bucket: (input.confidence.bucket as "LOW" | "MODERATE" | "HIGH") ?? undefined,
        rationale: input.confidence.rationale,
      })
    : undefined;
  const identifier: Identifier = {
    id,
    investigation_id: input.investigation_id,
    entity_id: input.entity_id,
    type: input.type,
    value: input.value.trim(),
    source_text: input.source_text?.trim(),
    source_evidence_ids: input.source_evidence_ids?.length
      ? [...input.source_evidence_ids]
      : undefined,
    first_observed_at: input.first_observed_at,
    last_observed_at: input.last_observed_at ?? undefined,
    is_primary: input.is_primary,
    confidence,
    created_at: now,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    identifiers: [...caseFile.identifiers, identifier],
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_IDENTIFIER",
    object_type: "identifier",
    object_id: id,
    details: { entity_id: input.entity_id, type: input.type, value: identifier.value },
  };
  return { next, auditEntry };
}

export type UpdateIdentifierPatch = Partial<
  Pick<
    Identifier,
    | "type"
    | "value"
    | "source_text"
    | "source_evidence_ids"
    | "first_observed_at"
    | "last_observed_at"
    | "is_primary"
  >
> & { confidence?: Partial<Confidence> };

/**
 * Update identifier. Normalizes confidence if provided.
 */
export function updateIdentifier(
  caseFile: CaseFile,
  identifierId: string,
  patch: UpdateIdentifierPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const ident = caseFile.identifiers.find((i) => i.id === identifierId);
  if (!ident)
    return {
      next: caseFile,
      auditEntry: { at: now, action: "UPDATE_IDENTIFIER", object_id: identifierId } as AuditEntry,
    };
  const confidence =
    patch.confidence !== undefined
      ? normalizeConfidence(
          typeof patch.confidence.score === "number"
            ? { ...patch.confidence, score: Math.max(0, Math.min(1, patch.confidence.score)) }
            : patch.confidence
        )
      : ident.confidence;
  const updated: Identifier = {
    ...ident,
    ...patch,
    type: patch.type ?? ident.type,
    value: (patch.value ?? ident.value).trim(),
    source_text: patch.source_text !== undefined ? patch.source_text?.trim() : ident.source_text,
    confidence,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    identifiers: caseFile.identifiers.map((i) => (i.id === identifierId ? updated : i)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "UPDATE_IDENTIFIER",
    object_type: "identifier",
    object_id: identifierId,
    details: { value: updated.value },
  };
  return { next, auditEntry };
}

/**
 * Delete identifier.
 */
export function deleteIdentifier(
  caseFile: CaseFile,
  identifierId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const ident = caseFile.identifiers.find((i) => i.id === identifierId);
  if (!ident)
    return {
      next: caseFile,
      auditEntry: { at: now, action: "DELETE_IDENTIFIER", object_id: identifierId } as AuditEntry,
    };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    identifiers: caseFile.identifiers.filter((i) => i.id !== identifierId),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "DELETE_IDENTIFIER",
    object_type: "identifier",
    object_id: identifierId,
    details: { entity_id: ident.entity_id, value: ident.value },
  };
  return { next, auditEntry };
}
