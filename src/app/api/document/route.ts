import { NextResponse } from "next/server";
import { ApiError, handler, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { extractLayout } from "@/lib/pdf-layout";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Values worth offering as editable. Each is a short, single-line field that
 * sits on its own — the only shape an in-place PDF edit can handle reliably,
 * because nothing in a PDF reflows.
 */
const DETECTORS: { field: string; label: string; pattern: RegExp }[] = [
  { field: "email", label: "Email", pattern: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  {
    field: "phone",
    label: "Phone",
    pattern: /\+?\(?\d[\d\s().-]{7,}\d/,
  },
  { field: "linkedin", label: "LinkedIn", pattern: /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/\S+/i },
  { field: "github", label: "GitHub", pattern: /(?:https?:\/\/)?(?:www\.)?github\.com\/\S+/i },
];

export interface DetectedValue {
  field: string;
  label: string;
  value: string;
  page: number;
  /** The full line it sits on, so the UI can show the surrounding context. */
  context: string;
}

/**
 * Describes the stored PDF: its size, and the values that can be edited in
 * place. Deliberately does not return the file itself — that is a separate
 * download so a large blob is not carried on every page load.
 */
export const GET = handler(async () => {
  const userId = await requireUserId();

  const record = await prisma.originalDocument.findUnique({
    where: { userId },
    select: { filename: true, byteSize: true, pageCount: true, uploadedAt: true, bytes: true },
  });

  if (!record) {
    return NextResponse.json({ exists: false });
  }

  const layout = await extractLayout(new Uint8Array(record.bytes));

  const detected: DetectedValue[] = [];
  const seen = new Set<string>();

  for (const page of layout.pages) {
    for (const line of page.lines) {
      for (const detector of DETECTORS) {
        if (seen.has(detector.field)) continue;
        const found = line.text.match(detector.pattern)?.[0];
        if (!found) continue;

        seen.add(detector.field);
        detected.push({
          field: detector.field,
          label: detector.label,
          value: found.trim().replace(/[.,;]$/, ""),
          page: page.pageNumber,
          context: line.text.slice(0, 160),
        });
      }
    }
  }

  // Fields the CV does not have yet — the "add my phone number" case. They are
  // offered as additions rather than replacements.
  const missing = DETECTORS.filter((d) => !seen.has(d.field)).map((d) => ({
    field: d.field,
    label: d.label,
  }));

  return NextResponse.json({
    exists: true,
    filename: record.filename,
    byteSize: record.byteSize,
    pageCount: record.pageCount,
    uploadedAt: record.uploadedAt,
    detected,
    missing,
    /** Anchors an addition can attach to, newest-first by position on page 1. */
    anchors: layout.pages[0].lines
      .filter((line) => line.text.trim().length > 3)
      .slice(0, 12)
      .map((line) => line.text.slice(0, 120)),
  });
});

/** Streams the stored PDF back, untouched. */
export const POST = handler(async () => {
  const userId = await requireUserId();

  const record = await prisma.originalDocument.findUnique({
    where: { userId },
    select: { filename: true, bytes: true },
  });

  if (!record) throw new ApiError(404, "You haven't uploaded a CV yet.");

  return new NextResponse(new Uint8Array(record.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${record.filename.replace(/"/g, "")}"`,
    },
  });
});
