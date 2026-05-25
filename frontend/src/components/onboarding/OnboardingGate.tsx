"use client";

import { useOnboarding } from "./OnboardingContext";
import { OnboardingContainer } from "./OnboardingContainer";

/**
 * Renders the onboarding overlay when needed.
 * Drop this inside any layout that wraps authenticated content.
 *
 * Usage:
 *   <OnboardingGate />
 *   {children}
 */
export function OnboardingGate() {
  const { showOnboarding } = useOnboarding();
  if (!showOnboarding) return null;
  return <OnboardingContainer />;
}
