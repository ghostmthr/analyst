/**
 * API route: HTML → PDF via Playwright.
 * POST { html: string } -> application/pdf
 * Returns JSON errors with ok:false, code, message when PDF unavailable or render fails.
 */

import { NextResponse } from "next/server";
import { chromium } from "playwright";

import { getPdfBackend } from "@/lib/config";

const MAX_HTML_BYTES = 5 * 1024 * 1024; // 5MB

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isPlaywrightUnavailableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    /Executable doesn't exist|browserType\.launch|Could not find browser|ENOENT/i.test(msg) ||
    (msg.includes("chromium") && (msg.includes("not found") || msg.includes("missing")))
  );
}

export async function POST(req: Request) {
  if (getPdfBackend() === "disabled") {
    return NextResponse.json(
      { ok: false, code: "PDF_DISABLED", message: "PDF export is disabled." },
      { status: 503 }
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return NextResponse.json(
      { ok: false, code: "INVALID_REQUEST", message: "Content-Type must be application/json" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const html = typeof body.html === "string" ? body.html : "";
    if (!html) {
      return NextResponse.json(
        { ok: false, code: "INVALID_REQUEST", message: "Missing html" },
        { status: 400 }
      );
    }

    const htmlBytes = new TextEncoder().encode(html).length;
    if (htmlBytes > MAX_HTML_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          code: "PAYLOAD_TOO_LARGE",
          message: `HTML exceeds ${MAX_HTML_BYTES / 1024 / 1024}MB limit (got ${(htmlBytes / 1024 / 1024).toFixed(2)}MB).`,
        },
        { status: 413 }
      );
    }

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });
    } catch (e) {
      console.error("Playwright launch error:", e);
      if (isPlaywrightUnavailableError(e)) {
        return NextResponse.json(
          {
            ok: false,
            code: "PLAYWRIGHT_UNAVAILABLE",
            message:
              "PDF generation requires Chromium. Run: npm run setup:pdf — then retry. Or use Download HTML and print to PDF.",
          },
          { status: 501 }
        );
      }
      return NextResponse.json(
        {
          ok: false,
          code: "PDF_RENDER_FAILED",
          message: e instanceof Error ? e.message : "Chromium could not launch.",
        },
        { status: 500 }
      );
    }

    try {
      const page = await browser.newPage();
      await page.setContent(html, {
        waitUntil: "networkidle",
        timeout: 15000,
      });
      const pdf = await page.pdf({
        format: "A4",
        margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
        printBackground: true,
      });
      return new NextResponse(new Uint8Array(pdf), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="analyst-brief.pdf"',
        },
      });
    } catch (e) {
      console.error("PDF render error:", e);
      return NextResponse.json(
        {
          ok: false,
          code: "PDF_RENDER_FAILED",
          message: e instanceof Error ? e.message : "PDF render failed.",
        },
        { status: 500 }
      );
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error("PDF export error:", e);
    return NextResponse.json(
      {
        ok: false,
        code: "PDF_RENDER_FAILED",
        message: e instanceof Error ? e.message : "PDF generation failed.",
      },
      { status: 500 }
    );
  }
}
