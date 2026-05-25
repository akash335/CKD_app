"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { checkHealth, HealthCheckResponse } from "@/lib/api-client";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://ckd-guardian-backend.onrender.com";

interface UseHealthCheckReturn {
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  warming: boolean; // true while silently retrying after a cold start
  refetch: () => void;
}

// Module-level cache so multiple component mounts share data
let cachedHealth: HealthCheckResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Silently pings /ping with retries to wake a sleeping Render backend.
 * Returns true once the backend responds, false after all retries exhausted.
 */
async function silentWakeUp(signal: AbortSignal): Promise<boolean> {
  const delays = [0, 4000, 6000, 6000, 8000, 8000, 8000]; // ~40s total
  for (const delay of delays) {
    if (signal.aborted) return false;
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    if (signal.aborted) return false;
    try {
      const res = await fetch(`${BASE_URL}/ping`, {
        signal: AbortSignal.timeout(6000),
      });
      if (res.ok) return true;
    } catch {
      // still sleeping, keep trying
    }
  }
  return false;
}

export function useHealthCheck(): UseHealthCheckReturn {
  const [data, setData] = useState<HealthCheckResponse | null>(cachedHealth);
  const [loading, setLoading] = useState(!cachedHealth);
  const [warming, setWarming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchHealth = useCallback(async (force = false) => {
    const now = Date.now();

    // Serve from cache if fresh (unless forced)
    if (!force && cachedHealth && now - cacheTimestamp < CACHE_TTL) {
      setData(cachedHealth);
      setLoading(false);
      return;
    }

    // Cancel any previous wake-up attempt
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setWarming(false);
    setError(null);

    try {
      // Fast ping first (5s) — covers normal awake case
      const pingRes = await fetch(`${BASE_URL}/ping`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!pingRes.ok) throw new Error("ping_failed");

      // Backend is awake — fetch full health
      const result = await checkHealth();
      if (!mountedRef.current) return;
      cachedHealth = result;
      cacheTimestamp = Date.now();
      setData(result);
      setLoading(false);
    } catch {
      if (!mountedRef.current) return;

      // Backend might be sleeping — silently warm it up in the background
      setLoading(false);
      setWarming(true);

      const awake = await silentWakeUp(controller.signal);
      if (!mountedRef.current || controller.signal.aborted) return;

      setWarming(false);

      if (awake) {
        try {
          const result = await checkHealth();
          if (!mountedRef.current) return;
          cachedHealth = result;
          cacheTimestamp = Date.now();
          setData(result);
          setError(null);
        } catch {
          if (mountedRef.current) setError("Backend woke up but health check failed");
        }
      } else {
        setError("Backend did not respond after 40s");
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchHealth();
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchHealth]);

  return {
    data,
    loading,
    warming,
    error,
    connected: data?.status === "healthy",
    refetch: () => fetchHealth(true),
  };
}

