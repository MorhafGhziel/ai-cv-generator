import { NextResponse } from "next/server";
import { handler, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Returns the user's applications for the dashboard list.
 *
 * `jobDescription` is deliberately excluded — it can run to thousands of words
 * per entry and the list never renders it. The detail route serves it on demand.
 */
export const GET = handler(async () => {
  const userId = await requireUserId();

  const entries = await prisma.cvEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      jobSnippet: true,
      targetCompany: true,
      targetRole: true,
      createdAt: true,
      cvData: true,
      answers: true,
    },
  });

  return NextResponse.json(entries);
});
