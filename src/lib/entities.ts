/**
 * Entity (Target) CRUD — pure functions returning next case file + audit entry.
 * No confidence on entity. Locations at entity.locations[].
 */

import type { AuditEntry } from "@/lib/audit";
import { validateEvidenceIdsForInv } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type {
  CaseFile,
  Entity,
  EntityType,
  LocationRef,
} from "@/types";

export interface CreateEntityInput {
  type: EntityType;
  name: string;
  description?: string;
  summary?: string;
  attributes?: {
    nationality_iso?: string;
    roles?: string[];
    current_organization_entity_ids?: string[];
    ein?: string;
    company_type?: string;
  };
  risk_tags?: string[];
  evidence_ids?: string[];
  image_evidence_ids?: string[];
}

/**
 * Create entity and add its id to investigation.entity_ids.
 */
export function createEntity(
  caseFile: CaseFile,
  invId: string,
  input: CreateEntityInput
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const id = newId("ENT");
  const entity: Entity = {
    id,
    investigation_id: invId,
    type: input.type,
    name: input.name.trim(),
    description: input.description?.trim(),
    summary: input.summary?.trim(),
    attributes: input.attributes,
    risk_tags: input.risk_tags?.length ? [...input.risk_tags] : undefined,
    evidence_ids: input.evidence_ids?.length
      ? [...input.evidence_ids]
      : undefined,
    image_evidence_ids: input.image_evidence_ids?.length
      ? [...input.image_evidence_ids]
      : undefined,
    created_at: now,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    entities: [...caseFile.entities, entity],
    investigations: caseFile.investigations.map((inv) =>
      inv.id === invId
        ? { ...inv, entity_ids: [...inv.entity_ids, id], updated_at: now }
        : inv
    ),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_ENTITY",
    object_type: "entity",
    object_id: id,
    details: { name: entity.name, type: entity.type },
  };
  return { next, auditEntry };
}

export type UpdateEntityPatch = Partial<
  Pick<
    Entity,
    | "type"
    | "name"
    | "description"
    | "summary"
    | "attributes"
    | "risk_tags"
    | "evidence_ids"
    | "image_evidence_ids"
  >
>;

/**
 * Update entity by id. Updates entity.updated_at and case.updated_at.
 */
export function updateEntity(
  caseFile: CaseFile,
  entityId: string,
  patch: UpdateEntityPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const entity = caseFile.entities.find((e) => e.id === entityId);
  if (!entity) return { next: caseFile, auditEntry: { at: now, action: "UPDATE_ENTITY", object_id: entityId } as AuditEntry };
  const updated: Entity = {
    ...entity,
    ...patch,
    type: patch.type ?? entity.type,
    name: (patch.name ?? entity.name).trim(),
    description: patch.description !== undefined ? patch.description?.trim() : entity.description,
    summary: patch.summary !== undefined ? patch.summary?.trim() : entity.summary,
    attributes: patch.attributes !== undefined ? patch.attributes : entity.attributes,
    risk_tags: patch.risk_tags !== undefined ? patch.risk_tags : entity.risk_tags,
    evidence_ids: patch.evidence_ids !== undefined ? patch.evidence_ids : entity.evidence_ids,
    image_evidence_ids: patch.image_evidence_ids !== undefined ? patch.image_evidence_ids : entity.image_evidence_ids,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    entities: caseFile.entities.map((e) => (e.id === entityId ? updated : e)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "UPDATE_ENTITY",
    object_type: "entity",
    object_id: entityId,
    details: { name: updated.name },
  };
  return { next, auditEntry };
}

/**
 * Delete entity (hard). Removes from entities and from investigation.entity_ids.
 */
export function deleteEntity(
  caseFile: CaseFile,
  entityId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const entity = caseFile.entities.find((e) => e.id === entityId);
  if (!entity) return { next: caseFile, auditEntry: { at: now, action: "DELETE_ENTITY", object_id: entityId } as AuditEntry };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    entities: caseFile.entities.filter((e) => e.id !== entityId),
    investigations: caseFile.investigations.map((inv) =>
      inv.id === entity.investigation_id
        ? {
            ...inv,
            entity_ids: inv.entity_ids.filter((id) => id !== entityId),
            updated_at: now,
          }
        : inv
    ),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "DELETE_ENTITY",
    object_type: "entity",
    object_id: entityId,
    details: { name: entity.name },
  };
  return { next, auditEntry };
}

/**
 * Add location to entity. Point only for Phase 3. Updates entity.updated_at and case.updated_at.
 */
export function addEntityLocation(
  caseFile: CaseFile,
  entityId: string,
  location: LocationRef
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const entity = caseFile.entities.find((e) => e.id === entityId);
  if (!entity) return { next: caseFile, auditEntry: { at: now, action: "ADD_ENTITY_LOCATION", object_id: entityId } as AuditEntry };
  validateEvidenceIdsForInv(caseFile, entity.investigation_id, location.evidence_ids);
  const locWithCapture: LocationRef = {
    ...location,
    captured_at: location.captured_at ?? now,
    method: location.method ?? "manual",
  };
  const updated: Entity = {
    ...entity,
    locations: [...(entity.locations ?? []), locWithCapture],
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    entities: caseFile.entities.map((e) => (e.id === entityId ? updated : e)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "ADD_ENTITY_LOCATION",
    object_type: "entity",
    object_id: entityId,
    details: { location_id: location.id, label: location.label },
  };
  return { next, auditEntry };
}

/**
 * Remove location from entity by location id.
 */
export function removeEntityLocation(
  caseFile: CaseFile,
  entityId: string,
  locationId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const entity = caseFile.entities.find((e) => e.id === entityId);
  if (!entity) return { next: caseFile, auditEntry: { at: now, action: "REMOVE_ENTITY_LOCATION", object_id: entityId } as AuditEntry };
  const locations = (entity.locations ?? []).filter((loc) => loc.id !== locationId);
  const updated: Entity = {
    ...entity,
    locations: locations.length ? locations : undefined,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    entities: caseFile.entities.map((e) => (e.id === entityId ? updated : e)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "REMOVE_ENTITY_LOCATION",
    object_type: "entity",
    object_id: entityId,
    details: { location_id: locationId },
  };
  return { next, auditEntry };
}

export type UpdateEntityLocationPatch = Partial<
  Pick<
    LocationRef,
    "label" | "accuracy_m" | "evidence_ids" | "notes" | "method" | "captured_at"
  >
> & { lat?: number; lng?: number };

/**
 * Update a location on an entity in place. Patch may include lat/lng (merged into geometry).
 * Updates entity.updated_at and case.updated_at.
 * Audit: UPDATE_ENTITY_LOCATION with entity_id, location_id, changed_fields.
 */
export function updateEntityLocation(
  caseFile: CaseFile,
  entityId: string,
  locationId: string,
  patch: UpdateEntityLocationPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const entity = caseFile.entities.find((e) => e.id === entityId);
  if (!entity)
    return { next: caseFile, auditEntry: { at: now, action: "UPDATE_ENTITY_LOCATION", object_id: entityId } as AuditEntry };
  const locations = entity.locations ?? [];
  const idx = locations.findIndex((loc) => loc.id === locationId);
  if (idx < 0)
    return { next: caseFile, auditEntry: { at: now, action: "UPDATE_ENTITY_LOCATION", object_id: locationId } as AuditEntry };

  if (patch.evidence_ids !== undefined) {
    validateEvidenceIdsForInv(caseFile, entity.investigation_id, patch.evidence_ids);
  }
  const loc = locations[idx];
  const changedFields: string[] = [];
  const nextLoc: LocationRef = { ...loc };

  if (patch.label !== undefined) {
    nextLoc.label = patch.label;
    changedFields.push("label");
  }
  if (patch.accuracy_m !== undefined) {
    nextLoc.accuracy_m = patch.accuracy_m;
    changedFields.push("accuracy_m");
  }
  if (patch.evidence_ids !== undefined) {
    nextLoc.evidence_ids = patch.evidence_ids.length ? [...patch.evidence_ids] : undefined;
    changedFields.push("evidence_ids");
  }
  if (patch.notes !== undefined) {
    nextLoc.notes = patch.notes;
    changedFields.push("notes");
  }
  if (patch.method !== undefined) {
    nextLoc.method = patch.method;
    changedFields.push("method");
  }
  if (patch.captured_at !== undefined) {
    nextLoc.captured_at = patch.captured_at;
    changedFields.push("captured_at");
  }
  if (patch.lat !== undefined || patch.lng !== undefined) {
    const lng = patch.lng ?? (loc.geometry.type === "Point" ? loc.geometry.coordinates[0] : 0);
    const lat = patch.lat ?? (loc.geometry.type === "Point" ? loc.geometry.coordinates[1] : 0);
    nextLoc.geometry = { type: "Point", coordinates: [lng, lat] };
    changedFields.push("geometry");
  }

  const nextLocations = [...locations];
  nextLocations[idx] = nextLoc;

  const updated: Entity = {
    ...entity,
    locations: nextLocations,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    entities: caseFile.entities.map((e) => (e.id === entityId ? updated : e)),
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "UPDATE_ENTITY_LOCATION",
    object_type: "entity",
    object_id: entityId,
    details: { entity_id: entityId, location_id: locationId, changed_fields: changedFields },
  };
  return { next, auditEntry };
}
