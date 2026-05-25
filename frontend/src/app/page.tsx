"use client";

import { useRouter } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";

export default function HomePage() {
  const { role, isLoading } = useRole();
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Auto-redirect if role is already set
  useEffect(() => {
    if (status === "authenticated" && !isLoading) {
      if (role === "patient") router.replace("/dashboard");
      else if (role === "doctor") router.replace("/doctor-dashboard");
    }
  }, [role, status, isLoading, router]);

  if (status === "loading" || (status === "authenticated" && isLoading)) {
    return (
      <div className="min-h-screen theme-bg flex items-center justify-center">
        <div className="w-full max-w-md p-8">
           <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <RoleSelector />;
}

function RoleSelector() {
  const { setRole } = useRole();
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<"patient" | "doctor" | null>(null);

  const handleSelect = async (role: "patient" | "doctor") => {
    if (isUpdating) return;
    setIsUpdating(true);
    setUpdatingRole(role);
    try {
      await setRole(role);
      // Redirect is triggered by the useEffect in HomePage when role state updates.
      // Set a safety timeout — if we're still stuck after 4s, reset the button.
      setTimeout(() => {
        setIsUpdating(false);
        setUpdatingRole(null);
      }, 4000);
    } catch {
      setIsUpdating(false);
      setUpdatingRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col items-center justify-center px-4">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
      </div>

      <div className="relative text-center max-w-lg w-full">
        {/* Logo */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center drop-shadow-2xl">
          <img src="/logo/logo.png" alt="CKD Guardian Logo" className="h-[150%] w-[150%] object-contain" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight theme-text mb-2">Setup Your Profile</h1>
        <p className="text-sm theme-text-muted mb-8">Select your role to personalize your experience</p>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
          {/* Patient */}
          <button
            onClick={() => handleSelect("patient")}
            disabled={isUpdating}
            className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-300 hover:border-sky-500/30 hover:bg-sky-500/[0.04] hover:shadow-lg hover:shadow-sky-500/10 ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition-all group-hover:bg-sky-500/20">
              {updatingRole === "patient" ? (
                 <div className="h-6 w-6 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></div>
              ) : (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold theme-text mb-1">
                {updatingRole === "patient" ? "Setting up..." : "I am a Patient"}
              </h3>
              <p className="text-[11px] theme-text-dimmed leading-relaxed">Track metrics, run predictions, and monitor trends</p>
            </div>
          </button>

          {/* Doctor */}
          <button
            onClick={() => handleSelect("doctor")}
            disabled={isUpdating}
            className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-6 transition-all duration-300 hover:border-violet-500/30 hover:bg-violet-500/[0.04] hover:shadow-lg hover:shadow-violet-500/10 ${
              isUpdating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition-all group-hover:bg-violet-500/20">
              {updatingRole === "doctor" ? (
                 <div className="h-6 w-6 rounded-full border-2 border-violet-400 border-t-transparent animate-spin"></div>
              ) : (
                <span className="text-3xl" role="img" aria-label="doctor">👨‍⚕️</span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold theme-text mb-1">
                {updatingRole === "doctor" ? "Setting up..." : "I am a Doctor"}
              </h3>
              <p className="text-[11px] theme-text-dimmed leading-relaxed">Review patient data, manage records, and provide care</p>
            </div>
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-[10px] theme-text-faint">Securely authenticated via Google Cloud</p>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-xs theme-text-muted hover:theme-text transition-colors underline decoration-slate-600 underline-offset-4"
          >
            Sign out and create a different account
          </button>
        </div>
      </div>
    </div>
  );
}
