import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

// The edge proxy runs the config without the Prisma adapter, which cannot
// run on the edge runtime. Session identity comes from the JWT alone.
const { auth } = NextAuth(authConfig);

/** Routes anyone may reach, signed in or not. */
const PUBLIC_ROUTES = new Set(["/", "/sign-in"]);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // NextAuth's own endpoints must stay reachable or sign-in can never complete.
  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();

  if (req.auth) return NextResponse.next();

  // An unauthenticated API call gets a JSON 401. Previously it was redirected
  // to the sign-in page, so `fetch(...).json()` on the client blew up parsing
  // an HTML document instead of surfacing "you're signed out".
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "You need to be signed in to do that." },
      { status: 401 },
    );
  }

  const signInUrl = new URL("/sign-in", req.nextUrl.origin);
  // Preserve where they were headed so sign-in can return them there.
  signInUrl.searchParams.set("callbackUrl", pathname + req.nextUrl.search);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: [
    // Everything except Next internals, the favicon, and static assets.
    // `_next` is excluded wholesale rather than just its static and image
    // subpaths, so dev-only endpoints such as HMR are never redirected.
    "/((?!_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|woff2?)$).*)",
  ],
};
