"use client";

import { CaseProvider } from "@/contexts/CaseContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <CaseProvider>{children}</CaseProvider>;
}
