"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardNav, DashboardTab } from "@/components/dashboard/DashboardNav";
import { OverviewSection } from "@/features/overview/OverviewSection";
import { InputSection } from "@/features/input/InputSection";
import { AnalyticsSection } from "@/features/analytics/AnalyticsSection";
import { HistorySection } from "@/features/history/HistorySection";
import { PatientLinkDoctor } from "@/features/linking/PatientLinkDoctor";
import { MedicationManagementSection } from "@/features/medications/MedicationManagementSection";
import { useRole } from "@/lib/role-context";
import { DataPrefetchProvider } from "@/lib/data-prefetch-context";
import { useRouter } from "next/navigation";

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS: DashboardTab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
        />
      </svg>
    ),
  },
  {
    id: "input",
    label: "Data Input",
    icon: (
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
        />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
  },
  {
    id: "medications",
    label: "Medications",
    icon: (
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 6.75h3m-7.5 0h.008v.008H6V6.75Zm12 0h.008v.008H18v-.008Zm-12 5.25h.008v.008H6V12Zm12 0h.008v.008H18V12Zm-12 5.25h.008v.008H6v-.008Zm12 0h.008v.008H18v-.008ZM8.25 4.5h7.5A2.25 2.25 0 0 1 18 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-7.5A2.25 2.25 0 0 1 6 17.25V6.75A2.25 2.25 0 0 1 8.25 4.5Z"
        />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    id: "doctors",
    label: "Doctors",
    icon: (
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
        />
      </svg>
    ),
  },
];

// ── Section renderer ─────────────────────────────────────────────────────────
function ActiveSection({ tab }: { tab: string }) {
  switch (tab) {
    case "overview":
      return <OverviewSection />;
    case "input":
      return <InputSection />;
    case "analytics":
      return <AnalyticsSection />;
    case "medications":
      return <MedicationManagementSection />;
    case "history":
      return <HistorySection />;
    case "doctors":
      return <PatientLinkDoctor />;
    default:
      return <OverviewSection />;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { role, clearRole } = useRole();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Guard: redirect non-patients
  useEffect(() => {
    if (role !== null && role !== "patient") {
      router.replace("/doctor-dashboard");
    }
  }, [role, router]);

  const handleSwitchRole = async () => {
    await clearRole();
    router.push("/");
  };

  return (
    <DataPrefetchProvider>
      <AppShell>
        <div className="mobile-page-safe mobile-no-overflow">
          {/* Page heading */}
          <div className="flex flex-col items-start justify-between gap-3 mb-5 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:flex-row sm:items-center sm:gap-4 sm:mb-6">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight theme-text">
                Patient Dashboard
              </h1>

              <p className="text-xs theme-text-muted mt-1 leading-relaxed">
                CKD monitoring across all your data sources
              </p>
            </div>

            <button
              onClick={handleSwitchRole}
              className="flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs theme-text-muted transition-all theme-transition"
              style={{
                borderColor: "var(--border-input)",
                background: "var(--bg-elevated)",
              }}
            >
              <svg
                className="h-3.5 w-3.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>

              <span>Switch Role</span>
            </button>
          </div>

          {/* Tab navigation */}
          <div className="mobile-tabs-safe -mx-1 px-1 mb-5 sm:mx-0 sm:px-0 sm:mb-6">
            <DashboardNav
              tabs={TABS}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* Active section — animated on change */}
          <div
            key={activeTab}
            className="animate-in fade-in slide-in-from-bottom-2 duration-300 mobile-no-overflow"
          >
            <ActiveSection tab={activeTab} />
          </div>
        </div>
      </AppShell>
    </DataPrefetchProvider>
  );
}