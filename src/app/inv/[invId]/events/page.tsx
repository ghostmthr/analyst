"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect,useMemo, useState } from "react";

import EventsTable from "@/components/EventsTable";
import { useCase } from "@/contexts/CaseContext";
import { isEvidenceBacked } from "@/lib/evidence";
import { EVENT_TYPE_OPTIONS } from "@/lib/labelRegistry";
import type { EventType } from "@/types";

type SortOrder = "newest" | "oldest";

export default function EventsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const invId = params.invId as string;
  const { caseFile } = useCase();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [typeFilter, setTypeFilter] = useState<EventType | "">("");
  const [entityIdFilter, setEntityIdFilter] = useState("");
  const entityFromUrl = searchParams.get("entity") ?? "";
  useEffect(() => {
    if (entityFromUrl) setEntityIdFilter(entityFromUrl);
  }, [entityFromUrl]);
  const [evidenceBackedOnly, setEvidenceBackedOnly] = useState(false);
  const [minConfidencePct, setMinConfidencePct] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const invEntities = useMemo(
    () => caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.entities, invId]
  );

  const eventsRaw = useMemo(
    () => (caseFile?.events ?? []).filter((e) => e.investigation_id === invId),
    [caseFile, invId]
  );

  const events = useMemo(() => {
    let list = eventsRaw;
    if (dateFrom) list = list.filter((e) => e.date >= dateFrom);
    if (dateTo) list = list.filter((e) => e.date <= dateTo);
    if (entityIdFilter) {
      list = list.filter((e) => e.entity_ids?.includes(entityIdFilter));
    }
    if (typeFilter) {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (evidenceBackedOnly) {
      list = list.filter((e) => isEvidenceBacked(e.evidence_ids, caseFile!));
    }
    if (minConfidencePct > 0) {
      const min = minConfidencePct / 100;
      list = list.filter((e) => (e.confidence?.score ?? 0) >= min);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.text.toLowerCase().includes(q) ||
          (e.title?.toLowerCase().includes(q) ?? false)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return sortOrder === "newest" ? -d : d;
    });
    return sorted;
  }, [
    eventsRaw,
    caseFile,
    dateFrom,
    dateTo,
    entityIdFilter,
    typeFilter,
    evidenceBackedOnly,
    minConfidencePct,
    searchText,
    sortOrder,
  ]);

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <Link href={`/inv/${invId}`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
            ← Investigation
          </Link>
          <h1 className="analyst-pageTitle" style={{ marginTop: 8, marginBottom: 4 }}>
            Events
          </h1>
          {inv && (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              {inv.title} — {events.length} event{events.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link href={`/inv/${invId}/events/new`} className="analyst-btnPrimary">
          NEW EVENT
        </Link>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          marginBottom: 16,
          padding: "12px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <input
          type="date"
          className="analyst-filterControl"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          aria-label="From date"
          style={{ minWidth: 140 }}
        />
        <input
          type="date"
          className="analyst-filterControl"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          aria-label="To date"
          style={{ minWidth: 140 }}
        />
        <input
          type="text"
          className="analyst-filterControl"
          placeholder="SEARCH"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ minWidth: 160 }}
          aria-label="Search event text"
        />
        <select
          className="analyst-filterControl"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          style={{ minWidth: 140 }}
          aria-label="Sort order"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <select
          className="analyst-filterControl"
          value={minConfidencePct}
          onChange={(e) => setMinConfidencePct(Number(e.target.value))}
          style={{ minWidth: 100 }}
          aria-label="Min confidence"
        >
          {[0, 25, 50, 75, 100].map((pct) => (
            <option key={pct} value={pct}>
              Min conf {pct}%
            </option>
          ))}
        </select>
        <select
          className="analyst-filterControl"
          value={typeFilter}
          onChange={(e) => setTypeFilter((e.target.value || "") as EventType | "")}
          style={{ minWidth: 160 }}
          aria-label="Event type"
        >
          <option value="">Type</option>
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="analyst-filterControl"
          value={entityIdFilter}
          onChange={(e) => setEntityIdFilter(e.target.value || "")}
          style={{ minWidth: 160 }}
          aria-label="Entity"
        >
          <option value="">Entity</option>
          {invEntities.map((ent) => (
            <option key={ent.id} value={ent.id}>
              {ent.name}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={evidenceBackedOnly}
            onChange={(e) => setEvidenceBackedOnly(e.target.checked)}
          />
          <span style={{ fontSize: 14 }}>Evidence-backed only</span>
        </label>
      </div>

      <EventsTable
        events={events}
        invId={invId}
        invEntities={invEntities}
        caseFile={caseFile}
        variant="full"
        emptyMessage="No events match filters."
      />
    </>
  );
}
