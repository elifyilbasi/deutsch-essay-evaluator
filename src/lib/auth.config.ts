import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/write", "/essays"];

/**
 * The subset of the Auth.js config that src/proxy.ts needs: no Prisma adapter, and no
 * providers.
 *
 * The split was originally forced — the adapter and the Credentials provider both pull in
 * Node.js-only modules, and middleware ran on the Edge runtime. Neither half of that is
 * still true: the Credentials provider is gone with password sign-in, and this project's
 * proxy runs on the Node runtime.
 *
 * It stays because of what it now buys instead. The proxy runs on every request to a
 * protected route, and it only ever needs to read a JWT and answer `authorized` — so
 * keeping the adapter out means Prisma and a database connection are not dragged into
 * that path at all. Providers are absent for the same reason: nothing here starts an
 * OAuth flow.
 *
 * The full config, with the adapter and the Google provider, is in auth.ts, and is what
 * API routes and server components use.
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
