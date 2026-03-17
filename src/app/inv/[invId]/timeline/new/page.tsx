"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/** Redirect legacy /timeline/new to /events/new, preserving query params. */
export default function TimelineNewRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invId = params.invId as string;

  useEffect(() => {
    const q = searchParams.toString();
    router.replace(`/inv/${invId}/events/new${q ? `?${q}` : ""}`);
  }, [router, invId, searchParams]);

  return <p style={{ padding: 24, color: "var(--text-muted)" }}>Redirecting…</p>;
}
