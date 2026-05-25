"use client";

import { cn } from "@/lib/utils";

interface OnboardingSlideProps {
  /** Icon rendered inside the tinted circle */
  icon: React.ReactNode;
  /** Gradient color for the icon circle — Tailwind gradient classes */
  iconGradient?: string;
  /** Main title */
  title: string;
  /** Supporting description */
  description: string;
  /** Optional accent color for the ambient glow behind the icon */
  glowColor?: string;
  className?: string;
}

/**
 * A single feature-highlight slide used in the features carousel.
 * Reuses GlassCard aesthetics (border, backdrop, shadow) inline so it
 * can be used without extra wrappers.
 */
export function OnboardingSlide({
  icon,
  iconGradient = "from-sky-500 to-violet-500",
  title,
  description,
  glowColor = "bg-sky-500",
  className,
}: OnboardingSlideProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center text-center px-4",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        className
      )}
    >
      {/* Ambient glow */}
      <div
        className={cn(
          "absolute top-0 h-32 w-32 rounded-full opacity-[0.08] blur-3xl -z-10",
          glowColor
        )}
      />

      {/* Icon circle */}
      <div
        className={cn(
          "mb-6 flex h-20 w-20 items-center justify-center rounded-2xl",
          "bg-gradient-to-br shadow-lg",
          iconGradient
        )}
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}
      >
        {icon}
      </div>

      {/* Text */}
      <h2 className="text-2xl sm:text-3xl font-bold theme-text mb-3 tracking-tight">
        {title}
      </h2>
      <p className="text-sm theme-text-muted leading-relaxed max-w-xs">
        {description}
      </p>
    </div>
  );
}
