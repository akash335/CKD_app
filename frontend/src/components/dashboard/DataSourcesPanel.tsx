"use client";

import { DataSourceStatus } from "@/types/patient";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn, timeAgo } from "@/lib/utils";

interface DataSourcesPanelProps {
  sources: DataSourceStatus[];
}

const sourceIcons: Record<string, React.ReactNode> = {
  hospital: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
    </svg>
  ),
  urea: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
    </svg>
  ),
  "medical-report": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0013.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12a3 3 0 110-6H8.25a9.013 9.013 0 010-18H12a9 9 0 019 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
    </svg>
  ),
};

export function DataSourcesPanel({ sources }: DataSourcesPanelProps) {
  return (
    <GlassCard>
      <h2 className="text-sm font-semibold theme-text mb-4">Data Sources</h2>
      <div className="space-y-3">
        {sources.map((src) => (
          <div key={src.source} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--bg-card)]">
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", src.isConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 theme-text-dimmed")}>
              {sourceIcons[src.source]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">{src.label}</span>
                <span className={cn("flex items-center gap-1 text-[10px]", src.isConnected ? "text-emerald-400" : "theme-text-dimmed")}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", src.isConnected ? "bg-emerald-400" : "bg-slate-600")} />
                  {src.isConnected ? "Connected" : "Offline"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] theme-text-dimmed">
                <span>{src.recordCount} records</span>
                <span>·</span>
                <span>{src.lastSync ? `Synced ${timeAgo(src.lastSync)}` : "No data yet"}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
