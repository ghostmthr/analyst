/**
 * Case integrity scanner — dangling references, orphans, attachment verification.
 * Deterministic output ordering. No automatic repairs.
 */

import { readAttachment } from "@/lib/caseIO";
import { hashFileSha256 } from "@/lib/evidence";
import type { CaseFile, Geometry,LocationRef } from "@/types";

export type IntegrityIssueSeverity = "ERROR" | "WARNING";

export interface IntegrityIssue {
  severity: IntegrityIssueSeverity;
  code: string;
  message: string;
  investigation_id?: string;
  object_type?: string;
  object_id?: string;
  path?: string;
  related_ids?: string[];
}

export interface ScanIntegrityResult {
  ok: boolean;
  errors: IntegrityIssue[];
  warnings: IntegrityIssue[];
  stats: Record<string, number>;
}

const GEOMETRY_TYPES = ["Point", "LineString", "Polygon"] as const;

function isValidGeometry(g: unknown): g is Geometry {
  if (!g || typeof g !== "object") return false;
  const o = g as Record<string, unknown>;
  const t = o.type as string | undefined;
  if (!t || !GEOMETRY_TYPES.includes(t as "Point" | "LineString" | "Polygon")) return false;
  if (!Array.isArray(o.coordinates)) return false;
  return true;
}

function sortIssues(issues: IntegrityIssue[]): IntegrityIssue[] {
  return [...issues].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    if ((a.path ?? "") !== (b.path ?? "")) return (a.path ?? "").localeCompare(b.path ?? "");
    if ((a.object_id ?? "") !== (b.object_id ?? "")) return (a.object_id ?? "").localeCompare(b.object_id ?? "");
    return (a.message ?? "").localeCompare(b.message ?? "");
  });
}

export async function scanCaseIntegrity(
  caseFile: CaseFile,
  opts?: { invId?: string; dir?: FileSystemDirectoryHandle }
): Promise<ScanIntegrityResult> {
  const { invId, dir } = opts ?? {};
  const errors: IntegrityIssue[] = [];
  const warnings: IntegrityIssue[] = [];

  const entityIds = new Set(caseFile.entities.map((e) => e.id));
  const evidenceIds = new Set(caseFile.evidence.map((e) => e.id));
  const claimIds = new Set(caseFile.claims.map((c) => c.id));
  const _invIds = new Set(caseFile.investigations.map((i) => i.id));
  const hypothesisGroupIds = new Set((caseFile.analysis?.hypothesis_groups ?? []).map((g) => g.id));
  const _hypothesisIds = new Set((caseFile.analysis?.hypotheses ?? []).map((h) => h.id));
  const _diagnosticClaimIds = new Set((caseFile.analysis?.diagnostic_claims ?? []).map((d) => d.id));

  const investigations = invId
    ? caseFile.investigations.filter((i) => i.id === invId)
    : caseFile.investigations;

  for (const inv of investigations) {
    const currentInvId = inv.id;

    // 1) Investigation linkage — entity_ids
    for (const eid of inv.entity_ids) {
      if (!entityIds.has(eid)) {
        errors.push({
          severity: "ERROR",
          code: "MISSING_ENTITY",
          message: `investigation.entity_ids references missing entity ${eid}`,
          investigation_id: currentInvId,
          object_type: "investigation",
          object_id: inv.id,
          path: `investigations[${inv.id}].entity_ids`,
          related_ids: [eid],
        });
      }
    }
    for (const entity of caseFile.entities.filter((e) => e.investigation_id === currentInvId)) {
      if (!inv.entity_ids.includes(entity.id)) {
        warnings.push({
          severity: "WARNING",
          code: "ORPHAN_ENTITY",
          message: `Entity ${entity.id} not in investigation.entity_ids`,
          investigation_id: currentInvId,
          object_type: "entity",
          object_id: entity.id,
          path: `entities[${entity.id}]`,
        });
      }
    }

    // hypothesis_group_ids
    for (const gid of inv.hypothesis_group_ids) {
      if (!hypothesisGroupIds.has(gid)) {
        errors.push({
          severity: "ERROR",
          code: "MISSING_HYPOTHESIS_GROUP",
          message: `investigation.hypothesis_group_ids references missing group ${gid}`,
          investigation_id: currentInvId,
          object_type: "investigation",
          object_id: inv.id,
          path: `investigations[${inv.id}].hypothesis_group_ids`,
          related_ids: [gid],
        });
      }
    }
    for (const group of (caseFile.analysis?.hypothesis_groups ?? []).filter((g) => g.investigation_id === currentInvId)) {
      if (!inv.hypothesis_group_ids.includes(group.id)) {
        warnings.push({
          severity: "WARNING",
          code: "ORPHAN_HYPOTHESIS_GROUP",
          message: `Hypothesis group ${group.id} not in investigation.hypothesis_group_ids`,
          investigation_id: currentInvId,
          object_type: "hypothesis_group",
          object_id: group.id,
          path: `analysis.hypothesis_groups[${group.id}]`,
        });
      }
    }
  }

  // 2) Relationships
  for (const rel of caseFile.relationships) {
    if (invId && rel.investigation_id !== invId) continue;
    if (!entityIds.has(rel.from_entity_id)) {
      errors.push({
        severity: "ERROR",
        code: "MISSING_ENTITY",
        message: `relationship.from_entity_id references missing entity ${rel.from_entity_id}`,
        investigation_id: rel.investigation_id,
        object_type: "relationship",
        object_id: rel.id,
        path: `relationships[${rel.id}].from_entity_id`,
        related_ids: [rel.from_entity_id],
      });
    }
    if (!entityIds.has(rel.to_entity_id)) {
      errors.push({
        severity: "ERROR",
        code: "MISSING_ENTITY",
        message: `relationship.to_entity_id references missing entity ${rel.to_entity_id}`,
        investigation_id: rel.investigation_id,
        object_type: "relationship",
        object_id: rel.id,
        path: `relationships[${rel.id}].to_entity_id`,
        related_ids: [rel.to_entity_id],
      });
    }
    if (rel.source === "EVIDENCE" && (!rel.evidence_ids || rel.evidence_ids.length === 0)) {
      errors.push({
        severity: "ERROR",
        code: "RELATIONSHIP_EVIDENCE_EMPTY",
        message: "relationship.source is EVIDENCE but evidence_ids is empty",
        investigation_id: rel.investigation_id,
        object_type: "relationship",
        object_id: rel.id,
        path: `relationships[${rel.id}].evidence_ids`,
      });
    }
    for (const eid of rel.evidence_ids ?? []) {
      if (!evidenceIds.has(eid)) {
        errors.push({
          severity: "ERROR",
          code: "MISSING_EVIDENCE",
          message: `relationship.evidence_ids references missing evidence ${eid}`,
          investigation_id: rel.investigation_id,
          object_type: "relationship",
          object_id: rel.id,
          path: `relationships[${rel.id}].evidence_ids`,
          related_ids: [eid],
        });
      }
    }
  }

  // 3) Claims
  for (const claim of caseFile.claims) {
    if (invId && claim.investigation_id !== invId) continue;
    for (const eid of claim.entity_ids ?? []) {
      if (!entityIds.has(eid)) {
        warnings.push({
          severity: "WARNING",
          code: "MISSING_ENTITY",
          message: `claim.entity_ids references missing entity ${eid}`,
          investigation_id: claim.investigation_id,
          object_type: "claim",
          object_id: claim.id,
          path: `claims[${claim.id}].entity_ids`,
          related_ids: [eid],
        });
      }
    }
    for (const eid of claim.evidence_ids ?? []) {
      if (!evidenceIds.has(eid)) {
        errors.push({
          severity: "ERROR",
          code: "MISSING_EVIDENCE",
          message: `claim.evidence_ids references missing evidence ${eid}`,
          investigation_id: claim.investigation_id,
          object_type: "claim",
          object_id: claim.id,
          path: `claims[${claim.id}].evidence_ids`,
          related_ids: [eid],
        });
      }
    }
  }

  // 4) Events
  for (const evt of caseFile.events) {
    if (invId && evt.investigation_id !== invId) continue;
    for (const eid of evt.entity_ids ?? []) {
      if (!entityIds.has(eid)) {
        warnings.push({
          severity: "WARNING",
          code: "MISSING_ENTITY",
          message: `event.entity_ids references missing entity ${eid}`,
          investigation_id: evt.investigation_id,
          object_type: "event",
          object_id: evt.id,
          path: `events[${evt.id}].entity_ids`,
          related_ids: [eid],
        });
      }
    }
    for (const cid of evt.claim_ids ?? []) {
      if (!claimIds.has(cid)) {
        warnings.push({
          severity: "WARNING",
          code: "MISSING_CLAIM",
          message: `event.claim_ids references missing claim ${cid}`,
          investigation_id: evt.investigation_id,
          object_type: "event",
          object_id: evt.id,
          path: `events[${evt.id}].claim_ids`,
          related_ids: [cid],
        });
      }
    }
    for (const eid of evt.evidence_ids ?? []) {
      if (!evidenceIds.has(eid)) {
        errors.push({
          severity: "ERROR",
          code: "MISSING_EVIDENCE",
          message: `event.evidence_ids references missing evidence ${eid}`,
          investigation_id: evt.investigation_id,
          object_type: "event",
          object_id: evt.id,
          path: `events[${evt.id}].evidence_ids`,
          related_ids: [eid],
        });
      }
    }
    const loc = evt.location as LocationRef | undefined;
    if (loc?.evidence_ids) {
      for (const eid of loc.evidence_ids) {
        if (!evidenceIds.has(eid)) {
          errors.push({
            severity: "ERROR",
            code: "MISSING_EVIDENCE",
            message: `event.location.evidence_ids references missing evidence ${eid}`,
            investigation_id: evt.investigation_id,
            object_type: "event",
            object_id: evt.id,
            path: `events[${evt.id}].location.evidence_ids`,
            related_ids: [eid],
          });
        }
      }
    }
    if (loc && !isValidGeometry(loc.geometry)) {
      errors.push({
        severity: "ERROR",
        code: "INVALID_GEOMETRY",
        message: "event.location.geometry must be Point, LineString, or Polygon with coordinates",
        investigation_id: evt.investigation_id,
        object_type: "event",
        object_id: evt.id,
        path: `events[${evt.id}].location.geometry`,
      });
    }
  }

  // Entity locations (evidence_ids)
  for (const entity of caseFile.entities) {
    if (invId && entity.investigation_id !== invId) continue;
    for (const loc of entity.locations ?? []) {
      for (const eid of loc.evidence_ids ?? []) {
        if (!evidenceIds.has(eid)) {
          errors.push({
            severity: "ERROR",
            code: "MISSING_EVIDENCE",
            message: `entity.location.evidence_ids references missing evidence ${eid}`,
            investigation_id: entity.investigation_id,
            object_type: "entity",
            object_id: entity.id,
            path: `entities[${entity.id}].locations[${loc.id}].evidence_ids`,
            related_ids: [eid],
          });
        }
      }
      if (loc && !isValidGeometry(loc.geometry)) {
        errors.push({
          severity: "ERROR",
          code: "INVALID_GEOMETRY",
          message: "entity.location.geometry must be Point, LineString, or Polygon with coordinates",
          investigation_id: entity.investigation_id,
          object_type: "entity",
          object_id: entity.id,
          path: `entities[${entity.id}].locations[${loc.id}].geometry`,
        });
      }
    }
  }

  // 5) Evidence attachments (if dir provided) — cache by path to avoid rehashing
  const hashCache = new Map<string, string>();
  const evidenceWithFile = caseFile.evidence.filter((e) => e.file?.path);
  if (dir && evidenceWithFile.length > 0) {
    for (const evd of evidenceWithFile) {
      const path = evd.file!.path;
      if (invId && evd.investigation_id !== invId) continue;

      try {
        const file = await readAttachment(dir, path);
        const cached = hashCache.get(path);
        const computed = cached ?? await hashFileSha256(file);
        if (!cached) hashCache.set(path, computed);

        if (computed !== evd.file!.sha256) {
          errors.push({
            severity: "ERROR",
            code: "ATTACHMENT_HASH_MISMATCH",
            message: `Evidence file hash does not match stored sha256`,
            investigation_id: evd.investigation_id,
            object_type: "evidence",
            object_id: evd.id,
            path: `evidence[${evd.id}].file`,
            related_ids: [path],
          });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "NotFoundError") {
          errors.push({
            severity: "ERROR",
            code: "MISSING_ATTACHMENT",
            message: `Evidence file not found at ${path}`,
            investigation_id: evd.investigation_id,
            object_type: "evidence",
            object_id: evd.id,
            path: `evidence[${evd.id}].file.path`,
            related_ids: [path],
          });
        } else {
          errors.push({
            severity: "ERROR",
            code: "ATTACHMENT_READ_ERROR",
            message: e instanceof Error ? e.message : "Failed to read attachment",
            investigation_id: evd.investigation_id,
            object_type: "evidence",
            object_id: evd.id,
            path: `evidence[${evd.id}].file`,
          });
        }
      }
    }
  }

  const sortedErrors = sortIssues(errors);
  const sortedWarnings = sortIssues(warnings);

  const stats: Record<string, number> = {
    errors: sortedErrors.length,
    warnings: sortedWarnings.length,
    attachment_verified: dir ? evidenceWithFile.filter((e) => !invId || e.investigation_id === invId).length : 0,
  };

  return {
    ok: sortedErrors.length === 0,
    errors: sortedErrors,
    warnings: sortedWarnings,
    stats,
  };
}
