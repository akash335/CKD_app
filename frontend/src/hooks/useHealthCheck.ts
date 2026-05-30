"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { checkHealth, HealthCheckResponse } from "@/lib/api-client";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ckd-guardian-backend.onrender.com";

const INTERNAL_API_KEY =
  process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "ckdguardian-secure-key-2026";

interface UseHealthCheckReturn {
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  warming: boolean;
  refetch: () => void;
}

let cachedHealth: HealthCheckResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000;

async function silentWakeUp(signal: AbortSignal): Promise<boolean> {
  const delays = [0, 4000, 6000, 6000, 8000, 8000, 8000];

  for (const delay of delays) {
    if (signal.aborted) return false;

    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    if (signal.aborted) return false;

    try {
      const res = await fetch(`${BASE_URL}/ping`, {
        method: "GET",
        headers: {
          "X-API-Key": INTERNAL_API_KEY,
        },
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });

      if (res.ok) return true;
    } catch {
      // backend may still be sleeping
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

    if (!force && cachedHealth && now - cacheTimestamp < CACHE_TTL) {
      setData(cachedHealth);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setWarming(false);
    setError(null);

    try {
      const pingRes = await fetch(`${BASE_URL}/ping`, {
        method: "GET",
        headers: {
          "X-API-Key": INTERNAL_API_KEY,
        },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });

      if (!pingRes.ok) {
        throw new Error("ping_failed");
      }

      const result = await checkHealth();

      if (!mountedRef.current) return;

      cachedHealth = result;
      cacheTimestamp = Date.now();

      setData(result);
      setLoading(false);
      setWarming(false);
      setError(null);
    } catch {
      if (!mountedRef.current) return;

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
          if (mountedRef.current) {
            setError("Backend woke up but health check failed");
          }
        }
      } else {
        setError("Backend did not respond after 40s");
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
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