import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  debug: true,
  logger: {
    error(error) {
      console.error("[AUTH ERROR]", error);
    },
    warn(code) {
      console.warn("[AUTH WARN]", code);
    },
    debug(code, metadata) {
      console.log("[AUTH DEBUG]", code, metadata);
    },
  },
});
