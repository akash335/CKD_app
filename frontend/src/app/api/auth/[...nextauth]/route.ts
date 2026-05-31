import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { loginUser } from "@/lib/api-client";

// ── Session lifetime constants ────────────────────────────────────────────────
// The JWT cookie lives 60 days for mobile-friendly sessions.
// Web browsers can enforce a shorter limit client-side via SessionGuard.
const SESSION_MAX_AGE = 60 * 24 * 60 * 60; // 60 days
const ACCESS_TOKEN_TTL = 15 * 60 * 1000; // 15 minutes

export const authOptions: NextAuthOptions = {
  providers: [
    // ── Email / Password Login ────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await loginUser({
            email: credentials.email,
            password: credentials.password,
          });

          return {
            id: result.id,
            name: result.name,
            email: result.email,
            image: result.image || null,
          };
        } catch (error: any) {
          throw new Error(error?.message || "Invalid credentials");
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account }) {
      // ── Initial sign-in ────────────────────────────────────────────────────
      if (user) {
        token.userId = user.id;
        token.provider = account?.provider || "credentials";
        token.loginAt = Date.now();
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL;
        return token;
      }

      // ── Access token still valid ───────────────────────────────────────────
      if (Date.now() < ((token.accessTokenExpires as number) ?? 0)) {
        return token;
      }

      // ── Rotate access token timestamp silently ─────────────────────────────
      token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId || token.sub;
        (session.user as any).provider = token.provider;
        (session.user as any).loginAt = token.loginAt;
        (session.user as any).accessTokenExpires = token.accessTokenExpires;
      }

      return session;
    },
  },

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE,
    updateAge: 60 * 60,
  },

  jwt: {
    maxAge: SESSION_MAX_AGE,
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };