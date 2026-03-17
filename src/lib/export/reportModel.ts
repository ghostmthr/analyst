/**
 * HTML report model — deterministic JSON structure for rendering.
 */

import { getEntityAssertionSummary } from "@/lib/derived";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

export interface ReportParams {
  timelineLimit?: number;
  entityIds?: string[];
}

export interface ReportInvestigationHeader {
  title: string;
  status: string;
  lead?: string;
  updated_at: string;
}

export interface ReportEntityProfile {
  id: string;
  name: string;
  type: string;
  description?: string;
  summary?: string;
  risk_tags?: string[];
  locations_count: number;
  claims_total: number;
  claims_evidence_backed: number;
  relationships_total: number;
  relationships_evidence_backed: number;
  high_confidence_total: number;
}

export interface ReportKeyJudgment {
  text: string;
  confidence: string;
  confidence_score: number;
  evidence_ids?: string[];
  claim_ids?: string[];
}

export interface ReportAssessmentSummary {
  question: string;
  top_hypothesis_label?: string;
  key_judgments: ReportKeyJudgment[];
  alternative_explanations?: string[];
  intelligence_gaps?: string[];
}

export interface ReportEvidenceRef {
  id: string;
  title: string;
  type: string;
  source_type: string;
  captured_at: string;
  source_url?: string;
  has_file: boolean;
  file_path?: string;
  file_sha256?: string;
  missing_attachment?: boolean;
}

export interface ReportAchAppendix {
  question: string;
  hypotheses: Array<{ id: string; label: string; statement: string }>;
  diagnostic_claims: Array<{
    id: string;
    text: string;
    diagnosticity: number;
    reliability: number;
    credibility: number;
    confidence?: number;
  }>;
  cells: Array<{ diagnostic_claim_id: string; hypothesis_id: string; relation: string }>;
  results?: Array<{ hypothesis_id: string; label: string; penalty: number; rank: number }>;
  separation?: number;
  evidence_coverage?: number;
  arc?: number;
  sensitivity?: {
    last_run_at?: string;
    evidence_id?: string;
    rank_flipped?: boolean;
    separation_drop?: number;
  };
}

export interface ReportMetadata {
  schema_version: string;
  system_version: string;
  generated_at: string;
  case_id: string;
  investigation_id: string;
  state_id: string;
}

export interface ReportModel {
  generated_at: string;
  metadata?: ReportMetadata;
  investigation: ReportInvestigationHeader;
  targets_summary: {
    count: number;
    by_type: Record<string, number>;
  };
  entity_profiles: ReportEntityProfile[];
  timeline_highlights: Array<{
    id: string;
    date: string;
    type: string;
    text: string;
    entity_ids?: string[];
  }>;
  assessment_summary?: ReportAssessmentSummary;
  ach_appendix?: ReportAchAppendix;
  evidence_appendix: ReportEvidenceRef[];
}

/**
 * Collect all evidence IDs referenced anywhere in the report content.
 * When restrictToEntityIds is empty, include all inv-scoped evidence.
 */
function collectReferencedEvidenceIds(
  caseFile: CaseFile,
  invId: string,
  restrictToEntityIds: Set<string>,
  timelineLimit: number
): Set<string> {
  const ids = new Set<string>();
  const invEntityIds = new Set(caseFile.entities.filter((e) => e.investigation_id === invId).map((e) => e.id));
  const invGroupIds = new Set(
    caseFile.analysis.hypothesis_groups.filter((g) => g.investigation_id === invId).map((g) => g.id)
  );
  const restrict = restrictToEntityIds.size > 0;

  for (const e of caseFile.entities) {
    if (e.investigation_id !== invId) continue;
    if (restrict && !restrictToEntityIds.has(e.id)) continue;
    e.image_evidence_ids?.forEach((id) => ids.add(id));
    e.locations?.forEach((loc) => loc.evidence_ids?.forEach((id) => ids.add(id)));
  }

  for (const id of caseFile.identifiers) {
    if (id.investigation_id !== invId || !invEntityIds.has(id.entity_id)) continue;
    if (restrict && !restrictToEntityIds.has(id.entity_id)) continue;
    id.source_evidence_ids?.forEach((evId) => ids.add(evId));
  }

  for (const c of caseFile.claims) {
    if (c.investigation_id !== invId) continue;
    if (restrict && !c.entity_ids?.some((eid) => restrictToEntityIds.has(eid))) continue;
    c.evidence_ids?.forEach((id) => ids.add(id));
  }

  for (const r of caseFile.relationships) {
    if (r.investigation_id !== invId) continue;
    if (restrict && !restrictToEntityIds.has(r.from_entity_id) && !restrictToEntityIds.has(r.to_entity_id)) continue;
    r.evidence_ids?.forEach((id) => ids.add(id));
  }

  const events = caseFile.events
    .filter((e) => e.investigation_id === invId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, timelineLimit);
  for (const ev of events) {
    ev.evidence_ids?.forEach((id) => ids.add(id));
    ev.location?.evidence_ids?.forEach((id) => ids.add(id));
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

export function buildReportModel(
  caseFile: CaseFile,
  invId: string,
  params: ReportParams = {},
  metadata?: ReportMetadata
): ReportModel {
  const inv = caseFile.investigations.find((i) => i.id === invId);
  if (!inv) throw new Error(`Investigation ${invId} not found.`);

  const timelineLimit = params.timelineLimit ?? 10;
  const entityIdsFilter = params.entityIds ? new Set(params.entityIds) : new Set<string>();

  const invEntities = caseFile.entities
    .filter((e) => e.investigation_id === invId)
    .filter((e) => entityIdsFilter.size === 0 || entityIdsFilter.has(e.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const byType: Record<string, number> = {};
  for (const e of invEntities) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }

  const entity_profiles: ReportEntityProfile[] = invEntities.map((ent) => {
    const summary = getEntityAssertionSummary(caseFile, invId, ent.id);
    return {
      id: ent.id,
      name: ent.name,
      type: ent.type,
      description: ent.description,
      summary: ent.summary,
      risk_tags: ent.risk_tags,
      locations_count: ent.locations?.length ?? 0,
      claims_total: summary.claims_total,
      claims_evidence_backed: summary.claims_evidence_backed,
      relationships_total: summary.relationships_total,
      relationships_evidence_backed: summary.relationships_evidence_backed,
      high_confidence_total: summary.high_confidence_total,
    };
  });

  const invGroupIds = new Set(
    caseFile.analysis.hypothesis_groups.filter((g) => g.investigation_id === invId).map((g) => g.id)
  );

  const timeline_highlights = caseFile.events
    .filter((e) => e.investigation_id === invId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, timelineLimit)
    .map((e) => ({
      id: e.id,
      date: e.date,
      type: e.type,
      text: e.text,
      entity_ids: e.entity_ids,
    }));

  let assessment_summary: ReportAssessmentSummary | undefined;
  const assessments = caseFile.analysis.assessments.filter((a) => invGroupIds.has(a.hypothesis_group_id));
  if (assessments.length > 0) {
    const a = assessments[0];
    const topHyp = caseFile.analysis.hypotheses.find((h) => h.id === a.top_hypothesis_id);
    assessment_summary = {
      question: a.question,
      top_hypothesis_label: topHyp?.label,
      key_judgments: (a.key_judgments ?? []).map((kj) => ({
        text: kj.text,
        confidence: kj.confidence?.bucket ?? "—",
        confidence_score: kj.confidence?.score ?? 0,
        evidence_ids: kj.evidence_ids,
        claim_ids: kj.claim_ids,
      })),
      alternative_explanations: a.alternative_explanations,
      intelligence_gaps: a.intelligence_gaps,
    };
  }

  let ach_appendix: ReportModel["ach_appendix"];
  const achMatrices = caseFile.analysis.ach_matrices.filter((m) => invGroupIds.has(m.hypothesis_group_id));
  if (achMatrices.length > 0) {
    const ach = achMatrices[0];
    const group = caseFile.analysis.hypothesis_groups.find((g) => g.id === ach.hypothesis_group_id);
    const hyps = caseFile.analysis.hypotheses
      .filter((h) => ach.hypothesis_ids.includes(h.id))
      .sort((a, b) => ach.hypothesis_ids.indexOf(a.id) - ach.hypothesis_ids.indexOf(b.id));
    const dclms = caseFile.analysis.diagnostic_claims
      .filter((d) => ach.diagnostic_claim_ids.includes(d.id))
      .sort((a, b) => ach.diagnostic_claim_ids.indexOf(a.id) - ach.diagnostic_claim_ids.indexOf(b.id));
    const cellMap = new Map(ach.cells.map((c) => [`${c.diagnostic_claim_id}:${c.hypothesis_id}`, c]));
    const cells = ach.diagnostic_claim_ids.flatMap((dclmId) =>
      ach.hypothesis_ids.map((hypId) => {
        const cell = cellMap.get(`${dclmId}:${hypId}`);
        return {
          diagnostic_claim_id: dclmId,
          hypothesis_id: hypId,
          relation: cell?.relation ?? "NA",
        };
      })
    );
    const results = ach.computed?.results?.map((r) => {
      const hyp = hyps.find((h) => h.id === r.hypothesis_id);
      return {
        hypothesis_id: r.hypothesis_id,
        label: hyp?.label ?? r.hypothesis_id,
        penalty: r.penalty,
        rank: r.rank,
      };
    });
    ach_appendix = {
      question: group?.question ?? "",
      hypotheses: hyps.map((h) => ({ id: h.id, label: h.label, statement: h.statement })),
      diagnostic_claims: dclms.map((d) => ({
        id: d.id,
        text: d.text,
        diagnosticity: d.weights.diagnosticity,
        reliability: d.weights.reliability,
        credibility: d.weights.credibility,
        confidence: d.confidence?.score,
      })),
      cells,
      results,
      separation: ach.computed?.separation,
      evidence_coverage: ach.computed?.evidence_coverage,
      arc: ach.computed?.arc,
      sensitivity: ach.computed?.sensitivity
        ? {
            last_run_at: ach.computed.sensitivity.last_run_at,
            evidence_id: ach.computed.sensitivity.evidence_id,
            rank_flipped: ach.computed.sensitivity.rank_flipped,
            separation_drop: ach.computed.sensitivity.separation_drop,
          }
        : undefined,
    };
  }

  const refEvidenceIds = collectReferencedEvidenceIds(
    caseFile,
    invId,
    entityIdsFilter,
    timelineLimit
  );

  const evidenceById = new Map(caseFile.evidence.map((e) => [e.id, e]));
  const evidence_appendix: ReportEvidenceRef[] = [...refEvidenceIds]
    .filter((id) => evidenceById.has(id))
    .map((id) => {
      const ev = evidenceById.get(id)!;
      const has_file = Boolean(ev.file);
      const missing_attachment =
        has_file && (!ev.file?.path || !ev.file?.sha256);
      return {
        id: ev.id,
        title: ev.title,
        type: ev.type,
        source_type: ev.source?.source_type ?? "OTHER",
        captured_at: ev.source?.captured_at ?? "",
        source_url: ev.source?.source_url,
        has_file,
        file_path: ev.file?.path,
        file_sha256: ev.file?.sha256,
        missing_attachment: missing_attachment || undefined,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    generated_at: metadata?.generated_at ?? nowUtc(),
    metadata,
    investigation: {
      title: inv.title,
      status: inv.status,
      lead: inv.lead,
      updated_at: inv.updated_at,
    },
    targets_summary: {
      count: invEntities.length,
      by_type: byType,
    },
    entity_profiles,
    timeline_highlights,
    assessment_summary,
    ach_appendix,
    evidence_appendix,
  };
}
