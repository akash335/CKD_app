"use client";

import { useHealthCheck } from "@/hooks/useHealthCheck";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

/**
 * Live backend connection status card.
 */
export function BackendStatus() {
  const { data, loading, error, connected, refetch } = useHealthCheck();

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10">
            <svg className="h-3 w-3 text-sky-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold theme-text">System Status</h3>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex h-7 w-7 items-center justify-center rounded-lg theme-text-muted transition-all hover:bg-[var(--bg-elevated-hover)] disabled:opacity-50"
          title="Refresh status"
        >
          <svg
            className={cn("h-3.5 w-3.5", loading && "animate-spin")}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 rounded-xl" style={{ background: 'var(--shimmer)' }} />
          <div className="h-8 rounded-lg" style={{ background: 'var(--shimmer)' }} />
          <div className="h-8 rounded-lg" style={{ background: 'var(--shimmer)' }} />
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-500/[0.06] border border-red-500/20 px-4 py-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-xs font-medium text-red-400">Connection Failed</span>
          </div>
          <p className="text-[11px] theme-text-muted leading-relaxed">
            Cannot reach the backend at <code className="text-[10px] px-1 py-0.5 rounded theme-text-secondary" style={{ background: 'var(--bg-elevated)' }}>ckd-guardian-backend.onrender.com</code>
          </p>
        </div>
      ) : data ? (
        <div className="space-y-3">
          {/* Connection banner */}
          <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-xs font-medium text-emerald-400">
                Backend Connected
              </span>
              <span className="ml-auto text-[10px] theme-text-dimmed font-mono">
                {data.version}
              </span>
            </div>
          </div>

          {/* Component statuses */}
          <div className="space-y-1">
            {Object.entries(data.components).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <span className="text-[11px] theme-text-muted capitalize">
                  {key.replace("_", " ")}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    value === "healthy" || value === "loaded"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-slate-500"
                  )}
                  style={value !== "healthy" && value !== "loaded" ? { background: 'var(--bg-elevated)' } : undefined}
                >
                  {value.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>

          {/* Timestamp */}
          <p className="text-[10px] theme-text-faint text-right">
            Checked: {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
      ) : null}
    </GlassCard>
  );
}
