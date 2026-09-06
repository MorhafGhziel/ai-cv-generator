import { NextResponse } from "next/server";
import { ApiError, handler, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { extractLayout } from "@/lib/pdf-layout";
import { toEditableBoxes } from "@/lib/pdf-compose";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * Every text line in the stored PDF, with its position — what the canvas
 * editor overlays on the rendered page so lines can be selected, retyped,
 * dragged or deleted.
 *
 * Page dimensions come along because the client renders at its own scale and
 * needs the PDF's own coordinate space to convert back on save.
 */
export const GET = handler(async () => {
  const userId = await requireUserId();

  const record = await prisma.originalDocument.findUnique({
    where: { userId },
    select: { filename: true, bytes: true },
  });

  if (!record) throw new ApiError(404, "You haven't uploaded a CV yet.");

  const layout = await extractLayout(new Uint8Array(record.bytes));

  return NextResponse.json({
    filename: record.filename,
    pages: layout.pages.map((page) => ({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
    })),
    boxes: toEditableBoxes(layout),
  });
});
