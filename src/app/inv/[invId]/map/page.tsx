"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

import { useCase } from "@/contexts/CaseContext";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: 24, color: "var(--text-muted)" }}>Loading map…</div>
  ),
});

export default function MapPage() {
  const params = useParams();
  const invId = params.invId as string;
  const { caseFile } = useCase();

  const inv = caseFile?.investigations.find((i) => i.id === invId);

  if (!caseFile) {
    return <p style={{ padding: 24 }}>No case loaded.</p>;
  }
  if (!inv) {
    return <p style={{ padding: 24 }}>Investigation not found.</p>;
  }

  return <MapView invId={invId} />;
}
