/**
 * Baseline ZIP export — case metadata + logs + optional attachments.
 */

import { canonicalStringify } from "@/lib/canonical";
import { computeStateId } from "@/lib/canonical";
import { readAttachment,readTextFileIfExists } from "@/lib/caseIO";
import { appendAudit, appendCustody } from "@/lib/caseIO";
import { hashBlobSha256 } from "@/lib/evidence";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

import type { ExportManifest, ManifestFileEntry } from "./manifest";
import { stringifyManifest } from "./manifest";
import { makeZip, zipAddText, zipFinalize } from "./zip";

const SYSTEM_VERSION = "analyst-0.2.0";

export interface ExportBaselineZipParams {
  dir?: FileSystemDirectoryHandle;
  caseFile: CaseFile;
  invId?: string;
  includeAttachments?: boolean;
}

export interface ExportBaselineZipResult {
  blob: Blob;
  manifest: ExportManifest;
  sha256: string;
}

export async function exportBaselineZip(
  params: ExportBaselineZipParams
): Promise<ExportBaselineZipResult> {
  const { dir, caseFile, invId, includeAttachments = false } = params;
  const hasDir = Boolean(dir);
  const canIncludeAttachments = hasDir && includeAttachments;
  const now = nowUtc();
  const zip = makeZip();

  // case.json
  const caseJson = canonicalStringify(caseFile);
  zipAddText(zip, "case.json", caseJson);

  let auditLog = "";
  let custodyLog = "";
  if (hasDir) {
    auditLog = await readTextFileIfExists(dir!, "audit.log");
    custodyLog = await readTextFileIfExists(dir!, "custody.log");
  }
  zipAddText(zip, "audit.log", auditLog);
  zipAddText(zip, "custody.log", custodyLog);

  const files: ManifestFileEntry[] = [
    { path: "case.json", kind: "CASE_JSON", size_bytes: caseJson.length },
    { path: "audit.log", kind: "AUDIT_LOG", size_bytes: auditLog.length },
    { path: "custody.log", kind: "CUSTODY_LOG", size_bytes: custodyLog.length },
  ];

  let _attachmentCount = 0;
  let evidenceList = caseFile.evidence;
  if (invId) {
    evidenceList = evidenceList.filter((e) => e.investigation_id === invId);
  }

  if (canIncludeAttachments) {
    for (const evd of evidenceList) {
      if (evd.file?.path) {
        try {
          const file = await readAttachment(dir!, evd.file.path);
          const buffer = await file.arrayBuffer();
          const blob = new Blob([buffer]);
          const path = evd.file.path;
          zip.file(path, blob, { binary: true });
          files.push({
            path,
            sha256: evd.file.sha256,
            size_bytes: evd.file.size_bytes,
            mime: evd.file.mime,
            kind: "ATTACHMENT",
            evidence_id: evd.id,
          });
          _attachmentCount++;
        } catch {
          files.push({
            path: evd.file.path,
            kind: "ATTACHMENT",
            evidence_id: evd.id,
            notes: "no_file",
          });
        }
      }
    }
  }

  // patches/ placeholder (empty folder)
  zip.folder("patches");

  // evidence list for manifest (always include for auditors)
  const evidence = evidenceList
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      source_type: e.source?.source_type ?? "OTHER",
      captured_at: e.source?.captured_at ?? "",
      source_url: e.source?.source_url,
      file: e.file,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const caseStateId = await computeStateId(caseFile);

  const manifest: ExportManifest = {
    manifest_version: "1.0.0",
    generated_at: now,
    exporter: { system_version: SYSTEM_VERSION },
    case: {
      id: caseFile.case.id,
      title: caseFile.case.title,
      schema_version: caseFile.schema_version,
    },
    scope: {
      kind: "BASELINE",
      inv_id: invId,
    },
    files: files
      .concat([{ path: "manifest.json", kind: "MANIFEST" }])
      .sort((a, b) => a.path.localeCompare(b.path)),
    evidence,
    checks: { case_state_id: caseStateId },
  };

  const manifestStr = stringifyManifest(manifest);
  zipAddText(zip, "manifest.json", manifestStr);

  const blob = await zipFinalize(zip);
  const sha256 = await hashBlobSha256(blob);

  if (hasDir) {
    await appendAudit(dir!, {
      at: now,
      action: "EXPORT_BASELINE_ZIP",
      details: {
        invId: invId ?? null,
        includeAttachments: canIncludeAttachments,
        fileCount: files.length + 1,
        evidenceCount: evidence.length,
      },
    });
    await appendCustody(dir!, {
      at: now,
      action: "EXPORT_BASELINE_ZIP",
      artifact: "download:baseline.zip",
      sha256,
      details: { fileCount: files.length + 1 },
    });
  }

  return { blob, manifest, sha256 };
}
