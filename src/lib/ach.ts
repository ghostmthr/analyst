/**
 * ACH Matrix — create, set cells, compute (ACH_INCONSISTENCY_WEIGHTED_V1), sensitivity.
 * Pure functions; compute optionally writes to case state.
 */

import type { AuditEntry } from "@/lib/audit";
import { isEvidenceBacked } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type {
  AchCell,
  AchMatrix,
  AchRelation,
  CaseFile,
  DiagnosticClaim,
} from "@/types";

type AnalysisSlice = Pick<CaseFile["analysis"], "hypothesis_groups" | "hypotheses" | "diagnostic_claims" | "ach_matrices">;

function getAnalysis(cf: CaseFile): AnalysisSlice {
  const a = cf.analysis;
  return {
    hypothesis_groups: a?.hypothesis_groups ?? [],
    hypotheses: a?.hypotheses ?? [],
    diagnostic_claims: a?.diagnostic_claims ?? [],
    ach_matrices: a?.ach_matrices ?? [],
  };
}

function setAchMatrices(cf: CaseFile, ach_matrices: AchMatrix[]): CaseFile {
  return { ...cf, analysis: { ...cf.analysis, ach_matrices } };
}

export interface CreateAchMatrixInput {
  hypothesisGroupId: string;
  hypothesisIds: string[];
  diagnosticClaimIds: string[];
}

export function createAchMatrix(
  caseFile: CaseFile,
  input: CreateAchMatrixInput
): { next: CaseFile; auditEntry: AuditEntry; achId: string } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const group = a.hypothesis_groups.find((g) => g.id === input.hypothesisGroupId);
  if (!group) throw new Error("Hypothesis group not found.");
  const id = newId("ACH");
  const matrix: AchMatrix = {
    id,
    hypothesis_group_id: input.hypothesisGroupId,
    hypothesis_ids: [...input.hypothesisIds],
    diagnostic_claim_ids: [...input.diagnosticClaimIds],
    cells: [],
  };
  const next = setAchMatrices(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    [...a.ach_matrices, matrix]
  );
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_ACH_MATRIX",
    object_type: "ach_matrix",
    object_id: id,
    details: { hypothesis_group_id: input.hypothesisGroupId },
  };
  return { next, auditEntry, achId: id };
}

export function setAchCell(
  caseFile: CaseFile,
  achId: string,
  cell: { diagnosticClaimId: string; hypothesisId: string; relation: AchRelation; analystNote?: string }
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const midx = a.ach_matrices.findIndex((m) => m.id === achId);
  if (midx < 0) {
    return { next: caseFile, auditEntry: { at: now, action: "SET_ACH_CELL", object_id: achId } as AuditEntry };
  }
  const mat = a.ach_matrices[midx];
  const cellEntry: AchCell = {
    diagnostic_claim_id: cell.diagnosticClaimId,
    hypothesis_id: cell.hypothesisId,
    relation: cell.relation,
    analyst_note: cell.analystNote,
  };
  const cells = mat.cells.filter(
    (c) => !(c.diagnostic_claim_id === cell.diagnosticClaimId && c.hypothesis_id === cell.hypothesisId)
  );
  cells.push(cellEntry);
  const updated = { ...mat, cells };
  const matrices = [...a.ach_matrices];
  matrices[midx] = updated;
  const next = setAchMatrices(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    matrices
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "SET_ACH_CELL",
      object_type: "ach_matrix",
      object_id: achId,
      details: { diagnostic_claim_id: cell.diagnosticClaimId, hypothesis_id: cell.hypothesisId, relation: cell.relation },
    },
  };
}

// --- Compute (deterministic) ---
function isDiagnosticRowEvidenceBacked(
  dclm: DiagnosticClaim,
  caseFile: CaseFile
): boolean {
  if (isEvidenceBacked(dclm.evidence_ids, caseFile)) return true;
  if (dclm.claim_ids?.length) {
    const claims = caseFile.claims.filter((c) => dclm.claim_ids!.includes(c.id));
    if (claims.some((c) => isEvidenceBacked(c.evidence_ids, caseFile))) return true;
  }
  return false;
}

export function computeAch(
  caseFile: CaseFile,
  achId: string,
  options?: { storeComputed?: boolean }
): {
  next: CaseFile;
  auditEntry?: AuditEntry;
  computed: AchMatrix["computed"];
} {
  const store = options?.storeComputed !== false;
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const mat = a.ach_matrices.find((m) => m.id === achId);
  if (!mat) {
    return {
      next: caseFile,
      computed: undefined,
    };
  }

  const dclmById = new Map(a.diagnostic_claims.map((d) => [d.id, d]));
  const cellMap = new Map(
    mat.cells.map((c) => [`${c.diagnostic_claim_id}:${c.hypothesis_id}`, c])
  );

  const rows = mat.diagnostic_claim_ids;
  const cols = mat.hypothesis_ids;
  const penalties: Record<string, number> = {};
  cols.forEach((hid) => (penalties[hid] = 0));

  let backedRows = 0;
  for (const dclmId of rows) {
    const dclm = dclmById.get(dclmId);
    if (!dclm) continue;
    const DCONF = dclm.confidence?.score ?? 0.6;
    const DW =
      dclm.weights.diagnosticity * dclm.weights.reliability * dclm.weights.credibility * DCONF;
    if (isDiagnosticRowEvidenceBacked(dclm, caseFile)) backedRows++;
    cols.forEach((hid) => {
      const cell = cellMap.get(`${dclmId}:${hid}`);
      if (cell?.relation === "I") penalties[hid] = (penalties[hid] ?? 0) + DW;
    });
  }

  const totalRows = rows.length || 1;
  const evidence_coverage = backedRows / totalRows;
  const sorted = cols
    .map((hypothesis_id) => ({ hypothesis_id, penalty: penalties[hypothesis_id] ?? 0 }))
    .sort((a, b) => a.penalty - b.penalty);
  const results = sorted.map((r, i) => ({
    hypothesis_id: r.hypothesis_id,
    penalty: r.penalty,
    rank: i + 1,
  }));

  const P1 = results[0]?.penalty ?? 0;
  const P2 = results[1]?.penalty ?? 0;
  const separation = Math.max(
    0,
    Math.min(1, (P2 - P1) / Math.max(P2, 0.0001))
  );
  const arc = 0.6 * separation + 0.4 * evidence_coverage;
  const topHypothesisId = results[0]?.hypothesis_id;

  const computed = {
    version: 1,
    algorithm: "ACH_INCONSISTENCY_WEIGHTED_V1" as const,
    results,
    separation,
    evidence_coverage,
    arc,
    computed_at: now,
  };

  let next = caseFile;
  let auditEntry: AuditEntry | undefined;
  if (store) {
    const matrices = a.ach_matrices.map((m) =>
      m.id === achId ? { ...m, computed } : m
    );
    next = setAchMatrices(
      { ...caseFile, case: { ...caseFile.case, updated_at: now } },
      matrices
    );
    auditEntry = {
      at: now,
      action: "COMPUTE_ACH",
      object_type: "ach_matrix",
      object_id: achId,
      details: {
        achId,
        groupId: mat.hypothesis_group_id,
        topHypothesisId,
        separation,
        evidence_coverage,
        arc,
      },
    };
  }
  return { next, auditEntry, computed };
}

// --- Sensitivity: remove evidence X ---
export interface SensitivityResult {
  baseline: { results: AchMatrix["computed"]; separation: number; evidence_coverage: number; arc: number };
  modified: { results: AchMatrix["computed"]; separation: number; evidence_coverage: number; arc: number };
  impact: { rankFlipped: boolean; separationDrop: number; impactedDiagnosticClaimIds: string[] };
}

export function computeAchSensitivityRemoveEvidence(
  caseFile: CaseFile,
  achId: string,
  evidenceId: string
): SensitivityResult | null {
  const baselineRun = computeAch(caseFile, achId, { storeComputed: false });
  if (!baselineRun.computed) return null;

  const mat = caseFile.analysis.ach_matrices?.find((m) => m.id === achId);
  if (!mat) return null;

  const _dclmById = new Map(caseFile.analysis.diagnostic_claims.map((d) => [d.id, d]));
  const impactedDiagnosticClaimIds: string[] = [];
  for (const d of caseFile.analysis.diagnostic_claims ?? []) {
    if (d.evidence_ids?.includes(evidenceId)) {
      impactedDiagnosticClaimIds.push(d.id);
      continue;
    }
    if (d.claim_ids?.length) {
      const claims = caseFile.claims.filter((c) => d.claim_ids!.includes(c.id));
          if (claims.some((c) => c.evidence_ids?.includes(evidenceId))) {
        impactedDiagnosticClaimIds.push(d.id);
      }
    }
  }

  const modifiedDclms = (caseFile.analysis.diagnostic_claims ?? []).map((d) => {
    if (!impactedDiagnosticClaimIds.includes(d.id)) return d;
    const originalDCONF = d.confidence?.score ?? 0.6;
    const reducedDCONF = Math.min(originalDCONF, 0.4);
    return {
      ...d,
      confidence: {
        ...d.confidence,
        score: reducedDCONF,
        bucket: (reducedDCONF >= 0.5 ? "MODERATE" : "LOW") as "LOW" | "MODERATE" | "HIGH",
      },
    };
  });

  const modifiedCaseFile: CaseFile = {
    ...caseFile,
    analysis: {
      ...caseFile.analysis,
      diagnostic_claims: modifiedDclms,
    },
  };

  const modifiedRun = computeAch(modifiedCaseFile, achId, { storeComputed: false });
  if (!modifiedRun.computed) return null;

  const baselineTop = baselineRun.computed.results[0]?.hypothesis_id;
  const modifiedTop = modifiedRun.computed.results[0]?.hypothesis_id;
  const rankFlipped = baselineTop !== modifiedTop;
  const separationDrop = baselineRun.computed.separation - modifiedRun.computed.separation;

  return {
    baseline: {
      results: baselineRun.computed,
      separation: baselineRun.computed.separation,
      evidence_coverage: baselineRun.computed.evidence_coverage,
      arc: baselineRun.computed.arc,
    },
    modified: {
      results: modifiedRun.computed,
      separation: modifiedRun.computed.separation,
      evidence_coverage: modifiedRun.computed.evidence_coverage,
      arc: modifiedRun.computed.arc,
    },
    impact: { rankFlipped, separationDrop, impactedDiagnosticClaimIds },
  };
}

export interface AchSensitivitySummaryInput {
  evidenceId: string;
  rankFlipped: boolean;
  separationDrop: number;
  impactedDiagnosticClaimIds: string[];
}

export function saveAchSensitivitySummary(
  caseFile: CaseFile,
  achId: string,
  summary: AchSensitivitySummaryInput
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const midx = a.ach_matrices.findIndex((m) => m.id === achId);
  if (midx < 0) {
    return { next: caseFile, auditEntry: { at: now, action: "SAVE_ACH_SENSITIVITY_SUMMARY", object_id: achId } as AuditEntry };
  }
  const mat = a.ach_matrices[midx];
  const existing = mat.computed ?? {
    version: 1,
    algorithm: "ACH_INCONSISTENCY_WEIGHTED_V1",
    results: [],
    separation: 0,
    evidence_coverage: 0,
    arc: 0,
    computed_at: now,
  };
  const sensitivity = {
    last_run_at: now,
    evidence_id: summary.evidenceId,
    rank_flipped: summary.rankFlipped,
    separation_drop: summary.separationDrop,
    most_sensitive_evidence_ids: [summary.evidenceId],
    most_sensitive_diagnostic_claim_ids: [...summary.impactedDiagnosticClaimIds],
  };
  const updated = {
    ...mat,
    computed: {
      ...existing,
      sensitivity,
    },
  };
  const matrices = [...a.ach_matrices];
  matrices[midx] = updated;
  const next = setAchMatrices(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    matrices
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "SAVE_ACH_SENSITIVITY_SUMMARY",
      object_type: "ach_matrix",
      object_id: achId,
      details: {
        achId,
        evidenceId: summary.evidenceId,
        rankFlipped: summary.rankFlipped,
        separationDrop: summary.separationDrop,
        impactedCount: summary.impactedDiagnosticClaimIds.length,
      },
    },
  };
}

export function deleteAchMatrix(
  caseFile: CaseFile,
  achId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const mat = a.ach_matrices.find((m) => m.id === achId);
  if (!mat) {
    return { next: caseFile, auditEntry: { at: now, action: "DELETE_ACH_MATRIX", object_id: achId } as AuditEntry };
  }
  const next = setAchMatrices(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    a.ach_matrices.filter((m) => m.id !== achId)
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "DELETE_ACH_MATRIX",
      object_type: "ach_matrix",
      object_id: achId,
      details: {},
    },
  };
}
