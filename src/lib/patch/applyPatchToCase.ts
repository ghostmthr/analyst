/**
 * Orchestration: apply patch to case folder (persist + audit + custody).
 * Handles attachments from ZIP.
 */

import { computeStateId } from "@/lib/canonical";
import { appendAudit, appendCustody, storeAttachmentFromBlob,writeCaseJson } from "@/lib/caseIO";
import { hashStringSha256 } from "@/lib/evidence";
import type { ExportManifest } from "@/lib/export/manifest";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

import { applyPatch } from "./applyPatch";
import type { ZipIndex } from "./readPatchZip";
import type { PatchFile } from "./types";
import type { ValidatePatchResult } from "./validatePatch";

function getExt(path: string): string {
  const last = path.split("/").pop() ?? "";
  const dot = last.lastIndexOf(".");
  return dot > 0 && dot < last.length - 1 ? last.slice(dot + 1) : "bin";
}

export interface ApplyPatchToCaseParams {
  dir: FileSystemDirectoryHandle;
  caseFile: CaseFile;
  patch: PatchFile;
  validation: ValidatePatchResult;
  files: ZipIndex;
  manifest?: ExportManifest;
  rawPatchJson: string;
  force?: boolean;
}

export interface ApplyPatchToCaseResult {
  next: CaseFile;
  appliedCount: number;
  skippedCount: number;
  attachmentCount: number;
  patchSha256: string;
  stateBeforeId: string;
  stateAfterId: string;
}

/**
 * Apply patch to case folder: run apply engine, write attachments, persist, log.
 */
export async function applyPatchToCase(
  params: ApplyPatchToCaseParams
): Promise<ApplyPatchToCaseResult> {
  const { dir, caseFile, patch, validation, files, manifest, rawPatchJson, force = false } = params;

  if (!validation.ok && !force) {
    throw new Error(`Patch validation failed: ${validation.errors.join("; ")}`);
  }

  const stateBeforeId = await computeStateId(caseFile);
  const result = applyPatch(caseFile, patch, { force });

  if (result.errors.length > 0 && !force) {
    throw new Error(`Apply failed: ${result.errors.join("; ")}`);
  }

  let attachmentCount = 0;
  const now = nowUtc();

  // Apply attachments from ZIP (manifest or patch.attachments)
  const seenSha256 = new Set<string>();

  const processAttachment = async (path: string, sha256: string): Promise<boolean> => {
    if (seenSha256.has(sha256)) return false;
    if (!files.paths.includes(path)) return false;

    try {
      const blob = await files.getBlob(path);
      const ext = getExt(path);
      const { path: storedPath } = await storeAttachmentFromBlob(dir, blob, sha256, ext);
      seenSha256.add(sha256);
      await appendCustody(dir, {
        at: now,
        action: "APPLY_PATCH_ATTACHMENT",
        artifact: storedPath,
        sha256,
        details: { source: path },
      });
      return true;
    } catch (e) {
      if (e instanceof Error && e.message.includes("sha256 mismatch")) {
        throw e;
      }
      return false;
    }
  };

  for (const entry of manifest?.files?.filter((f) => f.kind === "ATTACHMENT" && f.sha256 && f.path) ?? []) {
    if (await processAttachment(entry.path, entry.sha256!)) attachmentCount++;
  }

  for (const att of patch.attachments ?? []) {
    const path = att.path.replace(/^\/+/, "");
    const matchPath = files.paths.find((p) => p === path || p === `attachments/${path}` || p.endsWith("/" + att.path));
    if (matchPath && (await processAttachment(matchPath, att.sha256))) attachmentCount++;
  }

  const patchSha256 = await hashStringSha256(rawPatchJson);
  const stateAfterId = await computeStateId(result.next);

  await writeCaseJson(dir, result.next);

  await appendAudit(dir, {
    at: now,
    action: "APPLY_PATCH",
    details: {
      patch_id: patch.patch_id ?? patch.patch_version ?? "unknown",
      ops_count: patch.ops.length,
      applied_count: result.appliedOps.length,
      skipped_count: result.skippedOps.length,
      attachment_count: attachmentCount,
      state_before_id: stateBeforeId,
      state_after_id: stateAfterId,
    },
  });

  const manifestSha256 = manifest?.files
    ? await hashStringSha256(JSON.stringify(manifest.files))
    : undefined;

  await appendCustody(dir, {
    at: now,
    action: "APPLY_PATCH",
    artifact: "patch.zip",
    sha256: patchSha256,
    details: {
      patch_id: patch.patch_id ?? patch.patch_version ?? "unknown",
      manifest_sha256: manifestSha256,
    },
  });

  return {
    next: result.next,
    appliedCount: result.appliedOps.length,
    skippedCount: result.skippedOps.length,
    attachmentCount,
    patchSha256,
    stateBeforeId,
    stateAfterId,
  };
}
