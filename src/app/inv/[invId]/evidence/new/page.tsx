"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { EVIDENCE_SOURCE_TYPE_OPTIONS,EVIDENCE_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { EvidenceSourceType,EvidenceType } from "@/types";
const METHODS = [
  "download",
  "screenshot",
  "archive",
  "manual",
] as const;

export default function NewEvidencePage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const { caseFile, ingestEvidence } = useCase();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<EvidenceType>("DOCUMENT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState<EvidenceSourceType>("WEBSITE");
  const [method, setMethod] = useState<"download" | "screenshot" | "archive" | "manual">(
    "download"
  );
  const [sourceQuality, setSourceQuality] = useState("");
  const [credibility, setCredibility] = useState("");
  const [analystNote, setAnalystNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState(() =>
    new Date().toISOString().slice(0, 19) + "Z"
  );

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const requiresFile = type === "DOCUMENT" || type === "IMAGE";
  const capturedAtIso = capturedAt.includes("Z") ? capturedAt : capturedAt + "Z";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (requiresFile && !file) {
      setError("File is required for DOCUMENT and IMAGE evidence.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await ingestEvidence({
        investigation_id: invId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        source_type: sourceType,
        captured_at: capturedAtIso,
        method,
        file: file!,
        reliability:
          sourceQuality !== "" || credibility !== ""
            ? {
                source_quality:
                  sourceQuality === "" ? undefined : Number(sourceQuality),
                credibility: credibility === "" ? undefined : Number(credibility),
                notes: undefined,
              }
            : undefined,
        analyst_note: analystNote.trim() || undefined,
      });
      if (result) {
        router.push(`/inv/${invId}/evidence/${result.evidenceId}`);
      } else {
        setError("Failed to ingest evidence.");
      }
    } catch {
      setError("Failed to ingest evidence.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!inv) {
    return (
      <p>Investigation not found.</p>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}/evidence`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← Evidence
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 0 }}>Add evidence</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
        {error && (
          <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>
        )}

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Type *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EvidenceType)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            {EVIDENCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Source URL
          </label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Source type *
          </label>
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as EvidenceSourceType)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            {EVIDENCE_SOURCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Captured at (UTC)
          </label>
          <input
            type="datetime-local"
            value={capturedAt.slice(0, 16)}
            onChange={(e) => {
              const v = e.target.value;
              if (v) setCapturedAt(v.slice(0, 19) + "Z");
            }}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Attach file {requiresFile && "*"}
          </label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required={requiresFile}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Source quality (0–1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={sourceQuality}
              onChange={(e) => setSourceQuality(e.target.value)}
              placeholder="0.5"
              style={{ width: "100%", padding: "8px 12px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
              Credibility (0–1)
            </label>
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={credibility}
              onChange={(e) => setCredibility(e.target.value)}
              placeholder="0.5"
              style={{ width: "100%", padding: "8px 12px" }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Analyst note
          </label>
          <textarea
            value={analystNote}
            onChange={(e) => setAnalystNote(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? "Ingesting…" : "Ingest evidence"}
          </button>
          <Link href={`/inv/${invId}/evidence`} style={{ padding: "8px 16px" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
