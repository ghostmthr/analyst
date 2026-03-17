"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

import {
  computeAch as computeAchLib,
  computeAchSensitivityRemoveEvidence as computeAchSensitivityRemoveEvidenceLib,
  createAchMatrix as createAchMatrixLib,
  type CreateAchMatrixInput,
  deleteAchMatrix as deleteAchMatrixLib,
  saveAchSensitivitySummary as saveAchSensitivitySummaryLib,
  setAchCell as setAchCellLib,
} from "@/lib/ach";
import {
  createAssessmentSummary as createAssessmentSummaryLib,
  type CreateAssessmentSummaryInput,
  createDiagnosticClaim as createDiagnosticClaimLib,
  type CreateDiagnosticClaimInput,
  createHypothesis as createHypothesisLib,
  createHypothesisGroup as createHypothesisGroupLib,
  type CreateHypothesisGroupInput,
  type CreateHypothesisInput,
  deleteAssessmentSummary as deleteAssessmentSummaryLib,
  deleteDiagnosticClaim as deleteDiagnosticClaimLib,
  deleteHypothesis as deleteHypothesisLib,
  deleteHypothesisGroup as deleteHypothesisGroupLib,
  updateAssessmentSummary as updateAssessmentSummaryLib,
  type UpdateAssessmentSummaryPatch,
  updateDiagnosticClaim as updateDiagnosticClaimLib,
  type UpdateDiagnosticClaimPatch,
  updateHypothesis as updateHypothesisLib,
  updateHypothesisGroup as updateHypothesisGroupLib,
  type UpdateHypothesisGroupPatch,
  type UpdateHypothesisPatch,
} from "@/lib/assessment";
import type { AuditEntry } from "@/lib/audit";
import {
  createInvestigation as createInv,
  ingestEvidence as ingestEvidenceIO,
  type IngestEvidenceParams,
  initNewCase,
  loadCase,
  saveCase,
  verifyEvidenceHash as verifyEvidenceHashIO,
} from "@/lib/caseIO";
import {
  createClaim as createClaimLib,
  type CreateClaimInput,
  deleteClaim as deleteClaimLib,
  updateClaim as updateClaimLib,
  type UpdateClaimPatch,
} from "@/lib/claims";
import {
  addEntityLocation as addEntityLocationLib,
  createEntity as createEntityLib,
  type CreateEntityInput,
  deleteEntity as deleteEntityLib,
  removeEntityLocation as removeEntityLocationLib,
  updateEntity as updateEntityLib,
  updateEntityLocation as updateEntityLocationLib,
  type UpdateEntityLocationPatch,
  type UpdateEntityPatch,
} from "@/lib/entities";
import {
  createEvent as createEventLib,
  type CreateEventInput,
  deleteEvent as deleteEventLib,
  updateEvent as updateEventLib,
  type UpdateEventPatch,
} from "@/lib/events";
import {
  createIdentifier as createIdentifierLib,
  type CreateIdentifierInput,
  deleteIdentifier as deleteIdentifierLib,
  updateIdentifier as updateIdentifierLib,
  type UpdateIdentifierPatch,
} from "@/lib/identifiers";
import {
  createRelationship as createRelationshipLib,
  type CreateRelationshipInput,
  deleteRelationship as deleteRelationshipLib,
  updateRelationship as updateRelationshipLib,
  type UpdateRelationshipPatch,
} from "@/lib/relationships";
import type { CaseFile, LocationRef } from "@/types";

interface CaseState {
  caseFolderHandle: FileSystemDirectoryHandle | null;
  caseFile: CaseFile | null;
  loadError: string | null;
}

interface CaseContextValue extends CaseState {
  openCaseFolder: () => Promise<void>;
  initCaseInFolder: (caseTitle: string) => Promise<void>;
  refreshCase: () => Promise<void>;
  saveCaseFile: (next: CaseFile, auditEntry?: AuditEntry) => Promise<void>;
  createInvestigation: (params: {
    title: string;
    description?: string;
    lead?: string;
  }) => Promise<CaseFile | null>;
  ingestEvidence: (params: IngestEvidenceParams) => Promise<{
    next: CaseFile;
    evidenceId: string;
  } | null>;
  ingestEvidenceAndLink: (params: IngestEvidenceParams, entityId: string) => Promise<{
    next: CaseFile;
    evidenceId: string;
  } | null>;
  verifyEvidenceHash: (evidenceId: string) => Promise<{ match: boolean } | null>;
  createEntity: (invId: string, input: CreateEntityInput) => Promise<string | null>;
  updateEntity: (entityId: string, patch: UpdateEntityPatch) => Promise<void>;
  deleteEntity: (entityId: string) => Promise<void>;
  addEntityLocation: (entityId: string, location: LocationRef) => Promise<void>;
  removeEntityLocation: (entityId: string, locationId: string) => Promise<void>;
  updateEntityLocation: (entityId: string, locationId: string, patch: UpdateEntityLocationPatch) => Promise<void>;
  createIdentifier: (input: CreateIdentifierInput) => Promise<CaseFile | null>;
  updateIdentifier: (identifierId: string, patch: UpdateIdentifierPatch) => Promise<void>;
  deleteIdentifier: (identifierId: string) => Promise<void>;
  createClaim: (input: CreateClaimInput) => Promise<void>;
  updateClaim: (claimId: string, patch: UpdateClaimPatch) => Promise<void>;
  deleteClaim: (claimId: string) => Promise<void>;
  createRelationship: (input: CreateRelationshipInput) => Promise<void>;
  updateRelationship: (relId: string, patch: UpdateRelationshipPatch) => Promise<void>;
  deleteRelationship: (relId: string) => Promise<void>;
  createEvent: (input: CreateEventInput) => Promise<string | null>;
  updateEvent: (eventId: string, patch: UpdateEventPatch) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  createHypothesisGroup: (input: CreateHypothesisGroupInput) => Promise<string | null>;
  updateHypothesisGroup: (groupId: string, patch: UpdateHypothesisGroupPatch) => Promise<void>;
  deleteHypothesisGroup: (groupId: string) => Promise<void>;
  createHypothesis: (input: CreateHypothesisInput) => Promise<string | null>;
  updateHypothesis: (hypothesisId: string, patch: UpdateHypothesisPatch) => Promise<void>;
  deleteHypothesis: (hypothesisId: string) => Promise<void>;
  createDiagnosticClaim: (input: CreateDiagnosticClaimInput) => Promise<string | null>;
  updateDiagnosticClaim: (diagnosticClaimId: string, patch: UpdateDiagnosticClaimPatch) => Promise<void>;
  deleteDiagnosticClaim: (diagnosticClaimId: string) => Promise<void>;
  createAchMatrix: (input: CreateAchMatrixInput) => Promise<string | null>;
  setAchCell: (achId: string, cell: { diagnosticClaimId: string; hypothesisId: string; relation: "C" | "I" | "NA"; analystNote?: string }) => Promise<void>;
  computeAch: (achId: string, options?: { storeComputed?: boolean }) => Promise<import("@/types").AchMatrix["computed"]>;
  computeAchSensitivityRemoveEvidence: (achId: string, evidenceId: string) => import("@/lib/ach").SensitivityResult | null;
  saveAchSensitivitySummary: (achId: string, summary: import("@/lib/ach").AchSensitivitySummaryInput) => Promise<void>;
  deleteAchMatrix: (achId: string) => Promise<void>;
  createAssessmentSummary: (input: CreateAssessmentSummaryInput) => Promise<string | null>;
  updateAssessmentSummary: (assessmentId: string, patch: UpdateAssessmentSummaryPatch) => Promise<void>;
  deleteAssessmentSummary: (assessmentId: string) => Promise<void>;
}

const CaseContext = createContext<CaseContextValue | null>(null);

export function CaseProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CaseState>({
    caseFolderHandle: null,
    caseFile: null,
    loadError: null,
  });

  const refreshCase = useCallback(async () => {
    if (!state.caseFolderHandle) return;
    try {
      const data = await loadCase(state.caseFolderHandle);
      setState((s) => ({ ...s, caseFile: data, loadError: null }));
    } catch (e) {
      setState((s) => ({
        ...s,
        loadError: e instanceof Error ? e.message : "Failed to load case",
      }));
    }
  }, [state.caseFolderHandle]);

  const openCaseFolder = useCallback(async () => {
    try {
      const dir = await (await import("@/lib/caseIO")).openCaseFolder();
      try {
        const data = await loadCase(dir);
        setState({
          caseFolderHandle: dir,
          caseFile: data,
          loadError: null,
        });
      } catch (loadErr) {
        const isNotFound =
          (loadErr as { name?: string })?.name === "NotFoundError" ||
          (loadErr instanceof Error &&
            loadErr.message.includes("could not be found"));
        const msg =
          loadErr instanceof Error ? loadErr.message : "Failed to load case";
        setState({
          caseFolderHandle: dir,
          caseFile: null,
          loadError: isNotFound
            ? "No case.json found in this folder."
            : msg,
        });
      }
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setState((s) => ({
        ...s,
        loadError: e instanceof Error ? e.message : "Failed to open folder",
      }));
    }
  }, []);

  const initCaseInFolder = useCallback(
    async (caseTitle: string) => {
      if (!state.caseFolderHandle) return;
      try {
        const data = await initNewCase(state.caseFolderHandle, caseTitle);
        setState((s) => ({ ...s, caseFile: data, loadError: null }));
      } catch (e) {
        setState((s) => ({
          ...s,
          loadError: e instanceof Error ? e.message : "Failed to create case",
        }));
      }
    },
    [state.caseFolderHandle]
  );

  const saveCaseFile = useCallback(
    async (next: CaseFile, auditEntry?: AuditEntry) => {
      if (!state.caseFolderHandle) return;
      await saveCase(state.caseFolderHandle, next, auditEntry);
      setState((s) => ({ ...s, caseFile: next }));
    },
    [state.caseFolderHandle]
  );

  const createInvestigation = useCallback(
    async (params: { title: string; description?: string; lead?: string }) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry } = createInv(state.caseFile, params);
      await saveCase(state.caseFolderHandle, next, auditEntry);
      setState((s) => ({ ...s, caseFile: next }));
      return next;
    },
    [state.caseFile, state.caseFolderHandle]
  );

  const ingestEvidence = useCallback(
    async (params: IngestEvidenceParams) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      try {
        const result = await ingestEvidenceIO(
          state.caseFolderHandle,
          state.caseFile,
          params
        );
        setState((s) => ({ ...s, caseFile: result.next }));
        return result;
      } catch {
        return null;
      }
    },
    [state.caseFile, state.caseFolderHandle]
  );

  const ingestEvidenceAndLink = useCallback(
    async (params: IngestEvidenceParams, entityId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      try {
        const result = await ingestEvidenceIO(
          state.caseFolderHandle,
          state.caseFile,
          params
        );
        const entity = result.next.entities.find((e) => e.id === entityId);
        const currentEvIds = entity?.evidence_ids ?? [];
        const { next: linked, auditEntry } = updateEntityLib(result.next, entityId, {
          evidence_ids: [...currentEvIds, result.evidenceId],
        });
        await saveCase(state.caseFolderHandle, linked, auditEntry);
        setState((s) => ({ ...s, caseFile: linked }));
        return { next: linked, evidenceId: result.evidenceId };
      } catch {
        return null;
      }
    },
    [state.caseFile, state.caseFolderHandle]
  );

  const verifyEvidenceHash = useCallback(
    async (evidenceId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      try {
        const result = await verifyEvidenceHashIO(
          state.caseFolderHandle,
          state.caseFile,
          evidenceId
        );
        return result;
      } catch {
        return null;
      }
    },
    [state.caseFile, state.caseFolderHandle]
  );

  const saveAndSet = useCallback(
    async (next: CaseFile, auditEntry?: AuditEntry) => {
      if (!state.caseFolderHandle) return;
      await saveCase(state.caseFolderHandle, next, auditEntry);
      setState((s) => ({ ...s, caseFile: next }));
    },
    [state.caseFolderHandle]
  );

  const createEntity = useCallback(
    async (invId: string, input: CreateEntityInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry } = createEntityLib(state.caseFile, invId, input);
      await saveAndSet(next, auditEntry);
      return auditEntry.object_id ?? null;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const updateEntity = useCallback(
    async (entityId: string, patch: UpdateEntityPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateEntityLib(state.caseFile, entityId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const deleteEntity = useCallback(
    async (entityId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteEntityLib(state.caseFile, entityId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const addEntityLocation = useCallback(
    async (entityId: string, location: LocationRef) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = addEntityLocationLib(
        state.caseFile,
        entityId,
        location
      );
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const removeEntityLocation = useCallback(
    async (entityId: string, locationId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = removeEntityLocationLib(
        state.caseFile,
        entityId,
        locationId
      );
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const updateEntityLocation = useCallback(
    async (entityId: string, locationId: string, patch: UpdateEntityLocationPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateEntityLocationLib(
        state.caseFile,
        entityId,
        locationId,
        patch
      );
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const createIdentifier = useCallback(
    async (input: CreateIdentifierInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry } = createIdentifierLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return next;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const updateIdentifier = useCallback(
    async (identifierId: string, patch: UpdateIdentifierPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateIdentifierLib(
        state.caseFile,
        identifierId,
        patch
      );
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const deleteIdentifier = useCallback(
    async (identifierId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteIdentifierLib(
        state.caseFile,
        identifierId
      );
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const createClaim = useCallback(
    async (input: CreateClaimInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = createClaimLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const updateClaim = useCallback(
    async (claimId: string, patch: UpdateClaimPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateClaimLib(state.caseFile, claimId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const deleteClaim = useCallback(
    async (claimId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteClaimLib(state.caseFile, claimId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const createRelationship = useCallback(
    async (input: CreateRelationshipInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = createRelationshipLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const updateRelationship = useCallback(
    async (relId: string, patch: UpdateRelationshipPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateRelationshipLib(
        state.caseFile,
        relId,
        patch
      );
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const deleteRelationship = useCallback(
    async (relId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteRelationshipLib(state.caseFile, relId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const createEvent = useCallback(
    async (input: CreateEventInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry, eventId } = createEventLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return eventId;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const updateEvent = useCallback(
    async (eventId: string, patch: UpdateEventPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateEventLib(state.caseFile, eventId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteEventLib(state.caseFile, eventId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const createHypothesisGroup = useCallback(
    async (input: CreateHypothesisGroupInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry, groupId } = createHypothesisGroupLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return groupId;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const updateHypothesisGroup = useCallback(
    async (groupId: string, patch: UpdateHypothesisGroupPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateHypothesisGroupLib(state.caseFile, groupId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const deleteHypothesisGroup = useCallback(
    async (groupId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteHypothesisGroupLib(state.caseFile, groupId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const createHypothesis = useCallback(
    async (input: CreateHypothesisInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry, hypothesisId } = createHypothesisLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return hypothesisId;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const updateHypothesis = useCallback(
    async (hypothesisId: string, patch: UpdateHypothesisPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateHypothesisLib(state.caseFile, hypothesisId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const deleteHypothesis = useCallback(
    async (hypothesisId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteHypothesisLib(state.caseFile, hypothesisId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const createDiagnosticClaim = useCallback(
    async (input: CreateDiagnosticClaimInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry, diagnosticClaimId } = createDiagnosticClaimLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return diagnosticClaimId;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const updateDiagnosticClaim = useCallback(
    async (diagnosticClaimId: string, patch: UpdateDiagnosticClaimPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateDiagnosticClaimLib(state.caseFile, diagnosticClaimId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const deleteDiagnosticClaim = useCallback(
    async (diagnosticClaimId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteDiagnosticClaimLib(state.caseFile, diagnosticClaimId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const createAchMatrix = useCallback(
    async (input: CreateAchMatrixInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry, achId } = createAchMatrixLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return achId;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const setAchCell = useCallback(
    async (
      achId: string,
      cell: { diagnosticClaimId: string; hypothesisId: string; relation: "C" | "I" | "NA"; analystNote?: string }
    ) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = setAchCellLib(state.caseFile, achId, cell);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const computeAch = useCallback(
    async (achId: string, options?: { storeComputed?: boolean }) => {
      if (!state.caseFile || !state.caseFolderHandle) return undefined;
      const { next, auditEntry, computed } = computeAchLib(state.caseFile, achId, options);
      if (next !== state.caseFile && auditEntry) await saveAndSet(next, auditEntry);
      return computed;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const computeAchSensitivityRemoveEvidence = useCallback(
    (achId: string, evidenceId: string) => {
      if (!state.caseFile) return null;
      return computeAchSensitivityRemoveEvidenceLib(state.caseFile, achId, evidenceId);
    },
    [state.caseFile]
  );
  const saveAchSensitivitySummary = useCallback(
    async (achId: string, summary: import("@/lib/ach").AchSensitivitySummaryInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = saveAchSensitivitySummaryLib(state.caseFile, achId, summary);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const deleteAchMatrix = useCallback(
    async (achId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteAchMatrixLib(state.caseFile, achId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const createAssessmentSummary = useCallback(
    async (input: CreateAssessmentSummaryInput) => {
      if (!state.caseFile || !state.caseFolderHandle) return null;
      const { next, auditEntry, assessmentId } = createAssessmentSummaryLib(state.caseFile, input);
      await saveAndSet(next, auditEntry);
      return assessmentId;
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const updateAssessmentSummary = useCallback(
    async (assessmentId: string, patch: UpdateAssessmentSummaryPatch) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = updateAssessmentSummaryLib(state.caseFile, assessmentId, patch);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );
  const deleteAssessmentSummary = useCallback(
    async (assessmentId: string) => {
      if (!state.caseFile || !state.caseFolderHandle) return;
      const { next, auditEntry } = deleteAssessmentSummaryLib(state.caseFile, assessmentId);
      await saveAndSet(next, auditEntry);
    },
    [state.caseFile, state.caseFolderHandle, saveAndSet]
  );

  const value: CaseContextValue = {
    ...state,
    openCaseFolder,
    initCaseInFolder,
    refreshCase,
    saveCaseFile,
    createInvestigation,
    ingestEvidence,
    ingestEvidenceAndLink,
    verifyEvidenceHash,
    createEntity,
    updateEntity,
    deleteEntity,
    addEntityLocation,
    removeEntityLocation,
    updateEntityLocation,
    createIdentifier,
    updateIdentifier,
    deleteIdentifier,
    createClaim,
    updateClaim,
    deleteClaim,
    createRelationship,
    updateRelationship,
    deleteRelationship,
    createEvent,
    updateEvent,
    deleteEvent,
    createHypothesisGroup,
    updateHypothesisGroup,
    deleteHypothesisGroup,
    createHypothesis,
    updateHypothesis,
    deleteHypothesis,
    createDiagnosticClaim,
    updateDiagnosticClaim,
    deleteDiagnosticClaim,
    createAchMatrix,
    setAchCell,
    computeAch,
    computeAchSensitivityRemoveEvidence,
    saveAchSensitivitySummary,
    deleteAchMatrix,
    createAssessmentSummary,
    updateAssessmentSummary,
    deleteAssessmentSummary,
  };

  return (
    <CaseContext.Provider value={value}>{children}</CaseContext.Provider>
  );
}

export function useCase(): CaseContextValue {
  const ctx = useContext(CaseContext);
  if (!ctx) throw new Error("useCase must be used within CaseProvider");
  return ctx;
}
