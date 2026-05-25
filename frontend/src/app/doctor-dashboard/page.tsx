"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { useRole } from "@/lib/role-context";
import { DataPrefetchProvider, usePreloadedData } from "@/lib/data-prefetch-context";
import {
  fetchRecords,
  PatientSummary,
  RecordData,
  unlinkPatient,
  deleteRequest,
} from "@/lib/api-client";
import { DoctorRequestsModal } from "@/features/linking/DoctorRequestsModal";
import { ChatPanel } from "@/features/messaging/ChatPanel";
import { cn } from "@/lib/utils";
import type { ChatPeer } from "@/types/chat";

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Patient Detail View ──────────────────────────────────────────────────────

function PatientDetail({ patient, onBack }: { patient: PatientSummary; onBack: () => void }) {
  const [records, setRecords] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords(patient.user_id)
      .then((r) => setRecords(r.records))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [patient.user_id]);

  const rc = riskColors[patient.latest_risk_level] || riskColors.moderate;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs theme-text-muted hover:theme-text transition-colors">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        Back to Patient List
      </button>

      {/* Patient header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold theme-text">{patient.display_name}</h2>
          <div className="flex items-center gap-2 text-[10px] theme-text-dimmed">
            {patient.age && <span>{patient.age}y</span>}
            {patient.age && <span>·</span>}
            {patient.gender && <span className="capitalize">{patient.gender}</span>}
            {patient.gender && <span>·</span>}
            <span className="font-mono">{patient.user_id}</span>
          </div>
        </div>
        <span className={cn("text-[10px] font-medium px-2.5 py-1 rounded-full border capitalize", rc)}>
          {patient.latest_risk_level} risk
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <GlassCard padding="sm"><p className="mb-1 text-[10px] uppercase tracking-wider theme-text-dimmed">Records</p><p className="text-lg font-bold theme-text">{patient.record_count}</p></GlassCard>
        <GlassCard padding="sm"><p className="mb-1 text-[10px] uppercase tracking-wider theme-text-dimmed">Health Score</p><p className="text-lg font-bold theme-text">{patient.latest_health_score}/100</p></GlassCard>
        <GlassCard padding="sm"><p className="mb-1 text-[10px] uppercase tracking-wider theme-text-dimmed">Confidence</p><p className="text-lg font-bold theme-text">{patient.latest_confidence}%</p></GlassCard>
        <GlassCard padding="sm"><p className="mb-1 text-[10px] uppercase tracking-wider theme-text-dimmed">Last Updated</p><p className="text-xs font-medium theme-text">{formatDate(patient.last_updated)}</p></GlassCard>
      </div>

      {/* Records list */}
      <GlassCard padding="md">
        <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-3">Prediction History</p>
        {loading ? (
          <div className="space-y-2 animate-pulse">{[1,2,3].map((i) => <div key={i} className="h-14 rounded-xl bg-[var(--bg-elevated)]" />)}</div>
        ) : records.length === 0 ? (
          <p className="text-xs theme-text-dimmed py-6 text-center">No records found for this patient.</p>
        ) : (
          <div className="space-y-2">
            {records.map((rec) => {
              const recRc = riskColors[rec.risk_level] || riskColors.moderate;
              return (
                <div key={rec.id} className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono theme-text-dimmed uppercase">{rec.input_mode}</span>
                      <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border capitalize", recRc)}>{rec.risk_level}</span>
                    </div>
                    <span className="text-[10px] theme-text-dimmed">{formatDate(rec.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] theme-text-muted">
                    <span>Score: {rec.health_score}/100</span>
                    <span>Conf: {rec.confidence}%</span>
                    {Object.entries(rec.input_values).slice(0, 3).map(([k, v]) => (
                      <span key={k} className="capitalize">{k}: {v}</span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{rec.explanation}</p>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ── Main Doctor Dashboard Inner ────────────────────────────────────────────────

function DoctorDashboardInner() {
  const { clearRole, userId } = useRole();
  const router = useRouter();
  const { 
    patients, 
    patientsLoading, 
    patientsLoaded,
    setPatients,
    refetchPatients,
    doctorRequests
  } = usePreloadedData();

  const [selectedPatient, setSelectedPatient] = useState<PatientSummary | null>(null);
  const [patientToRemove, setPatientToRemove] = useState<PatientSummary | null>(null);
  const [chatPeer, setChatPeer] = useState<ChatPeer | null>(null);
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // Local sync
  useEffect(() => {
    if (!patientsLoaded && userId) {
      refetchPatients();
    }
  }, [patientsLoaded, userId, refetchPatients]);

  // Listen for patient refresh events (e.g. after accepting a request)
  useEffect(() => {
    const handleRefresh = () => void refetchPatients();
    window.addEventListener("refresh-patients", handleRefresh);
    return () => window.removeEventListener("refresh-patients", handleRefresh);
  }, [refetchPatients]);

  const loading = patientsLoading && !patientsLoaded;


  const handleRemovePatient = async () => {
    if (!patientToRemove || !userId) return;
    try {
      await unlinkPatient(patientToRemove.user_id, userId);
      setPatients(patients.filter(p => p.user_id !== patientToRemove.user_id));
      setPatientToRemove(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePastRequest = async (requestId: string, patientId: string) => {
    try {
      await deleteRequest(requestId, patientId);
      window.dispatchEvent(new CustomEvent("refresh-doctor-requests"));
    } catch (e) {
      console.error("Failed to delete past request:", e);
    }
  };

  const filteredPatients = patients.filter((p) => {
    if (search && !p.display_name.toLowerCase().includes(search.toLowerCase()) && !p.user_id.includes(search)) return false;
    if (riskFilter !== "all" && p.latest_risk_level !== riskFilter) return false;
    return true;
  });

  // Only show disconnected/rejected requests in history, since accepted ones are in the main list
  const pastRequests = doctorRequests.filter((r) => r.status === "rejected" || r.status === "removed");

  if (selectedPatient) {
    return (
      <AppShell>
        <PatientDetail patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-xl font-bold tracking-tight theme-text">Doctor Dashboard</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">Doctor Mode</span>
            </div>
            <p className="text-xs theme-text-muted">Monitor all patients across the system</p>
          </div>
          <div className="flex items-center gap-3">
            <DoctorRequestsModal />
            <button
              onClick={async () => { await clearRole(); router.push("/"); }}
              className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs theme-text-muted transition-all theme-transition"
              style={{ borderColor: 'var(--border-input)', background: 'var(--bg-elevated)' }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
              Switch Role
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard padding="sm">
            <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">Total Patients</p>
            <p className="text-xl font-bold theme-text">{patients.length}</p>
          </GlassCard>
          <GlassCard padding="sm">
            <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">Critical</p>
            <p className="text-xl font-bold text-red-400">{patients.filter((p) => p.latest_risk_level === "critical").length}</p>
          </GlassCard>
          <GlassCard padding="sm">
            <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">High Risk</p>
            <p className="text-xl font-bold text-orange-400">{patients.filter((p) => p.latest_risk_level === "high").length}</p>
          </GlassCard>
          <GlassCard padding="sm">
            <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">Low Risk</p>
            <p className="text-xl font-bold text-emerald-400">{patients.filter((p) => p.latest_risk_level === "low").length}</p>
          </GlassCard>
        </div>

        {/* Search & filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 theme-text-dimmed" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
            <input
              type="text" placeholder="Search patients..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm theme-text placeholder:theme-text-faint outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/40 theme-transition"
              style={{ background: 'var(--bg-input)', borderColor: 'var(--border-input)' }}
            />
          </div>
          <div className="flex gap-2">
            {["all", "critical", "high", "moderate", "low"].map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={cn("rounded-lg px-3 py-2 text-[10px] font-medium capitalize border transition-all",
                  riskFilter === level
                    ? "border-violet-500/30 bg-violet-500/10 text-violet-400"
                    : "theme-text-dimmed"
                )}
                style={riskFilter !== level ? { borderColor: 'var(--border-primary)', background: 'var(--bg-card)' } : undefined}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Patient list */}
        {loading ? (
          <div className="space-y-3 animate-pulse">{[1,2,3].map((i) => <div key={i} className="h-20 rounded-xl bg-[var(--bg-elevated)]" />)}</div>
        ) : filteredPatients.length === 0 ? (
          <GlassCard padding="lg" className="text-center py-16">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[var(--bg-elevated)] theme-text-dimmed mb-3">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
            </div>
            <p className="text-sm theme-text-muted mb-1">{patients.length === 0 ? "No patients yet" : "No patients match your filters"}</p>
            <p className="text-xs theme-text-dimmed">{patients.length === 0 ? "Patient records will appear here as predictions are submitted." : "Try adjusting your search or filter criteria."}</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {filteredPatients.map((patient) => {
              const pRc = riskColors[patient.latest_risk_level] || riskColors.moderate;
              return (
                <div
                  key={patient.user_id}
                  className="w-full text-left rounded-xl border px-4 py-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)' }}
                >
                  <button onClick={() => setSelectedPatient(patient)} className="flex-1 min-w-0 flex items-start sm:items-center gap-4 text-left w-full">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-sky-500/20 text-sm font-bold text-white">
                      {patient.display_name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium theme-text pr-2">{patient.display_name}</span>
                        <span className={cn("text-[9px] font-medium px-2 py-0.5 rounded-full border capitalize shrink-0", pRc)}>
                          {patient.latest_risk_level}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-1 text-[10px] theme-text-dimmed">
                        {patient.age && <span className="whitespace-nowrap">{patient.age}y</span>}
                        {patient.gender && <span className="capitalize whitespace-nowrap">{patient.gender}</span>}
                        <span className="font-mono truncate max-w-[90px] sm:max-w-none">{patient.user_id}</span>
                        <span className="whitespace-nowrap">{patient.record_count} records</span>
                        <span className="whitespace-nowrap">Score: {patient.latest_health_score}/100</span>
                        <span className="hidden sm:inline whitespace-nowrap">{formatDate(patient.last_updated)}</span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center justify-end gap-2 sm:pl-4 shrink-0 sm:border-l sm:ml-4 w-full sm:w-auto" style={{ borderColor: 'var(--border-primary)' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setChatPeer({
                          id: patient.user_id,
                          name: patient.display_name,
                          role: "patient",
                        });
                      }}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
                    >
                      Message
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setPatientToRemove(patient); }}
                      className="p-1.5 rounded-lg theme-text-dimmed hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Remove Patient"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                    <svg className="h-4 w-4 text-slate-600 pointer-events-none hidden sm:block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Requests Section */}
      {pastRequests.length > 0 && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <h2 className="text-lg font-bold tracking-tight theme-text mb-4">Connection History</h2>
          <div className="space-y-2">
            {pastRequests.map((req) => (
              <div
                key={req.id}
                className="w-full text-left rounded-xl border px-4 py-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)' }}
              >
                <div className="flex-1 min-w-0 flex items-start sm:items-center gap-4 text-left w-full">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-elevated-hover)] border border-[var(--border-primary)] text-sm font-bold theme-text">
                    {req.patient_name ? req.patient_name.split(" ").map((n) => n[0]).join("").slice(0, 2) : "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium theme-text pr-2">{req.patient_name || "Unknown Patient"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] theme-text-dimmed">
                      <span>{new Date(req.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-end gap-2 sm:pl-4 shrink-0 sm:border-l sm:ml-4 w-full sm:w-auto" style={{ borderColor: 'var(--border-primary)' }}>
                  {req.status === "accepted" ? (
                    <>
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400 border border-emerald-500/20 mr-2">
                        Accepted
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatPeer({
                            id: req.patient_id,
                            name: req.patient_name || "Unknown Patient",
                            role: "patient",
                          });
                        }}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-medium text-emerald-400 transition-all hover:bg-emerald-500/20"
                      >
                        Message
                      </button>
                    </>
                  ) : req.status === "removed" ? (
                    <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2.5 py-1.5 text-[10px] font-medium text-slate-400 border border-slate-500/20">
                      Disconnected
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-500/10 px-2.5 py-1.5 text-[10px] font-medium text-red-400 border border-red-500/20">
                      Rejected
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePastRequest(req.id, req.patient_id); }}
                    className="p-1.5 rounded-lg theme-text-dimmed hover:bg-red-500/10 hover:text-red-400 transition-colors ml-1"
                    title="Delete Record"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove Patient Confirmation Modal */}
      {patientToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-white/60 to-gray-200/60 dark:from-slate-900/80 dark:to-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl dark:shadow-black/30 backdrop-blur-xl bg-white/80 dark:bg-white/10 border border-gray-200/50 dark:border-white/20 ring-1 ring-inset ring-white/60 dark:ring-white/10 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Inner Highlight / Subtle Glow Edge */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5 dark:to-transparent opacity-50 pointer-events-none"></div>

            <div className="relative z-10">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Remove Patient</h3>
              <p className="text-sm text-gray-700 dark:text-gray-200 mb-6 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-gray-900 dark:text-white">{patientToRemove.display_name}</span> from your patient list? You will no longer have access to their records.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setPatientToRemove(null)}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-md text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemovePatient}
                  className="px-4 py-2 text-sm font-medium rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 border border-red-400/50 ring-1 ring-inset ring-white/20 hover:brightness-110 transition-all"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {userId && chatPeer && (
        <ChatPanel
          isOpen={Boolean(chatPeer)}
          onClose={() => setChatPeer(null)}
          currentUserId={userId}
          initialPeer={chatPeer}
        />
      )}
    </AppShell>
  );
}

export default function DoctorDashboardPage() {
  const { role } = useRole();
  const router = useRouter();

  // Guard: redirect non-doctors
  useEffect(() => {
    if (role !== null && role !== "doctor") router.replace("/dashboard");
  }, [role, router]);

  return (
    <DataPrefetchProvider>
      <DoctorDashboardInner />
    </DataPrefetchProvider>
  );
}
