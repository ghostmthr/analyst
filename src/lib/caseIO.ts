/**
 * Case folder IO — File System Access API.
 * Canonical storage only; no browser persistence.
 */

import type { AuditEntry } from "@/lib/audit";
import type { CustodyEntry } from "@/lib/audit";
import { formatAuditLine, formatCustodyLine } from "@/lib/audit";
import { canonicalStringify } from "@/lib/canonical";
import { hashBlobSha256,hashFileSha256 } from "@/lib/evidence";
import { newId, nowUtc } from "@/lib/ids";
import type {
  CaseFile,
  Evidence,
  EvidenceSourceType,
  EvidenceType,
  Investigation,
} from "@/types";

const CASE_JSON = "case.json";
const AUDIT_LOG = "audit.log";
const CUSTODY_LOG = "custody.log";
const EXPECTED_SCHEMA_VERSION = "2.0.0";

/**
 * Fix invalid JSON written by older code that serialized undefined as the literal "undefined".
 * Replaces token `undefined` with `null` only when it appears as a JSON value (not inside a string).
 */
function sanitizeUndefinedInJson(text: string): string {
  let out = "";
  let i = 0;
  let inString = false;
  let escape = false;
  const UNDEF = "undefined";
  const isValueBoundary = (j: number) => {
    const c = text[j];
    return j >= text.length || c === "," || c === "}" || c === "]" || c === "\n" || c === "\r" || c === " " || c === "\t";
  };
  while (i < text.length) {
    if (escape) {
      out += text[i];
      escape = false;
      i++;
      continue;
    }
    if (inString) {
      if (text[i] === "\\") {
        out += text[i];
        escape = true;
        i++;
        continue;
      }
      if (text[i] === '"') {
        inString = false;
        out += text[i];
        i++;
        continue;
      }
      out += text[i];
      i++;
      continue;
    }
    if (text[i] === '"') {
      inString = true;
      out += text[i];
      i++;
      continue;
    }
    if (text.substring(i, i + UNDEF.length) === UNDEF && isValueBoundary(i + UNDEF.length)) {
      const before = text[i - 1];
      if (before === ":" || before === "," || before === "[") {
        out += "null";
        i += UNDEF.length;
        continue;
      }
    }
    out += text[i];
    i++;
  }
  return out;
}

/**
 * Open case folder via File System Access API.
 */
export async function openCaseFolder(): Promise<FileSystemDirectoryHandle> {
  if (typeof window === "undefined" || !window.showDirectoryPicker) {
    throw new Error("File System Access API is not available (e.g. not in a secure context).");
  }
  return window.showDirectoryPicker();
}

/**
 * Read and parse case.json from directory.
 * Sanitizes legacy files that contain literal "undefined" (invalid JSON) by replacing with null.
 */
export async function readCaseJson(
  dir: FileSystemDirectoryHandle
): Promise<CaseFile> {
  const handle = await dir.getFileHandle(CASE_JSON);
  const file = await handle.getFile();
  let text = await file.text();
  text = sanitizeUndefinedInJson(text);
  const data = JSON.parse(text) as CaseFile;
  if (data.schema_version !== EXPECTED_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schema_version: ${data.schema_version}. Expected ${EXPECTED_SCHEMA_VERSION}.`
    );
  }
  return data;
}

/**
 * Read a text file from directory by relative path.
 * Returns empty string if file does not exist.
 */
export async function readTextFileIfExists(
  dir: FileSystemDirectoryHandle,
  relativePath: string
): Promise<string> {
  try {
    const parts = relativePath.split("/");
    let current: FileSystemDirectoryHandle | FileSystemFileHandle = dir;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      if (!name) continue;
      if (i === parts.length - 1) {
        const fileHandle = await (current as FileSystemDirectoryHandle).getFileHandle(name);
        const file = await fileHandle.getFile();
        return file.text();
      }
      current = await (current as FileSystemDirectoryHandle).getDirectoryHandle(name);
    }
    return "";
  } catch (e) {
    if (e instanceof DOMException && e.name === "NotFoundError") return "";
    throw e;
  }
}

/**
 * Write case.json atomically (overwrite).
 * Uses canonical stringify for deterministic output.
 */
export async function writeCaseJson(
  dir: FileSystemDirectoryHandle,
  data: CaseFile
): Promise<void> {
  const handle = await dir.getFileHandle(CASE_JSON, { create: true });
  const writable = await handle.createWritable();
  await writable.write(canonicalStringify(data));
  await writable.close();
}

/**
 * Ensure required files and directories exist; create if missing.
 * Creates: audit.log, custody.log, attachments/, patches/
 */
export async function ensureCaseFiles(
  dir: FileSystemDirectoryHandle
): Promise<void> {
  await dir.getFileHandle(AUDIT_LOG, { create: true });
  await dir.getFileHandle(CUSTODY_LOG, { create: true });
  await dir.getDirectoryHandle("attachments", { create: true });
  await dir.getDirectoryHandle("patches", { create: true });
}

/**
 * Minimal empty case for initializing a new case folder.
 */
export function createEmptyCase(caseTitle: string, caseId?: string): CaseFile {
  const now = nowUtc();
  const id = caseId ?? newId("CASE");
  return {
    schema_version: "2.0.0",
    system_version: "analyst-0.2.0",
    case: {
      id,
      title: caseTitle,
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    },
    investigations: [],
    entities: [],
    identifiers: [],
    evidence: [],
    claims: [],
    relationships: [],
    events: [],
    analysis: {
      hypothesis_groups: [],
      hypotheses: [],
      diagnostic_claims: [],
      ach_matrices: [],
      assessments: [],
    },
  };
}

/**
 * Initialize a new case in the folder: write case.json and ensure files.
 * Use when folder has no case.json.
 */
export async function initNewCase(
  dir: FileSystemDirectoryHandle,
  caseTitle: string
): Promise<CaseFile> {
  await ensureCaseFiles(dir);
  const empty = createEmptyCase(caseTitle);
  await writeCaseJson(dir, empty);
  return empty;
}

/**
 * Load case: read case.json and ensure required files exist.
 * Throws if case.json is missing (use initNewCase for new folders).
 */
export async function loadCase(
  dir: FileSystemDirectoryHandle
): Promise<CaseFile> {
  const data = await readCaseJson(dir);
  await ensureCaseFiles(dir);
  const now = nowUtc();
  const investigations = (data.investigations ?? []).map((inv) => ({
    ...inv,
    created_at: inv.created_at ?? inv.updated_at ?? now,
    updated_at: inv.updated_at ?? inv.created_at ?? now,
  }));
  const events = (data.events ?? []).map((e) => ({
    ...e,
    created_at: e.created_at ?? e.updated_at ?? now,
    updated_at: e.updated_at ?? e.created_at ?? now,
  }));
  const analysis = data.analysis ?? {};
  const diagnostic_claims = (analysis.diagnostic_claims ?? []).map((d) => ({
    ...d,
    created_at: d.created_at ?? d.updated_at ?? now,
    updated_at: d.updated_at ?? d.created_at ?? now,
  }));
  return {
    ...data,
    investigations,
    events,
    analysis: { ...analysis, diagnostic_claims },
  };
}

/**
 * Save case: update case.updated_at, write case.json, optionally append audit.
 */
export async function saveCase(
  dir: FileSystemDirectoryHandle,
  next: CaseFile,
  auditEntry?: AuditEntry
): Promise<void> {
  const updated: CaseFile = {
    ...next,
    case: {
      ...next.case,
      updated_at: nowUtc(),
    },
  };
  await writeCaseJson(dir, updated);
  if (auditEntry) {
    await appendAudit(dir, auditEntry);
  }
}

/**
 * Append a line to audit.log.
 */
export async function appendAudit(
  dir: FileSystemDirectoryHandle,
  entry: AuditEntry
): Promise<void> {
  const handle = await dir.getFileHandle(AUDIT_LOG, { create: true });
  const file = await handle.getFile();
  const existing = await file.text();
  const writable = await handle.createWritable({ keepExistingData: true });
  await writable.seek(existing.length);
  await writable.write(formatAuditLine(entry));
  await writable.close();
}

/**
 * Append a line to custody.log.
 */
export async function appendCustody(
  dir: FileSystemDirectoryHandle,
  entry: CustodyEntry
): Promise<void> {
  const handle = await dir.getFileHandle(CUSTODY_LOG, { create: true });
  const file = await handle.getFile();
  const existing = await file.text();
  const writable = await handle.createWritable({ keepExistingData: true });
  await writable.seek(existing.length);
  await writable.write(formatCustodyLine(entry));
  await writable.close();
}

/**
 * Get file extension from name (e.g. "doc.pdf" -> "pdf"). Default "bin".
 */
function getFileExtension(fileName: string): string {
  const last = fileName.split(".").pop();
  return last && last.length > 0 && last.length < 10 ? last : "bin";
}

/**
 * Store attachment from Blob (e.g. from patch ZIP).
 * Verifies sha256 matches; does not overwrite existing.
 * Returns path if stored, or existing path if already present.
 */
export async function storeAttachmentFromBlob(
  dir: FileSystemDirectoryHandle,
  blob: Blob,
  expectedSha256: string,
  ext = "bin"
): Promise<{ path: string; size_bytes: number }> {
  const computed = await hashBlobSha256(blob);
  if (computed !== expectedSha256) {
    throw new Error(`Attachment sha256 mismatch: expected ${expectedSha256}, got ${computed}`);
  }
  const a = expectedSha256.slice(0, 2);
  const b = expectedSha256.slice(2, 4);
  const attachments = await dir.getDirectoryHandle("attachments", { create: true });
  const sha256Dir = await attachments.getDirectoryHandle("sha256", { create: true });
  const aaDir = await sha256Dir.getDirectoryHandle(a, { create: true });
  const bbDir = await aaDir.getDirectoryHandle(b, { create: true });
  const fileName = `${expectedSha256}.${ext}`;
  const path = `attachments/sha256/${a}/${b}/${fileName}`;
  try {
    const handle = await bbDir.getFileHandle(fileName);
    const file = await handle.getFile();
    if (file.size > 0) return { path, size_bytes: file.size };
  } catch {
    // File doesn't exist, create it
  }
  const handle = await bbDir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  await writable.write(await blob.arrayBuffer());
  await writable.close();
  return { path, size_bytes: blob.size };
}

/**
 * Store attachment at content-addressed path: attachments/sha256/aa/bb/<sha256>.<ext>
 */
export async function storeAttachment(
  dir: FileSystemDirectoryHandle,
  file: File,
  sha256: string
): Promise<{ path: string; size_bytes: number; mime: string }> {
  const ext = getFileExtension(file.name);
  const a = sha256.slice(0, 2);
  const b = sha256.slice(2, 4);
  const attachments = await dir.getDirectoryHandle("attachments", {
    create: true,
  });
  const sha256Dir = await attachments.getDirectoryHandle("sha256", {
    create: true,
  });
  const aaDir = await sha256Dir.getDirectoryHandle(a, { create: true });
  const bbDir = await aaDir.getDirectoryHandle(b, { create: true });
  const fileName = `${sha256}.${ext}`;
  const handle = await bbDir.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable();
  const buffer = await file.arrayBuffer();
  await writable.write(buffer);
  await writable.close();
  const path = `attachments/sha256/${a}/${b}/${fileName}`;
  const mime = file.type || "application/octet-stream";
  return { path, size_bytes: file.size, mime };
}

export interface IngestEvidenceParams {
  investigation_id: string;
  type: EvidenceType;
  title: string;
  description?: string;
  source_url?: string;
  source_type: EvidenceSourceType;
  captured_at: string;
  published_at?: string | null;
  collected_by?: string;
  method?: "download" | "screenshot" | "archive" | "manual";
  file: File;
  reliability?: {
    source_quality?: number;
    credibility?: number;
    notes?: string;
  };
  analyst_note?: string;
  tags?: string[];
}

/**
 * Ingest evidence: hash file, store attachment, create Evidence record,
 * save case, append audit + custody. Returns updated case and evidence id.
 */
export async function ingestEvidence(
  dir: FileSystemDirectoryHandle,
  caseFile: CaseFile,
  params: IngestEvidenceParams
): Promise<{ next: CaseFile; evidenceId: string }> {
  const sha256 = await hashFileSha256(params.file);
  const stored = await storeAttachment(dir, params.file, sha256);
  const now = nowUtc();
  const evidenceId = newId("EVD");
  const evd: Evidence = {
    id: evidenceId,
    investigation_id: params.investigation_id,
    type: params.type,
    title: params.title,
    description: params.description,
    source: {
      source_url: params.source_url,
      source_type: params.source_type,
      captured_at: params.captured_at,
      published_at: params.published_at ?? null,
      collected_by: params.collected_by,
      method: params.method,
    },
    file: {
      path: stored.path,
      sha256,
      size_bytes: stored.size_bytes,
      mime: stored.mime,
    },
    reliability: params.reliability,
    analyst_note: params.analyst_note,
    tags: params.tags,
    created_at: now,
    updated_at: now,
  };
  const next: CaseFile = {
    ...caseFile,
    case: { ...caseFile.case, updated_at: now },
    evidence: [...caseFile.evidence, evd],
  };
  await writeCaseJson(dir, next);
  await appendAudit(dir, {
    at: now,
    action: "CREATE_EVIDENCE",
    object_type: "evidence",
    object_id: evidenceId,
    details: { title: evd.title, sha256, path: stored.path },
  });
  await appendCustody(dir, {
    at: now,
    action: "EVIDENCE_INGEST",
    artifact: stored.path,
    sha256,
    details: { evidence_id: evidenceId, size_bytes: stored.size_bytes },
  });
  return { next, evidenceId };
}

/**
 * Read an attachment file from the case folder by relative path.
 */
export async function readAttachment(
  dir: FileSystemDirectoryHandle,
  relativePath: string
): Promise<File> {
  const parts = relativePath.split("/");
  let current: FileSystemDirectoryHandle | FileSystemFileHandle =
    dir as FileSystemDirectoryHandle;
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    if (!name) continue;
    if (i === parts.length - 1) {
      const fileHandle = await (current as FileSystemDirectoryHandle).getFileHandle(
        name
      );
      const file = await fileHandle.getFile();
      return file;
    }
    current = await (current as FileSystemDirectoryHandle).getDirectoryHandle(
      name
    );
  }
  throw new Error(`Invalid path: ${relativePath}`);
}

/**
 * Verify evidence file hash: read file from attachments, recompute SHA-256,
 * compare to stored. Appends audit VERIFY_EVIDENCE_HASH.
 */
export async function verifyEvidenceHash(
  dir: FileSystemDirectoryHandle,
  caseFile: CaseFile,
  evidenceId: string
): Promise<{ match: boolean }> {
  const evd = caseFile.evidence.find((e) => e.id === evidenceId);
  if (!evd?.file?.path) {
    return { match: false };
  }
  const file = await readAttachment(dir, evd.file.path);
  const computed = await hashFileSha256(file);
  const match = computed === evd.file.sha256;
  const now = nowUtc();
  await appendAudit(dir, {
    at: now,
    action: "VERIFY_EVIDENCE_HASH",
    object_type: "evidence",
    object_id: evidenceId,
    details: { match, computed_sha256: computed, stored_sha256: evd.file.sha256 },
  });
  return { match };
}

/**
 * Create a new investigation and return updated case file.
 * Caller must saveCase(dir, next) and appendAudit(dir, entry).
 */
export function createInvestigation(
  caseFile: CaseFile,
  params: { title: string; description?: string; lead?: string }
): { next: CaseFile; auditEntry: AuditEntry } {
  const now = nowUtc();
  const inv: Investigation = {
    id: newId("INV"),
    title: params.title,
    description: params.description,
    status: "ACTIVE",
    lead: params.lead,
    created_at: now,
    updated_at: now,
    entity_ids: [],
    hypothesis_group_ids: [],
  };
  const next: CaseFile = {
    ...caseFile,
    investigations: [...caseFile.investigations, inv],
  };
  const auditEntry: AuditEntry = {
    at: now,
    action: "CREATE_INVESTIGATION",
    object_type: "investigation",
    object_id: inv.id,
    details: { title: inv.title },
  };
  return { next, auditEntry };
}
