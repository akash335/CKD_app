/**
 * API Client — central utility for communicating with the FastAPI backend.
 */

import type { ChatConversation, ChatMessage } from "@/types/chat";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://ckd-guardian-backend.onrender.com";

const INTERNAL_API_KEY =
  process.env.NEXT_PUBLIC_INTERNAL_API_KEY ?? "ckdguardian-secure-key-2026";

const LOCAL_FALLBACK_URL = "https://ckd-guardian-backend.onrender.com";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  components: { database: string; ml_models: string };
}

export type RiskLevel = "low" | "moderate" | "high" | "critical";
export type InputMode = "hospital" | "urea" | "medical-report";

export interface PredictionResponse {
  risk_level: RiskLevel;
  confidence: number;
  health_score: number;
  explanation: string;
  contributing_factors: string[];
  input_mode: string;
}

export interface HospitalInput {
  creatinine: number;
  urea: number;
  egfr: number;
  hemoglobin: number;
  age?: number;
}

export interface UreaInput {
  urea: number;
}

export interface ExtractedReportData {
  creatinine: number;
  urea: number;
  egfr: number;
  hemoglobin: number;
  age?: number;
}

export interface RecordData {
  id: string;
  input_mode: string;
  input_values: Record<string, number>;
  risk_level: string;
  confidence: number;
  health_score: number;
  explanation: string;
  contributing_factors: string[];
  created_at: string;
  user_id: string;
}

export interface RecordsListResponse {
  records: RecordData[];
  total: number;
}

export interface UserData {
  id: string;
  email: string;
  name?: string;
  image?: string;
  age?: number;
  gender?: string;
  next_checkup?: string;
  role: string;
  auth_provider?: string;
  has_password?: boolean;
  username?: string;
  created_at?: string;
}

export interface ApiError {
  message: string;
  status: number;
}

// ─── Core Fetcher ──────────────────────────────────────────────────────────

const shouldTryLocalFallback = () =>
  typeof window !== "undefined" &&
  window.location.hostname === "localhost" &&
  BASE_URL !== LOCAL_FALLBACK_URL;

const jsonHeaders = (extraHeaders?: HeadersInit): HeadersInit => ({
  "Content-Type": "application/json",
  "X-API-Key": INTERNAL_API_KEY,
  ...(extraHeaders || {}),
});

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit,
  baseUrl: string = BASE_URL,
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers: jsonHeaders(options?.headers),
    });
  } catch {
    throw {
      message: `Backend is unreachable at ${baseUrl}. Start the FastAPI server and try again.`,
      status: 0,
    } as ApiError;
  }

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;

    try {
      const body = await res.json();
      if (body.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {}

    throw { message: detail, status: res.status } as ApiError;
  }

  return res.json();
}

/**
 * Tries to wake the Render backend by polling /ping up to `maxAttempts` times.
 * Returns true if the backend responds within the timeout, false otherwise.
 */
export async function wakeBackend(
  maxAttempts = 8,
  intervalMs = 3000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/ping`, {
        method: "GET",
        headers: {
          "X-API-Key": INTERNAL_API_KEY,
        },
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) return true;
    } catch {
      // backend still sleeping
    }

    if (i < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  return false;
}

/**
 * Wrapper: attempts apiFetch, and if the backend is unreachable (status 0),
 * tries to wake it and retries once.
 */
async function apiFetchWithWake<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await apiFetch<T>(endpoint, options);
  } catch (err: any) {
    if (err?.status === 0) {
      const awake = await wakeBackend();

      if (awake) {
        return await apiFetch<T>(endpoint, options);
      }

      if (shouldTryLocalFallback()) {
        try {
          return await apiFetch<T>(endpoint, options, LOCAL_FALLBACK_URL);
        } catch {
          // fallback failed; rethrow original error
        }
      }
    }

    throw err;
  }
}

// ─── Endpoints ─────────────────────────────────────────────────────────────

export const checkHealth = () => apiFetch<HealthCheckResponse>("/health");

export const predictHospital = (data: HospitalInput) =>
  apiFetch<PredictionResponse>("/api/hospital/predict", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const predictUrea = (data: UreaInput) =>
  apiFetch<PredictionResponse>("/api/urea/predict", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const extractMedicalReport = async (
  file: File,
): Promise<ExtractedReportData> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/api/hospital/extract-report`, {
    method: "POST",
    headers: {
      "X-API-Key": INTERNAL_API_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;

    try {
      const body = await response.json();
      if (body.detail) {
        detail =
          typeof body.detail === "string"
            ? body.detail
            : JSON.stringify(body.detail);
      }
    } catch {}

    throw { message: detail, status: response.status } as ApiError;
  }

  return response.json();
};

export const saveRecord = (
  data: Omit<RecordData, "id" | "created_at"> & {
    input_values: Record<string, number>;
  },
) =>
  apiFetch<RecordData>("/api/records", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const fetchRecords = (userId?: string) =>
  apiFetch<RecordsListResponse>(
    userId ? `/api/records?user_id=${userId}` : "/api/records",
  );

export const fetchRecord = (id: string) =>
  apiFetch<RecordData>(`/api/records/${id}`);

export const deleteRecord = (id: string) =>
  apiFetch<{ success: boolean }>(`/api/records/${id}`, {
    method: "DELETE",
  });

export const fetchInsights = (userId?: string) =>
  apiFetch<InsightData[]>(
    userId ? `/api/records/insights?user_id=${userId}` : "/api/records/insights",
  );

// ─── Patients Doctor view ───────────────────────────────────────────────

export interface PatientSummary {
  user_id: string;
  display_name: string;
  record_count: number;
  age?: number;
  gender?: string;
  latest_risk_level: string;
  latest_health_score: number;
  latest_confidence: number;
  last_updated: string;
}

export const fetchPatients = (doctorId?: string) =>
  apiFetch<PatientSummary[]>(
    doctorId ? `/api/records/patients?doctor_id=${doctorId}` : "/api/records/patients",
  );

// ─── Requests Doctor-Patient Linking ─────────────────────────────────────

export interface ConnectionRequest {
  id: string;
  patient_id: string;
  patient_name: string;
  doctor_id: string;
  doctor_name?: string;
  username?: string;
  status: "pending" | "accepted" | "rejected" | "removed" | string;
  created_at: string;
}

export interface ActionResponse {
  success: boolean;
  message: string;
}

export interface DeleteMessageResponse extends ActionResponse {
  message_id: string;
  conversation_id: string;
  last_message: string | null;
  last_message_at: string | null;
  updated_at: string;
}

export type MedicationUnit = "mg" | "ml" | "units";
export type MedicationRoute = "oral" | "injection" | "iv" | "topical";
export type MedicationFrequency =
  | "once_daily"
  | "twice_daily"
  | "with_meals"
  | "at_bedtime"
  | "every_other_day"
  | "custom";

export interface MedicationInteraction {
  severe: string[];
  moderate: string[];
  none: string[];
  checkedAt: string;
}

export interface MedicationEntry {
  id: string;
  userId: string;
  name: string;
  prescribingDoctor: string;
  startDate: string;
  endDate: string;
  doseAmount: number;
  unit: MedicationUnit;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  customTimes: string[];
  scheduleTimes: string[];
  mealLinks: Record<string, boolean>;
  quantityOnHand: number;
  refillAlertThresholdDays: number;
  pillPhotoName: string;
  isPhosphateBinder: boolean;
  interaction: MedicationInteraction;
  overrideLogAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MedicationEntryCreateInput = Omit<
  MedicationEntry,
  "id" | "userId" | "createdAt" | "updatedAt"
>;

export interface MedicationMealTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
  updatedAt?: string;
}

interface MedicationInteractionServer {
  severe: string[];
  moderate: string[];
  none: string[];
  checked_at: string;
}

interface MedicationEntryServer {
  id: string;
  user_id: string;
  name: string;
  prescribing_doctor: string;
  start_date: string;
  end_date: string;
  dose_amount: number;
  unit: MedicationUnit;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  custom_times: string[];
  schedule_times: string[];
  meal_links: Record<string, boolean>;
  quantity_on_hand: number;
  refill_alert_threshold_days: number;
  pill_photo_name: string;
  is_phosphate_binder: boolean;
  interaction: MedicationInteractionServer;
  override_log_at: string | null;
  created_at: string;
  updated_at: string;
}

interface MedicationEntryCreateServer {
  name: string;
  prescribing_doctor: string;
  start_date: string;
  end_date: string;
  dose_amount: number;
  unit: MedicationUnit;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  custom_times: string[];
  schedule_times: string[];
  meal_links: Record<string, boolean>;
  quantity_on_hand: number;
  refill_alert_threshold_days: number;
  pill_photo_name: string;
  is_phosphate_binder: boolean;
  interaction: MedicationInteractionServer;
  override_log_at: string | null;
}

const toMedicationInteractionServer = (
  interaction: MedicationInteraction,
): MedicationInteractionServer => ({
  severe: interaction.severe,
  moderate: interaction.moderate,
  none: interaction.none,
  checked_at: interaction.checkedAt,
});

const fromMedicationEntryServer = (
  payload: MedicationEntryServer,
): MedicationEntry => ({
  id: payload.id,
  userId: payload.user_id,
  name: payload.name,
  prescribingDoctor: payload.prescribing_doctor,
  startDate: payload.start_date,
  endDate: payload.end_date,
  doseAmount: payload.dose_amount,
  unit: payload.unit,
  route: payload.route,
  frequency: payload.frequency,
  customTimes: payload.custom_times ?? [],
  scheduleTimes: payload.schedule_times ?? [],
  mealLinks: payload.meal_links ?? {},
  quantityOnHand: payload.quantity_on_hand,
  refillAlertThresholdDays: payload.refill_alert_threshold_days,
  pillPhotoName: payload.pill_photo_name ?? "",
  isPhosphateBinder: payload.is_phosphate_binder,
  interaction: {
    severe: payload.interaction?.severe ?? [],
    moderate: payload.interaction?.moderate ?? [],
    none: payload.interaction?.none ?? [],
    checkedAt: payload.interaction?.checked_at ?? new Date().toISOString(),
  },
  overrideLogAt: payload.override_log_at,
  createdAt: payload.created_at,
  updatedAt: payload.updated_at,
});

const toMedicationEntryCreateServer = (
  payload: MedicationEntryCreateInput,
): MedicationEntryCreateServer => ({
  name: payload.name,
  prescribing_doctor: payload.prescribingDoctor,
  start_date: payload.startDate,
  end_date: payload.endDate,
  dose_amount: payload.doseAmount,
  unit: payload.unit,
  route: payload.route,
  frequency: payload.frequency,
  custom_times: payload.customTimes,
  schedule_times: payload.scheduleTimes,
  meal_links: payload.mealLinks,
  quantity_on_hand: payload.quantityOnHand,
  refill_alert_threshold_days: payload.refillAlertThresholdDays,
  pill_photo_name: payload.pillPhotoName,
  is_phosphate_binder: payload.isPhosphateBinder,
  interaction: toMedicationInteractionServer(payload.interaction),
  override_log_at: payload.overrideLogAt,
});

export const createConnectionRequest = (patientId: string, username: string) =>
  apiFetch<ConnectionRequest>(`/api/requests?patient_id=${patientId}`, {
    method: "POST",
    body: JSON.stringify({ username }),
  });

export const sendPatientRequest = createConnectionRequest;

export const fetchDoctorRequests = (doctorId: string) =>
  apiFetch<ConnectionRequest[]>(`/api/requests/doctor/${doctorId}`);

export const fetchPatientRequests = (patientId: string) =>
  apiFetch<ConnectionRequest[]>(`/api/requests/patient/${patientId}`);

export const acceptRequest = (requestId: string, doctorId: string) =>
  apiFetch<ConnectionRequest>(
    `/api/requests/${requestId}/accept?doctor_id=${doctorId}`,
    { method: "POST" },
  );

export const rejectRequest = (requestId: string, doctorId: string) =>
  apiFetch<ConnectionRequest>(
    `/api/requests/${requestId}/reject?doctor_id=${doctorId}`,
    { method: "POST" },
  );

export const unlinkPatient = (patientId: string, doctorId: string) =>
  apiFetch<ActionResponse>(
    `/api/requests/unlink?patient_id=${patientId}&doctor_id=${doctorId}`,
    { method: "DELETE" },
  );

export const deleteRequest = (requestId: string, patientId: string) =>
  apiFetch<ActionResponse>(`/api/requests/${requestId}?patient_id=${patientId}`, {
    method: "DELETE",
  });

// ─── Medications ───────────────────────────────────────────────────────────

export const fetchMedicationEntries = (userId: string) =>
  apiFetch<MedicationEntryServer[]>(
    `/api/medications?user_id=${encodeURIComponent(userId)}`,
  ).then((items) => items.map(fromMedicationEntryServer));

export const createMedicationEntry = (
  userId: string,
  payload: MedicationEntryCreateInput,
) =>
  apiFetch<MedicationEntryServer>(
    `/api/medications?user_id=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      body: JSON.stringify(toMedicationEntryCreateServer(payload)),
    },
  ).then(fromMedicationEntryServer);

export const deleteMedicationEntry = (userId: string, medicationId: string) =>
  apiFetch<ActionResponse>(
    `/api/medications/${medicationId}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );

export const updateMedicationEntry = (
  userId: string,
  medicationId: string,
  payload: MedicationEntryCreateInput,
) =>
  apiFetch<MedicationEntryServer>(
    `/api/medications/${medicationId}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      body: JSON.stringify(toMedicationEntryCreateServer(payload)),
    },
  ).then(fromMedicationEntryServer);

/**
 * Meal times are currently stored locally because the backend route
 * /api/medications/preferences does not exist correctly yet.
 *
 * Earlier frontend code sent:
 * { breakfast, lunch, dinner }
 * to /api/medications/preferences, but the backend interpreted
 * "preferences" as a medication ID and returned 422 validation errors.
 *
 * This local storage version removes that broken backend call and keeps
 * the app stable on web, Android, and iOS.
 */
const medicationMealTimesStorageKey = (userId: string) =>
  `ckd_guardian_meal_times_${userId}`;

const DEFAULT_MEDICATION_MEAL_TIMES: MedicationMealTimes = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "19:00",
  updatedAt: new Date().toISOString(),
};

const getLocalMedicationMealTimes = (userId: string): MedicationMealTimes => {
  if (typeof window === "undefined") {
    return DEFAULT_MEDICATION_MEAL_TIMES;
  }

  try {
    const saved = window.localStorage.getItem(
      medicationMealTimesStorageKey(userId),
    );

    if (!saved) {
      return DEFAULT_MEDICATION_MEAL_TIMES;
    }

    const parsed = JSON.parse(saved);

    if (parsed?.breakfast && parsed?.lunch && parsed?.dinner) {
      return {
        breakfast: parsed.breakfast,
        lunch: parsed.lunch,
        dinner: parsed.dinner,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      };
    }

    return DEFAULT_MEDICATION_MEAL_TIMES;
  } catch {
    return DEFAULT_MEDICATION_MEAL_TIMES;
  }
};

const saveLocalMedicationMealTimes = (
  userId: string,
  payload: MedicationMealTimes,
): MedicationMealTimes => {
  const data: MedicationMealTimes = {
    breakfast: payload.breakfast,
    lunch: payload.lunch,
    dinner: payload.dinner,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      medicationMealTimesStorageKey(userId),
      JSON.stringify(data),
    );
  }

  return data;
};

export const fetchMedicationMealTimes = async (
  userId: string,
): Promise<MedicationMealTimes> => {
  return getLocalMedicationMealTimes(userId);
};

export const saveMedicationMealTimes = async (
  userId: string,
  payload: MedicationMealTimes,
): Promise<MedicationMealTimes> => {
  return saveLocalMedicationMealTimes(userId, payload);
};

// ─── Messaging ─────────────────────────────────────────────────────────────

export const fetchConversations = (userId: string) =>
  apiFetch<ChatConversation[]>(
    `/conversations?user_id=${encodeURIComponent(userId)}`,
  );

export const fetchChatMessages = (conversationId: string, userId: string) =>
  apiFetch<ChatMessage[]>(
    `/messages/${conversationId}?user_id=${encodeURIComponent(userId)}`,
  );

export const sendChatMessage = (data: {
  sender_id: string;
  receiver_id: string;
  message_text: string;
}) =>
  apiFetch<ChatMessage>("/messages/send", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const deleteChatMessage = (messageId: string, userId: string) =>
  apiFetch<DeleteMessageResponse>(
    `/messages/${messageId}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );

export const getChatWebSocketUrl = (conversationId: string, userId: string) => {
  const wsBaseUrl = BASE_URL.replace(/\/$/, "").replace(/^http/, "ws");
  return `${wsBaseUrl}/ws/chat/${conversationId}?user_id=${encodeURIComponent(userId)}`;
};

// ─── Intelligence ──────────────────────────────────────────────────────────

export interface AlertData {
  id: string;
  severity: string;
  title: string;
  message: string;
  metric?: string;
  action?: string;
}

export interface RecommendationData {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: string;
  icon: string;
}

export interface IntelligenceReport {
  alerts: AlertData[];
  recommendations: RecommendationData[];
  condition_summary: string;
  trend_label: string;
  risk_level: string;
  data_points: number;
}

export const fetchIntelligenceReport = (userId?: string) =>
  apiFetch<IntelligenceReport>(
    userId ? `/api/intelligence/report?user_id=${userId}` : "/api/intelligence/report",
  );

// ─── Users ─────────────────────────────────────────────────────────────────

export const syncUser = (data: {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role?: string;
}) =>
  apiFetch<UserData>("/api/users/sync", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const fetchUser = (userId: string) =>
  apiFetch<UserData>(`/api/users/${userId}`);

export const updateProfile = (
  userId: string,
  data: {
    name?: string;
    age?: number;
    gender?: string;
    role?: string;
    username?: string;
    next_checkup?: string;
  },
) =>
  apiFetch<UserData>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const updateUser = (
  userId: string,
  data: { name?: string; role?: string },
) =>
  apiFetch<UserData>(`/api/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });

export const fetchDoctors = () => apiFetch<UserData[]>("/api/users/doctors");

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  auth_provider: string;
  has_password: boolean;
  message: string;
}

export const registerUser = (data: {
  name: string;
  email: string;
  password: string;
}) =>
  apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const loginUser = (data: { email: string; password: string }) =>
  apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const changePassword = (
  userId: string,
  data: { current_password: string; new_password: string },
) =>
  apiFetch<{ message: string }>(
    `/api/auth/change-password?user_id=${userId}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

export interface InsightData {
  metric: string;
  trend: string;
  message: string;
  severity: string;
}

// ─── Alerts ────────────────────────────────────────────────────────────────

export interface AlertContact {
  id: string;
  user_id: string;
  name: string;
  email: string;
  relation: string;
  is_active: boolean;
  created_at: string;
}

export interface AlertSettings {
  id: string;
  user_id: string;
  enable_email_alerts: boolean;
  cooldown_hours: number;
  last_alert_sent_at?: string;
}

export const fetchAlertContacts = (userId: string) =>
  apiFetchWithWake<AlertContact[]>(
    `/api/profile/alert-contacts/view/${userId}`,
  );

export const addAlertContact = (
  userId: string,
  data: { name: string; email: string; relation: string },
) =>
  apiFetch<AlertContact>(
    `/api/profile/alert-contacts?user_id=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

export const deleteAlertContact = (userId: string, contactId: string) =>
  apiFetch<{ message: string }>(
    `/api/profile/alert-contacts/${contactId}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );

export const fetchAlertSettings = (userId: string) =>
  apiFetch<AlertSettings>(`/api/profile/alert-settings/view/${userId}`);

export const updateAlertSettings = (
  userId: string,
  data: { enable_email_alerts?: boolean; cooldown_hours?: number },
) =>
  apiFetch<AlertSettings>(
    `/api/profile/alert-settings?user_id=${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

export const triggerAlert = (
  userId: string,
  data: { risk_level: string; explanation: string },
) =>
  apiFetchWithWake<{ status: string; recipients?: number; reason?: string }>(
    `/api/profile/alerts/send?user_id=${encodeURIComponent(userId)}`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

// ─── Push Notifications ────────────────────────────────────────────────────

export const registerPushToken = (data: {
  user_id: string;
  token: string;
  platform?: "android" | "ios" | "web";
}) =>
  apiFetch<{ success: boolean; message: string; token_id: string }>(
    "/api/push/register",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

export const unregisterPushToken = (data: { user_id: string; token: string }) =>
  apiFetch<{ success: boolean; message: string }>("/api/push/register", {
    method: "DELETE",
    body: JSON.stringify(data),
  });

// ─── Notification Preferences ──────────────────────────────────────────────

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  medicine_reminders: boolean;
  chat_messages: boolean;
  health_alerts: boolean;
}

export const fetchNotificationPreferences = (userId: string) =>
  apiFetch<NotificationPreferences>(
    `/api/notification-preferences/${encodeURIComponent(userId)}`,
  );

export const updateNotificationPreferences = (
  userId: string,
  data: Partial<Omit<NotificationPreferences, "user_id">>,
) =>
  apiFetch<NotificationPreferences>(
    `/api/notification-preferences/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );

// ─── In-App Notifications ──────────────────────────────────────────────────

export interface InAppNotificationData {
  id: string;
  user_id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_image: string | null;
  type:
    | "new_message"
    | "connection_request"
    | "connection_accepted"
    | "health_alert";
  title: string;
  body: string;
  data: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: InAppNotificationData[];
  unread_count: number;
}

export const fetchInAppNotifications = (
  userId: string,
  unreadOnly = false,
  limit = 30,
) =>
  apiFetch<NotificationsResponse>(
    `/api/notifications?user_id=${encodeURIComponent(userId)}&unread_only=${unreadOnly}&limit=${limit}`,
  );

export const fetchUnreadCount = (userId: string) =>
  apiFetch<{ unread_count: number }>(
    `/api/notifications/unread-count?user_id=${encodeURIComponent(userId)}`,
  );

export const markNotificationRead = (notificationId: string, userId: string) =>
  apiFetch<{ success: boolean }>(
    `/api/notifications/${notificationId}/read?user_id=${encodeURIComponent(userId)}`,
    { method: "POST" },
  );

export const markAllNotificationsRead = (userId: string) =>
  apiFetch<{ success: boolean; marked_count: number }>(
    `/api/notifications/read-all?user_id=${encodeURIComponent(userId)}`,
    { method: "POST" },
  );