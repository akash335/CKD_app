"use client";

import { useMemo, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { RecordData, InsightData } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { usePreloadedData } from "@/lib/data-prefetch-context";
import { useRole } from "@/lib/role-context";

// ─── SVG Line Chart ────────────────────────────────────────────────────────

interface ChartPoint { value: number; label: string; }

function LineChart({ points, label, unit, color = "sky" }: { points: ChartPoint[]; label: string; unit: string; color?: string }) {
  if (points.length < 2) {
    return (
      <GlassCard padding="md">
        <p className="text-[0.65rem] xs:text-xs sm:text-sm font-medium theme-text-muted mb-2">{label}</p>
        <p className="text-[10px] xs:text-[11px] sm:text-xs theme-text-dimmed py-8 text-center">Need at least 2 data points</p>
      </GlassCard>
    );
  }

  const colorMap: Record<string, { stroke: string; fill: string; dot: string }> = {
    sky: { stroke: "#38bdf8", fill: "rgba(56,189,248,0.08)", dot: "#38bdf8" },
    emerald: { stroke: "#34d399", fill: "rgba(52,211,153,0.08)", dot: "#34d399" },
    amber: { stroke: "#fbbf24", fill: "rgba(251,191,36,0.08)", dot: "#fbbf24" },
    violet: { stroke: "#a78bfa", fill: "rgba(167,139,250,0.08)", dot: "#a78bfa" },
  };
  const c = colorMap[color] || colorMap.sky;

  const W = 400, H = 140, PX = 32, PY = 20;
  const values = points.map((p) => p.value);
  const minV = Math.min(...values) * 0.9;
  const maxV = Math.max(...values) * 1.1;
  const rangeV = maxV - minV || 1;

  const chartPts = points.map((p, i) => ({
    x: PX + (i / (points.length - 1)) * (W - 2 * PX),
    y: PY + (1 - (p.value - minV) / rangeV) * (H - 2 * PY),
    ...p,
  }));

  const line = chartPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${line} L ${chartPts[chartPts.length - 1].x} ${H - PY} L ${chartPts[0].x} ${H - PY} Z`;

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[0.65rem] xs:text-xs sm:text-sm font-medium theme-text-muted">{label}</p>
        <span className="text-[9px] xs:text-[10px] sm:text-xs theme-text-dimmed font-mono">{unit}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PY + frac * (H - 2 * PY);
          const val = maxV - frac * rangeV;
          return (
            <g key={frac}>
              <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="var(--border-primary)" strokeWidth={0.5} />
              <text x={PX - 4} y={y + 3} textAnchor="end" className="text-[6px] xs:text-[7px] sm:text-[8px] fill-slate-600">{val.toFixed(0)}</text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={area} fill={c.fill} />
        {/* Line */}
        <path d={line} fill="none" stroke={c.stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {chartPts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={3.5} fill="var(--bg-primary)" stroke={c.dot} strokeWidth={2} />
            <text x={p.x} y={H - 4} textAnchor="middle" className="text-[5px] xs:text-[6px] sm:text-[7px] fill-slate-600">{p.label}</text>
          </g>
        ))}
      </svg>
    </GlassCard>
  );
}

// ─── Insights Panel ─────────────────────────────────────────────────────────

function InsightsPanel({ insights }: { insights: InsightData[] }) {
  const sevColors: Record<string, { icon: string; bg: string; border: string }> = {
    warning: { icon: "text-amber-400", bg: "bg-amber-500/[0.06]", border: "border-amber-500/20" },
    positive: { icon: "text-emerald-400", bg: "bg-emerald-500/[0.06]", border: "border-emerald-500/20" },
    info: { icon: "text-sky-400", bg: "bg-sky-500/[0.06]", border: "border-sky-500/20" },
  };
  const trendIcons: Record<string, React.ReactNode> = {
    increasing: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>,
    decreasing: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-5.511m-3.182 5.51l-5.511-3.181" /></svg>,
    stable: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>,
  };

  return (
    <GlassCard padding="md">
      <p className="text-[8px] xs:text-[9px] sm:text-[10px] theme-text-dimmed uppercase tracking-wider mb-3">AI Insights</p>
      <div className="space-y-2.5">
        {insights.map((ins, i) => {
          const s = sevColors[ins.severity] || sevColors.info;
          return (
            <div key={i} className={cn("flex items-start gap-2 xs:gap-3 rounded-xl px-2 xs:px-4 py-2 xs:py-3 border", s.bg, s.border)}>
              <span className={cn("mt-0.5 shrink-0 h-4 w-4 xs:h-5 xs:w-5", s.icon)}>{trendIcons[ins.trend] || trendIcons.stable}</span>
              <div>
                <p className="text-[8px] xs:text-[10px] sm:text-xs font-medium theme-text-muted mb-0.5">{ins.metric} — <span className="capitalize">{ins.trend}</span></p>
                <p className="text-[9px] xs:text-xs sm:text-sm theme-text-muted leading-relaxed">{ins.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── Main Analytics Section ─────────────────────────────────────────────────

export function AnalyticsSection() {
  const { userId } = useRole();
  const {
    records,
    recordsLoading,
    recordsLoaded,
    insights,
    insightsLoading,
    insightsLoaded,
    refetchRecords,
    refetchInsights
  } = usePreloadedData();

  // Local sync: if prefetch hasn't finished, trigger it now for this section
  useEffect(() => {
    if (!recordsLoaded && userId) refetchRecords();
    if (!insightsLoaded && userId) refetchInsights();
  }, [recordsLoaded, insightsLoaded, userId, refetchRecords, refetchInsights]);

  const loading = (recordsLoading && !recordsLoaded) || (insightsLoading && !insightsLoaded);

  // Build chart data from records
  const hospitalRecords = useMemo(() => records.filter((r) => r.input_mode === "hospital").reverse(), [records]);
  const ureaRecords = useMemo(() => records.filter((r) => r.input_values.urea != null).reverse(), [records]);
  const lcrRecords = useMemo(() => records.filter((r) => r.input_mode === "medical-report").reverse(), [records]);

  const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const creatChart = useMemo(() => hospitalRecords.filter((r) => r.input_values.creatinine).map((r) => ({ value: r.input_values.creatinine, label: dateLabel(r.created_at) })), [hospitalRecords]);
  const egfrChart = useMemo(() => hospitalRecords.filter((r) => r.input_values.egfr).map((r) => ({ value: r.input_values.egfr, label: dateLabel(r.created_at) })), [hospitalRecords]);
  const ureaChart = useMemo(() => ureaRecords.map((r) => ({ value: r.input_values.urea, label: dateLabel(r.created_at) })), [ureaRecords]);
  const scoreChart = useMemo(() => records.slice().reverse().map((r) => ({ value: r.health_score, label: dateLabel(r.created_at) })), [records]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-32 rounded-lg bg-[var(--bg-elevated)]" />
        {[1, 2].map((i) => <div key={i} className="h-48 rounded-xl bg-[var(--bg-elevated)]" />)}
      </div>
    );
  }

  const hasData = records.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="h-1 xs:h-1.5 w-1 xs:w-1.5 rounded-full bg-emerald-400" />
        <h2 className="text-xs xs:text-sm sm:text-base font-semibold theme-text">Analytics</h2>
        <span className="ml-auto text-[8px] xs:text-[10px] sm:text-xs px-1.5 xs:px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          {records.length} data points
        </span>
      </div>

      {!hasData ? (
        <GlassCard padding="lg" className="text-center py-16">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[var(--bg-elevated)] theme-text-dimmed mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>
          </div>
          <p className="text-xs xs:text-sm sm:text-base theme-text-muted mb-1">No data to analyze</p>
          <p className="text-[9px] xs:text-xs sm:text-sm theme-text-dimmed">Run predictions from the Data Input tab. Analytics and trends will appear here automatically.</p>
        </GlassCard>
      ) : (
        <>
          {/* Insights */}
          <InsightsPanel insights={insights} />

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LineChart points={scoreChart} label="Health Score Over Time" unit="score" color="emerald" />
            <LineChart points={ureaChart} label="Urea Trend" unit="mg/dL" color="amber" />
            <LineChart points={creatChart} label="Creatinine Trend" unit="mg/dL" color="sky" />
            <LineChart points={egfrChart} label="eGFR Trend" unit="mL/min" color="violet" />
          </div>
        </>
      )}
    </div>
  );
}
