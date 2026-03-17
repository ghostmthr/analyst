/**
 * Audit and custody log entry types and formatting.
 * Actual append is done in caseIO (needs File System Access).
 */

export interface AuditEntry {
  at: string;
  actor?: string;
  action: string;
  object_type?: string;
  object_id?: string;
  details?: Record<string, unknown>;
}

export interface CustodyEntry {
  at: string;
  actor?: string;
  action: string;
  artifact?: string;
  sha256?: string;
  details?: Record<string, unknown>;
}

/**
 * Format audit entry as a single line for append to audit.log.
 */
export function formatAuditLine(entry: AuditEntry): string {
  const parts = [
    entry.at,
    entry.action,
    entry.actor ?? "",
    entry.object_type ?? "",
    entry.object_id ?? "",
    entry.details ? JSON.stringify(entry.details) : "",
  ];
  return parts.join("\t") + "\n";
}

/**
 * Format custody entry as a single line for append to custody.log.
 */
export function formatCustodyLine(entry: CustodyEntry): string {
  const parts = [
    entry.at,
    entry.action,
    entry.actor ?? "",
    entry.artifact ?? "",
    entry.sha256 ?? "",
    entry.details ? JSON.stringify(entry.details) : "",
  ];
  return parts.join("\t") + "\n";
}
