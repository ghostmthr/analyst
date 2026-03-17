/**
 * Patch validation — integrity checks before apply.
 * Returns { ok, errors, warnings, summary }.
 */

import { hashStringSha256 } from "@/lib/evidence";
import type { ExportManifest } from "@/lib/export/manifest";
import type { CaseFile } from "@/types";

import type { PatchFile, PatchOp, PatchOpType } from "./types";

const INV_SCOPED_OPS: PatchOpType[] = [
  "UPSERT_ENTITY",
  "UPSERT_IDENTIFIER",
  "UPSERT_EVIDENCE",
  "UPSERT_CLAIM",
  "UPSERT_RELATIONSHIP",
  "UPSERT_EVENT",
  "UPSERT_HYPOTHESIS_GROUP",
];

const _ANALYSIS_OPS: PatchOpType[] = [
  "UPSERT_HYPOTHESIS",
  "UPSERT_DIAGNOSTIC_CLAIM",
  "UPSERT_ACH_MATRIX",
  "UPSERT_ASSESSMENT_SUMMARY",
];

function getObjectId(op: PatchOp): string | undefined {
  if (op.id) return op.id;
  const obj = op.object as Record<string, unknown> | undefined;
  return obj?.id as string | undefined;
}

function getInvestigationId(op: PatchOp): string | undefined {
  const obj = op.object as Record<string, unknown> | undefined;
  return obj?.investigation_id as string | undefined;
}

export interface ValidatePatchResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    opsByType: Record<string, number>;
    attachmentsCount: number;
  };
}

export async function validatePatch(
  patch: PatchFile,
  manifest: ExportManifest | undefined,
  caseFile: CaseFile,
  options: {
    invId?: string;
    patchJsonBytes?: string;
    zipPaths?: string[];
    getAttachmentSha256?: (path: string) => Promise<string>;
  } = {}
): Promise<ValidatePatchResult> {
  const { invId, patchJsonBytes, zipPaths = [], getAttachmentSha256 } = options;
  const errors: string[] = [];
  const warnings: string[] = [];

  const evidenceIds = new Set(caseFile.evidence.map((e) => e.id));
  const entityIds = new Set(caseFile.entities.map((e) => e.id));
  const invIds = new Set(caseFile.investigations.map((i) => i.id));
  const claimIds = new Set(caseFile.claims.map((c) => c.id));
  const hypothesisGroupIds = new Set(
    (caseFile.analysis?.hypothesis_groups ?? []).map((g) => g.id)
  );

  // Track IDs being upserted in this patch
  const upsertedEvidenceIds = new Set<string>();
  const upsertedEntityIds = new Set<string>();
  const upsertedInvIds = new Set<string>();
  const upsertedClaimIds = new Set<string>();
  const upsertedHypGroupIds = new Set<string>();

  for (const op of patch.ops) {
    const ot = op.op as PatchOpType;
    if (ot?.startsWith("UPSERT_")) {
      const id = getObjectId(op);
      if (!id) errors.push(`Op ${ot}: missing object.id`);
      if (ot === "UPSERT_EVIDENCE" && id) upsertedEvidenceIds.add(id);
      if (ot === "UPSERT_ENTITY" && id) upsertedEntityIds.add(id);
      if (ot === "UPSERT_INVESTIGATION" && id) upsertedInvIds.add(id);
      if (ot === "UPSERT_CLAIM" && id) upsertedClaimIds.add(id);
      if (ot === "UPSERT_HYPOTHESIS_GROUP" && id) upsertedHypGroupIds.add(id);
    }
  }

  const opsByType: Record<string, number> = {};
  for (const op of patch.ops) {
    const t = (op.op as string) ?? "UNKNOWN";
    opsByType[t] = (opsByType[t] ?? 0) + 1;
  }

  // Validate each op
  for (let i = 0; i < patch.ops.length; i++) {
    const op = patch.ops[i];
    const ot = op.op as PatchOpType;
    const obj = op.object as Record<string, unknown> | undefined;
    const id = getObjectId(op);
    const opInvId = getInvestigationId(op);

    if (ot?.startsWith("UPSERT_")) {
      if (!id) continue; // already reported
      if (!obj) {
        errors.push(`Op ${i} (${ot}): missing object`);
        continue;
      }
      if (INV_SCOPED_OPS.includes(ot) || ot === "UPSERT_INVESTIGATION") {
        if (ot !== "UPSERT_INVESTIGATION" && opInvId && invId && opInvId !== invId) {
          warnings.push(`Op ${i} (${ot}): investigation_id ${opInvId} differs from scope ${invId}`);
        }
        if (ot !== "UPSERT_INVESTIGATION" && !opInvId) {
          errors.push(`Op ${i} (${ot}): investigation_id required`);
        }
      }
      if (ot === "UPSERT_EVIDENCE") {
        const file = obj.file as { path?: string; sha256?: string } | undefined;
        if (file?.path && !file?.sha256) {
          errors.push(`Op ${i} (UPSERT_EVIDENCE): file.path present but sha256 missing`);
        }
      }
      if (ot === "UPSERT_RELATIONSHIP") {
        const from = obj.from_entity_id as string | undefined;
        const to = obj.to_entity_id as string | undefined;
        if (from === to) {
          errors.push(`Op ${i} (UPSERT_RELATIONSHIP): from_entity_id must not equal to_entity_id`);
        }
        const source = obj.source as string | undefined;
        if (source === "EVIDENCE") {
          const eids = obj.evidence_ids as string[] | undefined;
          if (!eids?.length) {
            warnings.push(`Op ${i} (UPSERT_RELATIONSHIP): source=EVIDENCE but evidence_ids empty`);
          }
        }
      }
    }

    if (ot?.startsWith("DELETE_")) {
      const delId = op.id ?? (obj?.id as string | undefined);
      if (!delId) {
        errors.push(`Op ${i} (${ot}): id required`);
      } else {
        const base = ot.replace("DELETE_", "");
        const exists =
          (base === "ENTITY" && (entityIds.has(delId) || upsertedEntityIds.has(delId))) ||
          (base === "EVIDENCE" && (evidenceIds.has(delId) || upsertedEvidenceIds.has(delId))) ||
          (base === "INVESTIGATION" && (invIds.has(delId) || upsertedInvIds.has(delId))) ||
          (base === "CLAIM" && (claimIds.has(delId) || upsertedClaimIds.has(delId))) ||
          (base === "RELATIONSHIP" && caseFile.relationships.some((r) => r.id === delId)) ||
          (base === "EVENT" && caseFile.events.some((e) => e.id === delId)) ||
          (base === "HYPOTHESIS_GROUP" && (hypothesisGroupIds.has(delId) || upsertedHypGroupIds.has(delId))) ||
          (base === "HYPOTHESIS" && (caseFile.analysis?.hypotheses ?? []).some((h) => h.id === delId)) ||
          (base === "DIAGNOSTIC_CLAIM" && (caseFile.analysis?.diagnostic_claims ?? []).some((d) => d.id === delId)) ||
          (base === "ACH_MATRIX" && (caseFile.analysis?.ach_matrices ?? []).some((a) => a.id === delId)) ||
          (base === "ASSESSMENT_SUMMARY" && (caseFile.analysis?.assessments ?? []).some((a) => a.id === delId)) ||
          (base === "IDENTIFIER" && caseFile.identifiers.some((i) => i.id === delId));
        if (!exists) {
          warnings.push(`Op ${i} (${ot}): id ${delId} not found in case (no-op delete)`);
        }
      }
    }
  }

  // Evidence ID references: must exist in case OR be upserted in patch
  const resolveEvidenceId = (eid: string): boolean =>
    evidenceIds.has(eid) || upsertedEvidenceIds.has(eid);
  for (let i = 0; i < patch.ops.length; i++) {
    const op = patch.ops[i];
    const obj = op.object as Record<string, unknown> | undefined;
    if (!obj) continue;
    const eids = (obj.evidence_ids as string[] | undefined) ?? [];
    for (const eid of eids) {
      if (!resolveEvidenceId(eid)) {
        errors.push(`Op ${i}: evidence_ids references ${eid} which does not exist and is not upserted in this patch`);
      }
    }
  }

  // Manifest verification
  if (manifest?.files) {
    const patchEntry = manifest.files.find((f) => f.path === "patch.json");
    if (patchEntry?.sha256 && patchJsonBytes) {
      const computed = await hashStringSha256(patchJsonBytes);
      if (computed !== patchEntry.sha256) {
        errors.push(`Manifest: patch.json sha256 mismatch (expected ${patchEntry.sha256}, got ${computed})`);
      }
    }
    for (const f of manifest.files) {
      if (f.kind === "ATTACHMENT" && f.sha256 && f.path && getAttachmentSha256) {
        if (!zipPaths.includes(f.path)) {
          warnings.push(`Manifest lists attachment ${f.path} but it is not in ZIP`);
        } else {
          const computed = await getAttachmentSha256(f.path);
          if (computed !== f.sha256) {
            errors.push(`Manifest: attachment ${f.path} sha256 mismatch`);
          }
        }
      }
    }
  }

  // Count attachments (from patch.attachments or manifest ATTACHMENT entries)
  const attachmentsFromManifest = manifest?.files?.filter((f) => f.kind === "ATTACHMENT").length ?? 0;
  const attachmentsCount = patch.attachments?.length ?? attachmentsFromManifest;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: { opsByType, attachmentsCount },
  };
}
