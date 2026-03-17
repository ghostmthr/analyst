"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Banner } from "@/components/Banner";
import PageHeader from "@/components/PageHeader";
import { useCase } from "@/contexts/CaseContext";

import DiagnosticClaimsTab from "./DiagnosticClaimsTab";
import HypothesesTab from "./HypothesesTab";

type Tab = "hypotheses" | "diagnostic";

export default function AssessmentGroupPage() {
  const params = useParams();
  const invId = params.invId as string;
  const groupId = params.groupId as string;
  const { caseFile, createHypothesis, updateHypothesis, deleteHypothesis, createDiagnosticClaim, updateDiagnosticClaim, deleteDiagnosticClaim } = useCase();

  const [tab, setTab] = useState<Tab>("hypotheses");
  const [hypDrawer, setHypDrawer] = useState(false);
  const [dclmDrawer, setDclmDrawer] = useState(false);
  const [editingHypId, setEditingHypId] = useState<string | null>(null);
  const [editingDclmId, setEditingDclmId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const group = caseFile?.analysis?.hypothesis_groups?.find((g) => g.id === groupId);
  const hypotheses = (caseFile?.analysis?.hypotheses ?? []).filter((h) => h.hypothesis_group_id === groupId);
  const diagnosticClaims = (caseFile?.analysis?.diagnostic_claims ?? []).filter((d) => d.hypothesis_group_id === groupId);
  const invEvidence = useMemo(
    () => caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.evidence, invId]
  );
  const invClaims = useMemo(
    () => caseFile?.claims.filter((c) => c.investigation_id === invId) ?? [],
    [caseFile?.claims, invId]
  );

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;
  if (!group) {
    return (
      <>
        <p>Hypothesis group not found.</p>
        <Link href={`/inv/${invId}/assessment`}>← Assessment</Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref={`/inv/${invId}/assessment`}
        backLabel="← Assessment"
        title={group.name}
        subtitle={group.question}
      />

      <nav style={{ display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid var(--border)" }}>
        <button
          type="button"
          onClick={() => setTab("hypotheses")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: tab === "hypotheses" ? "var(--panel)" : "transparent",
            color: tab === "hypotheses" ? "var(--blue)" : "var(--text)",
            fontWeight: tab === "hypotheses" ? 600 : 400,
            borderBottom: tab === "hypotheses" ? "2px solid var(--blue)" : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          Hypotheses
        </button>
        <button
          type="button"
          onClick={() => setTab("diagnostic")}
          style={{
            padding: "8px 16px",
            border: "none",
            background: tab === "diagnostic" ? "var(--panel)" : "transparent",
            color: tab === "diagnostic" ? "var(--blue)" : "var(--text)",
            fontWeight: tab === "diagnostic" ? 600 : 400,
            borderBottom: tab === "diagnostic" ? "2px solid var(--blue)" : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          Diagnostic claims
        </button>
        <Link
          href={`/inv/${invId}/assessment/${groupId}/ach`}
          style={{
            padding: "8px 16px",
            color: "var(--text)",
            textDecoration: "none",
            borderBottom: "2px solid transparent",
            marginBottom: -1,
          }}
        >
          ACH
        </Link>
        <Link
          href={`/inv/${invId}/assessment/${groupId}/summary`}
          style={{
            padding: "8px 16px",
            color: "var(--text)",
            textDecoration: "none",
            borderBottom: "2px solid transparent",
            marginBottom: -1,
          }}
        >
          Summary
        </Link>
      </nav>

      {error && <Banner variant="error">{error}</Banner>}

      {tab === "hypotheses" && (
        <HypothesesTab
          groupId={groupId}
          hypotheses={hypotheses}
          invEvidence={invEvidence}
          invClaims={invClaims}
          onCreate={async (input) => {
            setError("");
            try {
              await createHypothesis(input);
              setHypDrawer(false);
            } catch (e) {
              console.error(e);
              setError(e instanceof Error ? e.message : "Failed");
            }
          }}
          onUpdate={async (id, patch) => {
            setError("");
            try {
              await updateHypothesis(id, patch);
              setEditingHypId(null);
            } catch (e) {
              console.error(e);
              setError(e instanceof Error ? e.message : "Failed");
            }
          }}
          onDelete={async (id) => {
            if (!confirm("Delete this hypothesis?")) return;
            setError("");
            try {
              await deleteHypothesis(id);
              setEditingHypId(null);
            } catch (e) {
              console.error(e);
              setError(e instanceof Error ? e.message : "Failed");
            }
          }}
          onOpenAdd={() => { setHypDrawer(true); setEditingHypId(null); }}
          onOpenEdit={(id) => { setEditingHypId(id); setHypDrawer(false); }}
          onClose={() => { setHypDrawer(false); setEditingHypId(null); }}
          editingId={editingHypId}
          drawerOpen={hypDrawer}
        />
      )}

      {tab === "diagnostic" && (
        <DiagnosticClaimsTab
          groupId={groupId}
          diagnosticClaims={diagnosticClaims}
          invEvidence={invEvidence}
          invClaims={invClaims}
          onCreate={async (input) => {
            setError("");
            try {
              await createDiagnosticClaim(input);
              setDclmDrawer(false);
            } catch (e) {
              console.error(e);
              setError(e instanceof Error ? e.message : "Failed");
            }
          }}
          onUpdate={async (id, patch) => {
            setError("");
            try {
              await updateDiagnosticClaim(id, patch);
              setEditingDclmId(null);
            } catch (e) {
              console.error(e);
              setError(e instanceof Error ? e.message : "Failed");
            }
          }}
          onDelete={async (id) => {
            if (!confirm("Delete this diagnostic claim?")) return;
            setError("");
            try {
              await deleteDiagnosticClaim(id);
              setEditingDclmId(null);
            } catch (e) {
              console.error(e);
              setError(e instanceof Error ? e.message : "Failed");
            }
          }}
          onOpenAdd={() => { setDclmDrawer(true); setEditingDclmId(null); }}
          onOpenEdit={(id) => { setEditingDclmId(id); setDclmDrawer(false); }}
          onClose={() => { setDclmDrawer(false); setEditingDclmId(null); }}
          editingId={editingDclmId}
          drawerOpen={dclmDrawer}
        />
      )}
    </>
  );
}
