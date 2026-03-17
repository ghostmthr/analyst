"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef,useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { bucketConfidence } from "@/lib/confidence";
import { newId } from "@/lib/ids";
import { displayConfidence, EVENT_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { EventType, LocationRef } from "@/types";

export default function NewEventPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invId = params.invId as string;
  const { caseFile, createEvent } = useCase();
  const appliedEntityFromUrl = useRef(false);

  const [date, setDate] = useState("");
  const [type, setType] = useState<EventType>("CORPORATE");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [entityIds, setEntityIds] = useState<string[]>([]);
  useEffect(() => {
    if (appliedEntityFromUrl.current) return;
    const entityFromUrl = searchParams.get("entity");
    if (entityFromUrl) {
      setEntityIds((prev) => (prev.length === 0 ? [entityFromUrl] : prev));
      appliedEntityFromUrl.current = true;
    }
  }, [searchParams]);
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [claimIds, setClaimIds] = useState<string[]>([]);
  const [confidencePct, setConfidencePct] = useState(50);
  const [rationale, setRationale] = useState("");
  const [hasLocation, setHasLocation] = useState(false);
  const [locLabel, setLocLabel] = useState("");
  const [locLat, setLocLat] = useState("");
  const [locLng, setLocLng] = useState("");
  const [locAccuracy, setLocAccuracy] = useState("");
  const [locEvidenceIds, setLocEvidenceIds] = useState<string[]>([]);
  const [locNotes, setLocNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const invEntities = useMemo(
    () => caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.entities, invId]
  );
  const invEvidence = useMemo(
    () => caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.evidence, invId]
  );
  const invClaims = useMemo(
    () => caseFile?.claims.filter((c) => c.investigation_id === invId) ?? [],
    [caseFile?.claims, invId]
  );

  const score = confidencePct / 100;
  const bucket = bucketConfidence(score);
  const rationaleRequired = score >= 0.75 || score <= 0.35;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!date.trim()) {
      setError("Date is required.");
      return;
    }
    if (!text.trim()) {
      setError("Text is required.");
      return;
    }
    if (rationaleRequired && !rationale.trim()) {
      setError("Rationale is required for high or low confidence.");
      return;
    }

    setSaving(true);
    try {
      let location: LocationRef | undefined;
      if (hasLocation && locLat.trim() && locLng.trim()) {
        const lat = Number(locLat);
        const lng = Number(locLng);
        if (Number.isNaN(lat) || Number.isNaN(lng)) {
          setError("Invalid lat/lng.");
          setSaving(false);
          return;
        }
        location = {
          id: newId("LOC"),
          label: locLabel.trim() || "Event location",
          geometry: { type: "Point", coordinates: [lng, lat] },
          accuracy_m: locAccuracy ? Number(locAccuracy) : undefined,
          method: "manual",
          evidence_ids: locEvidenceIds.length ? locEvidenceIds : undefined,
          notes: locNotes.trim() || undefined,
        };
      }

      const eventId = await createEvent({
        invId,
        date: date.trim(),
        type,
        title: title.trim() || undefined,
        text: text.trim(),
        entityIds: entityIds.length ? entityIds : undefined,
        claimIds: claimIds.length ? claimIds : undefined,
        evidenceIds: evidenceIds.length ? evidenceIds : undefined,
        location,
        confidence: {
          score,
          rationale: rationale.trim() || undefined,
        },
      });
      if (eventId) {
        const returnTo = searchParams.get("returnTo");
        const entityFromUrl = searchParams.get("entity");
        if (returnTo === "target" && (entityFromUrl || entityIds[0])) {
          router.push(`/inv/${invId}/targets/${entityFromUrl || entityIds[0]}?tab=events`);
        } else {
          router.push(`/inv/${invId}/events/${eventId}`);
        }
      } else {
        setError("Failed to create event.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event.");
    } finally {
      setSaving(false);
    }
  };

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}/events`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← Events
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>New Event</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>{inv.title}</p>
      </div>

      {error && (
        <p style={{ marginBottom: 16, padding: 12, background: "var(--danger-bg)", color: "var(--danger)", borderRadius: 4 }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            style={{ width: "100%", padding: "8px 12px" }}
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short label for the event"
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Text *</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={4}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Entities affected</label>
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
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 }}>
              {entityIds.map((id) => {
                const ent = invEntities.find((e) => e.id === id);
                return (
                  <li
                    key={id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 4 }}
                  >
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
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Evidence</label>
          <select
            multiple
            value={evidenceIds}
            onChange={(e) => setEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))}
            style={{ width: "100%", padding: "8px 12px", minHeight: 80 }}
          >
            {invEvidence.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Claims (optional)</label>
          <select
            multiple
            value={claimIds}
            onChange={(e) => setClaimIds(Array.from(e.target.selectedOptions, (o) => o.value))}
            style={{ width: "100%", padding: "8px 12px", minHeight: 60 }}
          >
            {invClaims.map((c) => (
              <option key={c.id} value={c.id}>{(c.title ?? c.text).slice(0, 50)}…</option>
            ))}
          </select>
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
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            required={rationaleRequired}
            rows={2}
            style={{ width: "100%", padding: "8px 12px" }}
          />
        </div>

        <div>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={hasLocation} onChange={(e) => setHasLocation(e.target.checked)} />
            Add location
          </label>
        </div>
        {hasLocation && (
          <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 4, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="text"
              placeholder="Location label"
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
              <label style={{ fontSize: 12, color: "var(--text-muted)" }}>Location evidence</label>
              <select
                multiple
                value={locEvidenceIds}
                onChange={(e) => setLocEvidenceIds(Array.from(e.target.selectedOptions, (o) => o.value))}
                style={{ width: "100%", padding: "8px 12px", minHeight: 60 }}
              >
                {invEvidence.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Notes (optional)"
              value={locNotes}
              onChange={(e) => setLocNotes(e.target.value)}
              rows={2}
              style={{ padding: "8px 12px" }}
            />
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create event"}
          </button>
          <Link href={`/inv/${invId}/events`} style={{ padding: "8px 16px" }}>
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
