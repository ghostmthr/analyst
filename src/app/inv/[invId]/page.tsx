"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InvRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const invId = params.invId as string;

  useEffect(() => {
    router.replace(`/inv/${invId}/targets`);
  }, [invId, router]);

  return <p style={{ padding: 24 }}>Redirecting…</p>;
}
