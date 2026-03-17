/**
 * JSON exports — full case and investigation-scoped bundle.
 */

import { canonicalStringify } from "@/lib/canonical";
import { appendAudit, appendCustody } from "@/lib/caseIO";
import { hashBlobSha256 } from "@/lib/evidence";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

const SYSTEM_VERSION = "analyst-0.2.0";
const BUNDLE_VERSION = "1.0.0";

export interface ExportCaseJsonResult {
  blob: Blob;
  sha256: string;
  size_bytes: number;
}

export interface InvestigationBundle {
  bundle_version: string;
  generated_at: string;
  exporter: { system_version: string; schema_version: string };
  scope: { inv_id: string; inv_title: string };
  counts: Record<string, number>;
  data: {
    investigations: CaseFile["investigations"];
    entities: CaseFile["entities"];
    identifiers: CaseFile["identifiers"];
    evidence: CaseFile["evidence"];
    claims: CaseFile["claims"];
    relationships: CaseFile["relationships"];
    events: CaseFile["events"];
    analysis: CaseFile["analysis"];
  };
}

export interface ExportInvestigationJsonResult {
  blob: Blob;
  sha256: string;
  size_bytes: number;
  bundle: InvestigationBundle;
}

/**
 * Collect all evidence IDs referenced by inv-scoped objects.
 */
function collectReferencedEvidenceIds(caseFile: CaseFile, invId: string): Set<string> {
  const ids = new Set<string>();
  const inv = caseFile.investigations.find((i) => i.id === invId);
  if (!inv) return ids;

  const invEntityIds = new Set(caseFile.entities.filter((e) => e.investigation_id === invId).map((e) => e.id));
  const _invClaimIds = new Set(caseFile.claims.filter((c) => c.investigation_id === invId).map((c) => c.id));

  for (const e of caseFile.entities) {
    if (e.investigation_id !== invId) continue;
    e.image_evidence_ids?.forEach((id) => ids.add(id));
    e.locations?.forEach((loc) => loc.evidence_ids?.forEach((id) => ids.add(id)));
  }

  for (const id of caseFile.identifiers) {
    if (id.investigation_id !== invId || !invEntityIds.has(id.entity_id)) continue;
    id.source_evidence_ids?.forEach((evId) => ids.add(evId));
  }

  for (const c of caseFile.claims) {
    if (c.investigation_id !== invId) continue;
    c.evidence_ids?.forEach((id) => ids.add(id));
  }

  for (const r of caseFile.relationships) {
    if (r.investigation_id !== invId) continue;
    r.evidence_ids?.forEach((id) => ids.add(id));
  }

  for (const ev of caseFile.events) {
    if (ev.investigation_id !== invId) continue;
    ev.evidence_ids?.forEach((id) => ids.add(id));
    ev.location?.evidence_ids?.forEach((id) => ids.add(id));
  }

  const invGroupIds = new Set(
    caseFile.analysis.hypothesis_groups.filter((g) => g.investigation_id === invId).map((g) => g.id)
  );

  for (const h of caseFile.analysis.hypotheses) {
    if (!invGroupIds.has(h.hypothesis_group_id)) continue;
    h.disconfirming?.evidence_ids?.forEach((id) => ids.add(id));
    h.disconfirming?.claim_ids?.forEach((cid) => {
      const claim = caseFile.claims.find((c) => c.id === cid);
      claim?.evidence_ids?.forEach((id) => ids.add(id));
    });
  }

  for (const d of caseFile.analysis.diagnostic_claims) {
    if (!invGroupIds.has(d.hypothesis_group_id)) continue;
    d.evidence_ids?.forEach((id) => ids.add(id));
    d.claim_ids?.forEach((cid) => {
      const claim = caseFile.claims.find((c) => c.id === cid);
      claim?.evidence_ids?.forEach((id) => ids.add(id));
    });
  }

  for (const a of caseFile.analysis.assessments) {
    if (!invGroupIds.has(a.hypothesis_group_id)) continue;
    for (const kj of a.key_judgments ?? []) {
      kj.evidence_ids?.forEach((id) => ids.add(id));
      kj.claim_ids?.forEach((cid) => {
        const claim = caseFile.claims.find((c) => c.id === cid);
        claim?.evidence_ids?.forEach((id) => ids.add(id));
      });
    }
  }

  return ids;
}

export async function exportCaseJson(
  caseFile: CaseFile,
  dir?: FileSystemDirectoryHandle
): Promise<ExportCaseJsonResult> {
  const now = nowUtc();
  const json = canonicalStringify(caseFile);
  const blob = new Blob([json], { type: "application/json" });
  const sha256 = await hashBlobSha256(blob);

  if (dir) {
    await appendAudit(dir, {
      at: now,
      action: "EXPORT_CASE_JSON",
      details: {},
    });
    await appendCustody(dir, {
      at: now,
      action: "EXPORT_CASE_JSON",
      artifact: "download:case.json",
      sha256,
      details: { size_bytes: blob.size },
    });
  }

  return { blob, sha256, size_bytes: blob.size };
}

export async function exportInvestigationJson(
  caseFile: CaseFile,
  invId: string,
  dir?: FileSystemDirectoryHandle
): Promise<ExportInvestigationJsonResult> {
  const now = nowUtc();
  const inv = caseFile.investigations.find((i) => i.id === invId);
  if (!inv) throw new Error(`Investigation ${invId} not found.`);

  const invEntityIds = new Set(caseFile.entities.filter((e) => e.investigation_id === invId).map((e) => e.id));
  const invGroupIds = new Set(
    caseFile.analysis.hypothesis_groups.filter((g) => g.investigation_id === invId).map((g) => g.id)
  );
  const refEvidenceIds = collectReferencedEvidenceIds(caseFile, invId);

  const evidenceById = new Map(caseFile.evidence.map((e) => [e.id, e]));
  const missingRefs = [...refEvidenceIds].filter((id) => !evidenceById.has(id));
  if (missingRefs.length > 0) {
    throw new Error(`Referenced evidence not found in case: ${missingRefs.join(", ")}`);
  }
  const invEvidence = [...refEvidenceIds]
    .map((id) => evidenceById.get(id)!)
    .sort((a, b) => a.id.localeCompare(b.id));

  const entities = caseFile.entities
    .filter((e) => e.investigation_id === invId)
    .sort((a, b) => a.id.localeCompare(b.id));

  const identifiers = caseFile.identifiers
    .filter((id) => id.investigation_id === invId && invEntityIds.has(id.entity_id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const claims = caseFile.claims
    .filter((c) => c.investigation_id === invId)
    .sort((a, b) => a.id.localeCompare(b.id));

  const relationships = caseFile.relationships
    .filter((r) => r.investigation_id === invId)
    .sort((a, b) => a.id.localeCompare(b.id));

  const events = caseFile.events
    .filter((e) => e.investigation_id === invId)
    .sort((a, b) => a.id.localeCompare(b.id));

  const hypothesis_groups = caseFile.analysis.hypothesis_groups
    .filter((g) => g.investigation_id === invId)
    .sort((a, b) => a.id.localeCompare(b.id));

  const hypotheses = caseFile.analysis.hypotheses
    .filter((h) => invGroupIds.has(h.hypothesis_group_id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const diagnostic_claims = caseFile.analysis.diagnostic_claims
    .filter((d) => invGroupIds.has(d.hypothesis_group_id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const ach_matrices = caseFile.analysis.ach_matrices
    .filter((m) => invGroupIds.has(m.hypothesis_group_id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const assessments = caseFile.analysis.assessments
    .filter((a) => invGroupIds.has(a.hypothesis_group_id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const bundle: InvestigationBundle = {
    bundle_version: BUNDLE_VERSION,
    generated_at: now,
    exporter: { system_version: SYSTEM_VERSION, schema_version: caseFile.schema_version },
    scope: { inv_id: invId, inv_title: inv.title },
    counts: {
      investigations: 1,
      entities: entities.length,
      identifiers: identifiers.length,
      evidence: invEvidence.length,
      claims: claims.length,
      relationships: relationships.length,
      events: events.length,
      hypothesis_groups: hypothesis_groups.length,
      hypotheses: hypotheses.length,
      diagnostic_claims: diagnostic_claims.length,
      ach_matrices: ach_matrices.length,
      assessments: assessments.length,
    },
    data: {
      investigations: [inv],
      entities,
      identifiers,
      evidence: invEvidence,
      claims,
      relationships,
      events,
      analysis: {
        hypothesis_groups,
        hypotheses,
        diagnostic_claims,
        ach_matrices,
        assessments,
      },
    },
  };

  const json = canonicalStringify(bundle);
  const blob = new Blob([json], { type: "application/json" });
  const sha256 = await hashBlobSha256(blob);

  if (dir) {
    await appendAudit(dir, {
      at: now,
      action: "EXPORT_INVESTIGATION_JSON",
      details: { inv_id: invId, ...bundle.counts },
    });
    await appendCustody(dir, {
      at: now,
      action: "EXPORT_INVESTIGATION_JSON",
      artifact: "download:investigation.json",
      sha256,
      details: { inv_id: invId, size_bytes: blob.size },
    });
  }

  return { blob, sha256, size_bytes: blob.size, bundle };
}
