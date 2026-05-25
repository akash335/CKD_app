"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRole } from "@/lib/role-context";
import { usePreloadedData } from "@/lib/data-prefetch-context";
import {
  acceptRequest,
  rejectRequest,
  fetchDoctorRequests,
  fetchInAppNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/api-client";
import { useClickOutside } from "@/hooks/useClickOutside";
import type { ConnectionRequest, InAppNotificationData } from "@/lib/api-client";

const POLL_INTERVAL = 8_000; // Poll every 8 seconds

/** Relative time label: "Just now", "2m ago", "1h ago", "3d ago" */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** Icon for notification type */
function notificationIcon(type: string): string {
  switch (type) {
    case "new_message": return "💬";
    case "connection_request": return "🔗";
    case "connection_accepted": return "✅";
    case "health_alert": return "🚨";
    default: return "🔔";
  }
}

export function NotificationBell() {
  const { role, userId } = useRole();
  const {
    doctorRequests: requests,
    doctorRequestsLoaded,
    setDoctorRequests,
    refetchDoctorRequests,
  } = usePreloadedData();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "requests">(role === "doctor" ? "requests" : "all");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  // ── Fetch in-app notifications ──────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetchInAppNotifications(userId, false, 30);
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch {
      // silent
    }
  }, [userId]);

  // ── Doctor: silent poll for connection requests ─────────────────────────
  const silentPoll = useCallback(async () => {
    if (role !== "doctor" || !userId) return;
    try {
      const data = await fetchDoctorRequests(userId);
      setDoctorRequests(data);
    } catch {
      // silent
    }
  }, [role, userId, setDoctorRequests]);

  // ── Start polling both notifications and doctor requests ───────────────
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchNotifs();
    if (role === "doctor" && !doctorRequestsLoaded) {
      refetchDoctorRequests();
    }

    // Poll
    pollRef.current = setInterval(() => {
      fetchNotifs();
      if (role === "doctor") silentPoll();
    }, POLL_INTERVAL);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [role, userId, doctorRequestsLoaded, refetchDoctorRequests, silentPoll, fetchNotifs]);

  // ── Doctor: handle connection request actions ──────────────────────────
  const handleAction = async (requestId: string, action: "accept" | "reject") => {
    if (!userId) return;
    try {
      setDoctorRequests((prev: ConnectionRequest[]) =>
        prev.map(r =>
          r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r
        )
      );
      if (action === "accept") {
        await acceptRequest(requestId, userId);
        window.dispatchEvent(new CustomEvent("refresh-patients"));
      } else {
        await rejectRequest(requestId, userId);
      }
      window.dispatchEvent(new CustomEvent("refresh-doctor-requests"));
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      refetchDoctorRequests();
    }
  };

  // ── Mark notification as read ─────────────────────────────────────────
  const handleNotifClick = async (notif: InAppNotificationData) => {
    if (!userId || notif.is_read) return;
    try {
      await markNotificationRead(notif.id, userId);
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      await markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

  const pendingRequests = role === "doctor" ? requests.filter(r => r.status === "pending") : [];
  const totalBadge = unreadCount + pendingRequests.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg theme-text-muted transition-all hover:bg-[var(--bg-elevated-hover)] hover:theme-text"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {totalBadge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-96 origin-top-right rounded-2xl border p-4 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200 z-50"
          style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-primary)', boxShadow: 'var(--shadow-card)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold theme-text">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[9px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full theme-text-muted" style={{ background: 'var(--bg-elevated)' }}>
                {totalBadge} New
              </span>
            </div>
          </div>

          {/* Tabs — only show if doctor (has both requests + notifications) */}
          {role === "doctor" && (
            <div className="flex gap-1 mb-3 p-0.5 rounded-lg" style={{ background: 'var(--bg-elevated)' }}>
              <button
                onClick={() => setActiveTab("requests")}
                className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all ${
                  activeTab === "requests"
                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    : "theme-text-muted hover:theme-text border border-transparent"
                }`}
              >
                Requests{pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ""}
              </button>
              <button
                onClick={() => setActiveTab("all")}
                className={`flex-1 text-[10px] font-semibold py-1.5 rounded-md transition-all ${
                  activeTab === "all"
                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    : "theme-text-muted hover:theme-text border border-transparent"
                }`}
              >
                Messages{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            </div>
          )}

          {/* Content */}
          <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-1">

            {/* ── TAB: Doctor Connection Requests ───────────────────────── */}
            {role === "doctor" && activeTab === "requests" && (
              <>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-6 text-sm theme-text-dimmed border border-dashed rounded-xl" style={{ borderColor: 'var(--border-primary)' }}>
                    No pending requests.
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div key={req.id} className="flex flex-col gap-2 p-3 rounded-xl border border-violet-500/20 transition-colors" style={{ background: 'var(--bg-card)' }}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold theme-text">{req.patient_name || "Unknown Patient"}</p>
                          <p className="text-[10px] theme-text-muted mt-0.5">wants to connect with you.</p>
                        </div>
                        <p className="text-[9px] theme-text-dimmed shrink-0">{new Date(req.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => handleAction(req.id, "reject")}
                          className="flex-1 rounded-lg border px-2 py-1.5 text-[10px] font-medium theme-text-muted hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                          style={{ borderColor: 'var(--border-input)', background: 'var(--bg-elevated)' }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleAction(req.id, "accept")}
                          className="flex-1 rounded-lg bg-violet-500/10 border border-violet-500/20 px-2 py-1.5 text-[10px] font-medium text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/30 transition-all"
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* ── TAB: All Notifications (messages, alerts, connections) ── */}
            {(activeTab === "all" || role !== "doctor") && (
              <>
                {notifications.length === 0 ? (
                  <div className="text-center py-6 text-sm theme-text-dimmed border border-dashed rounded-xl" style={{ borderColor: 'var(--border-primary)' }}>
                    No new notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`flex w-full items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        notif.is_read
                          ? "border-transparent opacity-60"
                          : "border-violet-500/20"
                      }`}
                      style={{ background: notif.is_read ? 'transparent' : 'var(--bg-card)' }}
                    >
                      {/* Icon / Avatar */}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-sm">
                        {notif.sender_image ? (
                          <img src={notif.sender_image} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          notificationIcon(notif.type)
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold theme-text truncate">{notif.title}</p>
                          <p className="text-[9px] theme-text-dimmed shrink-0 mt-0.5">{timeAgo(notif.created_at)}</p>
                        </div>
                        <p className="text-[11px] theme-text-muted mt-0.5 line-clamp-2">{notif.body}</p>
                      </div>

                      {/* Unread dot */}
                      {!notif.is_read && (
                        <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                      )}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
