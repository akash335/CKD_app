"use client";

import { useState, useCallback } from "react";
import { useOnboarding } from "./OnboardingContext";
import { ProgressIndicator } from "./ProgressIndicator";
import { OnboardingSlide } from "./OnboardingSlide";
import { useRole } from "@/lib/role-context";
import { cn } from "@/lib/utils";

// ── Total steps ───────────────────────────────────────────────────────────────
// 0 = Welcome
// 1 = Feature highlights (internal carousel 0-2)
// 2 = Role selection
// 3 = Permissions / setup
// 4 = Completion

const TOTAL_STEPS = 5;
const FEATURE_SLIDES = 3;

// ── Feature slide data ────────────────────────────────────────────────────────

const featureSlides = [
  {
    icon: (
      <svg
        className="h-9 w-9 text-white"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      </svg>
    ),
    iconGradient: "from-sky-500 to-cyan-400",
    glowColor: "bg-sky-500",
    title: "Track Your Health",
    description:
      "Monitor creatinine, urea, eGFR, and hemoglobin in one place. See trends over time with beautiful, easy-to-read charts.",
  },
  {
    icon: (
      <svg
        className="h-9 w-9 text-white"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
        />
      </svg>
    ),
    iconGradient: "from-violet-500 to-purple-400",
    glowColor: "bg-violet-500",
    title: "AI Risk Prediction",
    description:
      "Get instant CKD risk insights powered by a trained Gradient Boosting model. Receive a confidence score and personalized contributing factors.",
  },
  {
    icon: (
      <svg
        className="h-9 w-9 text-white"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      </svg>
    ),
    iconGradient: "from-emerald-500 to-teal-400",
    glowColor: "bg-emerald-500",
    title: "Stay Protected",
    description:
      "Receive intelligent health alerts and connect with your doctor. Early detection saves lives — CKD Guardian watches so you don't have to.",
  },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export function OnboardingContainer() {
  const { completeOnboarding } = useOnboarding();
  const { setRole } = useRole();

  const [step, setStep] = useState(0);
  const [featureSlide, setFeatureSlide] = useState(0);
  const [selectedRole, setSelectedRole] = useState<"patient" | "doctor" | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  // ── Navigation ────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    // Step 1 has internal feature slide navigation
    if (step === 1 && featureSlide < FEATURE_SLIDES - 1) {
      setFeatureSlide((s) => s + 1);
      return;
    }
    setStep((s) => s + 1);
  }, [step, featureSlide]);

  const goPrev = useCallback(() => {
    if (step === 1 && featureSlide > 0) {
      setFeatureSlide((s) => s - 1);
      return;
    }
    if (step > 0) setStep((s) => s - 1);
  }, [step, featureSlide]);

  const handleSkip = useCallback(() => {
    setIsExiting(true);
    setTimeout(completeOnboarding, 350);
  }, [completeOnboarding]);

  const handleFinish = useCallback(async () => {
    if (selectedRole) {
      setRoleLoading(true);
      await setRole(selectedRole);
      setRoleLoading(false);
    }
    setIsExiting(true);
    setTimeout(completeOnboarding, 350);
  }, [selectedRole, setRole, completeOnboarding]);

  // ── Progress calculation ──────────────────────────────────────────────────
  // Features step counts its internal slides for the indicator
  const totalDots = TOTAL_STEPS - 1 + FEATURE_SLIDES; // welcome + 3 feature slides + role + setup + done
  const currentDot =
    step === 0
      ? 0
      : step === 1
      ? 1 + featureSlide
      : step + FEATURE_SLIDES - 1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center px-4 bg-[var(--bg-primary)] bg-grid-pattern",
        "transition-opacity duration-350",
        isExiting ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      {/* Ambient orbs — identical to login page pattern */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-sky-500/[0.04] blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-80 w-80 rounded-full bg-violet-500/[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-emerald-500/[0.03] blur-3xl" />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500"
      >
        <div
          className="relative rounded-2xl border backdrop-blur-xl theme-transition overflow-hidden"
          style={{
            background: "var(--bg-card)",
            borderColor: "var(--border-primary)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* ── Skip button (top-right) ───────────────────────────── */}
          {step < 4 && (
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 z-10 text-xs theme-text-dimmed hover:theme-text-muted transition-colors px-2 py-1 rounded-lg hover:bg-[var(--bg-elevated)]"
            >
              Skip
            </button>
          )}

          {/* ── Step content ─────────────────────────────────────── */}
          <div className="p-8 pt-10 pb-6 min-h-[460px] flex flex-col">

            {/* STEP 0 — Welcome */}
            {step === 0 && <StepWelcome />}

            {/* STEP 1 — Feature highlights */}
            {step === 1 && (
              <div className="flex-1 flex flex-col justify-center">
                <OnboardingSlide
                  key={featureSlide}
                  {...featureSlides[featureSlide]}
                />
              </div>
            )}

            {/* STEP 2 — Role selection */}
            {step === 2 && (
              <StepRoleSelection
                selected={selectedRole}
                onSelect={setSelectedRole}
              />
            )}

            {/* STEP 3 — Permissions / setup */}
            {step === 3 && (
              <StepPermissions
                alertsEnabled={alertsEnabled}
                onToggleAlerts={() => setAlertsEnabled((v) => !v)}
              />
            )}

            {/* STEP 4 — Completion */}
            {step === 4 && <StepCompletion />}
          </div>

          {/* ── Footer: progress + nav ───────────────────────────── */}
          <div
            className="px-8 py-5 border-t"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
          >
            <ProgressIndicator
              total={totalDots}
              current={currentDot}
              className="mb-4"
            />

            <div className="flex items-center gap-3">
              {/* Back button */}
              {step > 0 && step < 4 && (
                <button
                  onClick={goPrev}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-medium theme-text-muted transition-all hover:theme-text hover:bg-[var(--bg-elevated-hover)] active:scale-[0.98] theme-transition"
                  style={{ borderColor: "var(--border-input)" }}
                >
                  Back
                </button>
              )}

              {/* Primary CTA */}
              {step < 4 ? (
                <button
                  onClick={step === 0 ? () => setStep(1) : goNext}
                  disabled={step === 2 && !selectedRole}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white",
                    "bg-gradient-to-r from-sky-500 to-violet-500",
                    "shadow-lg shadow-sky-500/20",
                    "transition-all hover:shadow-xl hover:shadow-sky-500/30 hover:scale-[1.01] active:scale-[0.99]",
                    "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  )}
                >
                  {step === 0
                    ? "Get Started"
                    : step === 1 && featureSlide < FEATURE_SLIDES - 1
                    ? "Next"
                    : step === 3
                    ? "Almost done!"
                    : "Continue"}
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  disabled={roleLoading}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-sm font-semibold text-white",
                    "bg-gradient-to-r from-emerald-500 to-teal-400",
                    "shadow-lg shadow-emerald-500/20",
                    "transition-all hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99]",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                >
                  {roleLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Setting up...
                    </span>
                  ) : (
                    "Go to Dashboard →"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step sub-components ──────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
      {/* Logo */}
      <div className="mx-auto flex h-20 w-20 items-center justify-center drop-shadow-2xl">
        <img
          src="/logo/logo.png"
          alt="CKD Guardian Logo"
          className="h-[140%] w-[140%] object-contain"
        />
      </div>

      {/* Wordmark */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight theme-text">
          CKD Guardian
        </h1>
        <p className="mt-2 text-base theme-text-muted">
          Monitor your kidney health smarter
        </p>
      </div>

      {/* Feature teaser chips */}
      <div className="flex flex-wrap justify-center gap-2 mt-1">
        {["ML Risk Prediction", "Lab Tracking", "Doctor Connect"].map((f) => (
          <span
            key={f}
            className="rounded-full border px-3 py-1 text-[11px] theme-text-dimmed"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function StepRoleSelection({
  selected,
  onSelect,
}: {
  selected: "patient" | "doctor" | null;
  onSelect: (role: "patient" | "doctor") => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold theme-text tracking-tight">Who are you?</h2>
        <p className="text-sm theme-text-muted mt-1">
          We&apos;ll personalise your experience
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Patient */}
        <RoleCard
          role="patient"
          selected={selected === "patient"}
          onSelect={() => onSelect("patient")}
          icon={
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          label="Patient"
          description="Track my kidney health"
          accentClass="sky"
        />

        {/* Doctor */}
        <RoleCard
          role="doctor"
          selected={selected === "doctor"}
          onSelect={() => onSelect("doctor")}
          icon={<span className="text-4xl leading-none">👨‍⚕️</span>}
          label="Doctor"
          description="Manage patient records"
          accentClass="violet"
        />
      </div>
    </div>
  );
}

function RoleCard({
  role,
  selected,
  onSelect,
  icon,
  label,
  description,
  accentClass,
}: {
  role: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  accentClass: "sky" | "violet";
}) {
  const colors = {
    sky: {
      iconBg: "bg-sky-500/10 text-sky-400",
      iconBgHover: "group-hover:bg-sky-500/20",
      ring: "border-sky-500/40 bg-sky-500/[0.04] shadow-sky-500/10",
    },
    violet: {
      iconBg: "bg-violet-500/10 text-violet-400",
      iconBgHover: "group-hover:bg-violet-500/20",
      ring: "border-violet-500/40 bg-violet-500/[0.04] shadow-violet-500/10",
    },
  }[accentClass];

  return (
    <button
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-200",
        selected
          ? cn(colors.ring, "shadow-lg")
          : "hover:shadow-md hover:" + colors.ring
      )}
      style={
        selected
          ? undefined
          : { borderColor: "var(--border-primary)", background: "var(--bg-card)" }
      }
    >
      {/* Selected checkmark */}
      {selected && (
        <span
          className={cn(
            "absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px]",
            accentClass === "sky" ? "bg-sky-500" : "bg-violet-500"
          )}
        >
          ✓
        </span>
      )}

      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-xl transition-all",
          colors.iconBg,
          colors.iconBgHover
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold theme-text">{label}</p>
        <p className="text-[11px] theme-text-dimmed mt-0.5 leading-snug">{description}</p>
      </div>
    </button>
  );
}

function StepPermissions({
  alertsEnabled,
  onToggleAlerts,
}: {
  alertsEnabled: boolean;
  onToggleAlerts: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold theme-text tracking-tight">Quick Setup</h2>
        <p className="text-sm theme-text-muted mt-1">
          Configure your preferences — you can change these later
        </p>
      </div>

      <div className="space-y-3">
        {/* Enable alerts toggle */}
        <div
          className="flex items-center justify-between rounded-xl border p-4 transition-all theme-transition"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <svg className="h-4.5 w-4.5 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium theme-text">Health Alerts</p>
              <p className="text-[11px] theme-text-dimmed">Get notified when values change</p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={onToggleAlerts}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
              alertsEnabled ? "bg-sky-500" : "bg-[var(--border-primary)]"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200",
                alertsEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {/* Emergency contacts — optional skip */}
        <div
          className="flex items-center gap-3 rounded-xl border p-4 theme-transition"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <svg className="h-4.5 w-4.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium theme-text">Emergency Contacts</p>
            <p className="text-[11px] theme-text-dimmed">Add from your Profile settings</p>
          </div>
          <span className="text-[10px] rounded-full px-2 py-0.5 bg-[var(--shimmer)] theme-text-dimmed">
            Optional
          </span>
        </div>

        {/* Profile note */}
        <p className="text-center text-[11px] theme-text-dimmed px-2 leading-relaxed">
          You can update all preferences at any time from your{" "}
          <span className="text-sky-400">Profile</span> page.
        </p>
      </div>
    </div>
  );
}

function StepCompletion() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-5">
      {/* Animated checkmark */}
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/30"
        style={{ animation: "scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
      >
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-3xl font-bold theme-text tracking-tight">
          You&apos;re all set!
        </h2>
        <p className="mt-2 text-sm theme-text-muted max-w-xs">
          CKD Guardian is ready. Start by entering your first lab results to get
          your personalised CKD risk assessment.
        </p>
      </div>

      {/* Feature summary pills */}
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {[
          { icon: "📊", text: "Lab data tracked securely" },
          { icon: "🧠", text: "ML model ready for predictions" },
          { icon: "🔔", text: "Alerts configured" },
        ].map(({ icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
          >
            <span className="text-base">{icon}</span>
            <span className="text-xs theme-text-muted">{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
