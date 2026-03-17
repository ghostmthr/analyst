/**
 * Smoke test: Patch apply engine (pure functions).
 * Run: npm run smoke:patch
 * - UPSERT_ENTITY -> entity exists after apply
 * - Apply same patch twice -> idempotent (no net change)
 */

import type { CaseFile } from "../../types";
import { applyPatch } from "../patch/applyPatch";
import type { PatchFile } from "../patch/types";
import { validatePatch } from "../patch/validatePatch";

const NOW = "2025-01-15T12:00:00.000Z";
const INV_ID = "INV_1";

function minimalCase(): CaseFile {
  return {
    schema_version: "2.0.0",
    system_version: "0.2.0",
    case: {
      id: "CASE_1",
      title: "Smoke case",
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
        entity_ids: [],
        hypothesis_group_ids: [],
      },
    ],
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

function patchWithUpsertEntity(): PatchFile {
  const entityId = "ENT_smoke_1";
  return {
    patch_version: "1.0.0",
    patch_id: "PATCH_smoke",
    generated_at: NOW,
    description: "Smoke test patch",
    ops: [
      {
        op: "UPSERT_ENTITY",
        object: {
          id: entityId,
          investigation_id: INV_ID,
          type: "PERSON",
          name: "Smoke Entity",
          created_at: NOW,
          updated_at: NOW,
        },
      },
    ],
  };
}

async function main() {
  const caseFile = minimalCase();
  const patch = patchWithUpsertEntity();

  // 1) Validate
  const validation = await validatePatch(patch, undefined, caseFile);
  if (!validation.ok) {
    throw new Error(`Validation failed: ${validation.errors.join("; ")}`);
  }
  console.log("OK validation: patch passes");

  // 2) Apply -> entity exists
  const result1 = applyPatch(caseFile, patch);
  if (result1.errors.length > 0) {
    throw new Error(`Apply failed: ${result1.errors.join("; ")}`);
  }
  const entity = result1.next.entities.find((e) => e.id === "ENT_smoke_1");
  if (!entity || entity.name !== "Smoke Entity") {
    throw new Error("Expected ENT_smoke_1 to exist after apply.");
  }
  if (!result1.next.investigations[0].entity_ids.includes("ENT_smoke_1")) {
    throw new Error("Expected investigation.entity_ids to include ENT_smoke_1.");
  }
  console.log("OK apply: UPSERT_ENTITY created entity");

  // 3) Idempotent: apply same patch again -> no net change
  const result2 = applyPatch(result1.next, patch);
  if (result2.errors.length > 0) {
    throw new Error(`Second apply failed: ${result2.errors.join("; ")}`);
  }
  const entityCount = result2.next.entities.filter((e) => e.id === "ENT_smoke_1").length;
  if (entityCount !== 1) {
    throw new Error(`Expected exactly 1 ENT_smoke_1, got ${entityCount}`);
  }
  console.log("OK idempotency: same patch twice -> no net change");

  console.log("All patch smoke checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
