/**
 * Canonical JSON serialization for deterministic state and patch chaining.
 * state_id = SHA-256(canonicalStringify(case.json))
 */

/**
 * Recursively sort object keys and return deterministic JSON string.
 * Arrays preserve order; object keys are sorted alphabetically.
 * Undefined values are omitted from objects (like JSON.stringify) and emitted as null in arrays so output is valid JSON.
 */
export function canonicalStringify(obj: unknown): string {
  if (obj === undefined) {
    return "null";
  }
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    const items = obj.map((item) => canonicalStringify(item));
    return "[" + items.join(",") + "]";
  }
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys
    .map((key) => {
      const value = (obj as Record<string, unknown>)[key];
      if (value === undefined) return null;
      return JSON.stringify(key) + ":" + canonicalStringify(value);
    })
    .filter((p): p is string => p !== null);
  return "{" + pairs.join(",") + "}";
}

/**
 * Compute state ID as SHA-256 of canonical case JSON.
 * Used for patch chaining and integrity.
 */
export async function computeStateId(caseJson: unknown): Promise<string> {
  const canonical = canonicalStringify(caseJson);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
