"use client";

import { cn } from "@/lib/utils";

interface TooltipProps {
  text: string;
  children: React.ReactNode;
  position?: "top" | "bottom";
}

/**
 * Simple CSS-only tooltip for contextual explanations.
 */
export function Tooltip({ text, children, position = "top" }: TooltipProps) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap",
          "rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] text-slate-200",
          "border border-white/10 shadow-xl",
          "opacity-0 transition-all duration-200 group-hover:opacity-100",
          position === "top"
            ? "bottom-full mb-2 group-hover:-translate-y-0.5"
            : "top-full mt-2 group-hover:translate-y-0.5"
        )}
      >
        {text}
      </span>
    </span>
  );
}
