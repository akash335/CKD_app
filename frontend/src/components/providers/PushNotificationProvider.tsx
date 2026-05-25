"use client";

/**
 * PushNotificationProvider.tsx
 *
 * Client component that initializes push notifications for the signed-in user
 * and renders in-app notification toasts globally across the entire app.
 */

import { useSession } from "next-auth/react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { NotificationToastContainer } from "@/components/InAppNotificationToast";

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | null)?.id ?? null;

  const { notifications, dismiss } = usePushNotifications(userId);

  return (
    <>
      {children}
      <NotificationToastContainer notifications={notifications} onDismiss={dismiss} />
    </>
  );
}
