"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { useRole } from "./role-context";
import {
  fetchRecords,
  fetchInsights,
  fetchPatientRequests,
  fetchIntelligenceReport,
  fetchMedicationEntries,
  fetchMedicationMealTimes,
  fetchConversations,
  fetchPatients,
  fetchDoctorRequests,
  fetchAlertSettings,
  fetchAlertContacts,
  type RecordData,
  type InsightData,
  type ConnectionRequest,
  type IntelligenceReport,
  type MedicationEntry,
  type MedicationMealTimes,
  type PatientSummary,
  type AlertSettings,
  type AlertContact,
} from "./api-client";
import { fetchPatientOverview } from "./api";
import type { PatientOverview } from "@/types/patient";
import type { ChatConversation } from "@/types/chat";

// ─── Types ─────────────────────────────────────────────────────────────────

interface PrefetchState {
  // Patient overview (used by Overview — health score, risk, metrics)
  patientOverview: PatientOverview | null;
  patientOverviewLoading: boolean;
  patientOverviewLoaded: boolean;

  // Records (used by History & Analytics)
  records: RecordData[];
  recordsLoading: boolean;
  recordsLoaded: boolean;

  // Insights (used by Analytics)
  insights: InsightData[];
  insightsLoading: boolean;
  insightsLoaded: boolean;

  // Patient requests (used by Doctors tab)
  patientRequests: ConnectionRequest[];
  patientRequestsLoading: boolean;
  patientRequestsLoaded: boolean;

  // Intelligence report (used by Overview)
  intelligenceReport: IntelligenceReport | null;
  intelligenceReportLoading: boolean;
  intelligenceReportLoaded: boolean;

  // Medications (used by Medications tab)
  medications: MedicationEntry[];
  medicationsLoading: boolean;
  medicationsLoaded: boolean;

  // Medication meal times
  mealTimes: MedicationMealTimes | null;
  mealTimesLoading: boolean;
  mealTimesLoaded: boolean;

  // Conversations (Messages)
  conversations: ChatConversation[];
  conversationsLoading: boolean;
  conversationsLoaded: boolean;

  // Doctor-specific: Patients
  patients: PatientSummary[];
  patientsLoading: boolean;
  patientsLoaded: boolean;

  // Doctor-specific: Connection Requests
  doctorRequests: ConnectionRequest[];
  doctorRequestsLoading: boolean;
  doctorRequestsLoaded: boolean;

  // Profile: Alert settings & contacts (prefetched for /profile page)
  alertSettings: AlertSettings | null;
  alertSettingsLoading: boolean;
  alertSettingsLoaded: boolean;
  alertContacts: AlertContact[];
  alertContactsLoading: boolean;
  alertContactsLoaded: boolean;

  // Mutators — allow sections to update cached data without refetching
  setPatientOverview: React.Dispatch<React.SetStateAction<PatientOverview | null>>;
  setRecords: React.Dispatch<React.SetStateAction<RecordData[]>>;
  setInsights: React.Dispatch<React.SetStateAction<InsightData[]>>;
  setPatientRequests: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  setIntelligenceReport: React.Dispatch<React.SetStateAction<IntelligenceReport | null>>;
  setMedications: React.Dispatch<React.SetStateAction<MedicationEntry[]>>;
  setMealTimes: React.Dispatch<React.SetStateAction<MedicationMealTimes | null>>;
  setConversations: React.Dispatch<React.SetStateAction<ChatConversation[]>>;
  setPatients: React.Dispatch<React.SetStateAction<PatientSummary[]>>;
  setDoctorRequests: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  setAlertSettings: React.Dispatch<React.SetStateAction<AlertSettings | null>>;
  setAlertContacts: React.Dispatch<React.SetStateAction<AlertContact[]>>;

  // Refetch helpers
  refetchPatientOverview: () => Promise<void>;
  refetchRecords: () => Promise<void>;
  refetchInsights: () => Promise<void>;
  refetchPatientRequests: () => Promise<void>;
  refetchIntelligenceReport: () => Promise<void>;
  refetchMedications: () => Promise<void>;
  refetchMealTimes: () => Promise<void>;
  refetchConversations: () => Promise<void>;
  refetchPatients: () => Promise<void>;
  refetchDoctorRequests: () => Promise<void>;
  refetchAlertSettings: () => Promise<void>;
  refetchAlertContacts: () => Promise<void>;
  refetchAll: () => void;
}

const defaultState: PrefetchState = {
  patientOverview: null,
  patientOverviewLoading: true,
  patientOverviewLoaded: false,
  records: [],
  recordsLoading: true,
  recordsLoaded: false,
  insights: [],
  insightsLoading: true,
  insightsLoaded: false,
  patientRequests: [],
  patientRequestsLoading: true,
  patientRequestsLoaded: false,
  intelligenceReport: null,
  intelligenceReportLoading: true,
  intelligenceReportLoaded: false,
  medications: [],
  medicationsLoading: true,
  medicationsLoaded: false,
  mealTimes: null,
  mealTimesLoading: true,
  mealTimesLoaded: false,
  conversations: [],
  conversationsLoading: true,
  conversationsLoaded: false,
  patients: [],
  patientsLoading: true,
  patientsLoaded: false,
  doctorRequests: [],
  doctorRequestsLoading: true,
  doctorRequestsLoaded: false,
  alertSettings: null,
  alertSettingsLoading: true,
  alertSettingsLoaded: false,
  alertContacts: [],
  alertContactsLoading: true,
  alertContactsLoaded: false,
  setPatientOverview: () => { },
  setRecords: () => { },
  setInsights: () => { },
  setPatientRequests: () => { },
  setIntelligenceReport: () => { },
  setMedications: () => { },
  setMealTimes: () => { },
  setConversations: () => { },
  setPatients: () => { },
  setDoctorRequests: () => { },
  setAlertSettings: () => { },
  setAlertContacts: () => { },
  refetchPatientOverview: async () => { },
  refetchRecords: async () => { },
  refetchInsights: async () => { },
  refetchPatientRequests: async () => { },
  refetchIntelligenceReport: async () => { },
  refetchMedications: async () => { },
  refetchMealTimes: async () => { },
  refetchConversations: async () => { },
  refetchPatients: async () => { },
  refetchDoctorRequests: async () => { },
  refetchAlertSettings: async () => { },
  refetchAlertContacts: async () => { },
  refetchAll: () => { },
};

const DataPrefetchContext = createContext<PrefetchState>(defaultState);

export function usePreloadedData() {
  return useContext(DataPrefetchContext);
}

/**
 *
 * Doctor prefetch order:
 *   1. Patients
 *   2. Doctor requests
 *   3. Conversations
 *
 * Patient prefetch order (most critical first):
 *   1. Intelligence report  (Overview — the landing tab)
 *   2. Records              (History & Analytics)
 *   3. Insights             (Analytics)
 *   4. Patient requests     (Doctors tab)
 *   5. Conversations (Messages)
 *   6. Medications          (Medications tab)
 *   7. Medication meal times
 */

// ── Module-level constants ────────────────────────────────────────────────
// Defined outside the component so they are never recreated on render.
const POLL_INTERVAL    = 30_000; // 30 seconds between background polls
const MUTATION_GRACE_MS = 5_000; // 5 seconds grace after a user mutation
const DEBOUNCE_MS       = 1_500; // 1.5 second debounce on event-triggered refetches

export function DataPrefetchProvider({ children }: { children: ReactNode }) {
  const { userId, role } = useRole();

  // ── State buckets ──────────────────────────────────────────────────────
  const [patientOverview, setPatientOverview] = useState<PatientOverview | null>(null);
  const [patientOverviewLoading, setPatientOverviewLoading] = useState(true);
  const [patientOverviewLoaded, setPatientOverviewLoaded] = useState(false);

  const [records, setRecords] = useState<RecordData[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsLoaded, setRecordsLoaded] = useState(false);

  const [insights, setInsights] = useState<InsightData[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsLoaded, setInsightsLoaded] = useState(false);

  const [patientRequests, setPatientRequests] = useState<ConnectionRequest[]>([]);
  const [patientRequestsLoading, setPatientRequestsLoading] = useState(true);
  const [patientRequestsLoaded, setPatientRequestsLoaded] = useState(false);

  const [intelligenceReport, setIntelligenceReport] = useState<IntelligenceReport | null>(null);
  const [intelligenceReportLoading, setIntelligenceReportLoading] = useState(true);
  const [intelligenceReportLoaded, setIntelligenceReportLoaded] = useState(false);

  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [medicationsLoading, setMedicationsLoading] = useState(true);
  const [medicationsLoaded, setMedicationsLoaded] = useState(false);

  const [mealTimes, setMealTimes] = useState<MedicationMealTimes | null>(null);
  const [mealTimesLoading, setMealTimesLoading] = useState(true);
  const [mealTimesLoaded, setMealTimesLoaded] = useState(false);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsLoaded, setPatientsLoaded] = useState(false);

  const [doctorRequests, setDoctorRequests] = useState<ConnectionRequest[]>([]);
  const [doctorRequestsLoading, setDoctorRequestsLoading] = useState(true);
  const [doctorRequestsLoaded, setDoctorRequestsLoaded] = useState(false);

  const [alertSettings, setAlertSettings] = useState<AlertSettings | null>(null);
  const [alertSettingsLoading, setAlertSettingsLoading] = useState(true);
  const [alertSettingsLoaded, setAlertSettingsLoaded] = useState(false);

  const [alertContacts, setAlertContacts] = useState<AlertContact[]>([]);
  const [alertContactsLoading, setAlertContactsLoading] = useState(true);
  const [alertContactsLoaded, setAlertContactsLoaded] = useState(false);

  // ── Loaded-state refs ──────────────────────────────────────────────────
  const overviewLoadedRef   = useRef(false);
  const recordsLoadedRef    = useRef(false);
  const insightsLoadedRef   = useRef(false);
  const reqLoadedRef        = useRef(false);
  const reportLoadedRef     = useRef(false);
  const medsLoadedRef       = useRef(false);
  const mealLoadedRef       = useRef(false);
  const convLoadedRef       = useRef(false);
  const patientsLoadedRef   = useRef(false);
  const drReqLoadedRef      = useRef(false);
  const alertSettingsLoadedRef = useRef(false);
  const alertContactsLoadedRef = useRef(false);

  // ── Individual refetch functions ───────────────────────────────────────
  // "First load" shows a loading skeleton; subsequent calls are silent.
  // Each callback only depends on userId — giving it a STABLE identity.
  // Stable identity → runPrefetch is stable → polling effect never restarts.

  const refetchPatientOverview = useCallback(async () => {
    if (!overviewLoadedRef.current) setPatientOverviewLoading(true);
    try {
      const overview = await fetchPatientOverview(userId || undefined);
      setPatientOverview(overview);
      overviewLoadedRef.current = true;
      setPatientOverviewLoaded(true);
    } catch { /* silent — fallback already returned by api.ts */ }
    setPatientOverviewLoading(false);
  }, [userId]);

  const refetchRecords = useCallback(async () => {
    if (!recordsLoadedRef.current) setRecordsLoading(true);
    try {
      const r = await fetchRecords(userId || undefined);
      setRecords(r.records);
      recordsLoadedRef.current = true;
      setRecordsLoaded(true);
    } catch { /* silent */ }
    setRecordsLoading(false);
  }, [userId]);

  const refetchInsights = useCallback(async () => {
    if (!insightsLoadedRef.current) setInsightsLoading(true);
    try {
      const ins = await fetchInsights(userId || undefined);
      setInsights(ins);
      insightsLoadedRef.current = true;
      setInsightsLoaded(true);
    } catch { /* silent */ }
    setInsightsLoading(false);
  }, [userId]);

  const refetchPatientRequests = useCallback(async () => {
    if (!userId) return;
    if (!reqLoadedRef.current) setPatientRequestsLoading(true);
    try {
      const data = await fetchPatientRequests(userId);
      setPatientRequests(data);
      reqLoadedRef.current = true;
      setPatientRequestsLoaded(true);
    } catch { /* silent */ }
    setPatientRequestsLoading(false);
  }, [userId]);

  const refetchIntelligenceReport = useCallback(async () => {
    if (!reportLoadedRef.current) setIntelligenceReportLoading(true);
    try {
      const rpt = await fetchIntelligenceReport(userId || undefined);
      setIntelligenceReport(rpt);
      reportLoadedRef.current = true;
      setIntelligenceReportLoaded(true);
    } catch { /* silent */ }
    setIntelligenceReportLoading(false);
  }, [userId]);

  const refetchMedications = useCallback(async () => {
    if (!userId) return;
    if (!medsLoadedRef.current) setMedicationsLoading(true);
    try {
      const meds = await fetchMedicationEntries(userId);
      setMedications(meds);
      medsLoadedRef.current = true;
      setMedicationsLoaded(true);
    } catch { /* silent */ }
    setMedicationsLoading(false);
  }, [userId]);

  const refetchMealTimes = useCallback(async () => {
    if (!userId) return;
    if (!mealLoadedRef.current) setMealTimesLoading(true);
    try {
      const mt = await fetchMedicationMealTimes(userId);
      setMealTimes(mt);
      mealLoadedRef.current = true;
      setMealTimesLoaded(true);
    } catch { /* silent */ }
    setMealTimesLoading(false);
  }, [userId]);

  const refetchConversations = useCallback(async () => {
    if (!userId) return;
    if (!convLoadedRef.current) setConversationsLoading(true);
    try {
      const data = await fetchConversations(userId);
      setConversations(data);
      convLoadedRef.current = true;
      setConversationsLoaded(true);
    } catch { /* silent */ }
    setConversationsLoading(false);
  }, [userId]);

  const refetchPatients = useCallback(async () => {
    if (!userId) return;
    if (!patientsLoadedRef.current) setPatientsLoading(true);
    try {
      const data = await fetchPatients(userId);
      setPatients(data);
      patientsLoadedRef.current = true;
      setPatientsLoaded(true);
    } catch { /* silent */ }
    setPatientsLoading(false);
  }, [userId]);

  const refetchDoctorRequests = useCallback(async () => {
    if (!userId) return;
    if (!drReqLoadedRef.current) setDoctorRequestsLoading(true);
    try {
      const data = await fetchDoctorRequests(userId);
      setDoctorRequests(data);
      drReqLoadedRef.current = true;
      setDoctorRequestsLoaded(true);
    } catch { /* silent */ }
    setDoctorRequestsLoading(false);
  }, [userId]);

  const refetchAlertSettings = useCallback(async () => {
    if (!userId) return;
    if (!alertSettingsLoadedRef.current) setAlertSettingsLoading(true);
    try {
      const data = await fetchAlertSettings(userId);
      setAlertSettings(data);
      alertSettingsLoadedRef.current = true;
      setAlertSettingsLoaded(true);
    } catch { /* silent */ }
    setAlertSettingsLoading(false);
  }, [userId]);

  const refetchAlertContacts = useCallback(async () => {
    if (!userId) return;
    if (!alertContactsLoadedRef.current) setAlertContactsLoading(true);
    try {
      const data = await fetchAlertContacts(userId);
      setAlertContacts(data);
      alertContactsLoadedRef.current = true;
      setAlertContactsLoaded(true);
    } catch { /* silent */ }
    setAlertContactsLoading(false);
  }, [userId]);

  // ── Optimized prefetch on mount ─────────────────────────────────────────

  const runPrefetch = useCallback(async () => {
    if (!role) return;

    if (role === "doctor") {
      await Promise.all([
        refetchPatients(),
        refetchDoctorRequests(),
        refetchConversations(),
      ]);
    } else {
      // Critical path first: intelligence report + overview + records in parallel
      await Promise.all([
        refetchIntelligenceReport(),
        refetchPatientOverview(),
        refetchRecords(),
      ]);
      // Lower-priority data in parallel after critical path
      await Promise.all([
        refetchInsights(),
        refetchPatientRequests(),
        refetchConversations(),
        refetchMedications(),
        refetchMealTimes(),
        refetchAlertSettings(),
        refetchAlertContacts(),
      ]);
    }
  }, [
    role,
    refetchPatients,
    refetchDoctorRequests,
    refetchIntelligenceReport,
    refetchPatientOverview,
    refetchRecords,
    refetchInsights,
    refetchPatientRequests,
    refetchConversations,
    refetchMedications,
    refetchMealTimes,
    refetchAlertSettings,
    refetchAlertContacts,
  ]);

  const hasPrefetched = useRef(false);

  useEffect(() => {
    if (userId && !hasPrefetched.current) {
      hasPrefetched.current = true;
      runPrefetch();
    }
  }, [userId, runPrefetch]);

  // ── Mutation grace period ───────────────────────────────────────────────
  // When the user makes a change (add record, save medication, etc.) we track
  // the time. Background polls skip their cycle if a mutation happened within
  // the last 5 seconds — this prevents a poll from overwriting an optimistic
  // update before the backend has confirmed the write.

  const lastMutationTime = useRef<number>(0);

  const markMutation = useCallback(() => {
    lastMutationTime.current = Date.now();
  }, []);

  // ── Background polling — silently refresh every 30s ────────────────────

  useEffect(() => {
    if (!userId || !role) return;

    const poll = () => {
      // Skip this cycle if the user just made a change
      if (Date.now() - lastMutationTime.current < MUTATION_GRACE_MS) return;

      if (role === "doctor") {
        refetchPatients();
        refetchDoctorRequests();
        refetchConversations();
      } else {
        refetchPatientRequests();
        refetchRecords();
        refetchMedications();
        refetchConversations();
        refetchPatientOverview();
      }
    };

    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [
    userId, role,
    refetchPatients, refetchDoctorRequests, refetchConversations,
    refetchPatientRequests, refetchRecords, refetchMedications,
    refetchPatientOverview,
  ]);

  // ── Visibility-based refetch — refresh when user returns to tab ─────────
  useEffect(() => {
    if (!userId || !role) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Only refetch if enough time has passed since last mutation
        if (Date.now() - lastMutationTime.current >= MUTATION_GRACE_MS) {
          runPrefetch();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [userId, role, runPrefetch]);

  // ── Listen for global refresh events ────────────────────────────────────
  // Event-triggered refetches are debounced by 1.5s so the backend has time
  // to confirm the write before we read it back. The mutation is already
  // reflected instantly in local state (optimistic update) — this just syncs
  // the confirmed server response silently in the background.

  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const debounced = useCallback((key: string, ms: number, fn: () => void) => {
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(fn, ms);
  }, []);

  useEffect(() => {
    const handleRefreshPatients = () => {
      markMutation();
      debounced("patients", DEBOUNCE_MS, () => {
        if (role === "doctor") {
          refetchPatients();
          refetchDoctorRequests();
        } else {
          refetchPatientRequests();
        }
      });
    };

    const handleRefreshDoctorRequests = () => {
      markMutation();
      debounced("doctorRequests", DEBOUNCE_MS, () => {
        if (role === "doctor") refetchDoctorRequests();
      });
    };

    const handleRefreshRecords = () => {
      markMutation();
      debounced("records", DEBOUNCE_MS, () => {
        refetchRecords();
        refetchPatientOverview();
        refetchIntelligenceReport();
      });
    };

    const handleRefreshMedications = () => {
      markMutation();
      debounced("medications", DEBOUNCE_MS, () => {
        refetchMedications();
        refetchMealTimes();
      });
    };

    const handleRefreshConversations = () => {
      // Messages don't need a grace period — the optimistic bubble is already shown
      // and the server echo via WebSocket handles deduplication
      debounced("conversations", 500, () => {
        refetchConversations();
      });
    };

    const handleRefreshAll = () => {
      markMutation();
      debounced("all", DEBOUNCE_MS, () => runPrefetch());
    };

    window.addEventListener("refresh-patients", handleRefreshPatients);
    window.addEventListener("refresh-doctor-requests", handleRefreshDoctorRequests);
    window.addEventListener("refresh-records", handleRefreshRecords);
    window.addEventListener("refresh-medications", handleRefreshMedications);
    window.addEventListener("refresh-conversations", handleRefreshConversations);
    window.addEventListener("refresh-all", handleRefreshAll);

    return () => {
      window.removeEventListener("refresh-patients", handleRefreshPatients);
      window.removeEventListener("refresh-doctor-requests", handleRefreshDoctorRequests);
      window.removeEventListener("refresh-records", handleRefreshRecords);
      window.removeEventListener("refresh-medications", handleRefreshMedications);
      window.removeEventListener("refresh-conversations", handleRefreshConversations);
      window.removeEventListener("refresh-all", handleRefreshAll);
      // Clear any pending debounce timers to prevent setState-after-unmount
      Object.values(debounceRef.current).forEach(clearTimeout);
    };
  }, [
    role, runPrefetch, markMutation, debounced,
    refetchPatients, refetchDoctorRequests, refetchPatientRequests,
    refetchRecords, refetchPatientOverview, refetchIntelligenceReport,
    refetchMedications, refetchMealTimes, refetchConversations,
  ]);

  const refetchAll = useCallback(() => {
    runPrefetch();
  }, [runPrefetch]);


  // ── Context value ──────────────────────────────────────────────────────

  return (
    <DataPrefetchContext.Provider
      value={{
        patientOverview,
        patientOverviewLoading,
        patientOverviewLoaded,
        records,
        recordsLoading,
        recordsLoaded,
        insights,
        insightsLoading,
        insightsLoaded,
        patientRequests,
        patientRequestsLoading,
        patientRequestsLoaded,
        intelligenceReport,
        intelligenceReportLoading,
        intelligenceReportLoaded,
        medications,
        medicationsLoading,
        medicationsLoaded,
        mealTimes,
        mealTimesLoading,
        mealTimesLoaded,
        conversations,
        conversationsLoading,
        conversationsLoaded,
        patients,
        patientsLoading,
        patientsLoaded,
        doctorRequests,
        doctorRequestsLoading,
        doctorRequestsLoaded,
        alertSettings,
        alertSettingsLoading,
        alertSettingsLoaded,
        alertContacts,
        alertContactsLoading,
        alertContactsLoaded,
        setPatientOverview,
        setRecords,
        setInsights,
        setPatientRequests,
        setIntelligenceReport,
        setMedications,
        setMealTimes,
        setConversations,
        setPatients,
        setDoctorRequests,
        setAlertSettings,
        setAlertContacts,
        refetchPatientOverview,
        refetchRecords,
        refetchInsights,
        refetchPatientRequests,
        refetchIntelligenceReport,
        refetchMedications,
        refetchMealTimes,
        refetchConversations,
        refetchPatients,
        refetchDoctorRequests,
        refetchAlertSettings,
        refetchAlertContacts,
        refetchAll,
      }}
    >
      {children}
    </DataPrefetchContext.Provider>
  );
}
