"use client";

import { PredictionResponse } from "@/lib/api-client";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface PredictionResultProps {
  result: PredictionResponse;
  onReset: () => void;
}

const riskStyles = {
  low:      { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", gradient: "from-emerald-500 to-teal-400",   ring: "ring-emerald-500/10", label: "Low Risk",      emoji: "✓" },
  moderate: { bg: "bg-amber-500/10",   border: "border-amber-500/20",   text: "text-amber-400",   gradient: "from-amber-500 to-orange-400",   ring: "ring-amber-500/10",   label: "Moderate Risk", emoji: "⚠" },
  high:     { bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-400",  gradient: "from-orange-500 to-red-400",     ring: "ring-orange-500/10",  label: "High Risk",     emoji: "!" },
  critical: { bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400",     gradient: "from-red-500 to-rose-400",       ring: "ring-red-500/10",     label: "Critical",      emoji: "!!" },
};

const modeLabels: Record<string, string> = {
  hospital: "Hospital Lab Data",
  urea: "Urea Reading",
  "medical-report": "Medical Report",
};

export function PredictionResult({ result, onReset }: PredictionResultProps) {
  const style = riskStyles[result.risk_level];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 xs:gap-3">
        <div className="flex items-center gap-2 xs:gap-3 min-w-0">
          <div className={cn("flex h-8 xs:h-9 w-8 xs:w-9 items-center justify-center rounded-lg xs:rounded-xl bg-gradient-to-br shadow-lg shrink-0", style.gradient)}>
            <svg className="h-4 xs:h-4.5 w-4 xs:w-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs xs:text-sm sm:text-base font-bold theme-text">Analysis Complete</h3>
            <p className="text-[9px] xs:text-[11px] sm:text-xs theme-text-muted">Results generated from your biomarker data</p>
          </div>
        </div>
        <span className="text-[8px] xs:text-[10px] sm:text-xs px-1.5 xs:px-2.5 py-0.5 xs:py-1 rounded-full theme-text-muted shrink-0 whitespace-nowrap" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)' }}>
          {modeLabels[result.input_mode] || result.input_mode}
        </span>
      </div>

      {/* ── Primary risk card ──────────────────────────────────────── */}
      <GlassCard padding="md" className={cn("border-2", style.border, "relative overflow-hidden")}>
        {/* Ambient glow */}
        <div className={cn("absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-20 blur-3xl bg-gradient-to-br", style.gradient)} />

        <div className="relative flex items-center gap-3 xs:gap-5">
          <div className={cn(
            "flex h-12 xs:h-16 w-12 xs:w-16 shrink-0 items-center justify-center rounded-2xl text-lg xs:text-2xl font-black ring-2",
            style.bg, style.text, style.ring
          )}>
            {style.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[8px] xs:text-[10px] sm:text-xs uppercase tracking-widest theme-text-faint mb-1">Risk Assessment</p>
            <p className={cn("text-base xs:text-2xl sm:text-3xl font-black tracking-tight", style.text)}>{style.label}</p>
          </div>
        </div>
      </GlassCard>

      {/* ── Metrics row ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Confidence */}
        <GlassCard padding="md">
          <p className="text-[8px] xs:text-[10px] sm:text-xs uppercase tracking-widest theme-text-faint mb-2">Confidence</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg xs:text-2xl sm:text-3xl font-black theme-text tabular-nums">{result.confidence}</span>
            <span className="text-[9px] xs:text-xs sm:text-sm theme-text-muted">%</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-500 to-violet-400 transition-all duration-1000 ease-out"
              style={{ width: `${result.confidence}%` }}
            />
          </div>
        </GlassCard>

        {/* Health Score */}
        <GlassCard padding="md">
          <p className="text-[8px] xs:text-[10px] sm:text-xs uppercase tracking-widest theme-text-faint mb-2">Health Score</p>
          <div className="flex items-baseline gap-1">
            <span className={cn("text-lg xs:text-2xl sm:text-3xl font-black tabular-nums",
              result.health_score >= 70 ? "text-emerald-400" :
              result.health_score >= 45 ? "text-amber-400" : "text-red-400"
            )}>
              {result.health_score}
            </span>
            <span className="text-[9px] xs:text-xs sm:text-sm theme-text-muted">/ 100</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000 ease-out",
                result.health_score >= 70 ? "from-emerald-500 to-teal-400" :
                result.health_score >= 45 ? "from-amber-500 to-yellow-400" : "from-red-500 to-rose-400"
              )}
              style={{ width: `${result.health_score}%` }}
            />
          </div>
        </GlassCard>
      </div>

      {/* ── Analysis explanation ────────────────────────────────────── */}
      <GlassCard padding="md">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10">
            <svg className="h-3 w-3 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
          </div>
          <p className="text-xs xs:text-sm sm:text-base font-semibold theme-text">Clinical Analysis</p>
        </div>
        <p className="text-xs xs:text-sm sm:text-base theme-text-secondary leading-relaxed">{result.explanation}</p>
      </GlassCard>

      {/* ── Contributing factors ────────────────────────────────────── */}
      <GlassCard padding="md">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/10">
            <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
            </svg>
          </div>
          <p className="text-xs xs:text-sm sm:text-base font-semibold theme-text">Contributing Factors</p>
          <span className="ml-auto text-[8px] xs:text-[10px] sm:text-xs px-1.5 xs:px-2 py-0.5 rounded-full theme-text-muted shrink-0" style={{ background: 'var(--bg-elevated)' }}>
            {result.contributing_factors.length} factors
          </span>
        </div>
        <ul className="space-y-2">
          {result.contributing_factors.map((factor, i) => (
            <li key={i} className="flex items-start gap-2 xs:gap-3 text-[9px] xs:text-xs sm:text-sm theme-text-secondary">
              <span className={cn(
                "mt-1.5 h-1 xs:h-1.5 w-1 xs:w-1.5 shrink-0 rounded-full",
                style.text.replace("text-", "bg-")
              )} />
              {factor}
            </li>
          ))}
        </ul>
      </GlassCard>

      {/* ── Action ─────────────────────────────────────────────────── */}
      <button
        onClick={onReset}
        className="group w-full rounded-xl border py-2 xs:py-3 text-xs xs:text-sm sm:text-base font-semibold theme-text-muted transition-all duration-200 hover:theme-text theme-transition"
        style={{ borderColor: 'var(--border-input)', background: 'var(--bg-elevated)' }}
      >
        <span className="flex items-center justify-center gap-2">
          <svg className="h-3 xs:h-3.5 w-3 xs:w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Run Another Analysis
        </span>
      </button>
    </div>
  );
}
