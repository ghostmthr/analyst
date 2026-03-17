"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import PageHeader from "@/components/PageHeader";
import { useCase } from "@/contexts/CaseContext";
import { isEvidenceRecordComplete } from "@/lib/evidence";
import { displayEvidenceSourceType,displayEvidenceType } from "@/lib/labelRegistry";

export default function EvidenceDetailPage() {
  const params = useParams();
  const invId = params.invId as string;
  const evidenceId = params.evidenceId as string;
  const { caseFile, verifyEvidenceHash } = useCase();
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(false);

  const evd = caseFile?.evidence.find((e) => e.id === evidenceId);
  const _inv = caseFile?.investigations.find((i) => i.id === invId);
  const complete = evd ? isEvidenceRecordComplete(evd) : false;

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyEvidenceHash(evidenceId);
      setVerifyResult(result?.match ?? false);
    } finally {
      setVerifying(false);
    }
  };

  if (!caseFile) {
    return <p>No case loaded.</p>;
  }
  if (!evd) {
    return (
      <>
        <p>Evidence not found.</p>
        <Link href={`/inv/${invId}/evidence`}>← Evidence</Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref={`/inv/${invId}/evidence`}
        backLabel="← Evidence"
        title={evd.title}
        subtitle={
          <>
            {displayEvidenceType(evd.type)} · {displayEvidenceSourceType(evd.source.source_type)}
            <span style={{ marginLeft: 8 }}>
              <EvidenceBackedBadge evidenceBacked={complete} size={14} />
            </span>
          </>
        }
      />

      {evd.description && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Description
          </h2>
          <p style={{ margin: 0, color: "var(--text)" }}>{evd.description}</p>
        </section>
      )}

      {evd.file && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            File
          </h2>
          <dl style={{ margin: 0, display: "grid", gap: "4px 16px", gridTemplateColumns: "auto 1fr" }}>
            <dt style={{ color: "var(--text-muted)" }}>Path</dt>
            <dd style={{ margin: 0, fontFamily: "monospace", fontSize: 13 }}>
              {evd.file.path}
            </dd>
            <dt style={{ color: "var(--text-muted)" }}>SHA-256</dt>
            <dd style={{ margin: 0, fontFamily: "monospace", fontSize: 13, wordBreak: "break-all" }}>
              {evd.file.sha256}
            </dd>
            <dt style={{ color: "var(--text-muted)" }}>Size</dt>
            <dd style={{ margin: 0 }}>{evd.file.size_bytes} bytes</dd>
            <dt style={{ color: "var(--text-muted)" }}>MIME</dt>
            <dd style={{ margin: 0 }}>{evd.file.mime}</dd>
          </dl>
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={handleVerify}
              disabled={verifying}
              style={{ marginRight: 8 }}
            >
              {verifying ? "Verifying…" : "Verify SHA-256"}
            </button>
            {verifyResult !== null && (
              <span
                style={{
                  color: verifyResult ? "var(--green)" : "var(--danger)",
                  fontWeight: 500,
                }}
              >
                {verifyResult ? "Hash matches." : "Hash mismatch."}
              </span>
            )}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
          Provenance
        </h2>
        <dl style={{ margin: 0, display: "grid", gap: "4px 16px", gridTemplateColumns: "auto 1fr" }}>
          <dt style={{ color: "var(--text-muted)" }}>Captured at</dt>
          <dd style={{ margin: 0 }}>{evd.source.captured_at}</dd>
          {evd.source.source_url && (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Source URL</dt>
              <dd style={{ margin: 0 }}>
                <a href={evd.source.source_url} target="_blank" rel="noopener noreferrer">
                  {evd.source.source_url}
                </a>
              </dd>
            </>
          )}
          <dt style={{ color: "var(--text-muted)" }}>Source type</dt>
          <dd style={{ margin: 0 }}>{displayEvidenceSourceType(evd.source.source_type)}</dd>
          {evd.source.collected_by && (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Collected by</dt>
              <dd style={{ margin: 0 }}>{evd.source.collected_by}</dd>
            </>
          )}
          {evd.source.method && (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Method</dt>
              <dd style={{ margin: 0 }}>{evd.source.method}</dd>
            </>
          )}
        </dl>
      </section>

      {(evd.reliability || evd.analyst_note) && (
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
            Reliability & notes
          </h2>
          {evd.reliability && (
            <p style={{ margin: "0 0 8px" }}>
              Source quality: {evd.reliability.source_quality ?? "—"} · Credibility:{" "}
              {evd.reliability.credibility ?? "—"}
              {evd.reliability.notes && ` · ${evd.reliability.notes}`}
            </p>
          )}
          {evd.analyst_note && (
            <p style={{ margin: 0, color: "var(--text)" }}>{evd.analyst_note}</p>
          )}
        </section>
      )}

      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
        Created {evd.created_at} · Updated {evd.updated_at}
      </p>
    </>
  );
}
