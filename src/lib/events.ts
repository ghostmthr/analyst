/**
 * Timeline events CRUD — pure functions returning next case file + audit entry.
 * Validation: entity/claim/evidence IDs must exist and belong to investigation.
 */

import type { AuditEntry } from "@/lib/audit";
import { normalizeConfidence } from "@/lib/confidence";
import { validateEvidenceIdsForInv } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type {
  CaseFile,
  Confidence,
  EventType,
  LocationRef,
  TimelineEvent,
} from "@/types";

export interface CreateEventInput {
  invId: string;
  date: string;
  type: EventType;
  title?: string;
  text: string;
  entityIds?: string[];
  claimIds?: string[];
  evidenceIds?: string[];
  location?: LocationRef;
  confidence?: { score: number; bucket?: string; rationale?: string };
}

function validateEntityIdsForInv(caseFile: CaseFile, invId: string, entityIds: string[] | undefined): void {
  if (!entityIds?.length) return;
  const byId = new Map(caseFile.entities.map((e) => [e.id, e]));
  for (const id of entityIds) {
    const ent = byId.get(id);
    if (!ent) throw new Error(`Entity "${id}" not found.`);
    if (ent.investigation_id !== invId) throw new Error("Entities must belong to the current investigation.");
  }
}

function validateClaimIdsForInv(caseFile: CaseFile, invId: string, claimIds: string[] | undefined): void {
  if (!claimIds?.length) return;
  const byId = new Map(caseFile.claims.map((c) => [c.id, c]));
  for (const id of claimIds) {
    const cl = byId.get(id);
    if (!cl) throw new Error(`Claim "${id}" not found.`);
    if (cl.investigation_id !== invId) throw new Error("Claims must belong to the current investigation.");
  }
}

function normalizeLocation(loc: LocationRef): LocationRef {
  if (loc.geometry.type === "Point") {
    const [lng, lat] = loc.geometry.coordinates;
    return { ...loc, geometry: { type: "Point" as const, coordinates: [lng, lat] } };
  }
  return loc;
}

export function createEvent(
  caseFile: CaseFile,
  input: CreateEventInput
): { next: CaseFile; auditEntry: AuditEntry; eventId: string } {
  const now = nowUtc();
  const inv = caseFile.investigations.find((i) => i.id === input.invId);
  if (!inv) throw new Error("Investigation not found.");

  validateEntityIdsForInv(caseFile, input.invId, input.entityIds);
  validateClaimIdsForInv(caseFile, input.invId, input.claimIds);
  validateEvidenceIdsForInv(caseFile, input.invId, input.evidenceIds);
  if (input.location?.geometry?.type === "Point") {
    validateEvidenceIdsForInv(caseFile, input.invId, input.location.evidence_ids);
  }

  const id = newId("EVT");
  const confidence = input.confidence
    ? normalizeConfidence({
        score: Math.max(0, Math.min(1, input.confidence.score)),
        bucket: input.confidence.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
        rationale: input.confidence.rationale,
      })
    : undefined;

  const location = input.location ? normalizeLocation(input.location) : undefined;

  const event: TimelineEvent = {
    id,
    investigation_id: input.invId,
    date: input.date,
    type: input.type,
    title: input.title?.trim() || undefined,
    text: input.text.trim(),
    entity_ids: input.entityIds?.length ? [...input.entityIds] : undefined,
    claim_ids: input.claimIds?.length ? [...input.claimIds] : undefined,
    evidence_ids: input.evidenceIds?.length ? [...input.evidenceIds] : undefined,
    location,
    confidence,
    created_at: now,
    updated_at: now,
  };

  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    events: [...caseFile.events, event],
  };

  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_EVENT",
    object_type: "event",
    object_id: id,
    details: {
      invId: input.invId,
      date: input.date,
      type: input.type,
      text_preview: input.text.trim().slice(0, 50),
      entity_count: input.entityIds?.length ?? 0,
      evidence_count: input.evidenceIds?.length ?? 0,
      has_location: Boolean(input.location),
    },
  };

  return { next, auditEntry, eventId: id };
}

export type UpdateEventPatch = Partial<
  Pick<TimelineEvent, "date" | "type" | "title" | "text" | "entity_ids" | "claim_ids" | "evidence_ids" | "location">
> & { confidence?: Partial<Confidence> };

export function updateEvent(
  caseFile: CaseFile,
  eventId: string,
  patch: UpdateEventPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const existing = caseFile.events.find((e) => e.id === eventId);
  if (!existing) {
    return {
      next: caseFile,
      auditEntry: { at: now, action: "UPDATE_EVENT", object_id: eventId } as AuditEntry,
    };
  }

  const invId = existing.investigation_id;
  if (patch.entity_ids !== undefined) validateEntityIdsForInv(caseFile, invId, patch.entity_ids);
  if (patch.claim_ids !== undefined) validateClaimIdsForInv(caseFile, invId, patch.claim_ids);
  if (patch.evidence_ids !== undefined) validateEvidenceIdsForInv(caseFile, invId, patch.evidence_ids);
  if (patch.location?.evidence_ids?.length) {
    validateEvidenceIdsForInv(caseFile, invId, patch.location.evidence_ids);
  }

  const changedFields: string[] = [];
  const confidence =
    patch.confidence !== undefined
      ? normalizeConfidence(
          typeof patch.confidence.score === "number"
            ? { ...patch.confidence, score: Math.max(0, Math.min(1, patch.confidence.score)) }
            : patch.confidence
        )
      : existing.confidence;
  if (patch.confidence !== undefined) changedFields.push("confidence");

  let location = patch.location !== undefined ? patch.location : existing.location;
  if (location?.geometry?.type === "Point") location = normalizeLocation(location);
  if (patch.location !== undefined) changedFields.push("location");

  const updated: TimelineEvent = {
    ...existing,
    date: patch.date ?? existing.date,
    type: patch.type ?? existing.type,
    title: patch.title !== undefined ? (patch.title?.trim() || undefined) : existing.title,
    text: (patch.text ?? existing.text).trim(),
    entity_ids: patch.entity_ids !== undefined ? patch.entity_ids : existing.entity_ids,
    claim_ids: patch.claim_ids !== undefined ? patch.claim_ids : existing.claim_ids,
    evidence_ids: patch.evidence_ids !== undefined ? patch.evidence_ids : existing.evidence_ids,
    location,
    confidence,
    updated_at: now,
  };

  if (patch.date !== undefined) changedFields.push("date");
  if (patch.type !== undefined) changedFields.push("type");
  if (patch.title !== undefined) changedFields.push("title");
  if (patch.text !== undefined) changedFields.push("text");
  if (patch.entity_ids !== undefined) changedFields.push("entity_ids");
  if (patch.claim_ids !== undefined) changedFields.push("claim_ids");
  if (patch.evidence_ids !== undefined) changedFields.push("evidence_ids");

  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    events: caseFile.events.map((e) => (e.id === eventId ? updated : e)),
  };

  const auditEntry: AuditEntry = {
    at: now,
    action: "UPDATE_EVENT",
    object_type: "event",
    object_id: eventId,
    details: { changed_fields: changedFields },
  };

  return { next, auditEntry };
}

export function deleteEvent(
  caseFile: CaseFile,
  eventId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const event = caseFile.events.find((e) => e.id === eventId);
  if (!event) {
    return {
      next: caseFile,
      auditEntry: { at: now, action: "DELETE_EVENT", object_id: eventId } as AuditEntry,
    };
  }

  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    events: caseFile.events.filter((e) => e.id !== eventId),
  };

  const auditEntry: AuditEntry = {
    at: now,
    action: "DELETE_EVENT",
    object_type: "event",
    object_id: eventId,
    details: { date: event.date, type: event.type },
  };

  return { next, auditEntry };
}
