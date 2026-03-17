/**
 * UI label registry — display labels and dropdown options.
 * Source of truth: config/taxonomy.ts. Storage keys unchanged; UI shows full written labels only.
 */

import type { IdentifierStorageType } from "@/config/taxonomy";
import { TAXONOMY } from "@/config/taxonomy";

// Re-export taxonomy options for UI (exact names from spec)
export const ENTITY_TYPE_OPTIONS = TAXONOMY.entityTypes;
export const CONFIDENCE_OPTIONS = TAXONOMY.confidence;
export const EVIDENCE_TYPE_OPTIONS = TAXONOMY.evidenceTypes;
export const EVIDENCE_SOURCE_TYPE_OPTIONS = TAXONOMY.evidenceSourceTypes;
export const LINK_TYPE_OPTIONS = TAXONOMY.linkTypes;
export const LINK_SOURCE_OPTIONS = TAXONOMY.linkSources;
export const EVENT_TYPE_OPTIONS = TAXONOMY.eventTypes;
export const RISK_FLAG_OPTIONS = TAXONOMY.riskFlags;
export const IDENTIFIER_FACETS = TAXONOMY.identifierFacets;

// Canonical identifier types (schema); everything else is CUSTOM:SLUG
const CANONICAL_IDENTIFIER_LABELS: Record<string, string> = {
  ALIAS: "Alias",
  DOMAIN: "Domain",
  IP: "IP Address",
  EMAIL: "Email",
  WALLET: "Wallet",
  HANDLE: "Handle",
  ASN: "ASN",
};

/**
 * Deterministic slug from a display label (e.g. "Phone Number" -> PHONE_NUMBER).
 */
export function toCustomSlug(label: string): string {
  const slug = label
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toUpperCase();
  return slug || "CUSTOM";
}

/**
 * Storage type for an identifier: canonical if label matches a known type, else CUSTOM:SLUG.
 */
export function identifierStorageType(label: string): IdentifierStorageType {
  const normalized = label.trim();
  const upper = normalized.toUpperCase().replace(/\s+/g, "_");
  for (const [key, displayLabel] of Object.entries(CANONICAL_IDENTIFIER_LABELS)) {
    if (displayLabel.toLowerCase() === normalized.toLowerCase()) return key as IdentifierStorageType;
    if (key === upper) return key as IdentifierStorageType;
  }
  // Check taxonomy options (canonical + CUSTOM) for exact label match
  for (const group of TAXONOMY.identifierFacets) {
    for (const opt of group.options) {
      if (opt.label.toLowerCase() === normalized.toLowerCase()) return opt.storageType;
    }
  }
  return `CUSTOM:${toCustomSlug(normalized)}` as IdentifierStorageType;
}

/**
 * Display label for a storage type. Never show CUSTOM:SLUG raw; convert slug to Title Case.
 */
export function displayIdentifierType(storageType: string): string {
  if (storageType.startsWith("CUSTOM:")) {
    const slug = storageType.slice(7);
    return slug
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return CANONICAL_IDENTIFIER_LABELS[storageType] ?? storageType;
}

/**
 * Humanize a key (snake_case, kebab-case, UPPER) to Title Case.
 * Prefer explicit mappings from taxonomy where available.
 */
export function humanizeKey(key: string): string {
  const k = key.trim();
  if (!k) return "";

  // Risk flags: use taxonomy label
  const risk = TAXONOMY.riskFlags.find((r) => r.key === k || r.key === k.replace(/_/g, "-"));
  if (risk) return risk.label;

  // Entity types
  const entity = TAXONOMY.entityTypes.find((e) => e.key === k);
  if (entity) return entity.label;

  // Link types
  const link = TAXONOMY.linkTypes.find((l) => l.key === k);
  if (link) return link.label;

  // Link sources
  const src = TAXONOMY.linkSources.find((s) => s.key === k);
  if (src) return src.label;

  // Confidence
  const conf = TAXONOMY.confidence.find((c) => c.key === k);
  if (conf) return conf.label;

  // Event types
  const evt = TAXONOMY.eventTypes.find((e) => e.key === k);
  if (evt) return evt.label;

  // Evidence types
  const ev = TAXONOMY.evidenceTypes.find((e) => e.key === k);
  if (ev) return ev.label;

  // Fallback: split on _ or - and title-case
  const words = k.replace(/-/g, "_").split("_").filter(Boolean);
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Get entity type display label from stored key (e.g. PERSON -> Person). */
export function displayEntityType(key: string): string {
  const opt = TAXONOMY.entityTypes.find((e) => e.key === key);
  return opt?.label ?? humanizeKey(key);
}

/** Get risk flag display label from tag_key. */
export function displayRiskFlag(key: string): string {
  const opt = TAXONOMY.riskFlags.find((r) => r.key === key);
  return opt?.label ?? humanizeKey(key);
}

/** Get link type display label from stored key. */
export function displayLinkType(key: string): string {
  if (key.startsWith("CUSTOM:")) {
    const slug = key.slice(7);
    return slug.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
  }
  const opt = TAXONOMY.linkTypes.find((l) => l.key === key);
  return opt?.label ?? humanizeKey(key);
}

/** Get link source display label. */
export function displayLinkSource(key: string): string {
  const opt = TAXONOMY.linkSources.find((s) => s.key === key);
  return opt?.label ?? humanizeKey(key);
}

/** Get confidence bucket display label. */
export function displayConfidence(key: string): string {
  const opt = TAXONOMY.confidence.find((c) => c.key === key);
  return opt?.label ?? humanizeKey(key);
}

/** Get evidence type display label; constrain UI to Document/Image for selection. */
export function displayEvidenceType(key: string): string {
  const opt = TAXONOMY.evidenceTypes.find((e) => e.key === key);
  if (opt) return opt.label;
  return humanizeKey(key);
}

/** Get evidence source type display label (e.g. SEC -> SEC Filing). */
export function displayEvidenceSourceType(key: string): string {
  const opt = TAXONOMY.evidenceSourceTypes.find((e) => e.key === key);
  if (opt) return opt.label;
  return humanizeKey(key);
}

/** Get event type display label (e.g. INTELLIGENCE_RELEVANT -> Intelligence Relevant). */
export function displayEventType(key: string): string {
  const opt = TAXONOMY.eventTypes.find((e) => e.key === key);
  return opt?.label ?? humanizeKey(key);
}
