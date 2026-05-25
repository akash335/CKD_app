"use client";

import { AlertData } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AlertsBannerProps {
  alerts: AlertData[];
  onDismiss?: (id: string) => void;
}

const severityStyles: Record<string, { bg: string; border: string; icon: string; iconBg: string }> = {
  critical: { bg: "bg-red-500/[0.06]", border: "border-red-500/25", icon: "text-red-400", iconBg: "bg-red-500/15" },
  warning: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/25", icon: "text-amber-400", iconBg: "bg-amber-500/15" },
  info: { bg: "bg-sky-500/[0.06]", border: "border-sky-500/25", icon: "text-sky-400", iconBg: "bg-sky-500/15" },
};

const severityIcons: Record<string, React.ReactNode> = {
  critical: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  warning: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

/**
 * Persistent alert banner for critical health warnings.
 */
export function AlertsBanner({ alerts, onDismiss }: AlertsBannerProps) {
  if (alerts.length === 0) return null;

  const sorted = [...alerts].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.severity as keyof typeof order] ?? 2) - (order[b.severity as keyof typeof order] ?? 2);
  });

  return (
    <div className="space-y-2 mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
      {sorted.map((alert) => {
        const s = severityStyles[alert.severity] || severityStyles.info;
        return (
          <div key={alert.id} className={cn("rounded-xl border px-4 py-3", s.bg, s.border)}>
            <div className="flex items-start gap-3">
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5", s.iconBg, s.icon)}>
                {severityIcons[alert.severity] || severityIcons.info}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold theme-text">{alert.title}</h4>
                  {onDismiss && (
                    <button onClick={() => onDismiss(alert.id)} className="shrink-0 theme-text-dimmed hover:theme-text transition-colors">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                <p className="text-[11px] theme-text-muted leading-relaxed mt-0.5">{alert.message}</p>
                {alert.action && (
                  <p className="text-[10px] theme-text-dimmed mt-1.5 flex items-center gap-1">
                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                    {alert.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
