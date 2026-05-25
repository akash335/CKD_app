"use client";

import { cn } from "@/lib/utils";

export interface DashboardTab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface DashboardNavProps {
  tabs: DashboardTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

/**
 * Horizontal tab navigation for switching between dashboard sections.
 * Scrollable on mobile, full-width on desktop.
 */
export function DashboardNav({ tabs, activeTab, onTabChange }: DashboardNavProps) {
  return (
    <nav className="mb-6">
      <div className="flex gap-1 overflow-x-auto rounded-xl border p-1 scrollbar-none theme-transition" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-1 xs:gap-1.5 sm:gap-2 whitespace-nowrap rounded-lg px-3 sm:px-4 py-2 xs:py-2.5 text-[0.7rem] xs:text-xs sm:text-sm font-medium transition-all duration-200 shrink-0 justify-center",
                isActive
                  ? "theme-text shadow-sm border"
                  : "theme-text-muted border border-transparent"
              )}
              style={isActive ? { background: 'var(--bg-elevated-hover)', borderColor: 'var(--border-hover)' } : undefined}
            >
              <span className={cn("shrink-0", isActive ? "text-sky-400" : "text-slate-500")}>
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              {/* Mobile: show abbreviated label */}
              <span className="sm:hidden">
                {tab.label.length > 8 ? tab.label.slice(0, 8) + "…" : tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
