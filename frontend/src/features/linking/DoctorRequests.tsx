"use client";

import { useState } from "react";
import { acceptRequest, rejectRequest, type ConnectionRequest } from "@/lib/api-client";
import { useRole } from "@/lib/role-context";
import { usePreloadedData } from "@/lib/data-prefetch-context";
import { ChatPanel } from "@/features/messaging/ChatPanel";
import type { ChatPeer } from "@/types/chat";

export function DoctorRequests({ onAccept }: { onAccept?: () => void }) {
  const { userId } = useRole();
  const {
    doctorRequests: requests,
    doctorRequestsLoading,
    doctorRequestsLoaded,
    setDoctorRequests,
    refetchDoctorRequests,
  } = usePreloadedData();
  const [chatPeer, setChatPeer] = useState<ChatPeer | null>(null);

  // Show loading skeleton only on the very first load (before any data has arrived)
  const loading = doctorRequestsLoading && !doctorRequestsLoaded;

  const handleAction = async (requestId: string, action: "accept" | "reject") => {
    if (!userId) return;
    try {
      // Optimistic update — move request to new status immediately
      setDoctorRequests((prev: ConnectionRequest[]) =>
        prev.map(r =>
          r.id === requestId ? { ...r, status: action === "accept" ? "accepted" : "rejected" } : r
        )
      );

      if (action === "accept") {
        await acceptRequest(requestId, userId);
        if (onAccept) onAccept();
        // Refresh patient list + conversations (new chat channel now available)
        window.dispatchEvent(new CustomEvent("refresh-patients"));
        window.dispatchEvent(new CustomEvent("refresh-conversations"));
      } else {
        await rejectRequest(requestId, userId);
        // Refresh patient list so rejected patient disappears from active list
        window.dispatchEvent(new CustomEvent("refresh-patients"));
      }
      // Sync doctor requests with server in background
      window.dispatchEvent(new CustomEvent("refresh-doctor-requests"));
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      // Revert optimistic update on failure
      refetchDoctorRequests();
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const pastRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
        {/* Pending Requests */}
        <div>
          <h3 className="text-sm font-bold theme-text mb-3">Pending ({pendingRequests.length})</h3>
          {loading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-16 bg-[var(--bg-elevated)] rounded-xl" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-6 text-sm theme-text-dimmed border border-dashed border-[var(--border-primary)] rounded-xl">
              No pending requests.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-violet-500/20 hover:bg-[var(--bg-elevated)] transition-colors gap-3">
                  <div>
                    <p className="text-sm font-bold theme-text">{req.patient_name || "Unknown Patient"}</p>
                    <p className="text-[11px] theme-text-dimmed">{new Date(req.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleAction(req.id, "reject")}
                      className="flex-1 sm:flex-none rounded-lg border border-[var(--border-input)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs theme-text-muted hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction(req.id, "accept")}
                      className="flex-1 sm:flex-none rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-md active:scale-[0.98]"
                      style={{ 
                        backgroundColor: 'rgba(124, 58, 237, 0.1)', 
                        borderColor: 'rgba(124, 58, 237, 0.25)', 
                        borderWidth: '1px',
                        color: 'var(--accent-primary)'
                      }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {userId && chatPeer && (
        <ChatPanel
          isOpen={Boolean(chatPeer)}
          onClose={() => setChatPeer(null)}
          currentUserId={userId}
          initialPeer={chatPeer}
        />
      )}
    </div>
  );
}
