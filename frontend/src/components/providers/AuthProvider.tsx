"use client";

import { SessionProvider, useSession, signOut } from "next-auth/react";
import { ReactNode, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Web browsers: sign out after 30 days (original default behaviour).
// Capacitor native (Android/iOS): stays signed in for the full 60 days.
const WEB_SESSION_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Enforces platform-specific session lifetimes:
 *  - Native mobile (Capacitor) → 60 days (no forced sign-out)
 *  - Web browser               → 30 days (original behaviour)
 *
 * The JWT itself always lives 60 days; this component enforces the shorter
 * web limit client-side by checking the `loginAt` timestamp stored in the token.
 */
function SessionGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Only runs in web browsers — skip on native Capacitor
    if (Capacitor.isNativePlatform()) return;
    if (status !== "authenticated" || !session) return;

    const loginAt = (session.user as any)?.loginAt as number | undefined;
    if (!loginAt) return;

    const age = Date.now() - loginAt;
    if (age > WEB_SESSION_LIMIT_MS) {
      // Session older than 30 days on web → sign out silently
      signOut({ callbackUrl: "/login" });
    }
  }, [session, status]);

  return <>{children}</>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}
