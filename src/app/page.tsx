"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCase } from "@/contexts/CaseContext";

export default function HomePage() {
  const { caseFile, loadError, openCaseFolder, initCaseInFolder, createInvestigation } = useCase();
  const router = useRouter();
  const [initTitle, setInitTitle] = useState("");
  const [invTitle, setInvTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const handleOpen = async () => {
    await openCaseFolder();
  };

  const handleInitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = initTitle.trim() || "Untitled Case";
    await initCaseInFolder(title);
  };

  const handleCreateInv = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = invTitle.trim();
    if (!t || !caseFile) return;
    setCreating(true);
    try {
      const next = await createInvestigation({ title: t });
      if (next) {
        const inv = next.investigations[next.investigations.length - 1];
        if (inv) router.push(`/inv/${inv.id}/targets`);
      }
    } finally {
      setCreating(false);
    }
  };

  const showInitForm =
    loadError === "No case.json found in this folder." && !caseFile;

  // No case loaded: show open case / create case
  if (!caseFile) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <h1 style={{ marginBottom: 8, fontSize: 24 }}>Analyst</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          Open a case folder to continue.
        </p>

        {loadError && loadError !== "No case.json found in this folder." && (
          <p style={{ color: "var(--danger)", marginBottom: 16 }}>{loadError}</p>
        )}

        {showInitForm ? (
          <form onSubmit={handleInitCase} style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 280 }}>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              This folder has no case. Create a new case:
            </p>
            <input
              type="text"
              placeholder="Case title"
              value={initTitle}
              onChange={(e) => setInitTitle(e.target.value)}
              style={{ padding: "8px 12px" }}
            />
            <button type="submit" style={{ padding: "8px 16px" }}>
              Create case
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={handleOpen}
            style={{ padding: "12px 24px", fontSize: 16 }}
          >
            Open case folder
          </button>
        )}
      </main>
    );
  }

  // Case loaded: show investigations list
  const investigations = caseFile.investigations;
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <h1 style={{ marginBottom: 8 }}>Investigations</h1>
      <p className="analyst-detailLineMuted" style={{ marginBottom: 24 }}>
        Case: {caseFile.case.title}
      </p>

      <form
        onSubmit={handleCreateInv}
        style={{ display: "flex", gap: 8, marginBottom: 24 }}
      >
        <input
          type="text"
          placeholder="New investigation title"
          value={invTitle}
          onChange={(e) => setInvTitle(e.target.value)}
          style={{ flex: 1, padding: "8px 12px", minHeight: "var(--input-height)" }}
        />
        <button type="submit" disabled={creating} className="analyst-btnPrimary">
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      <ul className="analyst-listReset">
        {investigations.length === 0 ? (
          <li className="analyst-emptyState">No investigations yet.</li>
        ) : (
          investigations.map((inv) => (
            <li
              key={inv.id}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <Link
                href={`/inv/${inv.id}/targets`}
                style={{ fontWeight: 500, display: "block" }}
              >
                {inv.title}
              </Link>
              <span className="analyst-detailLineMuted" style={{ fontSize: 12, display: "block" }}>
                {inv.status} · {(inv.updated_at ?? inv.created_at ?? "").slice(0, 10)}
                {inv.lead ? ` · ${inv.lead}` : ""}
              </span>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
