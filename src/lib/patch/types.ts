/**
 * Patch format types — patch.json structure.
 */

export type PatchOpType =
  | "UPSERT_INVESTIGATION"
  | "UPSERT_ENTITY"
  | "UPSERT_IDENTIFIER"
  | "UPSERT_EVIDENCE"
  | "UPSERT_CLAIM"
  | "UPSERT_RELATIONSHIP"
  | "UPSERT_EVENT"
  | "UPSERT_HYPOTHESIS_GROUP"
  | "UPSERT_HYPOTHESIS"
  | "UPSERT_DIAGNOSTIC_CLAIM"
  | "UPSERT_ACH_MATRIX"
  | "UPSERT_ASSESSMENT_SUMMARY"
  | "DELETE_INVESTIGATION"
  | "DELETE_ENTITY"
  | "DELETE_IDENTIFIER"
  | "DELETE_EVIDENCE"
  | "DELETE_CLAIM"
  | "DELETE_RELATIONSHIP"
  | "DELETE_EVENT"
  | "DELETE_HYPOTHESIS_GROUP"
  | "DELETE_HYPOTHESIS"
  | "DELETE_DIAGNOSTIC_CLAIM"
  | "DELETE_ACH_MATRIX"
  | "DELETE_ASSESSMENT_SUMMARY"
  | "ADD_ATTACHMENT";

export interface PatchOp {
  op: PatchOpType;
  object?: Record<string, unknown>;
  id?: string;
}

/**
 * Patch file structure (patch.json).
 * Supports both legacy (version, created_at) and spec (patch_version, patch_id, generated_at).
 */
export interface PatchFile {
  patch_version?: string;
  version?: string;
  patch_id?: string;
  generated_at?: string;
  created_at?: string;
  description?: string;
  ops: PatchOp[];
  attachments?: PatchAttachmentSpec[];
}

export interface PatchAttachmentSpec {
  path: string;
  sha256: string;
  size_bytes?: number;
  mime?: string;
  evidence_id?: string;
}
