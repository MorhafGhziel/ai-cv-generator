import { NextResponse } from "next/server";
import { handler, readJson, requireUserId } from "@/lib/api";
import { cvDataSchema } from "@/lib/cv-data";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Replaces the base profile. The body is validated against the full CV schema
 * before it touches the database — previously any JSON at all was accepted and
 * written straight into `cvProfile`, which could leave the app rendering a
 * profile with no name.
 */
export const PUT = handler(async (req) => {
  const userId = await requireUserId();
  const profile = await readJson(req, cvDataSchema);

  await prisma.user.update({
    where: { id: userId },
    data: { cvProfile: profile },
  });

  return NextResponse.json({ success: true, profile });
});
