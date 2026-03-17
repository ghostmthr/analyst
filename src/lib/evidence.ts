/**
 * Evidence hashing (Web Crypto) and evidence-backed derivation.
 * Attachment storage and ingest live in caseIO (need dir handle).
 */

import type { CaseFile, Evidence } from "@/types";

/**
 * Compute SHA-256 hash of a File (hex string).
 */
export async function hashFileSha256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute SHA-256 hash of a Blob (hex string).
 */
export async function hashBlobSha256(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute SHA-256 hash of a string (UTF-8 bytes).
 * Use for deterministic hashing when Blob/TextEncoder consistency matters.
 */
export async function hashStringSha256(s: string): Promise<string> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(s);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Evidence record is complete iff:
 * - captured_at exists
 * - source_url OR source_type exists
 * - If file path is present, sha256 exists (file ingest implies hash).
 * API: "sha256 exists, captured_at exists, source_url OR source_type exists"
 */
export function isEvidenceRecordComplete(evd: Evidence): boolean {
  if (!evd.source?.captured_at) return false;
  const hasSource =
    (evd.source.source_url != null && evd.source.source_url !== "") ||
    evd.source.source_type != null;
  if (!hasSource) return false;
  if (evd.file?.path) {
    return Boolean(evd.file.sha256 && evd.file.sha256.length === 64);
  }
  return true;
}

/**
 * Assertion is evidence-backed iff:
 * - ≥1 evidence id
 * - each referenced evidence is complete
 */
export function isEvidenceBacked(
  evidenceIds: string[] | undefined,
  caseFile: CaseFile
): boolean {
  if (!evidenceIds?.length) return false;
  const evidence = caseFile.evidence;
  const byId = new Map(evidence.map((e) => [e.id, e]));
  for (const id of evidenceIds) {
    const evd = byId.get(id);
    if (!evd || !isEvidenceRecordComplete(evd)) return false;
  }
  return true;
}

/**
 * Validate that all evidence IDs exist in caseFile and belong to the given investigation.
 * Use before writing locations/events/claims/relationships that reference evidence.
 * Throws with a user-facing message if invalid; do not write invalid refs to case.json.
 */
export function validateEvidenceIdsForInv(
  caseFile: CaseFile,
  invId: string,
  evidenceIds: string[] | undefined
): void {
  if (!evidenceIds?.length) return;
  const byId = new Map(caseFile.evidence.map((e) => [e.id, e]));
  for (const id of evidenceIds) {
    const ev = byId.get(id);
    if (!ev) throw new Error(`Evidence "${id}" not found.`);
    if (ev.investigation_id !== invId) {
      throw new Error("Evidence must belong to the current investigation.");
    }
  }
}

/**
 * Validate that all claim IDs exist in caseFile and belong to the given investigation.
 * Throws with a user-facing message if invalid.
 */
export function validateClaimIdsForInv(
  caseFile: CaseFile,
  invId: string,
  claimIds: string[] | undefined
): void {
  if (!claimIds?.length) return;
  const byId = new Map(caseFile.claims.map((c) => [c.id, c]));
  for (const id of claimIds) {
    const cl = byId.get(id);
    if (!cl) throw new Error(`Claim "${id}" not found.`);
    if (cl.investigation_id !== invId) throw new Error("Claims must belong to the current investigation.");
  }
}
