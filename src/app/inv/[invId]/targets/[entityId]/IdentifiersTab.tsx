"use client";

import { useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import GroupedTypeaheadPicker from "@/components/GroupedTypeaheadPicker";
import type { IdentifierStorageType } from "@/config/taxonomy";
import { bucketConfidence } from "@/lib/confidence";
import type { CreateIdentifierInput, UpdateIdentifierPatch } from "@/lib/identifiers";
import { displayConfidence, displayIdentifierType, IDENTIFIER_FACETS } from "@/lib/labelRegistry";
import type { CaseFile, Identifier } from "@/types";
import type { ExIdentifierType } from "@/types";

export interface IdentifiersTabProps {
  entityId: string;
  invId: string;
  identifiers: Identifier[];
  addDrawerOpen: boolean;
  onCloseAddDrawer: () => void;
  onCreate: (input: CreateIdentifierInput) => Promise<CaseFile | null>;
  onUpdate: (id: string, patch: UpdateIdentifierPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function IdentifiersTab({
  entityId,
  invId,
  identifiers,
  addDrawerOpen,
  onCloseAddDrawer,
  onCreate,
  onUpdate,
  onDelete,
}: IdentifiersTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<ExIdentifierType | IdentifierStorageType>("ALIAS");
  const [value, setValue] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [confidencePct, setConfidencePct] = useState(50);
  const [rationale, setRationale] = useState("");
  const [saving, setSaving] = useState(false);

  const score = confidencePct / 100;
  const bucket = bucketConfidence(score);
  const rationaleRequired = score >= 0.75 || score <= 0.35;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    if (rationaleRequired && !rationale.trim()) return;
    setSaving(true);
    try {
      await onCreate({
        investigation_id: invId,
        entity_id: entityId,
        type: type as ExIdentifierType,
        value: value.trim(),
        source_text: sourceText.trim() || undefined,
        confidence: {
          score,
          rationale: rationale.trim() || undefined,
        },
      });
      onCloseAddDrawer();
      setValue("");
      setSourceText("");
      setConfidencePct(50);
      setRationale("");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!value.trim()) return;
    if (rationaleRequired && !rationale.trim()) return;
    setSaving(true);
    try {
      await onUpdate(id, {
        type: type as ExIdentifierType,
        value: value.trim(),
        source_text: sourceText.trim() || undefined,
        confidence: { score, rationale: rationale.trim() || undefined },
      });
      setEditingId(null);
      setValue("");
      setSourceText("");
      setRationale("");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (ident: Identifier) => {
    setEditingId(ident.id);
    setType(ident.type);
    setValue(ident.value);
    setSourceText(ident.source_text ?? "");
    setConfidencePct(ident.confidence ? Math.round(ident.confidence.score * 100) : 50);
    setRationale(ident.confidence?.rationale ?? "");
  };

  const drawerVisible = addDrawerOpen || !!editingId;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="analyst-tableWrap">
        <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th colSpan={6}>IDENTIFIERS</th>
            </tr>
            <tr>
              <th>TYPE</th>
              <th>VALUE</th>
              <th>SOURCE</th>
              <th>CONFIDENCE</th>
              <th>CREATED</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {identifiers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 24, color: "var(--text-muted)" }}>
                  No identifiers yet.
                </td>
              </tr>
            ) : (
              identifiers.map((ident) => (
                <tr key={ident.id}>
                  <td style={{ padding: "12px 14px" }}>{displayIdentifierType(ident.type)}</td>
                  <td style={{ padding: "12px 14px" }}>{ident.value}</td>
                  <td style={{ padding: "12px 14px" }}>{ident.source_text ?? "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {ident.confidence
                      ? `${displayConfidence(ident.confidence.bucket)} (${(ident.confidence.score * 100).toFixed(0)}%)`
                      : "—"}
                  </td>
                  <td style={{ padding: "12px 14px" }}>{ident.created_at.slice(0, 10)}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <button type="button" onClick={() => openEdit(ident)} style={{ marginRight: 8 }}>Edit</button>
                    <button type="button" onClick={() => { if (confirm("Delete this identifier?")) onDelete(ident.id); }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AnalystModal
        open={drawerVisible}
        onClose={() => { onCloseAddDrawer(); setEditingId(null); }}
        title={editingId ? "Edit identifier" : "New identifier"}
      >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editingId) handleUpdate(editingId);
                else handleCreate(e);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type</label>
                <GroupedTypeaheadPicker
                  groups={IDENTIFIER_FACETS.map((g) => ({
                    heading: g.heading,
                    options: g.options.map((o) => ({ value: o.storageType, label: o.label })),
                  }))}
                  value={type}
                  onChange={(v) => setType(v as ExIdentifierType | IdentifierStorageType)}
                  placeholder="Select type…"
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Value *</label>
                <input type="text" value={value} onChange={(e) => setValue(e.target.value)} required style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Source text</label>
                <input type="text" value={sourceText} onChange={(e) => setSourceText(e.target.value)} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                  Confidence: {confidencePct}% ({displayConfidence(bucket)})
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={confidencePct}
                  onChange={(e) => setConfidencePct(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                  Rationale {rationaleRequired && "*"}
                </label>
                <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} required={rationaleRequired} rows={2} style={{ width: "100%", padding: "8px 12px" }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => { onCloseAddDrawer(); setEditingId(null); }}>Cancel</button>
              </div>
            </form>
      </AnalystModal>
    </div>
  );
}
