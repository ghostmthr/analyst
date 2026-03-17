/**
 * Assessment CRUD — hypothesis groups, hypotheses, diagnostic claims, assessment summaries.
 * Pure functions returning { next, auditEntry, id? }. Validation via validateEvidenceIdsForInv / validateClaimIdsForInv.
 */

import type { AuditEntry } from "@/lib/audit";
import { normalizeConfidence } from "@/lib/confidence";
import { validateClaimIdsForInv,validateEvidenceIdsForInv } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type {
  AssessmentSummary,
  CaseFile,
  Confidence,
  DiagnosticClaim,
  Hypothesis,
  HypothesisGroup,
  HypothesisStatus,
  KeyJudgment,
} from "@/types";

type AnalysisWorkspaceSlice = Pick<
  CaseFile["analysis"],
  "hypothesis_groups" | "hypotheses" | "diagnostic_claims" | "ach_matrices" | "assessments"
>;

function getAnalysis(cf: CaseFile): AnalysisWorkspaceSlice {
  const a = cf.analysis;
  return {
    hypothesis_groups: a?.hypothesis_groups ?? [],
    hypotheses: a?.hypotheses ?? [],
    diagnostic_claims: a?.diagnostic_claims ?? [],
    ach_matrices: a?.ach_matrices ?? [],
    assessments: a?.assessments ?? [],
  };
}

function setAnalysis(cf: CaseFile, analysis: AnalysisWorkspaceSlice): CaseFile {
  return { ...cf, analysis: { ...cf.analysis, ...analysis } };
}

// --- Hypothesis groups ---
export interface CreateHypothesisGroupInput {
  invId: string;
  targetEntityId?: string;
  name: string;
  question: string;
  description?: string;
}

export function createHypothesisGroup(
  caseFile: CaseFile,
  input: CreateHypothesisGroupInput
): { next: CaseFile; auditEntry: AuditEntry; groupId: string } {
  const now = nowUtc();
  const inv = caseFile.investigations.find((i) => i.id === input.invId);
  if (!inv) throw new Error("Investigation not found.");
  const id = newId("HGRP");
  const group: HypothesisGroup = {
    id,
    investigation_id: input.invId,
    target_entity_id: input.targetEntityId,
    name: input.name.trim(),
    question: input.question.trim(),
    description: input.description?.trim(),
    status: "ACTIVE",
    created_at: now,
    updated_at: now,
  };
  const a = getAnalysis(caseFile);
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, hypothesis_groups: [...a.hypothesis_groups, group] }
  );
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_HYPOTHESIS_GROUP",
    object_type: "hypothesis_group",
    object_id: id,
    details: { name: group.name, invId: input.invId },
  };
  return { next, auditEntry, groupId: id };
}

export type UpdateHypothesisGroupPatch = Partial<
  Pick<HypothesisGroup, "target_entity_id" | "name" | "question" | "description" | "status">
>;

export function updateHypothesisGroup(
  caseFile: CaseFile,
  groupId: string,
  patch: UpdateHypothesisGroupPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const idx = a.hypothesis_groups.findIndex((g) => g.id === groupId);
  if (idx < 0) {
    return { next: caseFile, auditEntry: { at: now, action: "UPDATE_HYPOTHESIS_GROUP", object_id: groupId } as AuditEntry };
  }
  const changedFields = Object.keys(patch) as (keyof UpdateHypothesisGroupPatch)[];
  const updated: HypothesisGroup = {
    ...a.hypothesis_groups[idx],
    ...patch,
    name: (patch.name ?? a.hypothesis_groups[idx].name).trim(),
    question: (patch.question ?? a.hypothesis_groups[idx].question).trim(),
    updated_at: now,
  };
  const groups = [...a.hypothesis_groups];
  groups[idx] = updated;
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, hypothesis_groups: groups }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "UPDATE_HYPOTHESIS_GROUP",
      object_type: "hypothesis_group",
      object_id: groupId,
      details: { changed_fields: changedFields },
    },
  };
}

export function deleteHypothesisGroup(
  caseFile: CaseFile,
  groupId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const group = a.hypothesis_groups.find((g) => g.id === groupId);
  if (!group) {
    return { next: caseFile, auditEntry: { at: now, action: "DELETE_HYPOTHESIS_GROUP", object_id: groupId } as AuditEntry };
  }
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    {
      ...a,
      hypothesis_groups: a.hypothesis_groups.filter((g) => g.id !== groupId),
      hypotheses: a.hypotheses.filter((h) => h.hypothesis_group_id !== groupId),
      diagnostic_claims: a.diagnostic_claims.filter((d) => d.hypothesis_group_id !== groupId),
      ach_matrices: a.ach_matrices.filter((m) => m.hypothesis_group_id !== groupId),
      assessments: a.assessments.filter((s) => s.hypothesis_group_id !== groupId),
    }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "DELETE_HYPOTHESIS_GROUP",
      object_type: "hypothesis_group",
      object_id: groupId,
      details: { name: group.name },
    },
  };
}

// --- Hypotheses ---
export interface CreateHypothesisInput {
  hypothesisGroupId: string;
  label: string;
  statement: string;
  status?: HypothesisStatus;
  prior_confidence?: { score: number; bucket?: string; rationale?: string };
  assumptions?: string[];
  falsifiers?: string[];
  collection_gaps?: string[];
  disconfirming?: { evidence_ids?: string[]; claim_ids?: string[]; notes?: string };
}

export function createHypothesis(
  caseFile: CaseFile,
  input: CreateHypothesisInput
): { next: CaseFile; auditEntry: AuditEntry; hypothesisId: string } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const group = a.hypothesis_groups.find((g) => g.id === input.hypothesisGroupId);
  if (!group) throw new Error("Hypothesis group not found.");
  const invId = group.investigation_id;
  if (input.disconfirming?.evidence_ids?.length) {
    validateEvidenceIdsForInv(caseFile, invId, input.disconfirming.evidence_ids);
  }
  if (input.disconfirming?.claim_ids?.length) {
    validateClaimIdsForInv(caseFile, invId, input.disconfirming.claim_ids);
  }
  const id = newId("HYP");
  const prior_confidence = input.prior_confidence
    ? normalizeConfidence({
        score: Math.max(0, Math.min(1, input.prior_confidence.score)),
        bucket: input.prior_confidence.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
        rationale: input.prior_confidence.rationale,
      })
    : undefined;
  const hyp: Hypothesis = {
    id,
    hypothesis_group_id: input.hypothesisGroupId,
    label: input.label.trim(),
    statement: input.statement.trim(),
    status: input.status ?? "ACTIVE",
    prior_confidence,
    assumptions: input.assumptions?.length ? [...input.assumptions] : undefined,
    falsifiers: input.falsifiers?.length ? [...input.falsifiers] : undefined,
    collection_gaps: input.collection_gaps?.length ? [...input.collection_gaps] : undefined,
    disconfirming: input.disconfirming,
    created_at: now,
    updated_at: now,
  };
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, hypotheses: [...a.hypotheses, hyp] }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "CREATE_HYPOTHESIS",
      object_type: "hypothesis",
      object_id: id,
      details: { label: hyp.label, hypothesis_group_id: input.hypothesisGroupId },
    },
    hypothesisId: id,
  };
}

export type UpdateHypothesisPatch = Partial<
  Pick<
    Hypothesis,
    "label" | "statement" | "status" | "assumptions" | "falsifiers" | "collection_gaps" | "disconfirming"
  >
> & { prior_confidence?: Partial<Confidence> };

export function updateHypothesis(
  caseFile: CaseFile,
  hypothesisId: string,
  patch: UpdateHypothesisPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const idx = a.hypotheses.findIndex((h) => h.id === hypothesisId);
  if (idx < 0) {
    return { next: caseFile, auditEntry: { at: now, action: "UPDATE_HYPOTHESIS", object_id: hypothesisId } as AuditEntry };
  }
  const existing = a.hypotheses[idx];
  const group = a.hypothesis_groups.find((g) => g.id === existing.hypothesis_group_id);
  if (patch.disconfirming?.evidence_ids && group) {
    validateEvidenceIdsForInv(caseFile, group.investigation_id, patch.disconfirming.evidence_ids);
  }
  if (patch.disconfirming?.claim_ids && group) {
    validateClaimIdsForInv(caseFile, group.investigation_id, patch.disconfirming.claim_ids);
  }
  const prior_confidence =
    patch.prior_confidence !== undefined
      ? normalizeConfidence(
          typeof patch.prior_confidence.score === "number"
            ? { ...patch.prior_confidence, score: Math.max(0, Math.min(1, patch.prior_confidence.score)) }
            : patch.prior_confidence
        )
      : existing.prior_confidence;
  const changedFields = Object.keys(patch) as string[];
  const updated: Hypothesis = {
    ...existing,
    ...patch,
    label: (patch.label ?? existing.label).trim(),
    statement: (patch.statement ?? existing.statement).trim(),
    prior_confidence,
    updated_at: now,
  };
  const hypotheses = [...a.hypotheses];
  hypotheses[idx] = updated;
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, hypotheses }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "UPDATE_HYPOTHESIS",
      object_type: "hypothesis",
      object_id: hypothesisId,
      details: { changed_fields: changedFields },
    },
  };
}

export function deleteHypothesis(
  caseFile: CaseFile,
  hypothesisId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const hyp = a.hypotheses.find((h) => h.id === hypothesisId);
  if (!hyp) {
    return { next: caseFile, auditEntry: { at: now, action: "DELETE_HYPOTHESIS", object_id: hypothesisId } as AuditEntry };
  }
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, hypotheses: a.hypotheses.filter((h) => h.id !== hypothesisId) }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "DELETE_HYPOTHESIS",
      object_type: "hypothesis",
      object_id: hypothesisId,
      details: { label: hyp.label },
    },
  };
}

// --- Diagnostic claims ---
export interface CreateDiagnosticClaimInput {
  hypothesisGroupId: string;
  text: string;
  claimIds?: string[];
  evidenceIds?: string[];
  weights: { diagnosticity: 1 | 2 | 3; reliability: number; credibility: number };
  confidence?: { score: number; bucket?: string; rationale?: string };
}

export function createDiagnosticClaim(
  caseFile: CaseFile,
  input: CreateDiagnosticClaimInput
): { next: CaseFile; auditEntry: AuditEntry; diagnosticClaimId: string } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const group = a.hypothesis_groups.find((g) => g.id === input.hypothesisGroupId);
  if (!group) throw new Error("Hypothesis group not found.");
  const invId = group.investigation_id;
  validateClaimIdsForInv(caseFile, invId, input.claimIds);
  validateEvidenceIdsForInv(caseFile, invId, input.evidenceIds);
  const id = newId("DCLM");
  const confidence = input.confidence
    ? normalizeConfidence({
        score: Math.max(0, Math.min(1, input.confidence.score)),
        bucket: input.confidence.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
        rationale: input.confidence.rationale,
      })
    : undefined;
  const dclm: DiagnosticClaim = {
    id,
    hypothesis_group_id: input.hypothesisGroupId,
    text: input.text.trim(),
    claim_ids: input.claimIds?.length ? [...input.claimIds] : undefined,
    evidence_ids: input.evidenceIds?.length ? [...input.evidenceIds] : undefined,
    weights: {
      diagnosticity: input.weights.diagnosticity,
      reliability: Math.max(0, Math.min(1, input.weights.reliability)),
      credibility: Math.max(0, Math.min(1, input.weights.credibility)),
    },
    confidence,
    created_at: now,
    updated_at: now,
  };
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, diagnostic_claims: [...a.diagnostic_claims, dclm] }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "CREATE_DIAGNOSTIC_CLAIM",
      object_type: "diagnostic_claim",
      object_id: id,
      details: { text_preview: dclm.text.slice(0, 50), hypothesis_group_id: input.hypothesisGroupId },
    },
    diagnosticClaimId: id,
  };
}

export type UpdateDiagnosticClaimPatch = Partial<
  Pick<DiagnosticClaim, "text" | "claim_ids" | "evidence_ids" | "weights">
> & { confidence?: Partial<Confidence> };

export function updateDiagnosticClaim(
  caseFile: CaseFile,
  diagnosticClaimId: string,
  patch: UpdateDiagnosticClaimPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const idx = a.diagnostic_claims.findIndex((d) => d.id === diagnosticClaimId);
  if (idx < 0) {
    return { next: caseFile, auditEntry: { at: now, action: "UPDATE_DIAGNOSTIC_CLAIM", object_id: diagnosticClaimId } as AuditEntry };
  }
  const existing = a.diagnostic_claims[idx];
  const group = a.hypothesis_groups.find((g) => g.id === existing.hypothesis_group_id);
  if (group) {
    if (patch.claim_ids !== undefined) validateClaimIdsForInv(caseFile, group.investigation_id, patch.claim_ids);
    if (patch.evidence_ids !== undefined) validateEvidenceIdsForInv(caseFile, group.investigation_id, patch.evidence_ids);
  }
  const confidence =
    patch.confidence !== undefined
      ? normalizeConfidence(
          typeof patch.confidence.score === "number"
            ? { ...patch.confidence, score: Math.max(0, Math.min(1, patch.confidence.score)) }
            : patch.confidence
        )
      : existing.confidence;
  const changedFields = Object.keys(patch) as string[];
  const updated: DiagnosticClaim = {
    ...existing,
    ...patch,
    text: (patch.text ?? existing.text).trim(),
    weights: patch.weights ?? existing.weights,
    confidence,
    updated_at: now,
  };
  const claims = [...a.diagnostic_claims];
  claims[idx] = updated;
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, diagnostic_claims: claims }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "UPDATE_DIAGNOSTIC_CLAIM",
      object_type: "diagnostic_claim",
      object_id: diagnosticClaimId,
      details: { changed_fields: changedFields },
    },
  };
}

export function deleteDiagnosticClaim(
  caseFile: CaseFile,
  diagnosticClaimId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const dclm = a.diagnostic_claims.find((d) => d.id === diagnosticClaimId);
  if (!dclm) {
    return { next: caseFile, auditEntry: { at: now, action: "DELETE_DIAGNOSTIC_CLAIM", object_id: diagnosticClaimId } as AuditEntry };
  }
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, diagnostic_claims: a.diagnostic_claims.filter((d) => d.id !== diagnosticClaimId) }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "DELETE_DIAGNOSTIC_CLAIM",
      object_type: "diagnostic_claim",
      object_id: diagnosticClaimId,
      details: {},
    },
  };
}

// --- Assessment summary ---
export interface CreateAssessmentSummaryInput {
  hypothesisGroupId: string;
  question: string;
  topHypothesisId: string;
  achId?: string;
  keyJudgments: KeyJudgment[];
  alternativeExplanations?: string[];
  intelligenceGaps?: string[];
}

export function createAssessmentSummary(
  caseFile: CaseFile,
  input: CreateAssessmentSummaryInput
): { next: CaseFile; auditEntry: AuditEntry; assessmentId: string } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const group = a.hypothesis_groups.find((g) => g.id === input.hypothesisGroupId);
  if (!group) throw new Error("Hypothesis group not found.");
  const invId = group.investigation_id;
  for (const kj of input.keyJudgments ?? []) {
    validateEvidenceIdsForInv(caseFile, invId, kj.evidence_ids);
    validateClaimIdsForInv(caseFile, invId, kj.claim_ids);
  }
  const id = newId("ASM");
  const summary: AssessmentSummary = {
    id,
    hypothesis_group_id: input.hypothesisGroupId,
    question: input.question.trim(),
    top_hypothesis_id: input.topHypothesisId,
    ach_id: input.achId,
    key_judgments: (input.keyJudgments ?? []).map((kj) => ({
      ...kj,
      confidence: normalizeConfidence({
        score: Math.max(0, Math.min(1, kj.confidence?.score ?? 0.5)),
        bucket: kj.confidence?.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
        rationale: kj.confidence?.rationale,
      }),
    })),
    alternative_explanations: input.alternativeExplanations?.length ? [...input.alternativeExplanations] : undefined,
    intelligence_gaps: input.intelligenceGaps?.length ? [...input.intelligenceGaps] : undefined,
    created_at: now,
    updated_at: now,
  };
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, assessments: [...a.assessments, summary] }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "CREATE_ASSESSMENT_SUMMARY",
      object_type: "assessment_summary",
      object_id: id,
      details: { hypothesis_group_id: input.hypothesisGroupId },
    },
    assessmentId: id,
  };
}

export type UpdateAssessmentSummaryPatch = Partial<
  Pick<AssessmentSummary, "question" | "top_hypothesis_id" | "ach_id" | "key_judgments" | "alternative_explanations" | "intelligence_gaps">
>;

export function updateAssessmentSummary(
  caseFile: CaseFile,
  assessmentId: string,
  patch: UpdateAssessmentSummaryPatch
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const idx = a.assessments.findIndex((s) => s.id === assessmentId);
  if (idx < 0) {
    return { next: caseFile, auditEntry: { at: now, action: "UPDATE_ASSESSMENT_SUMMARY", object_id: assessmentId } as AuditEntry };
  }
  const existing = a.assessments[idx];
  const group = a.hypothesis_groups.find((g) => g.id === existing.hypothesis_group_id);
  if (group && patch.key_judgments) {
    for (const kj of patch.key_judgments) {
      validateEvidenceIdsForInv(caseFile, group.investigation_id, kj.evidence_ids);
      validateClaimIdsForInv(caseFile, group.investigation_id, kj.claim_ids);
    }
  }
  const key_judgments = patch.key_judgments ?? existing.key_judgments;
  const normalized = key_judgments.map((kj) => ({
    ...kj,
    confidence: normalizeConfidence({
      score: Math.max(0, Math.min(1, kj.confidence?.score ?? 0.5)),
      bucket: kj.confidence?.bucket as "LOW" | "MODERATE" | "HIGH" | undefined,
      rationale: kj.confidence?.rationale,
    }),
  }));
  const changedFields = Object.keys(patch) as string[];
  const updated: AssessmentSummary = {
    ...existing,
    ...patch,
    key_judgments: normalized,
    updated_at: now,
  };
  const assessments = [...a.assessments];
  assessments[idx] = updated;
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, assessments }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "UPDATE_ASSESSMENT_SUMMARY",
      object_type: "assessment_summary",
      object_id: assessmentId,
      details: { changed_fields: changedFields },
    },
  };
}

export function deleteAssessmentSummary(
  caseFile: CaseFile,
  assessmentId: string
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const a = getAnalysis(caseFile);
  const summary = a.assessments.find((s) => s.id === assessmentId);
  if (!summary) {
    return { next: caseFile, auditEntry: { at: now, action: "DELETE_ASSESSMENT_SUMMARY", object_id: assessmentId } as AuditEntry };
  }
  const next = setAnalysis(
    { ...caseFile, case: { ...caseFile.case, updated_at: now } },
    { ...a, assessments: a.assessments.filter((s) => s.id !== assessmentId) }
  );
  return {
    next,
    auditEntry: {
      at: now,
      action: "DELETE_ASSESSMENT_SUMMARY",
      object_type: "assessment_summary",
      object_id: assessmentId,
      details: {},
    },
  };
}
