"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { PullToRefresh } from "./PullToRefresh";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * App-wide layout shell: iOS-safe header, main content, and clean public footer.
 */
export function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col theme-transition overflow-x-hidden">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/[0.03] blur-3xl" />
      </div>

      {/* Top navigation bar */}
      <header
        className="sticky top-0 z-50 border-b theme-border theme-transition"
        style={{
          background: "var(--bg-header)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)",
        }}
      >
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 px-4 pb-3 sm:px-6 lg:px-8">
          {/* Left brand */}
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center drop-shadow-md">
              <img
                src="/logo/logo.png"
                alt="CKD Guardian Logo"
                className="h-[150%] w-[150%] object-contain"
              />
            </div>

            {/* Hidden on very small screens to prevent overlap with iPhone status bar */}
            <span className="hidden xs:block sm:block truncate text-sm font-semibold tracking-tight theme-text">
              CKD Guardian
            </span>
          </Link>

          {/* Right nav */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center">
              <ThemeToggle />
            </div>

            <div className="flex h-8 w-8 items-center justify-center">
              <NotificationBell />
            </div>

            <div className="flex h-8 items-center justify-center">
              <LanguageSwitcher />
            </div>

            <Link
              href="/profile"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-700 text-[10px] font-bold text-white transition-all hover:ring-2 hover:ring-white/20 overflow-hidden"
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                session?.user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "U"
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <PullToRefresh>{children}</PullToRefresh>
      </main>

      {/* Public footer — no backend/database/version info shown to users */}
      <footer
        className="border-t theme-border py-4 theme-transition"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center text-center text-[11px] theme-text-faint">
            <span>© 2026 CKD Guardian. Built for better kidney health.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}