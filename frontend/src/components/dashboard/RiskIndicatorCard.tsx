"use client";

import { RiskAssessment } from "@/types/patient";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn, getRiskTheme } from "@/lib/utils";

interface RiskIndicatorCardProps {
  risk: RiskAssessment;
  hasRecords?: boolean;
}

export function RiskIndicatorCard({ risk, hasRecords = true }: RiskIndicatorCardProps) {
  const theme = getRiskTheme(risk.level);

  // Stages for the stage indicator
  const stages = [1, 2, 3, 4, 5] as const;

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs xs:text-sm sm:text-base font-semibold theme-text">CKD Risk</h2>
          <Tooltip text="Risk level based on ML model analysis of your lab results and health data">
            <svg
              className="h-3 xs:h-3.5 w-3 xs:w-3.5 theme-text-dimmed hover:text-slate-300 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
              />
            </svg>
          </Tooltip>
        </div>
      </div>

      {/* Main risk level display */}
      <div className="flex items-center gap-2 xs:gap-3 mb-4 xs:mb-5">
        <div
          className={cn(
            "flex h-10 xs:h-12 w-10 xs:w-12 items-center justify-center rounded-lg xs:rounded-xl",
            theme.bg,
            "border",
            theme.border
          )}
        >
          <svg
            className={cn("h-5 xs:h-6 w-5 xs:w-6", theme.text)}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <div>
          <span className={cn("text-base xs:text-xl sm:text-2xl font-bold", theme.text)}>
            {theme.label}
          </span>
          <p className="text-[9px] xs:text-[11px] sm:text-xs theme-text-dimmed">
            CKD Stage {risk.stage} of 5
          </p>
        </div>
      </div>

      {/* Stage indicator pills */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5">
          {stages.map((stage) => (
            <div
              key={stage}
              className={cn(
                "h-2 flex-1 rounded-full transition-all duration-500",
                stage <= risk.stage
                  ? `bg-gradient-to-r ${theme.gradient}`
                  : "bg-[var(--shimmer)]"
              )}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] theme-text-dimmed">
          <span>Normal</span>
          <span>Severe</span>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs theme-text-muted">Model Confidence</span>
          <span className="text-xs font-semibold theme-text tabular-nums">
            {risk.confidence}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--shimmer)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-400 transition-all duration-1000 ease-out"
            style={{ width: `${risk.confidence}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] theme-text-dimmed">
          {hasRecords
            ? "Based on analysis of your lab reports, medical reports, and urea values"
            : "No data submitted yet — you are assumed healthy"
          }
        </p>
      </div>

      {/* Contributing factors */}
      <div>
        {hasRecords && risk.factors.length > 0 ? (
          <>
            <p className="text-[11px] font-medium theme-text-muted uppercase tracking-wider mb-2">
              Contributing Factors
            </p>
            <ul className="space-y-1.5">
              {risk.factors.map((factor, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-xs text-slate-300"
                >
                  <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", theme.dot)} />
                  {factor}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-xl border px-3 py-2.5" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
            <p className="text-[11px] theme-text-muted">
              <span className="text-emerald-400 font-medium">✓ No risk factors detected.</span>{" "}
              Submit your lab values from the <span className="text-sky-400 font-medium">Data Input</span> tab for a detailed ML-powered assessment.
            </p>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
