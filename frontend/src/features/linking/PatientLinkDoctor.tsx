"use client";

import { useCallback, useEffect, useState } from "react";
import { 
  fetchPatientRequests, 
  createConnectionRequest, 
  deleteRequest,
  unlinkPatient,
  ConnectionRequest 
} from "@/lib/api-client";
import { useRole } from "@/lib/role-context";
import { usePreloadedData } from "@/lib/data-prefetch-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { ChatPanel } from "@/features/messaging/ChatPanel";
import { ChatPeer } from "@/types/chat";

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof (error as { message?: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return fallback;
}

function getErrorStatus(error: unknown): number | null {
  if (error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number") {
    return (error as { status: number }).status;
  }
  return null;
}

export function PatientLinkDoctor() {
  const { userId } = useRole();
  const { 
    patientRequests: requests, 
    patientRequestsLoading, 
    patientRequestsLoaded,
    refetchPatientRequests: loadRequests 
  } = usePreloadedData();
  
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [chatPeer, setChatPeer] = useState<ChatPeer | null>(null);

  // Load patient requests on mount if not already loaded by the global prefetch
  useEffect(() => {
    if (!patientRequestsLoaded && userId) {
      loadRequests();
    }
    // NOTE: Background polling is handled globally by DataPrefetchProvider.
    // No local interval needed — this prevents duplicate DB calls and
    // race conditions with the mutation grace period.
  }, [patientRequestsLoaded, userId, loadRequests]);

  // Show loading only on very first load
  const isLoading = patientRequestsLoading && !patientRequestsLoaded;


  const handleDeleteRequest = async (requestId: string) => {
    if (!userId) return;
    try {
      await deleteRequest(requestId, userId);
      await loadRequests();
      window.dispatchEvent(new CustomEvent("refresh-patients"));
    } catch (err: unknown) {
      const status = getErrorStatus(err);
      if (status !== 404) {
        console.error("Failed to delete request:", err);
        setError("Failed to delete request. Please try again.");
      } else {
        await loadRequests();
      }
    }
  };

  const handleUnlinkDoctor = async (doctorId: string) => {
    if (!userId) return;
    try {
      await unlinkPatient(userId, doctorId);
      await loadRequests();
      window.dispatchEvent(new CustomEvent("refresh-patients"));
    } catch (err: unknown) {
      console.error("Failed to unlink doctor:", err);
      setError("Failed to disconnect from doctor. Please try again.");
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      await createConnectionRequest(userId, username);
      setSuccess("Connection request sent to doctor!");
      setUsername("");
      await loadRequests();
      // Notify globally so any listening components can refresh
      window.dispatchEvent(new CustomEvent("refresh-patients"));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to send request. Check the username."));
    } finally {
      setLoading(false);
    }
  };


  return (
    <GlassCard padding="lg" className="h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold theme-text">Your Doctors</h2>
          <p className="text-sm theme-text-muted">Manage your connected healthcare providers</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
      </div>

      <form onSubmit={handleLink} className="mb-8">
        <label className="block text-sm font-medium theme-text-muted mb-2">Connect with a Doctor</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-dimmed font-mono">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="unique_username"
              className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-elevated)] pl-8 pr-4 py-2.5 text-sm theme-text placeholder:theme-text-faint outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username}
            className="rounded-xl bg-sky-500 hover:bg-sky-400 px-4 py-2.5 text-sm font-semibold theme-text shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Request Link"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        {success && <p className="mt-2 text-xs text-emerald-400">{success}</p>}
      </form>

      <div>
        <h3 className="text-sm font-bold theme-text mb-3">Connection Requests</h3>
        {isLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-12 bg-[var(--bg-elevated)] rounded-xl" />
            <div className="h-12 bg-[var(--bg-elevated)] rounded-xl" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-6 text-sm theme-text-dimmed">
            No connection requests found.
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)]">
                <div>
                  <p className="text-sm font-medium theme-text">{req.doctor_name || "Doctor"}</p>
                  <p className="text-xs theme-text-dimmed">{new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-400 border border-amber-500/20">
                        Pending
                      </span>
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1 rounded-lg theme-text-dimmed hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Cancel request"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {req.status === "accepted" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                        Accepted
                      </span>
                      <button
                        onClick={() => setChatPeer({
                          id: req.doctor_id,
                          name: req.doctor_name || "Doctor",
                          role: "doctor",
                        })}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
                      >
                        Message
                      </button>
                      <button
                        onClick={() => handleUnlinkDoctor(req.doctor_id)}
                        className="p-1.5 rounded-lg theme-text-dimmed hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Disconnect Doctor"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {req.status === "rejected" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-medium text-red-400 border border-red-500/20">
                        Rejected
                      </span>
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1 rounded-lg theme-text-dimmed hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Remove from list"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {req.status === "removed" && (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-1 text-[10px] font-medium text-slate-400 border border-slate-500/20">
                        Disconnected
                      </span>
                      <button
                        onClick={() => handleDeleteRequest(req.id)}
                        className="p-1 rounded-lg theme-text-dimmed hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Remove from list"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {userId && chatPeer && (
        <ChatPanel
          isOpen={Boolean(chatPeer)}
          onClose={() => setChatPeer(null)}
          currentUserId={userId}
          initialPeer={chatPeer}
        />
      )}
    </GlassCard>
  );
}
