"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirect legacy /timeline to /events for unified naming. */
export default function TimelineRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;

  useEffect(() => {
    router.replace(`/inv/${invId}/events`);
  }, [router, invId]);

  return <p style={{ padding: 24, color: "var(--text-muted)" }}>Redirecting to Events…</p>;
}
