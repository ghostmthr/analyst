/**
 * Patch ZIP reader — parse patch.json + manifest from browser File.
 * No writes; validation happens in validatePatch.
 */

import type { ExportManifest } from "@/lib/export/manifest";
import { loadZipFromFile } from "@/lib/export/zip";

import type { PatchFile } from "./types";

export interface ZipIndex {
  paths: string[];
  getText(path: string): Promise<string>;
  getBlob(path: string): Promise<Blob>;
}

function sanitize(p: string): string {
  const s = p.replace(/^\/+/, "").replace(/\/+/g, "/").trim();
  if (s.includes("..") || s.startsWith("/")) {
    throw new Error(`Invalid path in ZIP: ${p}`);
  }
  return s;
}

export interface ReadPatchZipResult {
  patch: PatchFile;
  manifest?: ExportManifest;
  files: ZipIndex;
  /** Raw patch.json text for manifest sha256 verification */
  rawPatchJson: string;
}

/**
 * Read a Patch ZIP file. Returns patch, optional manifest, and file index.
 * Validates patch.json exists; does not verify hashes (that's validatePatch).
 */
export async function readPatchZip(file: File): Promise<ReadPatchZipResult> {
  const zip = await loadZipFromFile(file);
  const paths: string[] = [];
  zip.forEach((relPath) => {
    const safe = sanitize(relPath);
    if (safe) paths.push(safe);
  });

  const getText = async (path: string): Promise<string> => {
    const safe = sanitize(path);
    const entry = zip.file(safe);
    if (!entry) throw new Error(`ZIP entry not found: ${path}`);
    return entry.async("string");
  };

  const getBlob = async (path: string): Promise<Blob> => {
    const safe = sanitize(path);
    const entry = zip.file(safe);
    if (!entry) throw new Error(`ZIP entry not found: ${path}`);
    return entry.async("blob");
  };

  const patchText = await getText("patch.json");
  const patch = JSON.parse(patchText) as PatchFile;

  if (!patch || !Array.isArray(patch.ops)) {
    throw new Error("Invalid patch.json: missing ops array.");
  }

  // Normalize legacy format to spec format
  if (!patch.generated_at && patch.created_at) {
    patch.generated_at = patch.created_at;
  }
  if (!patch.patch_version && patch.version) {
    patch.patch_version = patch.version;
  }
  if (!patch.patch_id) {
    patch.patch_id = `PATCH_${patch.generated_at ?? patch.created_at ?? "unknown"}`;
  }

  let manifest: ExportManifest | undefined;
  if (paths.includes("manifest.json")) {
    try {
      const manifestText = await getText("manifest.json");
      manifest = JSON.parse(manifestText) as ExportManifest;
    } catch {
      // manifest optional
    }
  }

  return {
    patch,
    manifest,
    files: { paths, getText, getBlob },
    rawPatchJson: patchText,
  };
}
