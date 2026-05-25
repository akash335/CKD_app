"use client";

import { cn } from "@/lib/utils";

interface ProgressIndicatorProps {
  total: number;
  current: number; // 0-based
  className?: string;
}

/**
 * Horizontal dot-progress indicator.
 * Active dot expands to a pill; others stay small circles.
 * Matches the app's existing muted color tokens.
 */
export function ProgressIndicator({
  total,
  current,
  className,
}: ProgressIndicatorProps) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1.5", className)}
      role="tablist"
      aria-label="Onboarding progress"
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          role="tab"
          aria-selected={i === current}
          className={cn(
            "h-1.5 rounded-full transition-all duration-300 ease-out",
            i === current
              ? "w-6 bg-gradient-to-r from-sky-400 to-violet-400"
              : i < current
              ? "w-1.5 bg-sky-500/40"
              : "w-1.5 bg-[var(--border-primary)]"
          )}
        />
      ))}
    </div>
  );
}
