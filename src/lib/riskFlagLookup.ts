/**
 * Risk flag lookup and custom tag helpers.
 * Storage: tag_key or custom:<kebab-case>. Display: full label only.
 */

import { RISK_FLAGS } from "./riskFlags";

export function getRiskFlagLabel(key: string): string {
  if (key.startsWith("custom:")) return labelFromCustomKey(key);
  const flag = RISK_FLAGS.find((f) => f.key.toLowerCase() === key.toLowerCase());
  return flag?.label ?? titleCaseKey(key);
}

export function getRiskFlagCategory(key: string): string | null {
  if (key.startsWith("custom:")) return null;
  const flag = RISK_FLAGS.find((f) => f.key.toLowerCase() === key.toLowerCase());
  return flag?.category ?? null;
}

export function matchesRiskFlag(query: string, flag: (typeof RISK_FLAGS)[number]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    flag.label.toLowerCase().includes(q) ||
    flag.key.toLowerCase().includes(q)
  );
}

/**
 * Convert input to kebab-case (strip punctuation, collapse whitespace).
 */
export function kebabCase(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").toLowerCase())
    .filter(Boolean)
    .join("-") || "tag";
}

export function customKeyFromLabel(label: string): string {
  return "custom:" + kebabCase(label);
}

/**
 * "custom:foo-bar" => "Foo Bar"
 */
export function labelFromCustomKey(key: string): string {
  if (!key.startsWith("custom:")) return key;
  const rest = key.slice(7).trim();
  if (!rest) return "Custom";
  return rest
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function titleCaseKey(key: string): string {
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
