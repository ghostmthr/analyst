/**
 * Patch apply engine — pure, deterministic.
 * Processes ops in order; returns next case file + audit metadata.
 */

import { validateEvidenceIdsForInv } from "@/lib/evidence";
import { nowUtc } from "@/lib/ids";
import type {
  AchMatrix,
  AnalysisWorkspace,
  AssessmentSummary,
  CaseFile,
  Claim,
  DiagnosticClaim,
  Entity,
  Evidence,
  Hypothesis,
  HypothesisGroup,
  Identifier,
  Investigation,
  Relationship,
  TimelineEvent,
} from "@/types";

import type { PatchFile, PatchOp, PatchOpType } from "./types";

export interface ApplyPatchOptions {
  force?: boolean;
}

export interface ApplyPatchResult {
  next: CaseFile;
  appliedOps: { op: PatchOpType; object_id: string }[];
  skippedOps: { op: PatchOpType; object_id?: string; reason: string }[];
  errors: string[];
  state_before_id?: string;
  state_after_id?: string;
}

function getObjectId(op: PatchOp): string | undefined {
  if (op.id) return op.id;
  const obj = op.object as Record<string, unknown> | undefined;
  return obj?.id as string | undefined;
}

function ensureAnalysis(analysis: AnalysisWorkspace | undefined): AnalysisWorkspace {
  return {
    hypothesis_groups: analysis?.hypothesis_groups ?? [],
    hypotheses: analysis?.hypotheses ?? [],
    diagnostic_claims: analysis?.diagnostic_claims ?? [],
    ach_matrices: analysis?.ach_matrices ?? [],
    assessments: analysis?.assessments ?? [],
  };
}

/**
 * Apply patch ops deterministically to case file.
 * Preserves created_at on upsert unless patch includes it.
 * Removes cross-refs on delete (entity_ids, hypothesis_group_ids).
 */
export function applyPatch(
  caseFile: CaseFile,
  patch: PatchFile,
  options: ApplyPatchOptions = {}
): ApplyPatchResult {
  const { force = false } = options;
  const now = nowUtc();
  const appliedOps: { op: PatchOpType; object_id: string }[] = [];
  const skippedOps: { op: PatchOpType; object_id?: string; reason: string }[] = [];
  const errors: string[] = [];

  let next: CaseFile = JSON.parse(JSON.stringify(caseFile));
  next.analysis = ensureAnalysis(next.analysis);

  const idx = {
    investigations: new Map(next.investigations.map((i) => [i.id, i])),
    entities: new Map(next.entities.map((e) => [e.id, e])),
    identifiers: new Map(next.identifiers.map((i) => [i.id, i])),
    evidence: new Map(next.evidence.map((e) => [e.id, e])),
    claims: new Map(next.claims.map((c) => [c.id, c])),
    relationships: new Map(next.relationships.map((r) => [r.id, r])),
    events: new Map(next.events.map((e) => [e.id, e])),
    hypothesisGroups: new Map((next.analysis.hypothesis_groups ?? []).map((g) => [g.id, g])),
    hypotheses: new Map((next.analysis.hypotheses ?? []).map((h) => [h.id, h])),
    diagnosticClaims: new Map((next.analysis.diagnostic_claims ?? []).map((d) => [d.id, d])),
    achMatrices: new Map((next.analysis.ach_matrices ?? []).map((a) => [a.id, a])),
    assessments: new Map((next.analysis.assessments ?? []).map((a) => [a.id, a])),
  };

  function replaceInArray<T extends { id: string }>(arr: T[], item: T): T[] {
    const i = arr.findIndex((x) => x.id === item.id);
    if (i >= 0) {
      const out = [...arr];
      out[i] = item;
      return out;
    }
    return [...arr, item];
  }

  function removeFromArray<T extends { id: string }>(arr: T[], id: string): T[] {
    return arr.filter((x) => x.id !== id);
  }

  for (let i = 0; i < patch.ops.length; i++) {
    const op = patch.ops[i];
    const ot = op.op as PatchOpType;
    const obj = op.object as Record<string, unknown> | undefined;
    const id = getObjectId(op);

    if (ot?.startsWith("UPSERT_")) {
      if (!id || !obj) {
        skippedOps.push({ op: ot, reason: "missing id or object" });
        continue;
      }
      const withTimestamps = {
        ...obj,
        id,
        updated_at: now,
        created_at: (obj.created_at as string) ?? now,
      } as Record<string, unknown>;

      switch (ot) {
        case "UPSERT_INVESTIGATION": {
          const entity_ids = (withTimestamps.entity_ids as string[]) ?? [];
          const hypothesis_group_ids = (withTimestamps.hypothesis_group_ids as string[]) ?? [];
          const inv: Investigation = {
            ...(withTimestamps as unknown as Investigation),
            entity_ids,
            hypothesis_group_ids,
          };
          next.investigations = replaceInArray(next.investigations, inv);
          idx.investigations.set(id, inv);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_ENTITY": {
          const entity = { ...withTimestamps } as unknown as Entity;
          next.entities = replaceInArray(next.entities, entity);
          idx.entities.set(id, entity);
          const invId = entity.investigation_id;
          const inv = next.investigations.find((x) => x.id === invId);
          if (inv && !inv.entity_ids.includes(id)) {
            next.investigations = next.investigations.map((x) =>
              x.id === invId ? { ...x, entity_ids: [...x.entity_ids, id], updated_at: now } : x
            );
          }
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_IDENTIFIER": {
          const identifier = { ...withTimestamps } as unknown as Identifier;
          next.identifiers = replaceInArray(next.identifiers, identifier);
          idx.identifiers.set(id, identifier);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_EVIDENCE": {
          const evidence = { ...withTimestamps } as unknown as Evidence;
          next.evidence = replaceInArray(next.evidence, evidence);
          idx.evidence.set(id, evidence);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_CLAIM": {
          const claim = { ...withTimestamps } as unknown as Claim;
          next.claims = replaceInArray(next.claims, claim);
          idx.claims.set(id, claim);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_RELATIONSHIP": {
          const rel = { ...withTimestamps } as unknown as Relationship;
          next.relationships = replaceInArray(next.relationships, rel);
          idx.relationships.set(id, rel);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_EVENT": {
          const evt = { ...withTimestamps } as unknown as TimelineEvent;
          next.events = replaceInArray(next.events, evt);
          idx.events.set(id, evt);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_HYPOTHESIS_GROUP": {
          const group = { ...withTimestamps } as unknown as HypothesisGroup;
          next.analysis.hypothesis_groups = replaceInArray(next.analysis.hypothesis_groups, group);
          idx.hypothesisGroups.set(id, group);
          const invId = group.investigation_id;
          const inv = next.investigations.find((x) => x.id === invId);
          if (inv && !inv.hypothesis_group_ids.includes(id)) {
            next.investigations = next.investigations.map((x) =>
              x.id === invId
                ? { ...x, hypothesis_group_ids: [...x.hypothesis_group_ids, id], updated_at: now }
                : x
            );
          }
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_HYPOTHESIS": {
          const hyp = { ...withTimestamps } as unknown as Hypothesis;
          next.analysis.hypotheses = replaceInArray(next.analysis.hypotheses, hyp);
          idx.hypotheses.set(id, hyp);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_DIAGNOSTIC_CLAIM": {
          const dc = { ...withTimestamps } as unknown as DiagnosticClaim;
          next.analysis.diagnostic_claims = replaceInArray(next.analysis.diagnostic_claims, dc);
          idx.diagnosticClaims.set(id, dc);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_ACH_MATRIX": {
          const ach = { ...withTimestamps } as unknown as AchMatrix;
          next.analysis.ach_matrices = replaceInArray(next.analysis.ach_matrices, ach);
          idx.achMatrices.set(id, ach);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        case "UPSERT_ASSESSMENT_SUMMARY": {
          const asm = { ...withTimestamps } as unknown as AssessmentSummary;
          next.analysis.assessments = replaceInArray(next.analysis.assessments, asm);
          idx.assessments.set(id, asm);
          appliedOps.push({ op: ot, object_id: id });
          break;
        }
        default:
          skippedOps.push({ op: ot, object_id: id, reason: "unsupported op" });
      }
    }

    if (ot?.startsWith("DELETE_")) {
      const delId = op.id ?? (obj?.id as string | undefined);
      if (!delId) {
        skippedOps.push({ op: ot, reason: "missing id" });
        continue;
      }
      const base = ot.replace("DELETE_", "");

      switch (base) {
        case "INVESTIGATION":
          next.investigations = removeFromArray(next.investigations, delId);
          idx.investigations.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "ENTITY": {
          next.entities = removeFromArray(next.entities, delId);
          idx.entities.delete(delId);
          next.investigations = next.investigations.map((inv) =>
            inv.entity_ids.includes(delId)
              ? { ...inv, entity_ids: inv.entity_ids.filter((e) => e !== delId), updated_at: now }
              : inv
          );
          appliedOps.push({ op: ot, object_id: delId });
          break;
        }
        case "IDENTIFIER":
          next.identifiers = removeFromArray(next.identifiers, delId);
          idx.identifiers.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "EVIDENCE":
          next.evidence = removeFromArray(next.evidence, delId);
          idx.evidence.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "CLAIM":
          next.claims = removeFromArray(next.claims, delId);
          idx.claims.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "RELATIONSHIP":
          next.relationships = removeFromArray(next.relationships, delId);
          idx.relationships.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "EVENT":
          next.events = removeFromArray(next.events, delId);
          idx.events.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "HYPOTHESIS_GROUP": {
          next.analysis.hypothesis_groups = removeFromArray(next.analysis.hypothesis_groups, delId);
          idx.hypothesisGroups.delete(delId);
          next.investigations = next.investigations.map((inv) =>
            inv.hypothesis_group_ids.includes(delId)
              ? {
                  ...inv,
                  hypothesis_group_ids: inv.hypothesis_group_ids.filter((g) => g !== delId),
                  updated_at: now,
                }
              : inv
          );
          appliedOps.push({ op: ot, object_id: delId });
          break;
        }
        case "HYPOTHESIS":
          next.analysis.hypotheses = removeFromArray(next.analysis.hypotheses, delId);
          idx.hypotheses.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "DIAGNOSTIC_CLAIM":
          next.analysis.diagnostic_claims = removeFromArray(next.analysis.diagnostic_claims, delId);
          idx.diagnosticClaims.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "ACH_MATRIX":
          next.analysis.ach_matrices = removeFromArray(next.analysis.ach_matrices, delId);
          idx.achMatrices.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        case "ASSESSMENT_SUMMARY":
          next.analysis.assessments = removeFromArray(next.analysis.assessments, delId);
          idx.assessments.delete(delId);
          appliedOps.push({ op: ot, object_id: delId });
          break;
        default:
          skippedOps.push({ op: ot, object_id: delId, reason: "unsupported delete" });
      }
    }
  }

  // Update case.updated_at
  next.case = { ...next.case, updated_at: now };

  // Post-apply: validate evidence IDs (unless force)
  if (!force) {
    for (const entity of next.entities) {
      const locs = entity.locations ?? [];
      for (const loc of locs) {
        if (loc.evidence_ids?.length) {
          try {
            validateEvidenceIdsForInv(next, entity.investigation_id, loc.evidence_ids);
          } catch (e) {
            errors.push(e instanceof Error ? e.message : "Evidence validation failed");
          }
        }
      }
    }
    for (const claim of next.claims) {
      if (claim.evidence_ids?.length) {
        try {
          validateEvidenceIdsForInv(next, claim.investigation_id, claim.evidence_ids);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Evidence validation failed");
        }
      }
    }
    for (const rel of next.relationships) {
      if (rel.evidence_ids?.length) {
        try {
          validateEvidenceIdsForInv(next, rel.investigation_id, rel.evidence_ids);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Evidence validation failed");
        }
      }
    }
    for (const evt of next.events) {
      if (evt.evidence_ids?.length) {
        try {
          validateEvidenceIdsForInv(next, evt.investigation_id, evt.evidence_ids);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Evidence validation failed");
        }
      }
      if (evt.location?.evidence_ids?.length) {
        try {
          validateEvidenceIdsForInv(next, evt.investigation_id, evt.location.evidence_ids);
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Evidence validation failed");
        }
      }
    }
  }

  return {
    next,
    appliedOps,
    skippedOps,
    errors,
  };
}
