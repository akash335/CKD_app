"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface ConditionSummaryProps {
  summary: string;
  trendLabel: string;
  riskLevel: string;
  dataPoints: number;
}

const trendStyles: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  improving: {
    color: "text-emerald-400",
    label: "Improving",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
  },
  worsening: {
    color: "text-red-400",
    label: "Worsening",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" /></svg>,
  },
  stable: {
    color: "text-sky-400",
    label: "Stable",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>,
  },
  insufficient_data: {
    color: "text-slate-400",
    label: "Collecting Data",
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
};

const riskColors: Record<string, string> = {
  low: "text-emerald-400", moderate: "text-amber-400", high: "text-orange-400", critical: "text-red-400",
};

/**
 * Condition summary card — shows overall health status, trend direction, and risk level.
 */
export function ConditionSummary({ summary, trendLabel, riskLevel, dataPoints }: ConditionSummaryProps) {
  const trend = trendStyles[trendLabel] || trendStyles.insufficient_data;

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10">
            <svg className="h-3 w-3 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold theme-text">Health Status</h3>
        </div>
        <span className="text-[10px] theme-text-dimmed">{dataPoints} assessments</span>
      </div>

      {/* Trend + Risk level */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 border", trend.color)}
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
        >
          {trend.icon}
          <span className="text-xs font-medium">{trend.label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] theme-text-dimmed">Current risk:</span>
          <span className={cn("text-xs font-semibold capitalize", riskColors[riskLevel] || "theme-text-muted")}>
            {riskLevel}
          </span>
        </div>
      </div>

      {/* Summary text */}
      <p className="text-xs theme-text-secondary leading-relaxed">{summary}</p>
    </GlassCard>
  );
}
