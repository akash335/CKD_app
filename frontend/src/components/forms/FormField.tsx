"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

interface FormFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  unit?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Premium form input with floating label feel, unit badge, validation state,
 * and smooth micro-interactions. Designed for medical-grade trust.
 */
export function FormField({
  label,
  name,
  value,
  onChange,
  type = "number",
  placeholder,
  unit,
  hint,
  error,
  required = true,
  min,
  max,
  step,
}: FormFieldProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = value !== "" && value !== undefined;

  return (
    <div className="group relative space-y-1.5">
      {/* Label row */}
      <label
        htmlFor={name}
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium transition-colors duration-200",
          focused ? "theme-text" : "theme-text-muted"
        )}
      >
        {label}
        {required && (
          <span className={cn(
            "transition-colors duration-200",
            error ? "text-red-400" : focused ? "text-sky-400" : "text-red-400/50"
          )}>*</span>
        )}
        {unit && (
          <span
            className={cn(
              "ml-auto text-[10px] px-2 py-0.5 rounded-md font-mono transition-all duration-200",
              focused
                ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                : "theme-text-faint border"
            )}
            style={!focused ? { background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' } : undefined}
          >
            {unit}
          </span>
        )}
      </label>

      {/* Input wrapper with glow effect */}
      <div className="relative">
        {/* Focus glow ring */}
        <div
          className={cn(
            "absolute -inset-px rounded-[13px] transition-opacity duration-300",
            focused ? "opacity-100" : "opacity-0"
          )}
          style={{
            background: error
              ? "linear-gradient(135deg, rgba(239,68,68,0.15), rgba(239,68,68,0.05))"
              : "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(139,92,246,0.08))",
          }}
        />

        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder || (focused ? `Enter ${label.toLowerCase()}...` : "—")}
          required={required}
          min={min}
          max={max}
          step={step}
          className={cn(
            "relative w-full rounded-xl border px-4 py-3 text-sm font-medium theme-transition",
            "outline-none transition-all duration-200",
            "theme-text",
            // Placeholder
            "placeholder:font-normal",
            focused ? "placeholder:theme-text-faint" : "placeholder:theme-text-faint",
            // States
            error
              ? "border-red-500/40 focus:border-red-400/60 focus:ring-2 focus:ring-red-500/15"
              : focused
                ? "border-sky-500/40 ring-2 ring-sky-500/10"
                : hasValue
                  ? "border-emerald-500/20 hover:border-emerald-500/30"
                  : "hover:border-[var(--border-hover)]"
          )}
          style={{
            background: focused ? 'var(--bg-card)' : 'var(--bg-input)',
            borderColor: !error && !focused && !hasValue ? 'var(--border-input)' : undefined,
          }}
        />

        {/* Success check indicator */}
        {hasValue && !error && !focused && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 animate-in fade-in duration-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Hint / Error text */}
      <div className="min-h-[14px]">
        {error ? (
          <p className="flex items-center gap-1 text-[10px] text-red-400 animate-in fade-in duration-200">
            <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {error}
          </p>
        ) : hint ? (
          <p className={cn(
            "text-[10px] transition-colors duration-200",
            focused ? "theme-text-muted" : "theme-text-faint"
          )}>
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
