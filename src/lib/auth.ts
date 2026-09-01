import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
/**
 * Off by default, even locally.
 *
 * Auth.js `debug` dumps the entire provider config on every sign-in — including
 * `clientSecret` in plain text — plus PKCE verifiers and tokens. That lands in
 * terminal scrollback and anywhere logs are pasted. Turn it on deliberately
 * with AUTH_DEBUG=true for one session, not permanently.
 */
const debugEnabled = process.env.AUTH_DEBUG === "true";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  debug: debugEnabled,
  logger: {
    error(error) {
      // Auth.js wraps the real failure — a database timeout, a bad credential —
      // inside `cause`, and its own `message` is only a docs link. Logging just
      // the message turns any adapter failure into an unactionable
      // "Read more at errors.authjs.dev", so the cause is unwrapped here.
      console.error("[auth]", error.name, error.message.split("\n")[0]);

      const cause = (error as Error & { cause?: unknown }).cause;
      if (cause) {
        const inner =
          cause instanceof Error
            ? cause
            : typeof cause === "object" && cause !== null && "err" in cause
              ? (cause as { err: unknown }).err
              : cause;
        console.error("[auth] caused by:", inner instanceof Error ? inner.message : inner);
      }
    },
    warn(code) {
      console.warn("[auth]", code);
    },
    debug(code, metadata) {
      if (debugEnabled) console.log("[auth]", code, metadata);
    },
  },
});
