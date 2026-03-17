"use client";

import { useState } from "react";

import { bucketConfidence } from "@/lib/confidence";
import type { UpdateEventPatch } from "@/lib/events";
import { newId } from "@/lib/ids";
import { EVENT_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { ClaimOption, EventType, LocationRef, TimelineEvent } from "@/types";

export interface EventEditFormProps {
  event: TimelineEvent;
  invId: string;
  invEntities: { id: string; name: string }[];
  invEvidence: { id: string; title: string }[];
  invClaims: ClaimOption[];
  onSave: (patch: UpdateEventPatch) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}

export default function EventEditForm({
  event,
  invId: _invId,
  invEntities,
  invEvidence,
  invClaims,
  onSave,
  onCancel,
  saving,
}: EventEditFormProps) {
  const [date, setDate] = useState(event.date);
  const [type, setType] = useState<EventType>(event.type);
  const [title, setTitle] = useState(event.title ?? "");
  const [text, setText] = useState(event.text);
  const [entityIds, setEntityIds] = useState<string[]>(event.entity_ids ?? []);
  const [evidenceIds, setEvidenceIds] = useState<string[]>(event.evidence_ids ?? []);
  const [claimIds, setClaimIds] = useState<string[]>(event.claim_ids ?? []);
  const [confidencePct, setConfidencePct] = useState(
    event.confidence ? Math.round(event.confidence.score * 100) : 50
  );
  const [rationale, setRationale] = useState(event.confidence?.rationale ?? "");
  const [location, setLocation] = useState<LocationRef | undefined>(event.location);

  const score = confidencePct / 100;
  const bucket = bucketConfidence(score);
  const rationaleRequired = score >= 0.75 || score <= 0.35;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rationaleRequired && !rationale.trim()) return;
    await onSave({
      date,
      type,
      title: title.trim() || undefined,
      text: text.trim(),
      entity_ids: entityIds.length ? entityIds : undefined,
      evidence_ids: evidenceIds.length ? evidenceIds : undefined,
      claim_ids: claimIds.length ? claimIds : undefined,
      confidence: { score, rationale: rationale.trim() || undefined },
      location: location
        ? {
            ...location,
            label: location.label,
            geometry: location.geometry,
            accuracy_m: location.accuracy_m,
            evidence_ids: location.evidence_ids,
            notes: location.notes,
          }
        : undefined,
    });
  };

  const updateLocation = (updates: Partial<LocationRef>) => {
    if (!location) {
      const loc: LocationRef = {
        id: newId("LOC"),
        label: "",
        geometry: { type: "Point", coordinates: [0, 0] },
        ...updates,
      };
      setLocation(loc);
    } else {
      setLocation({ ...location, ...updates });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="analyst-formStack">
      <div>
        <label className="analyst-formLabel">Date *</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="analyst-formInput" />
      </div>
      <div>
        <label className="analyst-formLabel">Type *</label>
        <select value={type} onChange={(e) => setType(e.target.value as EventType)} className="analyst-formInput">
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="analyst-formLabel">Title</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Short label for the event" className="analyst-formInput" />
      </div>
      <div>
        <label className="analyst-formLabel">Text *</label>
        <textarea value={text} onChange={(e) => setText(e.target.value)} required rows={4} className="analyst-formInput" />
      </div>
      <div>
        <label className="analyst-formLabel">Entities</label>
        <select
          className="analyst-filterControl"
          value=""
          onChange={(e) => {
            const id = e.target.value;
            if (id && !entityIds.includes(id)) setEntityIds((prev) => [...prev, id]);
            e.target.value = "";
          }}
          style={{ width: "100%", marginBottom: 8 }}
          aria-label="Add entity"
        >
          <option value="">Add entity…</option>
          {invEntities.map((ent) => (
            <option key={ent.id} value={ent.id} disabled={entityIds.includes(ent.id)}>
              {ent.name}
            </option>
          ))}
        </select>
        {entityIds.length > 0 && (
          <ul className="analyst-listReset" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {entityIds.map((id) => {
              const ent = invEntities.find((e) => e.id === id);
              return (
                <li key={id} className="analyst-chipRow">
                  <span>{ent?.name ?? id}</span>
                  <button
                    type="button"
                    onClick={() => setEntityIds((prev) => prev.filter((x) => x !== id))}
                    style={{ padding: "2px 8px", fontSize: 12 }}
                    aria-label={`Remove ${ent?.name ?? id}`}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div>
        <label className="analyst-formLabel">Evidence</label>
        <select multiple value={evidenceIds} onChange={(e) => setEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="analyst-formInput" style={{ minHeight: 80 }}>
          {invEvidence.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="analyst-formLabel">Claims</label>
        <select multiple value={claimIds} onChange={(e) => setClaimIds(Array.from(e.target.selectedOptions, (o) => o.value))} className="analyst-formInput" style={{ minHeight: 60 }}>
          {invClaims.map((c) => (
            <option key={c.id} value={c.id}>{c.text.slice(0, 50)}…</option>
          ))}
        </select>
      </div>
      <div>
        <label className="analyst-formLabel">Confidence: {confidencePct}% ({bucket})</label>
        <input type="range" min={0} max={100} value={confidencePct} onChange={(e) => setConfidencePct(Number(e.target.value))} style={{ width: "100%" }} />
      </div>
      <div>
        <label className="analyst-formLabel">Rationale {rationaleRequired && "*"}</label>
        <textarea value={rationale} onChange={(e) => setRationale(e.target.value)} required={rationaleRequired} rows={2} className="analyst-formInput" />
      </div>
      {location && (
        <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 4 }}>
          <label className="analyst-formLabel">Location</label>
          <input type="text" placeholder="Label" value={location.label} onChange={(e) => updateLocation({ label: e.target.value })} className="analyst-formInput" style={{ marginBottom: 8 }} />
          {location.geometry.type === "Point" && (
            <>
              <input type="number" step="any" placeholder="Lat" value={location.geometry.coordinates[1]} onChange={(e) => updateLocation({ geometry: { type: "Point", coordinates: [location.geometry.type === "Point" ? location.geometry.coordinates[0] : 0, Number(e.target.value)] } })} style={{ width: "48%", padding: "8px 12px", marginRight: "2%" }} />
              <input type="number" step="any" placeholder="Lng" value={location.geometry.coordinates[0]} onChange={(e) => updateLocation({ geometry: { type: "Point", coordinates: [Number(e.target.value), location.geometry.type === "Point" ? location.geometry.coordinates[1] : 0] } })} style={{ width: "48%", padding: "8px 12px" }} />
            </>
          )}
          <input type="number" placeholder="Accuracy (m)" value={location.accuracy_m ?? ""} onChange={(e) => updateLocation({ accuracy_m: e.target.value ? Number(e.target.value) : undefined })} className="analyst-formInput" style={{ marginTop: 8 }} />
          <select multiple value={location.evidence_ids ?? []} onChange={(e) => updateLocation({ evidence_ids: Array.from(e.target.selectedOptions, (o) => o.value) })} className="analyst-formInput" style={{ minHeight: 60, marginTop: 8 }}>
            {invEvidence.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
      )}
      <div className="analyst-actionsRow">
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
