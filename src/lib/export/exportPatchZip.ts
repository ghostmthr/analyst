/**
 * Patch ZIP scaffold — structure + manifest, no apply engine.
 * Phase 10 will implement apply/verify.
 */

import { canonicalStringify } from "@/lib/canonical";
import { appendAudit, appendCustody } from "@/lib/caseIO";
import { hashStringSha256 } from "@/lib/evidence";
import { hashBlobSha256 } from "@/lib/evidence";
import { newId,nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

import type { ExportManifest, ManifestFileEntry } from "./manifest";
import { stringifyManifest } from "./manifest";
import { makeZip, zipAddText, zipFinalize } from "./zip";

const SYSTEM_VERSION = "analyst-0.2.0";

export interface PatchPayload {
  patch_version: string;
  patch_id: string;
  generated_at: string;
  description?: string;
  ops: unknown[];
}

export interface ExportPatchZipParams {
  dir?: FileSystemDirectoryHandle;
  caseFile: CaseFile;
  patchOps: unknown[];
  description?: string;
}

export interface ExportPatchZipResult {
  blob: Blob;
  manifest: ExportManifest;
  sha256: string;
}

export async function exportPatchZip(
  params: ExportPatchZipParams
): Promise<ExportPatchZipResult> {
  const { dir, caseFile, patchOps, description } = params;
  const hasDir = Boolean(dir);
  const now = nowUtc();
  const zip = makeZip();

  const patchId = newId("PATCH");
  const patchPayload: PatchPayload = {
    patch_version: "1.0.0",
    patch_id: patchId,
    generated_at: now,
    description: description?.trim() || undefined,
    ops: patchOps,
  };
  const patchJson = canonicalStringify(patchPayload);
  zipAddText(zip, "patch.json", patchJson);

  const patchSha256 = await hashStringSha256(patchJson);

  const manifest: ExportManifest = {
    manifest_version: "1.0.0",
    generated_at: now,
    exporter: { system_version: SYSTEM_VERSION },
    case: {
      id: caseFile.case.id,
      title: caseFile.case.title,
      schema_version: caseFile.schema_version,
    },
    scope: { kind: "PATCH" },
    files: ([
      { path: "patch.json", kind: "PATCH_JSON" as const, size_bytes: patchJson.length, sha256: patchSha256 },
      { path: "manifest.json", kind: "MANIFEST" as const },
    ] as ManifestFileEntry[]).sort((a, b) => a.path.localeCompare(b.path)),
    evidence: [],
  };

  const manifestStr = stringifyManifest(manifest);
  zipAddText(zip, "manifest.json", manifestStr);

  const blob = await zipFinalize(zip);
  const sha256 = await hashBlobSha256(blob);

  if (hasDir) {
    await appendAudit(dir!, {
      at: now,
      action: "EXPORT_PATCH_ZIP",
      details: { opCount: patchOps.length },
    });
    await appendCustody(dir!, {
      at: now,
      action: "EXPORT_PATCH_ZIP",
      artifact: "download:patch.zip",
      sha256,
      details: { opCount: patchOps.length },
    });
  }

  return { blob, manifest, sha256 };
}
