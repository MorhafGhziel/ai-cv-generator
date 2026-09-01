import { NextResponse } from "next/server";
import { ApiError, handler, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;

  // Scoping the lookup by userId means a wrong id and someone else's id are
  // indistinguishable from the outside.
  const entry = await prisma.cvEntry.findFirst({
    where: { id, userId },
    select: {
      id: true,
      jobSnippet: true,
      jobDescription: true,
      targetCompany: true,
      targetRole: true,
      cvData: true,
      answers: true,
      createdAt: true,
    },
  });

  if (!entry) throw new ApiError(404, "That application no longer exists.");
  return NextResponse.json(entry);
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const userId = await requireUserId();
  const { id } = await params;

  // deleteMany scoped by userId does the ownership check and the delete in one
  // atomic statement, closing the read-then-write gap of a findUnique + delete.
  const { count } = await prisma.cvEntry.deleteMany({ where: { id, userId } });
  if (count === 0) throw new ApiError(404, "That application no longer exists.");

  return NextResponse.json({ success: true });
});
