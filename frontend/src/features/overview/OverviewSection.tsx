"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { AlertsBanner } from "@/components/dashboard/AlertsBanner";
import { ConditionSummary } from "@/components/dashboard/ConditionSummary";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { PatientOverviewSection } from "@/features/overview/PatientOverviewSection";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useRole } from "@/lib/role-context";
import { usePreloadedData } from "@/lib/data-prefetch-context";

/**
 * Overview section — patient-facing command center.
 * Shows alerts, condition summary, recommendations, and patient data.
 * Developer-only backend/database/model status is hidden from public users.
 */
export function OverviewSection() {
  const { userId } = useRole();

  const {
    intelligenceReport: report,
    intelligenceReportLoading,
    intelligenceReportLoaded,
    refetchIntelligenceReport,
    patientOverview: data,
    patientOverviewLoading: loading,
    patientOverviewLoaded,
    refetchPatientOverview,
  } = usePreloadedData();

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  // Local sync: if prefetch hasn't finished, trigger it now for this section
  useEffect(() => {
    if (!intelligenceReportLoaded && userId) {
      refetchIntelligenceReport();
    }

    if (!patientOverviewLoaded && userId) {
      refetchPatientOverview();
    }
  }, [
    intelligenceReportLoaded,
    patientOverviewLoaded,
    userId,
    refetchIntelligenceReport,
    refetchPatientOverview,
  ]);

  const reportLoading = intelligenceReportLoading && !intelligenceReportLoaded;

  const dismissAlert = (id: string) => {
    setDismissedAlerts((prev) => new Set([...prev, id]));
  };

  const activeAlerts =
    report?.alerts.filter((alert) => !dismissedAlerts.has(alert.id)) || [];

  return (
    <div className="space-y-6">
      {/* Alerts — always on top when present */}
      {!reportLoading && activeAlerts.length > 0 && (
        <AlertsBanner alerts={activeAlerts} onDismiss={dismissAlert} />
      )}

      {/* Condition summary */}
      {report && report.data_points > 0 && (
        <ConditionSummary
          summary={report.condition_summary}
          trendLabel={report.trend_label}
          riskLevel={report.risk_level}
          dataPoints={report.data_points}
        />
      )}

      {/* No-data welcome state */}
      {report && report.data_points === 0 && (
        <GlassCard padding="md" className="h-full">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10">
              <svg
                className="h-3 w-3 text-sky-400"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </div>

            <h2 className="text-sm font-semibold theme-text">
              Welcome to CKD Guardian
            </h2>
          </div>

          <p className="text-xs theme-text-muted leading-relaxed">
            Start by submitting a prediction from the{" "}
            <span className="text-sky-400 font-medium">Data Input</span> tab.
            Your personalized health insights, alerts, and recommendations will
            appear here.
          </p>
        </GlassCard>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <RecommendationsPanel recommendations={report.recommendations} />
      )}

      {/* Patient data */}
      {!data && !loading ? (
        <GlassCard padding="md" className="text-center py-12">
          <p className="text-sm text-red-400 mb-3">
            Failed to load patient data
          </p>

          <button
            onClick={refetchPatientOverview}
            className="rounded-xl px-4 py-2 text-xs font-medium theme-text border transition-all theme-transition"
            style={{
              background: "var(--bg-elevated)",
              borderColor: "var(--border-input)",
            }}
          >
            Retry
          </button>
        </GlassCard>
      ) : loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <PatientOverviewSection patient={data} />
      )}
    </div>
  );
}