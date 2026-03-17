"use client";

import { useState } from "react";

import AnalystModal from "@/components/AnalystModal";
import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import RiskTagChips from "@/components/RiskTagChips";
import { isAssertionEvidenceBacked } from "@/lib/derived";
import type { UpdateEntityLocationPatch,UpdateEntityPatch } from "@/lib/entities";
import { newId, nowUtc } from "@/lib/ids";
import { ENTITY_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { CaseFile, Entity, EntityType, Evidence, LocationRef } from "@/types";

export interface ProfileTabProps {
  entity: Entity;
  invId: string;
  caseFile: CaseFile;
  orgEntities: Entity[];
  imageEvidence: Evidence[];
  invEvidence: Evidence[];
  onUpdate: (entityId: string, patch: UpdateEntityPatch) => Promise<void>;
  onDelete: (entityId: string) => Promise<void>;
  onAddLocation: (entityId: string, location: LocationRef) => Promise<void>;
  onRemoveLocation: (entityId: string, locationId: string) => Promise<void>;
  onUpdateLocation: (entityId: string, locationId: string, patch: UpdateEntityLocationPatch) => Promise<void>;
  onNavigateBack: () => void;
}

export default function ProfileTab({
  entity,
  invId: _invId,
  caseFile,
  orgEntities,
  imageEvidence,
  invEvidence,
  onUpdate,
  onDelete,
  onAddLocation,
  onRemoveLocation,
  onUpdateLocation,
  onNavigateBack,
}: ProfileTabProps) {
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<EntityType>(entity.type);
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description ?? "");
  const [summary, setSummary] = useState(entity.summary ?? "");
  const [nationalityIso, setNationalityIso] = useState(
    entity.attributes?.nationality_iso ?? ""
  );
  const [currentRole, setCurrentRole] = useState(
    entity.attributes?.current_role ?? ""
  );
  const [currentOrgId, setCurrentOrgId] = useState(
    entity.attributes?.current_organization_entity_id ?? ""
  );
  const [lastActivity, setLastActivity] = useState(
    entity.attributes?.last_confirmed_activity ?? ""
  );
  const [riskTags, setRiskTags] = useState<string[]>(
    entity.risk_tags ?? []
  );
  const [imageEvidenceIds, setImageEvidenceIds] = useState<string[]>(
    entity.image_evidence_ids ?? []
  );
  const [locLabel, setLocLabel] = useState("");
  const [locLat, setLocLat] = useState("");
  const [locLng, setLocLng] = useState("");
  const [locAccuracy, setLocAccuracy] = useState("");
  const [locEvidenceIds, setLocEvidenceIds] = useState<string[]>([]);
  const [addingLoc, setAddingLoc] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editLocLabel, setEditLocLabel] = useState("");
  const [editLocLat, setEditLocLat] = useState("");
  const [editLocLng, setEditLocLng] = useState("");
  const [editLocAccuracy, setEditLocAccuracy] = useState("");
  const [editLocEvidenceIds, setEditLocEvidenceIds] = useState<string[]>([]);
  const [editLocNotes, setEditLocNotes] = useState("");
  const [savingLoc, setSavingLoc] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSaved, setProfileSaved] = useState(false);

  const handleSave = async () => {
    setProfileError("");
    setProfileSaved(false);
    setSaving(true);
    try {
      await onUpdate(entity.id, {
        type,
        name: name.trim(),
        description: description.trim() || undefined,
        summary: summary.trim() || undefined,
        attributes: {
          nationality_iso: nationalityIso.trim() || undefined,
          current_role: currentRole.trim() || undefined,
          current_organization_entity_id: currentOrgId || undefined,
          last_confirmed_activity: lastActivity.trim() || undefined,
        },
        risk_tags: riskTags,
        image_evidence_ids: imageEvidenceIds.length ? imageEvidenceIds : undefined,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = Number(locLat);
    const lng = Number(locLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    setProfileError("");
    setAddingLoc(true);
    try {
      const location: LocationRef = {
        id: newId("LOC"),
        label: locLabel.trim() || "Location",
        geometry: { type: "Point", coordinates: [lng, lat] },
        accuracy_m: locAccuracy ? Number(locAccuracy) : undefined,
        method: "manual",
        captured_at: nowUtc(),
        evidence_ids: locEvidenceIds.length ? locEvidenceIds : undefined,
      };
      await onAddLocation(entity.id, location);
      setLocLabel("");
      setLocLat("");
      setLocLng("");
      setLocAccuracy("");
      setLocEvidenceIds([]);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to add location.");
    } finally {
      setAddingLoc(false);
    }
  };

  const handleDelete = async () => {
    if (confirm("Delete this target?")) {
      setProfileError("");
      try {
        await onDelete(entity.id);
        onNavigateBack();
      } catch (err) {
        setProfileError(err instanceof Error ? err.message : "Failed to delete.");
      }
    }
  };

  return (
    <div className="analyst-formPanel">
      <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 24 }}>
      {profileError && (
        <div className="analyst-messageDanger">
          {profileError}
        </div>
      )}
      {profileSaved && (
        <div className="analyst-messageSuccess">
          Profile saved.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Entity type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EntityType)}
            style={{ width: "100%" }}
          >
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Summary</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={4}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Nationality (ISO)</label>
          <input
            type="text"
            value={nationalityIso}
            onChange={(e) => setNationalityIso(e.target.value)}
            placeholder="e.g. US"
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Current role</label>
          <input
            type="text"
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Current organization</label>
          <select
            value={currentOrgId}
            onChange={(e) => setCurrentOrgId(e.target.value)}
            style={{ width: "100%" }}
          >
            <option value="">—</option>
            {orgEntities.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Last confirmed activity</label>
          <input
            type="date"
            value={lastActivity}
            onChange={(e) => setLastActivity(e.target.value)}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>FLAGS / RISK FLAGS</label>
          <RiskTagChips
            value={riskTags}
            onChange={setRiskTags}
            placeholder="Type to search or add tag..."
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Link image evidence</label>
          <select
            multiple
            value={imageEvidenceIds}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, (o) => o.value);
              setImageEvidenceIds(selected);
            }}
            style={{ width: "100%", padding: "8px 12px", minHeight: 80 }}
          >
            {imageEvidence.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <small style={{ color: "var(--text-muted)" }}>Hold Ctrl/Cmd to select multiple.</small>
        </div>
      </div>

      <section>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Locations</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
          {(entity.locations ?? []).map((loc) => (
            <li
              key={loc.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>
                {loc.label} —{" "}
                {loc.geometry.type === "Point"
                  ? `[${loc.geometry.coordinates[1]}, ${loc.geometry.coordinates[0]}]`
                  : ""}
                {loc.evidence_ids?.length != null && (
                  <span style={{ marginLeft: 8, fontSize: 13, color: "var(--text-muted)" }}>
                    ({loc.evidence_ids.length} evidence)
                  </span>
                )}
                <span style={{ marginLeft: 8 }}>
                  <EvidenceBackedBadge
                    evidenceBacked={isAssertionEvidenceBacked(loc.evidence_ids, caseFile)}
                    size={13}
                  />
                </span>
              </span>
              <span>
                <button
                  type="button"
                  onClick={() => {
                    setEditingLocationId(loc.id);
                    setEditLocLabel(loc.label);
                    setEditLocLat(loc.geometry.type === "Point" ? String(loc.geometry.coordinates[1]) : "");
                    setEditLocLng(loc.geometry.type === "Point" ? String(loc.geometry.coordinates[0]) : "");
                    setEditLocAccuracy(loc.accuracy_m != null ? String(loc.accuracy_m) : "");
                    setEditLocEvidenceIds(loc.evidence_ids ?? []);
                    setEditLocNotes(loc.notes ?? "");
                  }}
                  style={{ fontSize: 12, marginRight: 8 }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveLocation(entity.id, loc.id)}
                  style={{ fontSize: 12 }}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
        <form onSubmit={handleAddLocation} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            type="text"
            placeholder="Label"
            value={locLabel}
            onChange={(e) => setLocLabel(e.target.value)}
            style={{ padding: "8px 12px" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              step="any"
              placeholder="Latitude"
              value={locLat}
              onChange={(e) => setLocLat(e.target.value)}
              style={{ flex: 1, padding: "8px 12px" }}
            />
            <input
              type="number"
              step="any"
              placeholder="Longitude"
              value={locLng}
              onChange={(e) => setLocLng(e.target.value)}
              style={{ flex: 1, padding: "8px 12px" }}
            />
          </div>
          <input
            type="number"
            placeholder="Accuracy (m)"
            value={locAccuracy}
            onChange={(e) => setLocAccuracy(e.target.value)}
            style={{ padding: "8px 12px" }}
          />
          <div>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500, fontSize: 14 }}>Evidence</label>
            <select
              multiple
              value={locEvidenceIds}
              onChange={(e) => setLocEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))}
              style={{ width: "100%", padding: "8px 12px", minHeight: 80 }}
            >
              {invEvidence.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>
            <small style={{ color: "var(--text-muted)" }}>Hold Ctrl/Cmd to select multiple.</small>
          </div>
          <button type="submit" disabled={addingLoc}>
            {addingLoc ? "Adding…" : "Add location"}
          </button>
        </form>

        <AnalystModal
          open={!!editingLocationId}
          onClose={() => setEditingLocationId(null)}
          title="Edit location"
        >
          <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const lat = Number(editLocLat);
                  const lng = Number(editLocLng);
                  if (Number.isNaN(lat) || Number.isNaN(lng)) return;
                  setProfileError("");
                  setSavingLoc(true);
                  try {
                    await onUpdateLocation(entity.id, editingLocationId!, {
                      label: editLocLabel.trim() || "Location",
                      lat,
                      lng,
                      accuracy_m: editLocAccuracy ? Number(editLocAccuracy) : undefined,
                      evidence_ids: editLocEvidenceIds.length ? editLocEvidenceIds : undefined,
                      notes: editLocNotes.trim() || undefined,
                    });
                    setEditingLocationId(null);
                  } catch (err) {
                    setProfileError(err instanceof Error ? err.message : "Failed to update location.");
                  } finally {
                    setSavingLoc(false);
                  }
                }}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Label</label>
                  <input
                    type="text"
                    value={editLocLabel}
                    onChange={(e) => setEditLocLabel(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={editLocLat}
                      onChange={(e) => setEditLocLat(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={editLocLng}
                      onChange={(e) => setEditLocLng(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Accuracy (m)</label>
                  <input
                    type="number"
                    value={editLocAccuracy}
                    onChange={(e) => setEditLocAccuracy(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Evidence</label>
                  <select
                    multiple
                    value={editLocEvidenceIds}
                    onChange={(e) => setEditLocEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                    style={{ width: "100%", padding: "8px 12px", minHeight: 80 }}
                  >
                    {invEvidence.map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Notes (optional)</label>
                  <textarea
                    value={editLocNotes}
                    onChange={(e) => setEditLocNotes(e.target.value)}
                    rows={2}
                    style={{ width: "100%", padding: "8px 12px" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="submit" disabled={savingLoc}>{savingLoc ? "Saving…" : "Save"}</button>
                  <button type="button" onClick={() => setEditingLocationId(null)}>Cancel</button>
                </div>
              </form>
        </AnalystModal>
      </section>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : profileSaved ? "Saved" : "Save profile"}
        </button>
        <button type="button" onClick={handleDelete} style={{ color: "var(--danger)" }}>
          Delete target
        </button>
      </div>
      </div>
    </div>
  );
}
