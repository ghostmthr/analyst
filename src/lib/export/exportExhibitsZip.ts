/**
 * Exhibits ZIP export — selected evidence attachments + manifest.
 * Verifies sha256 before inclusion; throws on mismatch.
 */

import { readAttachment } from "@/lib/caseIO";
import { appendAudit, appendCustody } from "@/lib/caseIO";
import { hashBlobSha256,hashFileSha256 } from "@/lib/evidence";
import { nowUtc } from "@/lib/ids";
import type { CaseFile } from "@/types";

import type { ExportManifest, ManifestEvidenceEntry,ManifestFileEntry } from "./manifest";
import { stringifyManifest } from "./manifest";
import { makeZip, zipAddText, zipFinalize } from "./zip";

const SYSTEM_VERSION = "analyst-0.2.0";

export interface ExportExhibitsZipParams {
  dir: FileSystemDirectoryHandle;
  caseFile: CaseFile;
  evidenceIds: string[];
  invId: string;
}

export interface ExportExhibitsZipResult {
  blob: Blob;
  manifest: ExportManifest;
  sha256: string;
}

export async function exportExhibitsZip(
  params: ExportExhibitsZipParams
): Promise<ExportExhibitsZipResult> {
  const { dir, caseFile, evidenceIds, invId } = params;
  const now = nowUtc();
  const zip = makeZip();

  const files: ManifestFileEntry[] = [];
  const evidenceEntries: ManifestEvidenceEntry[] = [];
  let attachmentCount = 0;

  for (const evidenceId of evidenceIds) {
    const evd = caseFile.evidence.find((e) => e.id === evidenceId);
    if (!evd) {
      throw new Error(`Evidence "${evidenceId}" not found.`);
    }
    if (evd.investigation_id !== invId) {
      throw new Error(`Evidence "${evidenceId}" does not belong to this investigation.`);
    }

    const entry: ManifestEvidenceEntry = {
      id: evd.id,
      title: evd.title,
      type: evd.type,
      source_type: evd.source?.source_type ?? "OTHER",
      captured_at: evd.source?.captured_at ?? "",
      source_url: evd.source?.source_url,
      file: evd.file,
    };
    evidenceEntries.push(entry);

    if (evd.file?.path) {
      const file = await readAttachment(dir, evd.file.path);
      const computedSha = await hashFileSha256(file);
      if (computedSha !== evd.file.sha256) {
        throw new Error(`Attachment hash mismatch for ${evd.id}. Expected ${evd.file.sha256}, got ${computedSha}.`);
      }
      const buffer = await file.arrayBuffer();
      const blob = new Blob([buffer]);
      zip.file(evd.file.path, blob, { binary: true });
      files.push({
        path: evd.file.path,
        sha256: evd.file.sha256,
        size_bytes: evd.file.size_bytes,
        mime: evd.file.mime,
        kind: "ATTACHMENT",
        evidence_id: evd.id,
      });
      attachmentCount++;
    } else {
      files.push({
        path: `evidence/${evd.id}.meta`,
        kind: "OTHER",
        evidence_id: evd.id,
        notes: "no_file",
      });
    }
  }

  evidenceEntries.sort((a, b) => a.id.localeCompare(b.id));
  files.sort((a, b) => a.path.localeCompare(b.path));
  files.push({ path: "manifest.json", kind: "MANIFEST" });

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
      kind: "EXHIBITS",
      inv_id: invId,
      evidence_ids: evidenceIds,
    },
    files,
    evidence: evidenceEntries,
  };

  const manifestStr = stringifyManifest(manifest);
  zipAddText(zip, "manifest.json", manifestStr);

  const evidenceIndex = {
    evidence: evidenceEntries,
    generated_at: now,
  };
  zipAddText(zip, "evidence_index.json", JSON.stringify(evidenceIndex, null, 2));

  const blob = await zipFinalize(zip);
  const sha256 = await hashBlobSha256(blob);

  await appendAudit(dir, {
    at: now,
    action: "EXPORT_EXHIBITS_ZIP",
    details: {
      evidenceCount: evidenceIds.length,
      attachmentCount,
    },
  });
  await appendCustody(dir, {
    at: now,
    action: "EXPORT_EXHIBITS_ZIP",
    artifact: "download:exhibits.zip",
    sha256,
    details: { evidenceCount: evidenceIds.length, attachmentCount },
  });

  return { blob, manifest, sha256 };
}
