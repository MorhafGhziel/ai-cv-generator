import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, readJson, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { applyPdfEdits, type PdfEdit } from "@/lib/pdf-edit";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  edits: z
    .array(
      z.object({
        kind: z.enum(["replace", "append"]),
        target: z.string().trim().min(1).max(300),
        value: z.string().trim().max(300),
        separator: z.string().max(12).optional(),
      }),
    )
    .min(1, "Nothing to change.")
    .max(12, "That's more changes than one pass can safely make."),
  /** When false the edited file is discarded — used to preview outcomes only. */
  download: z.boolean().default(true),
});

/**
 * Applies edits inside the user's own PDF, leaving its design untouched.
 *
 * Never mutates the stored original: edits are applied to a copy and returned.
 * The stored file remains the pristine thing the user uploaded, so a bad edit
 * is always one download away from being undone.
 */
export const POST = handler(async (req) => {
  const userId = await requireUserId();
  const { edits, download } = await readJson(req, bodySchema);

  const record = await prisma.originalDocument.findUnique({
    where: { userId },
    select: { filename: true, bytes: true },
  });

  if (!record) throw new ApiError(404, "You haven't uploaded a CV yet.");

  let result;
  try {
    result = await applyPdfEdits(new Uint8Array(record.bytes), edits as PdfEdit[]);
  } catch (error) {
    console.error("[document/edit] pdf edit failed:", error);
    throw new ApiError(422, "We couldn't edit that PDF. Your original is unchanged.");
  }

  const applied = result.outcomes.filter((o) => o.applied).length;

  // Reporting per-edit outcomes matters more than a single pass/fail: an edit
  // that could not fit is a fact about the document, and the user needs to know
  // which one, and why.
  const outcomes = result.outcomes.map((o) => ({
    target: o.edit.target,
    value: o.edit.value,
    kind: o.edit.kind,
    applied: o.applied,
    reason: o.reason,
  }));

  if (!download || applied === 0) {
    return NextResponse.json({ applied, total: edits.length, outcomes });
  }

  return NextResponse.json({
    applied,
    total: edits.length,
    outcomes,
    filename: record.filename.replace(/\.pdf$/i, "") + "-edited.pdf",
    // Base64 keeps the outcome report and the file in one response, so the UI
    // can explain a partial success instead of silently downloading less than
    // the user asked for.
    pdf: Buffer.from(result.bytes).toString("base64"),
  });
});
