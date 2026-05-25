"use client";

import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg", className)}
      style={{ background: 'var(--shimmer)' }}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div
        className="rounded-2xl border p-4 sm:p-6"
        style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
      >
        <div className="flex items-center gap-4">
          <Shimmer className="h-14 w-14 rounded-full" />
          <div className="space-y-2 flex-1">
            <Shimmer className="h-5 w-40" />
            <Shimmer className="h-3 w-28" />
          </div>
          <div className="hidden sm:flex gap-2">
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <Shimmer className="mt-4 h-10 w-full rounded-xl" />
      </div>

      {/* Score + Risk row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          className="rounded-2xl border p-6 flex flex-col items-center"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <Shimmer className="h-4 w-24 mb-6" />
          <Shimmer className="h-36 w-36 rounded-full" />
          <div className="mt-6 w-full space-y-3">
            <Shimmer className="h-10 w-full rounded-xl" />
            <Shimmer className="h-10 w-full rounded-xl" />
            <Shimmer className="h-10 w-full rounded-xl" />
          </div>
        </div>
        <div
          className="rounded-2xl border p-6"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <Shimmer className="h-4 w-20 mb-5" />
          <div className="flex items-center gap-3 mb-5">
            <Shimmer className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Shimmer className="h-5 w-28" />
              <Shimmer className="h-3 w-20" />
            </div>
          </div>
          <Shimmer className="h-2 w-full rounded-full mb-4" />
          <Shimmer className="h-1.5 w-full rounded-full mb-6" />
          <div className="space-y-2">
            <Shimmer className="h-3 w-full" />
            <Shimmer className="h-3 w-3/4" />
            <Shimmer className="h-3 w-5/6" />
          </div>
        </div>
        <div
          className="rounded-2xl border p-6 md:col-span-2 lg:col-span-1"
          style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
        >
          <Shimmer className="h-4 w-24 mb-4" />
          <div className="space-y-3">
            <Shimmer className="h-14 w-full rounded-xl" />
            <Shimmer className="h-14 w-full rounded-xl" />
            <Shimmer className="h-14 w-full rounded-xl" />
          </div>
        </div>
      </div>

      {/* Metrics skeleton */}
      <div>
        <Shimmer className="h-4 w-24 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-card)' }}
            >
              <Shimmer className="h-3 w-16 mb-3" />
              <Shimmer className="h-7 w-20 mb-3" />
              <Shimmer className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
