"use client";

import { useState, useRef } from "react";
import { useRole } from "@/lib/role-context";
import { usePreloadedData } from "@/lib/data-prefetch-context";
import { DoctorRequests } from "./DoctorRequests";
import { useClickOutside } from "@/hooks/useClickOutside";

export function DoctorRequestsModal() {
  const { userId } = useRole();
  const { doctorRequests } = usePreloadedData();
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useClickOutside(modalRef, () => setIsOpen(false));

  // Derive pending count from the shared context — no separate API call needed
  const pendingCount = doctorRequests.filter(r => r.status === "pending").length;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all shadow-lg shadow-violet-500/10"
        style={{ 
          borderColor: 'rgba(124, 58, 237, 0.25)', 
          background: 'rgba(124, 58, 237, 0.1)',
          color: 'var(--accent-primary)'
        }}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
        Patient Requests
        {pendingCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold theme-text animate-pulse">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div 
            ref={modalRef}
            className="w-full max-w-lg rounded-2xl border border-[var(--border-input)] bg-[var(--bg-card)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-primary)] p-5 bg-[var(--bg-elevated)]">
              <div>
                <h2 className="text-lg font-bold theme-text">Patient Requests</h2>
                <p className="text-xs theme-text-muted mt-0.5">Manage incoming connection requests</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 theme-text-muted hover:bg-[var(--shimmer)] hover:theme-text transition-all"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
              <DoctorRequests onAccept={() => {
                // Data syncs automatically via shared context + events
              }} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
