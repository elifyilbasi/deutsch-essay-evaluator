import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/write", "/essays"];

/**
 * Edge-safe subset of the Auth.js config: no Prisma adapter and no
 * Credentials provider here, since both pull in Node.js-only modules
 * that can't run in the Edge middleware runtime. The full config
 * (with adapter + provider) lives in auth.ts and is used everywhere
 * else (API routes, server components), which run on the Node runtime.
 */
export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix),
      );
      return isProtected ? Boolean(auth?.user) : true;
    },
  },
};
