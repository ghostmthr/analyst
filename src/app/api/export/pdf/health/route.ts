/**
 * Health check: local Playwright or remote PDF service reachable.
 * GET /api/export/pdf/health -> { ok, backend?, code?, message? }
 */

import { NextResponse } from "next/server";
import { chromium } from "playwright";

import { getPdfBackend, getPdfRemoteServiceUrl } from "@/lib/config";

export const dynamic = "force-dynamic";

const MINIMAL_HTML = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><p>health</p></body></html>";

export async function GET() {
  const backend = getPdfBackend();
  if (backend === "disabled") {
    return NextResponse.json({ ok: false, code: "PDF_DISABLED", backend });
  }

  if (backend === "remote_service") {
    const url = getPdfRemoteServiceUrl();
    if (!url) {
      return NextResponse.json({
        ok: false,
        code: "REMOTE_UNREACHABLE",
        backend: "remote_service",
        message: "ANALYST_PDF_SERVICE_URL is not set",
      });
    }
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html: MINIMAL_HTML }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return NextResponse.json({
          ok: false,
          code: "REMOTE_ERROR",
          backend: "remote_service",
          message: err?.message ?? err?.error ?? `Remote returned ${res.status}`,
        });
      }
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/pdf")) {
        return NextResponse.json({
          ok: false,
          code: "REMOTE_ERROR",
          backend: "remote_service",
          message: "Remote did not return application/pdf",
        });
      }
      return NextResponse.json({ ok: true, backend: "remote_service" });
    } catch (e) {
      const message =
        e instanceof Error && e.name === "AbortError"
          ? "Remote PDF service timed out (12s)"
          : e instanceof Error
            ? e.message
            : "Network error";
      return NextResponse.json({
        ok: false,
        code: "REMOTE_UNREACHABLE",
        backend: "remote_service",
        message,
      });
    }
  }

  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent("<html><body><p>test</p></body></html>", { waitUntil: "load" });
      await page.pdf({ format: "A4" });
      return NextResponse.json({ ok: true, backend: "local_playwright" });
    } finally {
      await browser.close();
    }
  } catch {
    return NextResponse.json({ ok: false, code: "PLAYWRIGHT_UNAVAILABLE", backend });
  }
}
