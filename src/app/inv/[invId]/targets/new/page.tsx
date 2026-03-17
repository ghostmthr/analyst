"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { ENTITY_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { EntityType } from "@/types";

export default function NewTargetPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const { caseFile, createEntity } = useCase();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<EntityType>("PERSON");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState("");

  const inv = caseFile?.investigations.find((i) => i.id === invId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    try {
      const entityId = await createEntity(invId, {
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        summary: summary.trim() || undefined,
      });
      if (entityId) {
        router.push(`/inv/${invId}/targets/${entityId}`);
      } else {
        setError("Failed to create target.");
      }
    } catch {
      setError("Failed to create target.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!inv) {
    return <p>Investigation not found.</p>;
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link
          href={`/inv/${invId}/targets`}
          style={{ fontSize: 14, color: "var(--text-muted)" }}
        >
          ← Targets
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 0 }}>New target</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}
      >
        {error && <p style={{ color: "var(--danger)", margin: 0 }}>{error}</p>}

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Entity type *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntityType)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Description (one-line)
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create target"}
          </button>
          <Link href={`/inv/${invId}/targets`} style={{ padding: "8px 16px" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
