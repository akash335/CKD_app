/**
 * pushNotificationService.ts
 *
 * Core Capacitor push notification service.
 * Handles: registration, token retrieval, foreground/background events.
 * Only active on native Android/iOS — safely no-ops on web.
 */

import { Capacitor } from "@capacitor/core";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://ckd-guardian-backend.onrender.com";

let _isInitialized = false;

export type PushNotificationPayload = {
  title?: string;
  body?: string;
  data?: Record<string, string>;
};

export type NotificationHandler = (payload: PushNotificationPayload) => void;

// In-memory subscribers for foreground notifications
const _foregroundHandlers: Set<NotificationHandler> = new Set();

export function onForegroundNotification(handler: NotificationHandler): () => void {
  _foregroundHandlers.add(handler);
  return () => _foregroundHandlers.delete(handler);
}

function _dispatchForeground(payload: PushNotificationPayload) {
  _foregroundHandlers.forEach((h) => h(payload));
}

/** Returns true if running as a native Capacitor app (Android/iOS). */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Register device token with the backend.
 * Called after FCM registration succeeds.
 */
async function _registerTokenWithBackend(
  userId: string,
  token: string,
  platform: string
): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/push/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, token, platform }),
    });
    console.log("[Push] Token registered with backend.");
  } catch (err) {
    console.error("[Push] Failed to register token with backend:", err);
  }
}

/**
 * Remove device token from backend on logout.
 */
export async function unregisterPushToken(userId: string, token: string): Promise<void> {
  try {
    await fetch(`${BASE_URL}/api/push/register`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, token }),
    });
    console.log("[Push] Token unregistered from backend.");
  } catch (err) {
    console.error("[Push] Failed to unregister token:", err);
  }
}

/**
 * Initialize push notifications for a logged-in user.
 * Safe to call multiple times — initializes only once.
 */
export async function initPushNotifications(userId: string): Promise<void> {
  if (!isNativePlatform()) {
    console.log("[Push] Not a native platform — push notifications skipped.");
    return;
  }
  if (_isInitialized) return;
  _isInitialized = true;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const platform = Capacitor.getPlatform(); // "android" | "ios"

    // ── 1. Check / request permission ──────────────────────────────────
    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === "prompt") {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== "granted") {
      console.warn("[Push] Permission not granted:", permStatus.receive);
      _isInitialized = false;
      return;
    }

    // ── 2. Register with FCM ────────────────────────────────────────────
    await PushNotifications.register();

    // ── 3. Handle token ─────────────────────────────────────────────────
    PushNotifications.addListener("registration", async ({ value: token }) => {
      console.log("[Push] FCM token received:", token);
      await _registerTokenWithBackend(userId, token, platform);
      // Store token in sessionStorage so logout can unregister it
      sessionStorage.setItem("fcm_token", token);
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("[Push] Registration error:", err);
      _isInitialized = false;
    });

    // ── 4. Foreground notifications ─────────────────────────────────────
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      console.log("[Push] Foreground notification:", notification);
      _dispatchForeground({
        title: notification.title ?? undefined,
        body: notification.body ?? undefined,
        data: notification.data as Record<string, string> | undefined,
      });
    });

    // ── 5. Notification tap (background / closed) ───────────────────────
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      console.log("[Push] Notification tapped:", action);
      const data = action.notification.data as Record<string, string> | undefined;
      
      if (typeof window !== "undefined" && data) {
        if (data.type === "new_message" && data.conversation_id) {
          window.location.href = `/chat?conversation=${data.conversation_id}`;
        } else if (data.type === "medicine_reminder") {
          window.location.href = `/dashboard`;
        } else if (data.type === "health_alert") {
          window.location.href = `/dashboard`;
        }
      }
    });

    console.log("[Push] Push notification listeners registered.");
  } catch (err) {
    console.error("[Push] Initialization failed:", err);
    _isInitialized = false;
  }
}

/**
 * Fully tear down push notification listeners (call on logout).
 */
export async function teardownPushNotifications(): Promise<void> {
  if (!isNativePlatform() || !_isInitialized) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
    _isInitialized = false;
    console.log("[Push] Listeners removed.");
  } catch (err) {
    console.error("[Push] Teardown failed:", err);
  }
}
