"use client";

import { HealthMetric } from "@/types/patient";
import { GlassCard } from "@/components/ui/GlassCard";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn, getTrendInfo, timeAgo } from "@/lib/utils";

interface KeyMetricsGridProps {
  metrics: HealthMetric[];
}

function MetricCard({ metric }: { metric: HealthMetric }) {
  const trend = getTrendInfo(metric.trend);
  const isInRange =
    metric.value >= metric.normalRange.min &&
    metric.value <= metric.normalRange.max;

  const rangeSpan = metric.normalRange.max - metric.normalRange.min;
  const rangeBuffer = rangeSpan * 0.4;
  const displayMin = metric.normalRange.min - rangeBuffer;
  const displayMax = metric.normalRange.max + rangeBuffer;
  const displaySpan = displayMax - displayMin;
  const valuePosition = Math.max(0, Math.min(100, ((metric.value - displayMin) / displaySpan) * 100));
  const normalStart = ((metric.normalRange.min - displayMin) / displaySpan) * 100;
  const normalEnd = ((metric.normalRange.max - displayMin) / displaySpan) * 100;

  return (
    <GlassCard hover padding="sm" className="group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[0.7rem] xs:text-xs sm:text-sm font-medium theme-text-muted group-hover:text-slate-300 transition-colors">
            {metric.label}
          </h3>
          {!isInRange && (
            <Tooltip text={`Normal: ${metric.normalRange.min}–${metric.normalRange.max} ${metric.unit}`}>
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/10 text-[7px] xs:text-[8px] text-amber-400">!</span>
            </Tooltip>
          )}
        </div>
        <span className={cn("inline-flex items-center gap-0.5 text-[8px] xs:text-[10px] sm:text-xs font-medium", trend.color)}>
          {trend.icon} {trend.label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={cn("text-lg xs:text-2xl sm:text-3xl font-bold tabular-nums tracking-tight", isInRange ? "theme-text" : "text-amber-400")}>
          {metric.value}
        </span>
        <span className="text-[0.65rem] xs:text-xs sm:text-sm theme-text-dimmed">{metric.unit}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-[var(--shimmer)] overflow-hidden">
        <div className="absolute h-full bg-emerald-500/20 rounded-full" style={{ left: `${normalStart}%`, width: `${normalEnd - normalStart}%` }} />
        <div className={cn("absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 transition-all duration-700 ease-out", isInRange ? "bg-emerald-400 border-emerald-500/50" : "bg-amber-400 border-amber-500/50")} style={{ left: `calc(${valuePosition}% - 6px)` }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[8px] xs:text-[10px] sm:text-xs theme-text-faint">
        <span>{metric.normalRange.min}–{metric.normalRange.max} {metric.unit}</span>
        <span>{timeAgo(metric.lastUpdated)}</span>
      </div>
    </GlassCard>
  );
}

export function KeyMetricsGrid({ metrics }: KeyMetricsGridProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xs xs:text-sm sm:text-base font-semibold theme-text">Key Metrics</h2>
        <Tooltip text="Your most recent lab values with normal ranges">
          <svg className="h-3 xs:h-3.5 w-3 xs:w-3.5 theme-text-dimmed hover:text-slate-300 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        </Tooltip>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((m) => <MetricCard key={m.label} metric={m} />)}
      </div>
    </div>
  );
}
