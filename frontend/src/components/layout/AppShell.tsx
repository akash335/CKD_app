"use client";

import { cn } from "@/lib/utils";
import { useHealthCheck } from "@/hooks/useHealthCheck";
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
 * App-wide layout shell: safe iOS header, ambient background, main content, and footer.
 */
export function AppShell({ children }: AppShellProps) {
  const { connected, loading: healthLoading, warming } = useHealthCheck();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col theme-transition mobile-no-overflow">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/[0.03] blur-3xl" />
      </div>

      {/* Top navigation bar */}
      <header
        className="sticky top-0 z-50 border-b theme-border theme-transition mobile-header-safe"
        style={{
          background: "var(--bg-header)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {/* Logo */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center drop-shadow-md">
              <img
                src="/logo/logo.png"
                alt="CKD Guardian Logo"
                className="h-[150%] w-[150%] object-contain"
              />
            </div>

            {/* Hide title on very small mobile screens to avoid notch/header overlap */}
            <span className="hidden sm:inline text-sm font-semibold tracking-tight theme-text truncate">
              CKD Guardian
            </span>

            <span className="hidden md:inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/20">
              BETA
            </span>
          </Link>

          {/* Right nav */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />
            <LanguageSwitcher />

            {/* User avatar */}
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
      <main className="relative flex-1 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 mobile-page-safe">
        <PullToRefresh>{children}</PullToRefresh>
      </main>

      {/* Footer */}
      <footer className="border-t theme-border py-4 theme-transition ios-safe-bottom">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] theme-text-faint">
            <span>© 2026 CKD Guardian. Built for better kidney health.</span>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    healthLoading
                      ? "bg-amber-400 animate-pulse"
                      : warming
                      ? "bg-amber-400 animate-pulse"
                      : connected
                      ? "bg-emerald-400"
                      : "bg-red-400"
                  )}
                />

                {healthLoading
                  ? "Checking connection..."
                  : warming
                  ? "Warming up server..."
                  : connected
                  ? "Backend connected"
                  : "Backend offline"}
              </span>

              <span>v0.1.0-beta</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}