"use client";

import { HealthScore as HealthScoreType } from "@/types/patient";
import { GlassCard } from "@/components/ui/GlassCard";
import { CircularProgress } from "@/components/ui/CircularProgress";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn, getTrendInfo, getScoreColor } from "@/lib/utils";

interface HealthScoreCardProps {
  score: HealthScoreType;
  hasRecords?: boolean;
}

function SubScore({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  const color = getScoreColor(value);
  const barWidth = `${value}%`;

  return (
    <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--bg-card)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] theme-text-muted group-hover:theme-text transition-colors">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-xs theme-text-muted">{label}</span>
          <span className={cn("text-sm font-semibold tabular-nums", color)}>
            {value}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--shimmer)]">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
              value >= 80
                ? "from-emerald-500 to-teal-400"
                : value >= 60
                ? "from-amber-500 to-yellow-400"
                : value >= 40
                ? "from-orange-500 to-amber-400"
                : "from-red-500 to-rose-400"
            )}
            style={{ width: barWidth }}
          />
        </div>
      </div>
    </div>
  );
}

export function HealthScoreCard({ score, hasRecords = true }: HealthScoreCardProps) {
  const trend = getTrendInfo(score.trend);
  const deltaSign = score.delta >= 0 ? "+" : "";

  return (
    <GlassCard className="flex flex-col items-center">
      <div className="flex w-full items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold theme-text">Health Score</h2>
          <Tooltip text="Composite score based on kidney, metabolic, and cardiovascular health">
            <svg
              className="h-3.5 w-3.5 theme-text-dimmed hover:text-slate-300 transition-colors"
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
        {/* Trend badge */}
        {hasRecords ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              score.trend === "improving"
                ? "bg-emerald-500/10 text-emerald-400"
                : score.trend === "declining"
                ? "bg-red-500/10 text-red-400"
                : "bg-slate-500/10 theme-text-muted"
            )}
          >
            <span className="text-xs">{trend.icon}</span>
            {deltaSign}
            {score.delta} pts
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
            ✓ Healthy Default
          </span>
        )}
      </div>

      {/* Circular score */}
      <CircularProgress
        value={score.overall}
        label="Overall"
        sublabel="out of 100"
        className="my-2"
      />

      {/* New user hint */}
      {!hasRecords && (
        <p className="text-[10px] text-center theme-text-dimmed mt-1 italic">
          Baseline score — add your lab data for a personalized result
        </p>
      )}

      {/* Sub-scores */}
      <div className="mt-4 w-full space-y-1">
        <SubScore
          label="Kidney Function"
          value={score.kidney}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          }
        />
        <SubScore
          label="Metabolic Health"
          value={score.metabolic}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
          }
        />
        <SubScore
          label="Cardiovascular"
          value={score.cardiovascular}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
      </div>
    </GlassCard>
  );
}
