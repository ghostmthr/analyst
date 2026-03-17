"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Redirect legacy /timeline/[eventId] to /events/[eventId]. */
export default function TimelineEventRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;
  const eventId = params.eventId as string;

  useEffect(() => {
    router.replace(`/inv/${invId}/events/${eventId}`);
  }, [router, invId, eventId]);

  return <p style={{ padding: 24, color: "var(--text-muted)" }}>Redirecting to event…</p>;
}
