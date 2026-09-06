import { NextResponse } from "next/server";
import { z } from "zod";
import { ApiError, handler, readJson, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { operationsSchema } from "@/lib/pdf-ops";

export const runtime = "nodejs";

/**
 * The editor's saved work.
 *
 * Operations are stored rather than an edited file, so the upload stays
 * pristine: every export replays the list onto the same original bytes, saves
 * cannot compound on each other, and clearing the list is a true revert rather
 * than a best-effort undo.
 */

export const GET = handler(async () => {
  const userId = await requireUserId();

  const record = await prisma.originalDocument.findUnique({
    where: { userId },
    select: { edits: true, editsAt: true },
  });

  if (!record) throw new ApiError(404, "You haven't uploaded a CV yet.");

  // Rows written before this column existed, or by an older client, must not
  // break the editor — an unreadable list is simply no saved work.
  const parsed = operationsSchema.safeParse(record.edits ?? []);

  return NextResponse.json({
    operations: parsed.success ? parsed.data : [],
    savedAt: parsed.success && parsed.data.length > 0 ? record.editsAt : null,
  });
});

const bodySchema = z.object({ operations: operationsSchema });

export const PUT = handler(async (req) => {
  const userId = await requireUserId();
  const { operations } = await readJson(req, bodySchema);

  const { count } = await prisma.originalDocument.updateMany({
    where: { userId },
    data: {
      edits: operations,
      // Null rather than a timestamp when empty, so "no saved work" is a single
      // state the client can test rather than two.
      editsAt: operations.length > 0 ? new Date() : null,
    },
  });

  if (count === 0) throw new ApiError(404, "You haven't uploaded a CV yet.");

  return NextResponse.json({ saved: operations.length, savedAt: new Date().toISOString() });
});
