import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { syncUser, loginUser } from "@/lib/api-client";

// ── Session lifetime constants ────────────────────────────────────────────────
// The JWT cookie always lives 60 days (maximum — for mobile).
// Web browsers enforce a shorter 30-day limit client-side via SessionGuard.
const SESSION_MAX_AGE  = 60 * 24 * 60 * 60; // 60 days (mobile)
const ACCESS_TOKEN_TTL = 15 * 60 * 1000;    // 15-minute access token window

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    // ── Email / Password ────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        try {
          const result = await loginUser({
            email:    credentials.email,
            password: credentials.password,
          });
          return {
            id:    result.id,
            name:  result.name,
            email: result.email,
            image: result.image || null,
          };
        } catch (error: any) {
          throw new Error(error?.message || "Invalid credentials");
        }
      },
    }),

    // ── Google Sign-In (Capacitor native mobile) ────────────────────────
    CredentialsProvider({
      id:   "google-native",
      name: "Google Native",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        try {
          const res  = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${credentials.idToken}`
          );
          const data = await res.json();

          if (data.error || !data.email) throw new Error("Invalid Google token");

          try {
            await syncUser({
              id:    data.sub,
              email: data.email,
              name:  data.name,
              image: data.picture,
            });
          } catch (syncErr) {
            console.error("Failed to sync Google Native user:", syncErr);
          }

          return {
            id:    data.sub,
            name:  data.name,
            email: data.email,
            image: data.picture,
          };
        } catch (error) {
          console.error("Google Native Auth Error:", error);
          throw new Error("Failed to authenticate with Google");
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email && user.id) {
        try {
          await syncUser({
            id:    user.id,
            email: user.email,
            name:  user.name  ?? undefined,
            image: user.image ?? undefined,
          });
        } catch (error) {
          console.error("Error syncing Google user to backend:", error);
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      // ── Initial sign-in ─────────────────────────────────────────────
      if (user) {
        token.userId             = user.id;
        token.provider           = account?.provider || "credentials";
        token.loginAt            = Date.now(); // ← used by web SessionGuard
        token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL;
        return token;
      }

      // ── Access token still valid ────────────────────────────────────
      if (Date.now() < (token.accessTokenExpires as number ?? 0)) {
        return token;
      }

      // ── Rotate access token silently (60-day session cookie untouched) ─
      token.accessTokenExpires = Date.now() + ACCESS_TOKEN_TTL;
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id                 = token.userId || token.sub;
        (session.user as any).provider           = token.provider;
        (session.user as any).loginAt            = token.loginAt;      // for web limit
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
    maxAge:    SESSION_MAX_AGE, // 60 days — full duration for mobile
    updateAge: 60 * 60,        // refresh cookie hourly while app is open
  },

  jwt: {
    maxAge: SESSION_MAX_AGE,
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
