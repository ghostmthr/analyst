/**
 * Export manifest format — shared across Baseline, Exhibits, Patch ZIPs.
 */

import { canonicalStringify } from "@/lib/canonical";
import type { ISODateTime } from "@/types";

export type ExportScopeKind = "BASELINE" | "EXHIBITS" | "PATCH";

export type ManifestFileKind =
  | "CASE_JSON"
  | "AUDIT_LOG"
  | "CUSTODY_LOG"
  | "ATTACHMENT"
  | "MANIFEST"
  | "PATCH_JSON"
  | "OTHER";

export interface ManifestFileEntry {
  path: string;
  sha256?: string;
  size_bytes?: number;
  mime?: string;
  kind: ManifestFileKind;
  evidence_id?: string;
  notes?: string;
}

export interface ManifestEvidenceEntry {
  id: string;
  title: string;
  type: string;
  source_type: string;
  captured_at: string;
  source_url?: string;
  file?: {
    path: string;
    sha256: string;
    size_bytes: number;
    mime: string;
  };
}

export interface ExportManifest {
  manifest_version: "1.0.0";
  generated_at: ISODateTime;
  exporter: { system_version: string };
  case: { id: string; title: string; schema_version: string };
  scope: {
    kind: ExportScopeKind;
    inv_id?: string;
    evidence_ids?: string[];
  };
  files: ManifestFileEntry[];
  evidence: ManifestEvidenceEntry[];
  checks?: {
    case_state_id?: string;
  };
}

/**
 * Serialize manifest for deterministic inclusion in ZIP.
 */
export function stringifyManifest(manifest: ExportManifest): string {
  return canonicalStringify(manifest);
}
