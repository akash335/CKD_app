"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { deleteRecord, RecordData } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { usePreloadedData } from "@/lib/data-prefetch-context";
import { useRole } from "@/lib/role-context";

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  moderate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
};

const modeLabels: Record<string, string> = { hospital: "Hospital", urea: "Urea", "medical-report": "Medical Report" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function RecordDetail({ record, onBack, onDelete }: { record: RecordData; onBack: () => void; onDelete: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const rc = riskColors[record.risk_level] || riskColors.moderate;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs theme-text-muted hover:theme-text transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
          Back to History
        </button>

        {!isDeleting ? (
          <button 
            onClick={() => setIsDeleting(true)}
            className="flex items-center gap-1 text-[10px] text-rose-500/70 hover:text-rose-500 transition-colors uppercase tracking-wider font-semibold"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
            <span className="text-[10px] font-semibold text-rose-500 uppercase tracking-wider">Confirm?</span>
            <button onClick={onDelete} className="bg-rose-500 text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-rose-600 transition-colors">Yes, Delete</button>
            <button onClick={() => setIsDeleting(false)} className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold theme-text">Report Detail</h3>
        <span className="text-[10px] theme-text-dimmed">{formatDate(record.created_at)}</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassCard padding="sm"><p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">Risk Level</p><p className={cn("text-lg font-bold capitalize", rc.split(" ")[0])}>{record.risk_level}</p></GlassCard>
        <GlassCard padding="sm"><p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">Confidence</p><p className="text-lg font-bold theme-text">{record.confidence}%</p></GlassCard>
        <GlassCard padding="sm"><p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-1">Health Score</p><p className="text-lg font-bold theme-text">{record.health_score}/100</p></GlassCard>
      </div>

      {/* Input values */}
      <GlassCard padding="md">
        <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-3">Input Values ({modeLabels[record.input_mode]})</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.entries(record.input_values).map(([key, val]) => (
            <div key={key} className="rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)] px-3 py-2">
              <p className="text-[10px] theme-text-dimmed capitalize">{key}</p>
              <p className="text-sm font-semibold theme-text tabular-nums">{val}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Explanation */}
      <GlassCard padding="md">
        <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-2">Analysis</p>
        <p className="text-sm theme-text-muted leading-relaxed">{record.explanation}</p>
      </GlassCard>

      {/* Factors */}
      <GlassCard padding="md">
        <p className="text-[10px] theme-text-dimmed uppercase tracking-wider mb-3">Contributing Factors</p>
        <ul className="space-y-2">
          {record.contributing_factors.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-xs theme-text-muted">
              <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", rc.split(" ")[0].replace("text-", "bg-"))} />
              {f}
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}

export function HistorySection() {
  const { userId } = useRole();
  const { 
    records, 
    recordsLoading, 
    recordsLoaded,
    setRecords,
    refetchRecords 
  } = usePreloadedData();

  const [selectedRecord, setSelectedRecord] = useState<RecordData | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);

  // Local sync: if prefetch hasn't finished, trigger it now for this section
  useEffect(() => {
    if (!recordsLoaded && userId) {
      refetchRecords();
    }
  }, [recordsLoaded, userId, refetchRecords]);

  const loading = recordsLoading && !recordsLoaded;

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
      setRecordToDelete(null);
      window.dispatchEvent(new CustomEvent("refresh-records"));
    } catch (err: any) {
      const msg = err?.message || (typeof err === "string" ? err : "Unknown error");
      console.error("Failed to delete record:", msg);
      // Optional: Add a local error state if you want to show it in UI
      alert(`Failed to delete record: ${msg}`);
      setRecordToDelete(null);
    }
  };

  if (selectedRecord) {
    return <RecordDetail record={selectedRecord} onBack={() => setSelectedRecord(null)} onDelete={() => handleDelete(selectedRecord.id)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        <h2 className="text-sm font-semibold theme-text">History</h2>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] theme-text-muted border border-[var(--border-primary)]">{records.length} records</span>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map((i) => <div key={i} className="h-16 rounded-xl bg-[var(--bg-elevated)]" />)}
        </div>
      ) : records.length === 0 ? (
        <GlassCard padding="lg" className="text-center py-16">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-[var(--bg-elevated)] theme-text-dimmed mb-3">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm theme-text-muted mb-1">No records yet</p>
          <p className="text-xs theme-text-dimmed">Run a prediction from the Data Input tab to see history here.</p>
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {records.map((rec) => {
            const rc = riskColors[rec.risk_level] || riskColors.moderate;
            const isConfirmingDelete = recordToDelete === rec.id;
            
            return (
              <div 
                key={rec.id} 
                className={cn(
                  "relative w-full rounded-xl border border-[var(--border-primary)] bg-[var(--bg-elevated)] transition-all overflow-hidden",
                  isConfirmingDelete ? "border-rose-500/50 ring-1 ring-rose-500/20" : "hover:bg-[var(--bg-elevated-hover)] hover:border-[var(--border-hover)]"
                )}
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <div 
                    onClick={() => setSelectedRecord(rec)}
                    className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-elevated)] theme-text-muted text-[10px] font-bold uppercase">{modeLabels[rec.input_mode]?.slice(0, 3)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium theme-text">{modeLabels[rec.input_mode]} Analysis</span>
                        <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize", rc)}>{rec.risk_level}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] theme-text-dimmed">
                        <span>Score: {rec.health_score}/100</span>
                        <span>·</span>
                        <span>{rec.confidence}% conf.</span>
                        <span>·</span>
                        <span>{formatDate(rec.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isConfirmingDelete ? (
                      <button 
                        onClick={() => setRecordToDelete(rec.id)}
                        className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500/40 hover:text-rose-500 transition-all"
                        title="Delete record"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 animate-in slide-in-from-right-2">
                        <button 
                          onClick={() => handleDelete(rec.id)}
                          className="px-2 py-1 rounded bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 transition-colors"
                        >
                          Delete
                        </button>
                        <button 
                          onClick={() => setRecordToDelete(null)}
                          className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white text-[10px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    
                    {!isConfirmingDelete && (
                      <svg className="h-4 w-4 theme-text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
