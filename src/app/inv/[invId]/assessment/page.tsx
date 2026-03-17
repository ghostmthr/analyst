"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useCase } from "@/contexts/CaseContext";

export default function AssessmentPage() {
  const params = useParams();
  const invId = params.invId as string;
  const { caseFile } = useCase();

  const inv = caseFile?.investigations.find((i) => i.id === invId);
  const groups = (caseFile?.analysis?.hypothesis_groups ?? []).filter(
    (g) => g.investigation_id === invId
  );
  const entities = caseFile?.entities.filter((e) => e.investigation_id === invId) ?? [];

  if (!caseFile) return <p>No case loaded.</p>;
  if (!inv) return <p>Investigation not found.</p>;

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/inv/${invId}`} style={{ fontSize: 14, color: "var(--text-muted)" }}>
          ← Investigation
        </Link>
        <h1 style={{ marginTop: 8, marginBottom: 4 }}>Assessment</h1>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>{inv.title}</p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
          {groups.length} hypothesis group{groups.length !== 1 ? "s" : ""}
        </p>
        <Link
          href={`/inv/${invId}/assessment/new`}
          style={{
            padding: "8px 16px",
            background: "var(--blue)",
            color: "white",
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          New hypothesis group
        </Link>
      </div>

      {groups.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>No hypothesis groups yet. Create one to start analysis.</p>
      ) : (
        <div className="analyst-tableWrap">
          <table className="analyst-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Target entity</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const target = g.target_entity_id
                  ? entities.find((e) => e.id === g.target_entity_id)
                  : null;
                return (
                  <tr key={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px" }}>{g.name}</td>
                    <td style={{ padding: "12px" }}>{g.status}</td>
                    <td style={{ padding: "12px" }}>{target?.name ?? "—"}</td>
                    <td style={{ padding: "12px" }}>{g.updated_at.slice(0, 10)}</td>
                    <td style={{ padding: "12px" }}>
                      <Link href={`/inv/${invId}/assessment/${g.id}`} style={{ fontSize: 14 }}>
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
