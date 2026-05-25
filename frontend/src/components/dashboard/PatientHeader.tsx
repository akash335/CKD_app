"use client";

import { PatientOverview } from "@/types/patient";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getRiskTheme, timeAgo, formatDate } from "@/lib/utils";

interface PatientHeaderProps {
  patient: PatientOverview;
}

export function PatientHeader({ patient }: PatientHeaderProps) {
  const riskTheme = getRiskTheme(patient.risk.level);
  const riskVariant =
    patient.risk.level === "low"
      ? "success"
      : patient.risk.level === "moderate"
      ? "warning"
      : patient.risk.level === "high"
      ? "danger"
      : "danger";

  return (
    <GlassCard className="relative overflow-hidden">
      {/* Ambient glow based on risk */}
      <div
        className={`absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br ${riskTheme.gradient} opacity-[0.07] blur-3xl`}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Patient identity */}
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div
              className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-br ${riskTheme.gradient} text-lg sm:text-xl font-bold text-white shadow-lg ${riskTheme.glow}`}
            >
              {patient.avatarInitials}
            </div>
            {/* Online dot */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-slate-900 bg-emerald-400">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-300" />
            </span>
          </div>

          <div>
            <h1 className="text-lg sm:text-xl font-semibold theme-text tracking-tight">
              {patient.name}
            </h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs theme-text-muted">
              {patient.age > 0 && (
                <>
                  <span>
                    {patient.age}y · {patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : "Other"}
                  </span>
                  <span className="theme-text-faint">·</span>
                </>
              )}
              <span className="font-mono text-[11px] theme-text-dimmed">
                ID: {patient.id}
              </span>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={riskTheme.label}
            variant={riskVariant}
            pulse={patient.risk.level === "critical"}
          />
          <StatusBadge
            label={`Stage ${patient.risk.stage}`}
            variant="info"
          />
          <div className="hidden sm:block text-[11px] theme-text-dimmed">
            {patient.lastUpdated ? `Updated ${timeAgo(patient.lastUpdated)}` : "No data yet"}
          </div>
        </div>
      </div>

      {/* Next checkup */}
      <div className="mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
        <svg className="h-3.5 w-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="theme-text-muted">
          Next checkup:{" "}
          <span className="font-medium theme-text-secondary">
            {formatDate(patient.nextCheckup)}
          </span>
        </span>
      </div>
    </GlassCard>
  );
}
