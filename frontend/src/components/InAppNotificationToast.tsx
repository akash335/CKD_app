"use client";

/**
 * InAppNotificationToast.tsx
 *
 * Premium floating toast for foreground push notifications.
 * Auto-dismisses after 5 seconds. Slides in from top-right.
 * Tapping navigates to the conversation.
 */

import { useEffect, useRef } from "react";
import type { InAppNotification } from "@/hooks/usePushNotifications";

interface Props {
  notification: InAppNotification;
  onDismiss: (id: string) => void;
}

export function InAppNotificationToast({ notification, onDismiss }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(notification.id), 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notification.id, onDismiss]);

  const handleClick = () => {
    onDismiss(notification.id);
    const data = notification.data;
    if (!data) return;
    
    if (data.type === "new_message" && data.conversation_id) {
      window.location.href = `/chat?conversation=${data.conversation_id}`;
    } else if (data.type === "medicine_reminder") {
      window.location.href = `/dashboard`;
    } else if (data.type === "health_alert") {
      window.location.href = `/dashboard`;
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        background: "rgba(17, 17, 27, 0.92)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(99, 102, 241, 0.4)",
        borderRadius: "16px",
        padding: "14px 18px",
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.15)",
        minWidth: "280px",
        maxWidth: "340px",
        animation: "slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        position: "relative",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "10px",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: "18px",
        }}
      >
        💬
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {notification.title && (
          <p
            style={{
              margin: 0,
              fontWeight: 600,
              fontSize: "13px",
              color: "#e2e8f0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {notification.title}
          </p>
        )}
        {notification.body && (
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "12px",
              color: "#94a3b8",
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: "1.4",
            }}
          >
            {notification.body}
          </p>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id);
        }}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          background: "none",
          border: "none",
          color: "#64748b",
          cursor: "pointer",
          fontSize: "14px",
          padding: "2px 4px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "2px",
          borderRadius: "0 0 16px 16px",
          background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
          animation: "shrinkWidth 5s linear forwards",
          width: "100%",
        }}
      />

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100%) scale(0.9); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}


interface ToastContainerProps {
  notifications: InAppNotification[];
  onDismiss: (id: string) => void;
}

/**
 * Renders all active in-app notification toasts in a fixed overlay.
 */
export function NotificationToastContainer({ notifications, onDismiss }: ToastContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        pointerEvents: "none",
      }}
    >
      {notifications.map((n) => (
        <div key={n.id} style={{ pointerEvents: "auto" }}>
          <InAppNotificationToast notification={n} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
