/**
 * usePushNotifications.ts
 *
 * React hook that:
 * 1. Waits until the user has interacted with the app before requesting permission
 * 2. Initializes the native push notification service
 * 3. Subscribes to foreground notifications and surfaces them via state
 * 4. Cleans up on logout / unmount
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  initPushNotifications,
  isNativePlatform,
  onForegroundNotification,
  teardownPushNotifications,
  type PushNotificationPayload,
} from "@/lib/pushNotificationService";

export interface InAppNotification extends PushNotificationPayload {
  id: string;
  receivedAt: number;
}

export function usePushNotifications(userId: string | null | undefined) {
  const initialized = useRef(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  // Dismiss a specific in-app notification
  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  // Dismiss all
  const dismissAll = () => setNotifications([]);

  useEffect(() => {
    if (!userId || !isNativePlatform() || initialized.current) return;

    // Defer permission request — ask after first interaction
    const requestOnInteraction = () => {
      if (initialized.current) return;
      initialized.current = true;

      initPushNotifications(userId).catch(console.error);

      // Subscribe to foreground notifications
      const unsubscribe = onForegroundNotification((payload) => {
        const notification: InAppNotification = {
          ...payload,
          id: `${Date.now()}-${Math.random()}`,
          receivedAt: Date.now(),
        };
        setNotifications((prev) => [notification, ...prev].slice(0, 5)); // max 5 queued
      });

      return unsubscribe;
    };

    // Fire after first user gesture (click / scroll / touch)
    const events = ["click", "touchstart", "scroll"];
    let cleanup: (() => void) | undefined;

    const handler = () => {
      cleanup = requestOnInteraction() ?? undefined;
      events.forEach((e) => window.removeEventListener(e, handler));
    };

    events.forEach((e) => window.addEventListener(e, handler, { once: true }));

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      cleanup?.();
      teardownPushNotifications().catch(console.error);
      initialized.current = false;
    };
  }, [userId]);

  return { notifications, dismiss, dismissAll };
}
