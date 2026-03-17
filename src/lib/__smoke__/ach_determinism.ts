/**
 * Smoke test: ACH compute determinism and persistence.
 * Run: npm run smoke:ach
 * - Run computeAch twice with same inputs → identical results (excluding computed_at).
 * - Write case to temp, read back → analysis.ach_matrices[0].computed exists.
 * - Compute with storeComputed: true → audit entry COMPUTE_ACH present.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import type { CaseFile } from "../../types";
import { computeAch } from "../ach";

const NOW = "2025-01-15T12:00:00.000Z";

function minimalCase(): CaseFile {
  const invId = "INV_1";
  const groupId = "HG_1";
  const hyp1 = "H1";
  const hyp2 = "H2";
  const dclm1 = "DC1";
  const dclm2 = "DC2";
  const achId = "ACH_1";

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
        id: invId,
        title: "Inv",
        status: "ACTIVE",
        created_at: NOW,
        updated_at: NOW,
        entity_ids: [],
        hypothesis_group_ids: [groupId],
      },
    ],
    entities: [],
    identifiers: [],
    evidence: [],
    claims: [],
    relationships: [],
    events: [],
    analysis: {
      hypothesis_groups: [
        {
          id: groupId,
          investigation_id: invId,
          name: "Group",
          question: "Q?",
          status: "ACTIVE",
          created_at: NOW,
          updated_at: NOW,
        },
      ],
      hypotheses: [
        {
          id: hyp1,
          hypothesis_group_id: groupId,
          label: "H1",
          statement: "Hypothesis 1",
          status: "ACTIVE",
          created_at: NOW,
          updated_at: NOW,
        },
        {
          id: hyp2,
          hypothesis_group_id: groupId,
          label: "H2",
          statement: "Hypothesis 2",
          status: "ACTIVE",
          created_at: NOW,
          updated_at: NOW,
        },
      ],
      diagnostic_claims: [
        {
          id: dclm1,
          hypothesis_group_id: groupId,
          text: "Claim 1",
          weights: { diagnosticity: 2, reliability: 0.8, credibility: 0.7 },
          confidence: { score: 0.6, bucket: "MODERATE" },
          created_at: NOW,
          updated_at: NOW,
        },
        {
          id: dclm2,
          hypothesis_group_id: groupId,
          text: "Claim 2",
          weights: { diagnosticity: 1, reliability: 0.9, credibility: 0.8 },
          confidence: { score: 0.6, bucket: "MODERATE" },
          created_at: NOW,
          updated_at: NOW,
        },
      ],
      ach_matrices: [
        {
          id: achId,
          hypothesis_group_id: groupId,
          hypothesis_ids: [hyp1, hyp2],
          diagnostic_claim_ids: [dclm1, dclm2],
          cells: [
            { diagnostic_claim_id: dclm1, hypothesis_id: hyp1, relation: "C" },
            { diagnostic_claim_id: dclm1, hypothesis_id: hyp2, relation: "I" },
            { diagnostic_claim_id: dclm2, hypothesis_id: hyp1, relation: "I" },
            { diagnostic_claim_id: dclm2, hypothesis_id: hyp2, relation: "C" },
          ],
        },
      ],
      assessments: [],
    },
  };
}

function computedWithoutTime(c: NonNullable<CaseFile["analysis"]["ach_matrices"][0]["computed"]>) {
  const { computed_at: _, ...rest } = c;
  return rest;
}

function main() {
  const caseFile = minimalCase();
  const achId = caseFile.analysis.ach_matrices[0].id;

  // 1) Determinism: run compute twice, compare results (excluding computed_at)
  const run1 = computeAch(caseFile, achId, { storeComputed: false });
  const run2 = computeAch(caseFile, achId, { storeComputed: false });

  if (!run1.computed || !run2.computed) {
    throw new Error("Expected both runs to return computed.");
  }

  const a = JSON.stringify(computedWithoutTime(run1.computed));
  const b = JSON.stringify(computedWithoutTime(run2.computed));
  if (a !== b) {
    throw new Error("Determinism failed: two compute runs produced different results.");
  }
  console.log("OK determinism: same inputs → same results");

  // 2) Audit entry when storing
  const runStore = computeAch(caseFile, achId, { storeComputed: true });
  if (!runStore.auditEntry || runStore.auditEntry.action !== "COMPUTE_ACH") {
    throw new Error("Expected COMPUTE_ACH audit entry when storeComputed: true.");
  }
  console.log("OK audit: COMPUTE_ACH entry present");

  // 3) Persistence: write case to temp, read back, assert computed exists
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "analyst-smoke-"));
  const casePath = path.join(tmpDir, "case.json");
  try {
    const toWrite = runStore.next;
    fs.writeFileSync(casePath, JSON.stringify(toWrite, null, 2), "utf-8");
    const raw = fs.readFileSync(casePath, "utf-8");
    const parsed = JSON.parse(raw) as CaseFile;
    const ach = parsed.analysis?.ach_matrices?.[0];
    if (!ach?.computed) {
      throw new Error("Persistence check failed: reloaded case missing ach.computed.");
    }
    if (!ach.computed.results?.length || ach.computed.results.length < 2) {
      throw new Error("Persistence check failed: expected at least 2 hypothesis results.");
    }
    console.log("OK persistence: reloaded case has analysis.ach_matrices[0].computed");
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true });
    } catch {
      // ignore
    }
  }

  console.log("All smoke checks passed.");
}

main();
