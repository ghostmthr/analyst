"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import EvidenceBackedBadge from "@/components/EvidenceBackedBadge";
import PageHeader from "@/components/PageHeader";
import { useCase } from "@/contexts/CaseContext";
import { isEvidenceBacked } from "@/lib/evidence";
import { displayConfidence, displayEventType, displayEvidenceSourceType } from "@/lib/labelRegistry";

import EventEditForm from "../EventEditForm";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const eventId = params.eventId as string;
  const { caseFile, updateEvent, deleteEvent } = useCase();

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const event = caseFile?.events.find((e) => e.id === eventId);
  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const invEntities = useMemo(
    () => caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.entities, invId]
  );
  const invEvidence = caseFile?.evidence.filter((e) => e.investigation_id === invId) ?? [];
  const invClaims = caseFile?.claims.filter((c) => c.investigation_id === invId) ?? [];

  const entityNames = useMemo(() => {
    const map = new Map(invEntities.map((e) => [e.id, e.name]));
    return (event?.entity_ids ?? []).map((id) => map.get(id) ?? id);
  }, [event?.entity_ids, invEntities]);

  const directEvidence = useMemo(
    () =>
      (event?.evidence_ids ?? [])
        .map((id) => caseFile?.evidence.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => e != null),
    [caseFile, event?.evidence_ids]
  );

  const linkedClaims = useMemo(
    () => (event?.claim_ids ?? []).map((id) => caseFile?.claims.find((c) => c.id === id)).filter((c): c is NonNullable<typeof c> => c != null),
    [caseFile, event?.claim_ids]
  );

  const derivedEvidenceIds = useMemo(() => {
    const set = new Set<string>();
    linkedClaims.forEach((c) => (c.evidence_ids ?? []).forEach((id) => set.add(id)));
    return Array.from(set);
  }, [linkedClaims]);
  const derivedEvidence = useMemo(
    () =>
      derivedEvidenceIds
        .map((id) => caseFile?.evidence.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => e != null),
    [caseFile, derivedEvidenceIds]
  );

  const handleDelete = async () => {
    if (!confirm("Delete this event?")) return;
    setSaving(true);
    try {
      await deleteEvent(eventId);
      router.push(`/inv/${invId}/events`);
    } catch {
      setError("Failed to delete.");
    } finally {
      setSaving(false);
    }
  };

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;
  if (!event) {
    return (
      <>
        <p>Event not found.</p>
        <Link href={`/inv/${invId}/events`}>← Events</Link>
      </>
    );
  }

  return (
    <>
      <PageHeader
        backHref={`/inv/${invId}/events`}
        backLabel="← Events"
        title={editing ? "Edit event" : "Event"}
        subtitle={event ? `${event.date} · ${displayEventType(event.type)}` : undefined}
      />

      {error && (
        <p className="analyst-messageDanger analyst-gap16">
          {error}
        </p>
      )}

      {editing ? (
        <EventEditForm
          event={event}
          invId={invId}
          invEntities={invEntities}
          invEvidence={invEvidence}
          invClaims={invClaims}
          onSave={async (patch) => {
            setError("");
            setSaving(true);
            try {
              await updateEvent(eventId, patch);
              setEditing(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to update.");
            } finally {
              setSaving(false);
            }
          }}
          onCancel={() => setEditing(false)}
          saving={saving}
        />
      ) : (
        <div style={{ maxWidth: 640 }}>
          {event.title && (
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: 0, marginBottom: 16 }}>{event.title}</h2>
          )}
          <p style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{event.text}</p>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", marginBottom: 16 }}>
            <dt style={{ color: "var(--text-muted)" }}>Date</dt>
            <dd>{event.date}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Type</dt>
            <dd>{displayEventType(event.type)}</dd>
            <dt style={{ color: "var(--text-muted)" }}>Evidence-backed</dt>
            <dd>
              {isEvidenceBacked(event.evidence_ids, caseFile) ? (
                <EvidenceBackedBadge evidenceBacked />
              ) : (
                "No (direct evidence only)"
              )}
            </dd>
            {event.confidence && (
              <>
                <dt style={{ color: "var(--text-muted)" }}>Confidence</dt>
                <dd>
                  {displayConfidence(event.confidence.bucket)} ({(event.confidence.score * 100).toFixed(0)}%)
                  {event.confidence.rationale && (
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)" }}>{event.confidence.rationale}</span>
                  )}
                </dd>
              </>
            )}
          </dl>

          {entityNames.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Entities</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {(event.entity_ids ?? []).map((id, i) => (
                  <li key={id} style={{ marginBottom: 4 }}>
                    <Link href={`/inv/${invId}/targets/${id}`}>{entityNames[i] ?? id}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {directEvidence.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Evidence</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {directEvidence.map((ev) => (
                  <li key={ev.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <Link href={`/inv/${invId}/evidence/${ev.id}`} style={{ fontWeight: 500 }}>
                      {ev.title}
                    </Link>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {displayEvidenceSourceType(ev.source.source_type)} · {ev.source.captured_at.slice(0, 10)}
                      {ev.file?.sha256 && ` · ${ev.file.sha256.slice(0, 16)}…`}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {linkedClaims.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Linked claims</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {linkedClaims.map((c) => (
                  <li key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: 14 }}>
                    {(c.title ?? c.text).slice(0, 100)}{(c.title ?? c.text).length > 100 ? "…" : ""}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {derivedEvidence.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Derived evidence from claims</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                Not counted as event evidence-backed.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {derivedEvidence.map((ev) => (
                  <li key={ev.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                    <Link href={`/inv/${invId}/evidence/${ev.id}`}>{ev.title}</Link>
                    {ev.file?.sha256 && (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}> · {ev.file.sha256.slice(0, 16)}…</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {event.location && (
            <section style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>Location</h3>
              <p style={{ margin: "0 0 4px" }}>{event.location.label}</p>
              {event.location.geometry.type === "Point" && (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  {event.location.geometry.coordinates[1].toFixed(5)}, {event.location.geometry.coordinates[0].toFixed(5)}
                  {event.location.accuracy_m != null && ` · ±${event.location.accuracy_m}m`}
                </p>
              )}
              {(event.location.evidence_ids?.length ?? 0) > 0 && (
                <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                  Evidence: {event.location.evidence_ids!.length}
                  <span style={{ marginLeft: 6 }}>
                    <EvidenceBackedBadge evidenceBacked={isEvidenceBacked(event.location.evidence_ids, caseFile)} size={13} />
                  </span>
                </p>
              )}
            </section>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button type="button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" onClick={handleDelete} disabled={saving} style={{ color: "var(--danger)" }}>
              Delete
            </button>
          </div>
        </div>
      )}
    </>
  );
}
