import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check env vars
    const envCheck = {
      AUTH_SECRET: !!process.env.AUTH_SECRET,
      AUTH_GOOGLE_ID: !!process.env.AUTH_GOOGLE_ID,
      AUTH_GOOGLE_SECRET: !!process.env.AUTH_GOOGLE_SECRET,
      AUTH_URL: process.env.AUTH_URL || "not set",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || "not set",
    };

    // Try importing auth
    let authError = null;
    try {
      const { auth } = await import("@/lib/auth");
      const session = await auth();
      return NextResponse.json({ envCheck, session, authError: null });
    } catch (e: unknown) {
      authError = e instanceof Error ? { message: e.message, stack: e.stack } : String(e);
    }

    return NextResponse.json({ envCheck, authError });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
