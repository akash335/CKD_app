"use client";

import { PatientOverview } from "@/types/patient";
import { PatientHeader } from "@/components/dashboard/PatientHeader";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { RiskIndicatorCard } from "@/components/dashboard/RiskIndicatorCard";
import { KeyMetricsGrid } from "@/components/dashboard/KeyMetricsGrid";
import { DataSourcesPanel } from "@/components/dashboard/DataSourcesPanel";
import { GlassCard } from "@/components/ui/GlassCard";

interface PatientOverviewSectionProps {
  patient: PatientOverview;
}

/**
 * The main patient overview feature — assembles all dashboard cards
 * into a responsive, prioritized layout.
 * 
 * For new users (no records), shows healthy defaults with
 * a prominent prompt to add data.
 */
export function PatientOverviewSection({ patient }: PatientOverviewSectionProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Patient header — full width, most important */}
      <PatientHeader patient={patient} />

      {/* Score, Risk, Sources — side by side on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <HealthScoreCard score={patient.healthScore} hasRecords={patient.hasRecords} />
        <RiskIndicatorCard risk={patient.risk} hasRecords={patient.hasRecords} />
        <div className="md:col-span-2 lg:col-span-1">
          <DataSourcesPanel sources={patient.dataSources} />
        </div>
      </div>

      {/* Key metrics grid — only show when there's real data */}
      {patient.hasRecords && patient.keyMetrics.length > 0 ? (
        <KeyMetricsGrid metrics={patient.keyMetrics} />
      ) : (
        <AddDataPrompt />
      )}
    </div>
  );
}


/**
 * Prominent prompt card encouraging new users to submit their first lab data.
 */
function AddDataPrompt() {
  return (
    <GlassCard padding="md" className="relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-gradient-to-br from-sky-500 to-emerald-400 opacity-[0.06] blur-3xl" />
      <div className="absolute -left-16 -bottom-16 h-32 w-32 rounded-full bg-gradient-to-br from-violet-500 to-sky-400 opacity-[0.04] blur-3xl" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Icon */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/20 to-emerald-500/20 border border-sky-500/20">
          <svg className="h-6 w-6 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold theme-text mb-1">
            Add your lab data to see detailed metrics
          </h3>
          <p className="text-xs theme-text-muted leading-relaxed">
            You&apos;re currently seeing a healthy baseline. Go to the{" "}
            <span className="text-sky-400 font-medium">Data Input</span>{" "}
            tab to enter your creatinine, urea, eGFR, and hemoglobin values for a
            personalized CKD risk assessment powered by our ML model.
          </p>
        </div>

        {/* Decorative arrow */}
        <div className="hidden sm:flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </div>
      </div>
    </GlassCard>
  );
}
