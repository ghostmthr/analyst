/**
 * ZIP utility layer for client-side export.
 * Uses JSZip; must work in Next client (no Node-only APIs).
 */

import JSZip from "jszip";

export type ZipInstance = JSZip;

/**
 * Create a new ZIP instance.
 */
export function makeZip(): JSZip {
  return new JSZip();
}

/**
 * Add a text file to the ZIP.
 * Paths should be deterministic and safe (no leading slashes, no ..).
 */
export function zipAddText(zip: JSZip, path: string, text: string): void {
  const safe = sanitizePath(path);
  zip.file(safe, text, { binary: false });
}

/**
 * Add a Blob/File to the ZIP.
 */
export function zipAddBlob(zip: JSZip, path: string, blob: Blob): void {
  const safe = sanitizePath(path);
  zip.file(safe, blob, { binary: true });
}

/**
 * Finalize ZIP and return Blob.
 */
export async function zipFinalize(zip: JSZip): Promise<Blob> {
  return zip.generateAsync({ type: "blob" });
}

/**
 * Trigger browser download of a Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Load a ZIP from a File (for import).
 */
export async function loadZipFromFile(file: File): Promise<JSZip> {
  return JSZip.loadAsync(file);
}

/**
 * Sanitize path: remove leading slash, collapse //, reject ..
 */
export function sanitizePath(p: string): string {
  let s = p.replace(/^\/+/, "").replace(/\/+/g, "/");
  if (s.includes("..")) {
    throw new Error(`Invalid path: ${p}`);
  }
  return s;
}
