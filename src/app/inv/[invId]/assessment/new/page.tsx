"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Banner } from "@/components/Banner";
import { useCase } from "@/contexts/CaseContext";

export default function NewHypothesisGroupPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const { caseFile, createHypothesisGroup } = useCase();

  const [name, setName] = useState("");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [targetEntityId, setTargetEntityId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const entities = caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!question.trim()) {
      setError("Question is required.");
      return;
    }
    setSaving(true);
    try {
      const groupId = await createHypothesisGroup({
        invId,
        name: name.trim(),
        question: question.trim(),
        description: description.trim() || undefined,
        targetEntityId: targetEntityId || undefined,
      });
      if (groupId) router.push(`/inv/${invId}/assessment/${groupId}`);
      else setError("Failed to create group.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create group.");
    } finally {
      setSaving(false);
    }
  };

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}/assessment`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← Assessment
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>New hypothesis group</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>{inv.title}</p>
      </div>

      {error && <Banner variant="error">{error}</Banner>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Question *</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            rows={3}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Target entity</label>
          <select
            value={targetEntityId}
            onChange={(e) => setTargetEntityId(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            <option value="">—</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>{saving ? "Creating…" : "Create"}</button>
          <Link href={`/inv/${invId}/assessment`} style={{ padding: "8px 16px" }}>Cancel</Link>
        </div>
      </form>
    </>
  );
}
