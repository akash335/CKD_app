"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import Link from "next/link";

export default function LoginPage() {
  const { status } = useSession();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/");
    }
  }, [status, router]);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col items-center justify-center px-4 theme-transition">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-500/[0.03] blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        <GlassCard padding="lg">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center drop-shadow-xl">
              <img
                src="/logo/logo.png"
                alt="CKD Guardian Logo"
                className="h-[150%] w-[150%] object-contain"
              />
            </div>

            <h1 className="text-2xl font-bold theme-text">Welcome Back</h1>
            <p className="text-sm theme-text-muted mt-1">
              Sign in to CKD Guardian
            </p>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleCredentialLogin} className="space-y-4">
            {/* Error Banner */}
            {error && (
              <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 px-4 py-3 text-xs text-red-400 animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <svg
                    className="h-4 w-4 mt-0.5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  {error}
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium theme-text-muted mb-1.5"
              >
                Email Address
              </label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border px-4 py-3 text-sm theme-text placeholder:theme-text-faint outline-none transition-all focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40 theme-transition"
                style={{
                  background: "var(--bg-input)",
                  borderColor: "var(--border-input)",
                }}
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium theme-text-muted mb-1.5"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border px-4 py-3 pr-12 text-sm theme-text placeholder:theme-text-faint outline-none transition-all focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/40 theme-transition"
                  style={{
                    background: "var(--bg-input)",
                    borderColor: "var(--border-input)",
                  }}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 theme-text-dimmed hover:theme-text-muted transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      className="h-4.5 w-4.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-4.5 w-4.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl hover:shadow-sky-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-xs theme-text-dimmed">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-sky-400 font-medium hover:text-sky-300 transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t theme-border">
            <p className="text-[10px] theme-text-faint text-center leading-relaxed">
              Your data is handled securely and used only for health monitoring.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}