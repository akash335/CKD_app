"use client";

/**
 * NotificationSettings.tsx
 *
 * Premium notification settings card — lets users control
 * push notification categories individually.
 * Safe to render on web (hides native-only info when not on device).
 */

import { useEffect, useState } from "react";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/api-client";
import { isNativePlatform } from "@/lib/pushNotificationService";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface Props {
  userId: string;
}

interface ToggleRowProps {
  icon: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
}

function ToggleRow({ icon, label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between py-3.5 px-4 rounded-xl border transition-all duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-70",
      )}
      style={{
        borderColor: disabled ? "var(--border-muted)" : "var(--border-primary)",
        background: disabled ? "var(--bg-muted)" : "var(--bg-elevated)",
      }}
    >
      <div className="flex items-center gap-3 flex-1">
        <span className="text-xl shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="m-0 font-semibold text-sm theme-text">{label}</p>
          <p className="m-0 mt-1 text-xs theme-text-muted">{description}</p>
        </div>
      </div>

      {/* Toggle switch */}
      <button
        disabled={disabled}
        onClick={() => onChange(!checked)}
        aria-label={`${label} ${checked ? "enabled" : "disabled"}`}
        className="relative w-11 h-6 rounded-full border-0 cursor-pointer transition-all duration-200 shrink-0 ml-4"
        style={{
          background: checked
            ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
            : "rgba(100,116,139,0.25)",
        }}
      >
        <span
          className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 shadow-md"
          style={{
            left: checked ? "22px" : "2px",
          }}
        />
      </button>
    </div>
  );
}

export function NotificationSettings({ userId }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNative = isNativePlatform();

  useEffect(() => {
    fetchNotificationPreferences(userId)
      .then(setPrefs)
      .catch(() => setError("Failed to load notification settings."));
  }, [userId]);

  const update = async (patch: Partial<Omit<NotificationPreferences, "user_id">>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const updated = await updateNotificationPreferences(userId, patch);
      setPrefs(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setPrefs(prefs); // rollback
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!prefs) {
    return (
      <GlassCard padding="md">
        <div className="flex items-start gap-3 rounded-xl border px-4 py-3" style={{ borderColor: error ? "rgba(239,68,68,0.25)" : "var(--border-primary)", background: error ? "rgba(239,68,68,0.06)" : "var(--bg-elevated)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 shrink-0">
            <span className="text-base">🔔</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-sm font-semibold theme-text">Push Notifications</p>
            <p className="m-0 mt-1 text-xs theme-text-muted">
              {error
                ? "Backend is disconnected right now. Push notification settings will appear once the server is back online."
                : "Loading notification settings…"}
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  const categoryDisabled = !prefs.push_enabled;

  return (
    <GlassCard padding="lg" className="max-w-lg">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
          <span className="text-lg">🔔</span>
        </div>
        <h3 className="text-base font-bold theme-text flex-1">Push Notifications</h3>
        {saving && (
          <span className="text-xs font-medium text-indigo-400">Saving…</span>
        )}
        {saved && !saving && (
          <span className="text-xs font-medium text-emerald-400">✓ Saved</span>
        )}
      </div>
      <p className="mb-5 text-xs theme-text-muted">
        {isNative
          ? "Manage what alerts you receive on this device."
          : "Install the app on your phone to receive push notifications."}
      </p>

      {error && (
        <div
          className="mb-4 rounded-lg border px-4 py-2 text-xs font-medium"
          style={{
            borderColor: "rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.1)",
            color: "#fca5a5",
          }}
        >
          {error}
        </div>
      )}

      {/* Toggles container */}
      <div className="space-y-2.5">
        {/* Master toggle */}
        <ToggleRow
          icon="📱"
          label="Enable Push Notifications"
          description="Master switch for all notifications"
          checked={prefs.push_enabled}
          onChange={(val) => update({ push_enabled: val })}
        />

        {/* Category toggles */}
        <ToggleRow
          icon="💊"
          label="Medicine Reminders"
          description="Get notified at your scheduled medication times"
          checked={prefs.medicine_reminders}
          disabled={categoryDisabled}
          onChange={(val) => update({ medicine_reminders: val })}
        />
        <ToggleRow
          icon="💬"
          label="Chat Messages"
          description="New messages from your doctor or patient"
          checked={prefs.chat_messages}
          disabled={categoryDisabled}
          onChange={(val) => update({ chat_messages: val })}
        />
        <ToggleRow
          icon="🔴"
          label="Health Alerts"
          description="High or critical CKD risk predictions"
          checked={prefs.health_alerts}
          disabled={categoryDisabled}
          onChange={(val) => update({ health_alerts: val })}
        />
      </div>

      {!isNative && (
        <div
          className="mt-5 rounded-lg border px-4 py-3 text-xs font-medium"
          style={{
            borderColor: "rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.1)",
            color: "#a5b4fc",
          }}
        >
          📲 Download the CKD Guardian app on your Android phone to receive live push notifications.
        </div>
      )}
    </GlassCard>
  );
}
