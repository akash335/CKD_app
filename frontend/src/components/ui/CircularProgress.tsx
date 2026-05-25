"use client";

import { useEffect, useRef, useState } from "react";
import { cn, getScoreGradient } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  animated?: boolean;
  className?: string;
}

/**
 * Animated circular progress indicator for displaying scores.
 */
export function CircularProgress({
  value,
  max = 100,
  size = 160,
  strokeWidth = 10,
  label,
  sublabel,
  animated = true,
  className,
}: CircularProgressProps) {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : value);
  const animationRef = useRef<number | null>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(value / max, 1);
  const offset = circumference - (displayValue / max) * circumference;

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    let start: number | null = null;
    const duration = 1200;

    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [value, animated]);

  const gradient = getScoreGradient(value);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Gradient definition */}
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop
              offset="0%"
              className={cn(
                value >= 80
                  ? "[stop-color:theme(colors.emerald.500)]"
                  : value >= 60
                  ? "[stop-color:theme(colors.amber.500)]"
                  : value >= 40
                  ? "[stop-color:theme(colors.orange.500)]"
                  : "[stop-color:theme(colors.red.500)]"
              )}
            />
            <stop
              offset="100%"
              className={cn(
                value >= 80
                  ? "[stop-color:theme(colors.teal.400)]"
                  : value >= 60
                  ? "[stop-color:theme(colors.yellow.400)]"
                  : value >= 40
                  ? "[stop-color:theme(colors.amber.400)]"
                  : "[stop-color:theme(colors.rose.400)]"
              )}
            />
          </linearGradient>
        </defs>

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="theme-text/[0.06]"
          strokeWidth={strokeWidth}
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#score-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-100 ease-out"
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl sm:text-4xl font-bold tracking-tight theme-text tabular-nums">
          {displayValue}
        </span>
        {label && (
          <span className="mt-0.5 text-[11px] font-medium uppercase tracking-widest theme-text-muted">
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-[10px] theme-text-dimmed">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
