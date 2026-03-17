/**
 * Smoke test: Integrity scanner determinism and known refs.
 * Run: npm run smoke:integrity
 * - Build minimal case with known dangling refs
 * - Assert scan returns deterministic sorted output and expected error/warning counts
 */

import type { CaseFile } from "../../types";
import { scanCaseIntegrity } from "../integrity/scanIntegrity";

const NOW = "2025-01-15T12:00:00.000Z";
const INV_ID = "INV_1";

function caseWithDanglingRefs(): CaseFile {
  return {
    schema_version: "2.0.0",
    system_version: "0.2.0",
    case: {
      id: "CASE_1",
      title: "Smoke",
      status: "ACTIVE",
      created_at: NOW,
      updated_at: NOW,
    },
    investigations: [
      {
        id: INV_ID,
        title: "Inv",
        status: "ACTIVE",
        created_at: NOW,
        updated_at: NOW,
        entity_ids: ["ENT_missing"], // dangling: entity not in entities[]
        hypothesis_group_ids: [],
      },
    ],
    entities: [
      {
        id: "ENT_1",
        investigation_id: INV_ID,
        type: "PERSON",
        name: "One",
        created_at: NOW,
        updated_at: NOW,
      },
      // ENT_1 not in inv.entity_ids -> ORPHAN_ENTITY warning
    ],
    identifiers: [],
    evidence: [],
    claims: [
      {
        id: "CLM_1",
        investigation_id: INV_ID,
        text: "Claim",
        evidence_ids: ["EVD_missing"], // dangling evidence
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    relationships: [
      {
        id: "REL_1",
        investigation_id: INV_ID,
        from_entity_id: "ENT_1",
        to_entity_id: "ENT_missing", // dangling entity
        type: "OWNS",
        source: "EVIDENCE",
        evidence_ids: [], // ERROR: source EVIDENCE but empty evidence_ids
        created_at: NOW,
        updated_at: NOW,
      },
    ],
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

async function main() {
  const caseFile = caseWithDanglingRefs();
  const result = await scanCaseIntegrity(caseFile, { invId: INV_ID });

  if (result.errors.length === 0) {
    throw new Error("Expected at least one error (e.g. MISSING_ENTITY, RELATIONSHIP_EVIDENCE_EMPTY).");
  }
  if (result.warnings.length === 0) {
    throw new Error("Expected at least one warning (e.g. ORPHAN_ENTITY, or MISSING_ENTITY for inv.entity_ids).");
  }

  const errorCodes = result.errors.map((e) => e.code);
  const warningCodes = result.warnings.map((w) => w.code);

  if (!errorCodes.includes("MISSING_ENTITY") && !errorCodes.includes("RELATIONSHIP_EVIDENCE_EMPTY")) {
    throw new Error("Expected errors to include MISSING_ENTITY or RELATIONSHIP_EVIDENCE_EMPTY.");
  }
  if (!warningCodes.includes("ORPHAN_ENTITY") && !errorCodes.some((c) => c === "MISSING_ENTITY")) {
    throw new Error("Expected ORPHAN_ENTITY warning or MISSING_ENTITY for inv.entity_ids.");
  }

  const sortedErrors = [...result.errors].sort((a, b) => {
    if (a.code !== b.code) return a.code.localeCompare(b.code);
    return (a.path ?? "").localeCompare(b.path ?? "");
  });
  const sameOrder =
    result.errors.length === sortedErrors.length &&
    result.errors.every((e, i) => e.code === sortedErrors[i].code && (e.path ?? "") === (sortedErrors[i].path ?? ""));
  if (!sameOrder) {
    throw new Error("Integrity scanner must return errors in deterministic sorted order.");
  }

  if (result.ok) {
    throw new Error("Expected ok: false when there are errors.");
  }
  if (result.stats.errors !== result.errors.length || result.stats.warnings !== result.warnings.length) {
    throw new Error("stats.errors / stats.warnings must match arrays length.");
  }

  console.log("OK integrity: deterministic output and expected error/warning counts");
  console.log("All integrity smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
