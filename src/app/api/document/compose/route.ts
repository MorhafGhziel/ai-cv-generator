import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, readJson, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { composePdf } from "@/lib/pdf-compose";
import { operationsSchema } from "@/lib/pdf-ops";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({ operations: operationsSchema });

/**
 * Replays the editor's operations onto a copy of the stored PDF and returns it.
 *
 * The original is never modified, so the editor is undoable by construction:
 * discarding the operation list restores the document exactly. That also means
 * a session can be exported repeatedly without drift, since every export starts
 * from the same bytes rather than compounding on the last result.
 */
export const POST = handler(async (req) => {
  const userId = await requireUserId();
  const { operations } = await readJson(req, bodySchema);

  if (operations.length === 0) {
    throw new ApiError(400, "There are no changes to save.");
  }

  const record = await prisma.originalDocument.findUnique({
    where: { userId },
    select: { filename: true, bytes: true },
  });

  if (!record) throw new ApiError(404, "You haven't uploaded a CV yet.");

  let result;
  try {
    result = await composePdf(new Uint8Array(record.bytes), operations);
  } catch (error) {
    console.error("[document/compose] failed:", error);
    throw new ApiError(422, "We couldn't build that PDF. Your original is unchanged.");
  }

  const applied = result.outcomes.filter((o) => o.applied).length;

  return NextResponse.json({
    applied,
    total: result.outcomes.length,
    // Per-operation outcomes, because a refusal is a fact about the document
    // and the user needs to know which change didn't land, and why.
    outcomes: result.outcomes,
    filename: record.filename.replace(/\.pdf$/i, "") + "-edited.pdf",
    pdf: Buffer.from(result.bytes).toString("base64"),
  });
});
