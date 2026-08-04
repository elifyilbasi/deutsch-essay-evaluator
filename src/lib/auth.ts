import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      // Attaches a Google identity to an existing user with the same address instead of
      // refusing with OAuthAccountNotLinked.
      //
      // Off by default, and rightly: linking on a claimed email address lets anyone who
      // can *assert* an address take over the account holding it. It is safe for this
      // provider specifically, because Google verifies the address it returns — which is
      // the exact case the flag exists for. It must not be copied onto a provider that
      // does not.
      //
      // Without it, the accounts that predate Google sign-in are stranded: the person
      // either cannot get in at all, or silently becomes a second, empty user while
      // their essays stay attached to the first.
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
