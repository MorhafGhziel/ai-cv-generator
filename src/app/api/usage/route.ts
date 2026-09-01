import { NextResponse } from "next/server";
import { handler, requireUserId } from "@/lib/api";
import { getUsageSummary } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Remaining free-tier allowance, so the UI can show it before a user hits a wall. */
export const GET = handler(async () => {
  const userId = await requireUserId();
  return NextResponse.json(await getUsageSummary(userId));
});
