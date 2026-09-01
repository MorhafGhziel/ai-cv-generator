import { NextResponse } from "next/server";
import { handler, readJson, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { preferencesSchema, toPreferences } from "@/lib/preferences";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true },
  });

  return NextResponse.json(toPreferences(user?.preferences));
});

export const PUT = handler(async (req) => {
  const userId = await requireUserId();
  const preferences = await readJson(req, preferencesSchema);

  await prisma.user.update({
    where: { id: userId },
    data: { preferences },
  });

  return NextResponse.json({ success: true, preferences });
});
