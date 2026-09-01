import { NextResponse } from "next/server";
import { handler, readJson, requireUserId } from "@/lib/api";
import { cvDataSchema } from "@/lib/cv-data";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export const POST = handler(async (req) => {
  const userId = await requireUserId();
  const profile = await readJson(req, cvDataSchema);

  await prisma.user.update({
    where: { id: userId },
    data: { cvProfile: profile, onboardingComplete: true },
  });

  return NextResponse.json({ success: true });
});
