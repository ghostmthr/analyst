"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useCase } from "@/contexts/CaseContext";
import { displayEntityType,ENTITY_TYPE_OPTIONS } from "@/lib/labelRegistry";
import { getRiskFlagLabel } from "@/lib/riskFlagLookup";
import { RISK_FLAGS } from "@/lib/riskFlags";
import type { EntityType } from "@/types";

export default function TargetsPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const { caseFile } = useCase();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<EntityType | "">("");
  const [riskTagFilter, setRiskTagFilter] = useState<string>("");

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const allEntities = useMemo(
    () => caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [],
    [caseFile?.entities, invId]
  );

  const entities = useMemo(() => {
    let list = allEntities;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((e) => e.name?.toLowerCase().includes(q));
    }
    if (typeFilter) {
      list = list.filter((e) => e.type === typeFilter);
    }
    if (riskTagFilter) {
      const key = riskTagFilter.toLowerCase();
      list = list.filter(
        (e) => e.risk_tags?.some((t) => t.toLowerCase() === key)
      );
    }
    return list;
  }, [allEntities, searchQuery, typeFilter, riskTagFilter]);

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
          <h1 style={{ marginBottom: 8 }}>Targets</h1>
          {inv && (
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              {inv.title} — {entities.length} target{entities.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <Link href={`/inv/${invId}/targets/new`} className="analyst-btnPrimary">
          ADD TARGET
        </Link>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
        <input
          type="search"
          className="analyst-filterControl"
          placeholder="SEARCH"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ minWidth: 160 }}
          aria-label="Search targets"
        />
        <select
          className="analyst-filterControl"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EntityType | "")}
          style={{ minWidth: 160 }}
          aria-label="Entity type"
        >
          <option value="">Entity type</option>
          {ENTITY_TYPE_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="analyst-filterControl"
          value={riskTagFilter}
          onChange={(e) => setRiskTagFilter(e.target.value)}
          style={{ minWidth: 220 }}
          aria-label="Risk tag"
        >
          <option value="">Risk tag</option>
          {RISK_FLAGS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label} — {f.category}
            </option>
          ))}
        </select>
      </div>

      <div className="analyst-tableWrap">
        <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>NAME</th>
              <th>ENTITY TYPE</th>
              <th>RISK TAGS</th>
              <th>UPDATED</th>
              <th>LOCATIONS</th>
            </tr>
          </thead>
          <tbody>
            {entities.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, color: "var(--text-muted)" }}>
                  No targets yet.
                </td>
              </tr>
            ) : (
              entities.map((e) => (
                <tr
                  key={e.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onClick={() => router.push(`/inv/${invId}/targets/${e.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      router.push(`/inv/${invId}/targets/${e.id}`);
                    }
                  }}
                >
                  <td style={{ padding: "12px" }}>
                    <Link
                      href={`/inv/${invId}/targets/${e.id}`}
                      onClick={(ev) => ev.stopPropagation()}
                      style={{ fontWeight: 500 }}
                    >
                      {e.name}
                    </Link>
                  </td>
                  <td style={{ padding: "12px" }}>{displayEntityType(e.type)}</td>
                  <td style={{ padding: "12px" }}>
                    {e.risk_tags?.length
                      ? e.risk_tags.map(getRiskFlagLabel).join(", ")
                      : "—"}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {e.updated_at.slice(0, 10)}
                  </td>
                  <td style={{ padding: "12px" }}>
                    {e.locations?.length ?? 0}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
