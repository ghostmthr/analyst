import "./globals.css";

import type { Metadata } from "next";

import { Providers } from "./Providers";

export const metadata: Metadata = {
  title: "Analyst",
  description: "Analyst v1 — Investigative management system. Local-first, file-authoritative.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="analyst-app">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
