/**
 * ID and time utilities for Analyst case files.
 * All timestamps in ISO8601 UTC.
 */

/**
 * Generate a new stable ID with optional prefix.
 * Format: PREFIX_<timestamp>_<random hex>
 */
export function newId(prefix: string): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(16).slice(2, 10);
  return `${prefix}_${t}_${r}`;
}

/**
 * Current time in UTC ISO-8601 (with Z).
 */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * Today's date in UTC YYYY-MM-DD.
 */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
