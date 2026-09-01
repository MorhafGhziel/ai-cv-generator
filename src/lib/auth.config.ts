import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * Adapter-free config, shared with the edge proxy. Anything requiring
 * Prisma belongs in `auth.ts`, which only ever runs in the Node runtime.
 */
export const authConfig: NextAuthConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    jwt({ token, user }) {
      // `user` is only populated on the sign-in pass.
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
};
