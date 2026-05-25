"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const STORAGE_KEY = "ckdguardian-onboarded";

interface OnboardingContextType {
  /** True while we still need to show onboarding */
  showOnboarding: boolean;
  /** Call when user finishes or skips */
  completeOnboarding: () => void;
  /** Call to force-reset (dev / testing) */
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType>({
  showOnboarding: false,
  completeOnboarding: () => {},
  resetOnboarding: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

/**
 * Provides onboarding state to the entire app.
 * Reads / writes localStorage to remember if the user has already
 * completed the onboarding flow so it only shows once.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  // Start hidden; we'll reveal after checking localStorage
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      setShowOnboarding(true);
    }
    setMounted(true);
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setShowOnboarding(true);
  }, []);

  // Don't render children until we know if onboarding is needed
  // (avoids flash of dashboard before overlay)
  if (!mounted) return null;

  return (
    <OnboardingContext.Provider
      value={{ showOnboarding, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
