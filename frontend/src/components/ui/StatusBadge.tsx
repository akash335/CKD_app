"use client";

import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  pulse?: boolean;
  size?: "sm" | "md";
}

const variants = {
  success: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-500/20",
  },
  warning: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-500/20",
  },
  danger: {
    bg: "bg-red-500/15",
    text: "text-red-400",
    dot: "bg-red-400",
    border: "border-red-500/20",
  },
  info: {
    bg: "bg-sky-500/15",
    text: "text-sky-400",
    dot: "bg-sky-400",
    border: "border-sky-500/20",
  },
  neutral: {
    bg: "bg-slate-500/15",
    text: "theme-text-muted",
    dot: "bg-slate-400",
    border: "border-slate-500/20",
  },
};

export function StatusBadge({
  label,
  variant = "neutral",
  pulse = false,
  size = "sm",
}: StatusBadgeProps) {
  const v = variants[variant];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        v.bg,
        v.text,
        v.border,
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {pulse && (
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              v.dot
            )}
          />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", v.dot)} />
      </span>
      {label}
    </span>
  );
}
