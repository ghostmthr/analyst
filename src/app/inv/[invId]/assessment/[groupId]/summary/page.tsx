"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Banner } from "@/components/Banner";
import { useCase } from "@/contexts/CaseContext";
import { bucketConfidence } from "@/lib/confidence";
import { requiresRationale, validateConfidence } from "@/lib/validation";

export default function SummaryPage() {
  const params = useParams();
  const invId = params.invId as string;
  const groupId = params.groupId as string;
  const { caseFile, createAssessmentSummary, updateAssessmentSummary } = useCase();

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const group = caseFile?.analysis?.hypothesis_groups?.find((g) => g.id === groupId);
  const hypotheses = (caseFile?.analysis?.hypotheses ?? []).filter((h) => h.hypothesis_group_id === groupId);
  const achMatrices = (caseFile?.analysis?.ach_matrices ?? []).filter((m) => m.hypothesis_group_id === groupId);
  const assessments = (caseFile?.analysis?.assessments ?? []).filter((a) => a.hypothesis_group_id === groupId);
  const invEvidence = useMemo(
    () => caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.evidence, invId]
  );
  const invClaims = useMemo(
    () => caseFile?.claims.filter((c) => c.investigation_id === invId) ?? [],
    [caseFile?.claims, invId]
  );

  const ach = achMatrices[0];
  const topFromCompute = ach?.computed?.results?.[0]?.hypothesis_id;
  const summary = assessments[0];

  const [question, setQuestion] = useState(summary?.question ?? group?.question ?? "");
  const [topHypothesisId, setTopHypothesisId] = useState(summary?.top_hypothesis_id ?? topFromCompute ?? hypotheses[0]?.id ?? "");
  const [achId, setAchId] = useState(summary?.ach_id ?? ach?.id ?? "");
  const [keyJudgments, setKeyJudgments] = useState<{ text: string; confidencePct: number; rationale: string; evidenceIds: string[]; claimIds: string[] }[]>(
    summary?.key_judgments?.map((kj) => ({
      text: kj.text,
      confidencePct: kj.confidence ? Math.round(kj.confidence.score * 100) : 50,
      rationale: kj.confidence?.rationale ?? "",
      evidenceIds: kj.evidence_ids ?? [],
      claimIds: kj.claim_ids ?? [],
    })) ?? [{ text: "", confidencePct: 50, rationale: "", evidenceIds: [], claimIds: [] }]
  );
  const [alternativeExplanations, setAlternativeExplanations] = useState<string>(summary?.alternative_explanations?.join("\n") ?? "");
  const [intelligenceGaps, setIntelligenceGaps] = useState<string>(summary?.intelligence_gaps?.join("\n") ?? "");

  const [kjErrors, setKjErrors] = useState<Record<number, string>>({});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setKjErrors({});
    const toSave = keyJudgments.filter((kj) => kj.text.trim());
    const errors: Record<number, string> = {};
    for (let i = 0; i < keyJudgments.length; i++) {
      const kj = keyJudgments[i];
      if (!kj.text.trim()) continue;
      const score = kj.confidencePct / 100;
      const v = validateConfidence({ score, rationale: kj.rationale });
      if (!v.ok) {
        errors[i] = v.message ?? "Invalid confidence.";
      }
    }
    if (Object.keys(errors).length > 0) {
      setKjErrors(errors);
      setError("Fix validation errors below.");
      return;
    }
    const judgments = toSave.map((kj) => {
      const score = kj.confidencePct / 100;
      const bucket = bucketConfidence(score);
      return {
        text: kj.text.trim(),
        confidence: { score, bucket, rationale: kj.rationale.trim() || undefined },
        evidence_ids: kj.evidenceIds.length ? kj.evidenceIds : undefined,
        claim_ids: kj.claimIds.length ? kj.claimIds : undefined,
      };
    });
    if (judgments.length === 0) {
      setError("Add at least one key judgment.");
      return;
    }
    setSaving(true);
    try {
      const alt = alternativeExplanations.trim().split("\n").filter(Boolean);
      const gaps = intelligenceGaps.trim().split("\n").filter(Boolean);
      if (summary) {
        await updateAssessmentSummary(summary.id, {
          question: question.trim(),
          top_hypothesis_id: topHypothesisId,
          ach_id: achId || undefined,
          key_judgments: judgments,
          alternative_explanations: alt.length ? alt : undefined,
          intelligence_gaps: gaps.length ? gaps : undefined,
        });
      } else {
        await createAssessmentSummary({
          hypothesisGroupId: groupId,
          question: question.trim(),
          topHypothesisId,
          achId: achId || undefined,
          keyJudgments: judgments,
          alternativeExplanations: alt.length ? alt : undefined,
          intelligenceGaps: gaps.length ? gaps : undefined,
        });
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const addJudgment = () => {
    setKeyJudgments((prev) => [...prev, { text: "", confidencePct: 50, rationale: "", evidenceIds: [], claimIds: [] }]);
  };

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv || !group) return <p>Not found.</p>;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}/assessment/${groupId}`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← {group.name}
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>Key judgments</h1>
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      <form onSubmit={handleSave} style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Question</label>
          <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} style={{ width: "100%", padding: "8px 12px" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Top hypothesis</label>
          <select value={topHypothesisId} onChange={(e) => setTopHypothesisId(e.target.value)} style={{ width: "100%", padding: "8px 12px" }}>
            {hypotheses.map((h) => (
              <option key={h.id} value={h.id}>{h.label}: {h.statement.slice(0, 50)}…</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>ACH matrix</label>
          <select value={achId} onChange={(e) => setAchId(e.target.value)} style={{ width: "100%", padding: "8px 12px" }}>
            <option value="">—</option>
            {achMatrices.map((m) => (
              <option key={m.id} value={m.id}>ACH matrix</option>
            ))}
          </select>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontWeight: 500 }}>Key judgments *</label>
            <button type="button" onClick={addJudgment}>Add judgment</button>
          </div>
          {keyJudgments.map((kj, i) => {
            const score = kj.confidencePct / 100;
            const rationaleRequired = requiresRationale(score);
            const inlineError = kjErrors[i];
            return (
            <div key={i} style={{ marginBottom: 16, padding: 12, border: "1px solid var(--border)", borderRadius: 4 }}>
              <textarea
                placeholder="Judgment text"
                value={kj.text}
                onChange={(e) => setKeyJudgments((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], text: e.target.value };
                  return next;
                })}
                rows={2}
                style={{ width: "100%", padding: "8px 12px", marginBottom: 8 }}
              />
              <label style={{ fontSize: 14 }}>Confidence: {kj.confidencePct}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={kj.confidencePct}
                onChange={(e) => setKeyJudgments((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], confidencePct: Number(e.target.value) };
                  return next;
                })}
                style={{ width: "100%", marginBottom: 8 }}
              />
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Rationale {rationaleRequired && "*"}</label>
              <input
                placeholder={rationaleRequired ? "Required when confidence ≥75% or ≤35%" : "Optional"}
                value={kj.rationale}
                onChange={(e) => setKeyJudgments((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], rationale: e.target.value };
                  return next;
                })}
                style={{ width: "100%", padding: "8px 12px", marginBottom: 4, borderColor: inlineError ? "var(--danger)" : undefined }}
              />
              {inlineError && <p style={{ margin: 0, fontSize: 12, color: "var(--danger)" }}>{inlineError}</p>}
              <select
                multiple
                value={kj.evidenceIds}
                onChange={(e) => setKeyJudgments((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], evidenceIds: Array.from(e.target.selectedOptions, (o) => o.value) };
                  return next;
                })}
                style={{ width: "100%", padding: "8px 12px", minHeight: 50 }}
              >
                {invEvidence.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
              </select>
              <select
                multiple
                value={kj.claimIds}
                onChange={(e) => setKeyJudgments((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], claimIds: Array.from(e.target.selectedOptions, (o) => o.value) };
                  return next;
                })}
                style={{ width: "100%", padding: "8px 12px", minHeight: 50, marginTop: 8 }}
              >
                {invClaims.map((c) => <option key={c.id} value={c.id}>{(c.title ?? c.text).slice(0, 50)}…</option>)}
              </select>
            </div>
          );
          })}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Alternative explanations (one per line)</label>
          <textarea value={alternativeExplanations} onChange={(e) => setAlternativeExplanations(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px" }} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Intelligence gaps (one per line)</label>
          <textarea value={intelligenceGaps} onChange={(e) => setIntelligenceGaps(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px" }} />
        </div>

        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>
    </>
  );
}
