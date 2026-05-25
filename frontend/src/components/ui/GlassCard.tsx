"use client";

import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

/**
 * Premium frosted-glass card — the foundational container.
 * Adapts to light/dark mode with proper depth and layering.
 */
export function GlassCard({
  children,
  className,
  hover = false,
  padding = "md",
}: GlassCardProps) {
  const paddings = {
    sm: "p-3.5 sm:p-4",
    md: "p-4 sm:p-5 lg:p-6",
    lg: "p-5 sm:p-6 lg:p-8",
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border backdrop-blur-xl theme-transition",
        hover && "transition-all duration-300",
        paddings[padding],
        className
      )}
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border-primary)",
        boxShadow: "var(--shadow-card)",
      }}
      onMouseEnter={hover ? (e) => {
        e.currentTarget.style.borderColor = "var(--border-hover)";
        e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
        e.currentTarget.style.background = "var(--bg-card-hover)";
      } : undefined}
      onMouseLeave={hover ? (e) => {
        e.currentTarget.style.borderColor = "var(--border-primary)";
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.background = "var(--bg-card)";
      } : undefined}
    >
      {children}
    </div>
  );
}
