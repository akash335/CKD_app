"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/GlassCard";
import { FormField } from "@/components/forms/FormField";
import { useRole } from "@/lib/role-context";
import {
  createMedicationEntry,
  deleteMedicationEntry,
  fetchMedicationEntries,
  fetchMedicationMealTimes,
  saveMedicationMealTimes,
  updateMedicationEntry,
  type MedicationEntry,
  type MedicationEntryCreateInput,
} from "@/lib/api-client";

type MedicationUnit = "mg" | "ml" | "units";
type MedicationRoute = "oral" | "injection" | "iv" | "topical";
type MedicationFrequency =
  | "once_daily"
  | "twice_daily"
  | "with_meals"
  | "at_bedtime"
  | "every_other_day"
  | "custom";
type MealKey = "breakfast" | "lunch" | "dinner";
type RefillStatus = "safe" | "warning" | "critical";
type MealDoseStatus = "taken" | "pending" | "skipped";

interface MealTimes {
  breakfast: string;
  lunch: string;
  dinner: string;
}

interface InteractionResult {
  severe: string[];
  moderate: string[];
  none: string[];
  checkedAt: string;
}

interface Medication {
  id: string;
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
  mealLinks: Record<MealKey, boolean>;
  quantityOnHand: number;
  refillAlertThresholdDays: number;
  pillPhotoName: string;
  isPhosphateBinder: boolean;
  interaction: InteractionResult;
  overrideLogAt: string | null;
  createdAt: string;
}

interface MedicationDraft {
  name: string;
  prescribingDoctor: string;
  startDate: string;
  endDate: string;
  doseAmount: string;
  unit: MedicationUnit;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  customTimes: string[];
  mealLinks: Record<MealKey, boolean>;
  quantityOnHand: string;
  refillAlertThresholdDays: number;
  pillPhotoName: string;
  isPhosphateBinder: boolean;
}

interface BundledReminder {
  time: string;
  medicationIds: string[];
  medicationNames: string[];
}

const toMedicationEntryInput = (medication: Medication): MedicationEntryCreateInput => ({
  name: medication.name,
  prescribingDoctor: medication.prescribingDoctor,
  startDate: medication.startDate,
  endDate: medication.endDate,
  doseAmount: medication.doseAmount,
  unit: medication.unit,
  route: medication.route,
  frequency: medication.frequency,
  customTimes: medication.customTimes,
  scheduleTimes: medication.scheduleTimes,
  mealLinks: medication.mealLinks,
  quantityOnHand: medication.quantityOnHand,
  refillAlertThresholdDays: medication.refillAlertThresholdDays,
  pillPhotoName: medication.pillPhotoName,
  isPhosphateBinder: medication.isPhosphateBinder,
  interaction: medication.interaction,
  overrideLogAt: medication.overrideLogAt,
});

const fromMedicationEntry = (entry: MedicationEntry): Medication => ({
  id: entry.id,
  name: entry.name,
  prescribingDoctor: entry.prescribingDoctor,
  startDate: entry.startDate,
  endDate: entry.endDate ?? "",
  doseAmount: entry.doseAmount,
  unit: entry.unit,
  route: entry.route,
  frequency: entry.frequency,
  customTimes: entry.customTimes ?? [],
  scheduleTimes: entry.scheduleTimes ?? [],
  mealLinks: entry.mealLinks ?? { breakfast: true, lunch: true, dinner: true },
  quantityOnHand: entry.quantityOnHand,
  refillAlertThresholdDays: entry.refillAlertThresholdDays,
  pillPhotoName: entry.pillPhotoName ?? "",
  isPhosphateBinder: entry.isPhosphateBinder,
  interaction: entry.interaction ?? {
    severe: [],
    moderate: [],
    none: [],
    checkedAt: new Date().toISOString(),
  },
  overrideLogAt: entry.overrideLogAt,
  createdAt: entry.createdAt,
});

const STORAGE_KEYS = {
  medications: "ckd_medications_store_v2",
  draft: "ckd_medications_draft_v2",
  mealTimes: "ckd_medications_meal_times_v2",
};

const MEDICATION_SUGGESTIONS = [
  "Sevelamer",
  "Calcium Acetate",
  "Lisinopril",
  "Furosemide",
  "Erythropoietin",
  "Sodium Bicarbonate",
  "Iron Sucrose",
  "Calcitriol",
  "Amlodipine",
  "Losartan",
  "Metformin",
  "Insulin Glargine",
];

const DEFAULT_MEAL_TIMES: MealTimes = {
  breakfast: "08:00",
  lunch: "13:00",
  dinner: "19:00",
};

const INITIAL_MISSED_SCHEDULED_AT = new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString();
const INITIAL_MISSED_FOLLOW_UP_AT = new Date(new Date().getTime() + (20 * 60 * 1000)).toISOString();

function createEmptyDraft(): MedicationDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: "",
    prescribingDoctor: "",
    startDate: today,
    endDate: "",
    doseAmount: "",
    unit: "mg",
    route: "oral",
    frequency: "once_daily",
    customTimes: ["08:00"],
    mealLinks: { breakfast: true, lunch: true, dinner: true },
    quantityOnHand: "",
    refillAlertThresholdDays: 7,
    pillPhotoName: "",
    isPhosphateBinder: false,
  };
}

function createInitialMedications(): Medication[] {
  const today = new Date().toISOString().slice(0, 10);
  return [
    {
      id: crypto.randomUUID(),
      name: "***",
      prescribingDoctor: "Dr. Kumar",
      startDate: today,
      endDate: "",
      doseAmount: 800,
      unit: "mg",
      route: "oral",
      frequency: "with_meals",
      customTimes: [],
      mealLinks: { breakfast: true, lunch: true, dinner: true },
      scheduleTimes: ["07:50", "12:50", "18:50"],
      quantityOnHand: 36,
      refillAlertThresholdDays: 7,
      pillPhotoName: "",
      isPhosphateBinder: true,
      interaction: {
        severe: [],
        moderate: ["Binder may reduce absorption of other oral medicines. Keep at least 1 hour gap."],
        none: [],
        checkedAt: new Date().toISOString(),
      },
      overrideLogAt: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: "***",
      prescribingDoctor: "Dr. Meera",
      startDate: today,
      endDate: "",
      doseAmount: 10,
      unit: "mg",
      route: "oral",
      frequency: "once_daily",
      customTimes: [],
      mealLinks: { breakfast: false, lunch: false, dinner: false },
      scheduleTimes: ["09:00"],
      quantityOnHand: 20,
      refillAlertThresholdDays: 7,
      pillPhotoName: "",
      isPhosphateBinder: false,
      interaction: {
        severe: [],
        moderate: [],
        none: ["No interaction alerts in current list."],
        checkedAt: new Date().toISOString(),
      },
      overrideLogAt: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

function getInitialMedications() {
  if (typeof window === "undefined") return createInitialMedications();

  try {
    const storedMeds = window.localStorage.getItem(STORAGE_KEYS.medications);
    if (!storedMeds) return createInitialMedications();

    const parsed = JSON.parse(storedMeds) as Medication[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : createInitialMedications();
  } catch {
    return createInitialMedications();
  }
}

function getInitialDraft() {
  if (typeof window === "undefined") return createEmptyDraft();

  try {
    const storedDraft = window.localStorage.getItem(STORAGE_KEYS.draft);
    if (!storedDraft) return createEmptyDraft();

    const parsed = JSON.parse(storedDraft) as MedicationDraft;
    return parsed?.name !== undefined ? parsed : createEmptyDraft();
  } catch {
    return createEmptyDraft();
  }
}

function getInitialMealTimes() {
  if (typeof window === "undefined") return DEFAULT_MEAL_TIMES;

  try {
    const storedTimes = window.localStorage.getItem(STORAGE_KEYS.mealTimes);
    if (!storedTimes) return DEFAULT_MEAL_TIMES;

    const parsed = JSON.parse(storedTimes) as MealTimes;
    if (parsed?.breakfast && parsed?.lunch && parsed?.dinner) return parsed;
    return DEFAULT_MEAL_TIMES;
  } catch {
    return DEFAULT_MEAL_TIMES;
  }
}

function toMinutes(time: string) {
  const [hour, minute] = time.split(":").map((part) => Number(part));
  return (hour * 60) + minute;
}

function fromMinutes(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function minusMinutes(time: string, minutes: number) {
  return fromMinutes(toMinutes(time) - minutes);
}

function formatTime(time: string) {
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = ((hour + 11) % 12) + 1;
  return `${normalizedHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFrequencyPerDay(medication: Medication) {
  switch (medication.frequency) {
    case "once_daily":
      return 1;
    case "twice_daily":
      return 2;
    case "at_bedtime":
      return 1;
    case "every_other_day":
      return 0.5;
    case "custom":
      return Math.max(medication.scheduleTimes.length, 1);
    case "with_meals": {
      const count = Object.values(medication.mealLinks).filter(Boolean).length;
      return Math.max(count, 1);
    }
    default:
      return 1;
  }
}

function getDaysRemaining(medication: Medication) {
  const perDay = getFrequencyPerDay(medication);
  return medication.quantityOnHand / perDay;
}

function getRefillStatus(daysRemaining: number): RefillStatus {
  if (daysRemaining < 7) return "critical";
  if (daysRemaining <= 14) return "warning";
  return "safe";
}

function getRefillBarClass(status: RefillStatus) {
  if (status === "critical") return "bg-red-500";
  if (status === "warning") return "bg-amber-500";
  return "bg-emerald-500";
}

function getRefillTextClass(status: RefillStatus) {
  if (status === "critical") return "text-red-400";
  if (status === "warning") return "text-amber-400";
  return "text-emerald-400";
}

function getRefillLabel(status: RefillStatus) {
  if (status === "critical") return "Critical";
  if (status === "warning") return "Refill Soon";
  return "Healthy Supply";
}

function getStatusDotClass(status: RefillStatus) {
  if (status === "critical") return "bg-red-500";
  if (status === "warning") return "bg-amber-500";
  return "bg-emerald-500";
}

function resolveScheduleTimes(draft: MedicationDraft, mealTimes: MealTimes) {
  switch (draft.frequency) {
    case "once_daily":
      return ["08:00"];
    case "twice_daily":
      return ["08:00", "20:00"];
    case "at_bedtime":
      return ["21:00"];
    case "every_other_day":
      return ["08:00"];
    case "custom":
      return draft.customTimes.filter(Boolean);
    case "with_meals": {
      const mealOrder: MealKey[] = ["breakfast", "lunch", "dinner"];
      const linked = mealOrder.filter((meal) => draft.mealLinks[meal]);
      const targetMeals = linked.length > 0 ? linked : mealOrder;
      return targetMeals.map((meal) => minusMinutes(mealTimes[meal], 10));
    }
    default:
      return ["08:00"];
  }
}

function runInteractionCheck(candidateMedicationName: string, existingMedications: Medication[]): Promise<InteractionResult> {
  const severe: string[] = [];
  const moderate: string[] = [];

  const severePairs: Array<[string, string, string]> = [
    ["warfarin", "aspirin", "Warfarin + aspirin may significantly increase bleeding risk."],
    ["ibuprofen", "lisinopril", "Ibuprofen + ACE inhibitors may worsen kidney perfusion."],
    ["spironolactone", "losartan", "Spironolactone + ARB can increase hyperkalemia risk."],
  ];

  const moderatePairs: Array<[string, string, string]> = [
    ["calcium acetate", "iron", "Calcium-based binders can reduce iron absorption."],
    ["furosemide", "lisinopril", "Monitor blood pressure when loop diuretics and ACE inhibitors are combined."],
    ["metformin", "furosemide", "Combined use may require closer renal monitoring."],
  ];

  const candidate = candidateMedicationName.trim().toLowerCase();
  const existingNames = existingMedications.map((medication) => medication.name.trim().toLowerCase());

  for (const [a, b, message] of severePairs) {
    if ((candidate.includes(a) && existingNames.some((name) => name.includes(b)))
      || (candidate.includes(b) && existingNames.some((name) => name.includes(a)))) {
      severe.push(message);
    }
  }

  for (const [a, b, message] of moderatePairs) {
    if ((candidate.includes(a) && existingNames.some((name) => name.includes(b)))
      || (candidate.includes(b) && existingNames.some((name) => name.includes(a)))) {
      moderate.push(message);
    }
  }

  if (severe.length === 0 && moderate.length === 0) {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        resolve({
          severe: [],
          moderate: [],
          none: ["No known interactions detected with current medications."],
          checkedAt: new Date().toISOString(),
        });
      }, 700);
    });
  }

  return new Promise((resolve) => {
    window.setTimeout(() => {
      resolve({
        severe,
        moderate,
        none: severe.length + moderate.length > 0 ? [] : ["No known interactions."],
        checkedAt: new Date().toISOString(),
      });
    }, 700);
  });
}


export function MedicationManagementSection() {
  const [isMobile, setIsMobile] = useState(false);
  const { userId } = useRole();

  const [mealTimes, setMealTimes] = useState<MealTimes>(getInitialMealTimes);
  const [medications, setMedications] = useState<Medication[]>(getInitialMedications);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [medicationToDelete, setMedicationToDelete] = useState<string | null>(null);

  const deleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((m) => m.id !== id));
    if (selectedMedicationId === id) {
      setSelectedMedicationId(null);
    }
    setMedicationToDelete(null);
    window.dispatchEvent(new CustomEvent("refresh-medications"));

    if (userId) {
      deleteMedicationEntry(userId, id).catch((err) => {
        console.warn("Failed to delete medication from backend:", err);
      });
    }
  };

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [draft, setDraft] = useState<MedicationDraft>(getInitialDraft);
  const [wizardError, setWizardError] = useState("");

  const [interactionLoading, setInteractionLoading] = useState(false);
  const [interaction, setInteraction] = useState<InteractionResult | null>(null);
  const [severeAcknowledged, setSevereAcknowledged] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [generatedRefillList, setGeneratedRefillList] = useState<string>("");

  const [editingBundleTime, setEditingBundleTime] = useState<string | null>(null);
  const [disabledBundles, setDisabledBundles] = useState<string[]>([]);
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [newSlotData, setNewSlotData] = useState({ medicationId: "", time: "12:00" });

  const syncChangedSchedules = (prev: Medication[], next: Medication[]) => {
    if (!userId) return;
    const previousSchedules = new Map(
      prev.map((med) => [med.id, med.scheduleTimes.join("|")])
    );

    next.forEach((med) => {
      if (previousSchedules.get(med.id) !== med.scheduleTimes.join("|")) {
        updateMedicationEntry(userId, med.id, toMedicationEntryInput(med)).catch((err) => {
          console.warn("Failed to sync medication schedule:", err);
        });
      }
    });
  };

  const updateBundleTime = (oldTime: string, newTime: string) => {
    setMedications((prev) => {
      const next = prev.map((med) => ({
        ...med,
        scheduleTimes: med.scheduleTimes.map((t) => t === oldTime ? newTime : t),
      }));
      syncChangedSchedules(prev, next);
      return next;
    });
    if (disabledBundles.includes(oldTime)) {
      setDisabledBundles(prev => [...prev.filter(t => t !== oldTime), newTime]);
    }
  };

  const deleteBundleTime = (time: string) => {
    setMedications((prev) => {
      const next = prev.map((med) => ({
        ...med,
        scheduleTimes: med.scheduleTimes.filter((t) => t !== time),
      }));
      syncChangedSchedules(prev, next);
      return next;
    });
  };

  const toggleBundle = (time: string) => {
    setDisabledBundles(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const addCustomSlot = () => {
    if (!newSlotData.medicationId || !newSlotData.time) return;
    setMedications((prev) => {
      const next = prev.map((med) => {
        if (med.id === newSlotData.medicationId) {
          const updated = {
            ...med,
            scheduleTimes: Array.from(new Set([...med.scheduleTimes, newSlotData.time]))
              .sort((a, b) => toMinutes(a) - toMinutes(b)),
          };
          if (userId) {
            updateMedicationEntry(userId, updated.id, toMedicationEntryInput(updated)).catch((err) => {
              console.warn("Failed to sync medication schedule:", err);
            });
          }
          return updated;
        }
        return med;
      });
      return next;
    });
    setIsAddSlotOpen(false);
    setNewSlotData({ medicationId: "", time: "12:00" });
  };

  const [missedDoseAction, setMissedDoseAction] = useState<{
    medicationId: string | null;
    scheduledAt: string;
    evaluatedAt: string;
    skipReason: string;
    followUpAt: string;
    status: "pending" | "taken" | "skipped" | "remind_later";
  }>({
    medicationId: null,
    scheduledAt: INITIAL_MISSED_SCHEDULED_AT,
    evaluatedAt: INITIAL_MISSED_FOLLOW_UP_AT,
    skipReason: "",
    followUpAt: INITIAL_MISSED_FOLLOW_UP_AT,
    status: "pending",
  });

  const [binderLog, setBinderLog] = useState<Record<MealKey, MealDoseStatus>>({
    breakfast: "pending",
    lunch: "pending",
    dinner: "pending",
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncView = () => setIsMobile(mediaQuery.matches);
    syncView();
    mediaQuery.addEventListener("change", syncView);
    return () => mediaQuery.removeEventListener("change", syncView);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.medications, JSON.stringify(medications));
  }, [medications]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft));
  }, [draft]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.mealTimes, JSON.stringify(mealTimes));
  }, [mealTimes]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    let isActive = true;

    const load = async () => {
      try {
        const [serverMedications, serverMealTimes] = await Promise.all([
          fetchMedicationEntries(userId),
          fetchMedicationMealTimes(userId),
        ]);

        if (!isActive) return;

        if (serverMedications.length > 0) {
          setMedications(serverMedications.map(fromMedicationEntry));
        } else {
          const stored = window.localStorage.getItem(STORAGE_KEYS.medications);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Medication[];
              if (Array.isArray(parsed) && parsed.length > 0) {
                const created = await Promise.all(
                  parsed.map((med) => createMedicationEntry(userId, toMedicationEntryInput(med)))
                );
                if (!isActive) return;
                setMedications(created.map(fromMedicationEntry));
              }
            } catch {
              // Ignore local parse errors and keep defaults.
            }
          }
        }

        if (serverMealTimes) {
          setMealTimes({
            breakfast: serverMealTimes.breakfast,
            lunch: serverMealTimes.lunch,
            dinner: serverMealTimes.dinner,
          });
        }
      } catch (err) {
        console.warn("Failed to sync medications from backend:", err);
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    const timer = window.setTimeout(() => {
      saveMedicationMealTimes(userId, mealTimes).catch((err) => {
        console.warn("Failed to sync meal times:", err);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [mealTimes, userId]);

  const effectiveSelectedMedicationId = selectedMedicationId ?? medications[0]?.id ?? null;

  const selectedMedication = useMemo(
    () => medications.find((medication) => medication.id === effectiveSelectedMedicationId) ?? null,
    [effectiveSelectedMedicationId, medications],
  );

  const medicationMetrics = useMemo(() => medications.map((medication) => {
    const daysRemaining = getDaysRemaining(medication);
    const refillStatus = getRefillStatus(daysRemaining);
    return {
      medication,
      daysRemaining,
      refillStatus,
    };
  }), [medications]);

  const criticalMedicationMetrics = useMemo(
    () => medicationMetrics.filter((metric) => metric.refillStatus === "critical"),
    [medicationMetrics],
  );

  const reminderBundles = useMemo(() => {
    const grouped = new Map<string, BundledReminder>();

    medicationMetrics.forEach(({ medication }) => {
      medication.scheduleTimes.forEach((time) => {
        const existing = grouped.get(time);
        if (existing) {
          existing.medicationIds.push(medication.id);
          existing.medicationNames.push(medication.name);
        } else {
          grouped.set(time, {
            time,
            medicationIds: [medication.id],
            medicationNames: [medication.name],
          });
        }
      });
    });

    return Array.from(grouped.values()).sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  }, [medicationMetrics]);

  const medicationSearchSuggestions = useMemo(() => {
    const query = draft.name.trim().toLowerCase();
    if (!query) return MEDICATION_SUGGESTIONS.slice(0, 6);
    return MEDICATION_SUGGESTIONS
      .filter((suggestion) => suggestion.toLowerCase().includes(query))
      .slice(0, 6);
  }, [draft.name]);

  const missedHours = useMemo(() => {
    const diffMs = new Date(missedDoseAction.evaluatedAt).getTime() - new Date(missedDoseAction.scheduledAt).getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  }, [missedDoseAction.evaluatedAt, missedDoseAction.scheduledAt]);

  const catchUpGuidance = missedHours < 4
    ? "Take it now and continue your next dose on schedule."
    : "Skip this dose and continue with your next scheduled dose.";

  const canProceedFromStep = useMemo(() => {
    if (wizardStep === 1) {
      return Boolean(draft.name.trim() && draft.startDate && draft.prescribingDoctor.trim());
    }

    if (wizardStep === 2) {
      return Number(draft.doseAmount) > 0;
    }

    if (wizardStep === 3) {
      if (draft.frequency === "custom") {
        return draft.customTimes.filter(Boolean).length > 0;
      }
      if (draft.frequency === "with_meals") {
        return Object.values(draft.mealLinks).some(Boolean);
      }
      return true;
    }

    if (wizardStep === 4) {
      return Number(draft.quantityOnHand) > 0 && draft.refillAlertThresholdDays > 0;
    }

    return true;
  }, [draft, wizardStep]);

  const runInteractionAsync = async () => {
    if (!draft.name.trim()) {
      setWizardError("Enter a medication name before running interaction check.");
      return;
    }

    setInteractionLoading(true);
    setWizardError("");
    try {
      const result = await runInteractionCheck(draft.name, medications);
      setInteraction(result);
      setSevereAcknowledged(false);
    } finally {
      setInteractionLoading(false);
    }
  };

  const openWizard = () => {
    setWizardError("");
    setIsWizardOpen(true);
    setWizardStep(1);
    setInteraction(null);
    setSevereAcknowledged(false);
  };

  const closeWizard = () => {
    setIsWizardOpen(false);
    setWizardStep(1);
    setInteraction(null);
    setSevereAcknowledged(false);
    setWizardError("");
  };

  const saveMedication = async () => {
    if (!canProceedFromStep) {
      setWizardError("Fill all required fields to continue.");
      return;
    }

    setWizardError("");

    let nextInteraction = interaction;
    if (!nextInteraction) {
      setInteractionLoading(true);
      try {
        nextInteraction = await runInteractionCheck(draft.name, medications);
        setInteraction(nextInteraction);
      } finally {
        setInteractionLoading(false);
      }
    }

    if (nextInteraction.severe.length > 0 && !severeAcknowledged) {
      setWizardError("Acknowledge severe interaction warnings before saving.");
      return;
    }

    setSaveLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 550));

    const newMedication: Medication = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      prescribingDoctor: draft.prescribingDoctor.trim(),
      startDate: draft.startDate,
      endDate: draft.endDate,
      doseAmount: Number(draft.doseAmount),
      unit: draft.unit,
      route: draft.route,
      frequency: draft.frequency,
      customTimes: draft.customTimes,
      mealLinks: draft.mealLinks,
      scheduleTimes: resolveScheduleTimes(draft, mealTimes),
      quantityOnHand: Number(draft.quantityOnHand),
      refillAlertThresholdDays: draft.refillAlertThresholdDays,
      pillPhotoName: draft.pillPhotoName,
      isPhosphateBinder: draft.isPhosphateBinder,
      interaction: nextInteraction,
      overrideLogAt: nextInteraction.severe.length > 0 ? new Date().toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    if (userId) {
      try {
        const created = await createMedicationEntry(userId, toMedicationEntryInput(newMedication));
        const mapped = fromMedicationEntry(created);
        setMedications((prev) => [mapped, ...prev]);
        setSelectedMedicationId(mapped.id);
      } catch (err) {
        console.warn("Failed to sync medication to backend:", err);
        setMedications((prev) => [newMedication, ...prev]);
        setSelectedMedicationId(newMedication.id);
      }
    } else {
      setMedications((prev) => [newMedication, ...prev]);
      setSelectedMedicationId(newMedication.id);
    }
    setDraft(createEmptyDraft());
    setSaveLoading(false);

    closeWizard();
    window.dispatchEvent(new CustomEvent("refresh-medications"));
  };

  const updateDraft = (patch: Partial<MedicationDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

  const updateMealTime = (meal: MealKey, value: string) => {
    setMealTimes((prev) => ({ ...prev, [meal]: value }));
  };

  const markDoseTaken = () => {
    setMissedDoseAction((prev) => ({
      ...prev,
      status: "taken",
      skipReason: "",
      evaluatedAt: new Date().toISOString(),
    }));
  };

  const markDoseSkipped = () => {
    setMissedDoseAction((prev) => ({
      ...prev,
      status: "skipped",
      evaluatedAt: new Date().toISOString(),
      followUpAt: new Date(Date.now() + (20 * 60 * 1000)).toISOString(),
    }));
  };

  const remindLater = () => {
    setMissedDoseAction((prev) => ({
      ...prev,
      status: "remind_later",
      evaluatedAt: new Date().toISOString(),
      followUpAt: new Date(Date.now() + (30 * 60 * 1000)).toISOString(),
    }));
  };

  const generateRefillList = () => {
    const lines = criticalMedicationMetrics.map(({ medication, daysRemaining }) => (
      `${medication.name} · ${Math.floor(daysRemaining)} days left · ${medication.doseAmount}${medication.unit}`
    ));
    const report = `Refill list generated ${formatDateTime(new Date().toISOString())}\n${lines.join("\n")}`;
    setGeneratedRefillList(report);
  };

  const topSummaryCard = (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-bold theme-text">Medication Management</h2>
          <p className="text-[11px] theme-text-muted">Stay on schedule and avoid alert fatigue</p>
        </div>
      </div>
    </div>
  );


  const medicationListPanel = (
    <GlassCard padding="md" className="h-full">
      <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12z" />
          </svg>
        </div>
        <span className="text-xs font-semibold theme-text">Active Medications</span>
        <span className="text-[10px] theme-text-faint">— {medications.length} total</span>

        <button
          type="button"
          onClick={openWizard}
          className="ml-auto min-h-8 rounded-lg px-3 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all"
        >
          + Add
        </button>
      </div>

      <div className="space-y-3">
        {medicationMetrics.map(({ medication, daysRemaining, refillStatus }) => {
          const selected = medication.id === effectiveSelectedMedicationId;
          const isDeleting = medicationToDelete === medication.id;

          return (
            <div
              key={medication.id}
              onClick={() => {
                if (!isDeleting) setSelectedMedicationId(medication.id);
              }}
              className={cn(
                "group relative w-full flex flex-col gap-1 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300",
                selected
                  ? "bg-emerald-500/[0.06] border-emerald-500/25 ring-1 ring-emerald-500/20 shadow-sm"
                  : "hover:scale-[1.01] theme-transition",
                isDeleting && "border-red-500/30 bg-red-500/5 ring-1 ring-red-500/20"
              )}
              style={!selected && !isDeleting ? { borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)', cursor: 'pointer' } : { cursor: isDeleting ? 'default' : 'pointer' }}
            >
              {isDeleting ? (
                <div className="py-1">
                  <p className="text-xs font-semibold text-red-500 mb-1">Remove {medication.name}?</p>
                  <p className="text-[10px] text-red-500/80 mb-3">This action cannot be undone.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMedication(medication.id); }}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-1.5 text-[11px] font-medium transition-colors"
                    >
                      Yes, remove
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMedicationToDelete(null); }}
                      className="flex-1 border border-red-500/30 hover:bg-red-500/10 text-red-500 rounded-lg py-1.5 text-[11px] font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between w-full h-full">
                  <div>
                    <p className={cn("text-sm font-semibold transition-colors duration-200", selected ? "theme-text" : "theme-text-muted")}>
                      {medication.name}
                    </p>
                    <p className="text-[10px] theme-text-faint">{medication.doseAmount}{medication.unit} · {medication.route}</p>
                    <p className={cn("text-[11px] font-medium mt-1", getRefillTextClass(refillStatus))}>{Math.floor(daysRemaining)} days left</p>
                  </div>
                  <div className="flex flex-col items-end gap-3 min-h-full">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full mt-1", getStatusDotClass(refillStatus))} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMedicationToDelete(medication.id);
                      }}
                      className={cn(
                        "p-1 -mr-1 mt-auto text-[var(--text-muted)] hover:text-red-500 transition-all duration-200",
                        selected ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"
                      )}
                      title="Remove medication"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
  const selectedMedicationPanel = (
    <div className="space-y-4">
      <GlassCard padding="md">
        {selectedMedication ? (
          <>
            <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/15 text-sky-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </div>
              <span className="text-xs font-semibold theme-text">{selectedMedication.name}</span>
              <span className="text-[10px] theme-text-faint">— details</span>

              {selectedMedication.isPhosphateBinder && (
                <span className="ml-auto rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  Phosphate Binder
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="rounded-xl border p-3 theme-transition" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
                <p className="text-[10px] font-medium text-sky-400 mb-0.5">Dose</p>
                <p className="theme-text font-semibold">{selectedMedication.doseAmount} {selectedMedication.unit}</p>
              </div>
              <div className="rounded-xl border p-3 theme-transition" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
                <p className="text-[10px] font-medium text-violet-400 mb-0.5">Route</p>
                <p className="theme-text font-semibold capitalize">{selectedMedication.route}</p>
              </div>
              <div className="rounded-xl border p-3 theme-transition" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
                <p className="text-[10px] font-medium text-emerald-400 mb-0.5">Frequency</p>
                <p className="theme-text font-semibold capitalize">{selectedMedication.frequency.replaceAll("_", " ")}</p>
              </div>
              <div className="rounded-xl border p-3 theme-transition" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
                <p className="text-[10px] font-medium text-amber-400 mb-0.5">Doctor</p>
                <p className="theme-text font-semibold truncate">{selectedMedication.prescribingDoctor}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="theme-text-dimmed">Supply level</span>
                <span className={cn("font-medium", getRefillTextClass(getRefillStatus(getDaysRemaining(selectedMedication))))}>
                  {getRefillLabel(getRefillStatus(getDaysRemaining(selectedMedication)))}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
                <div
                  className={cn("h-full rounded-full", getRefillBarClass(getRefillStatus(getDaysRemaining(selectedMedication))))}
                  style={{ width: `${Math.min(100, (getDaysRemaining(selectedMedication) / 30) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border p-3 theme-transition" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
              <p className="text-[10px] font-medium text-sky-400 mb-1">Reminder Times</p>
              <p className="text-xs font-semibold theme-text">{selectedMedication.scheduleTimes.map(formatTime).join(" · ")}</p>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-xs theme-text-dimmed">Select a medication to view details.</p>
          </div>
        )}
      </GlassCard>

      {selectedMedication?.isPhosphateBinder && (
        <GlassCard padding="md" className="border-amber-500/30 bg-amber-500/5">
          <p className="text-[10px] uppercase tracking-wider text-amber-500 font-semibold mb-1">Phosphate Binder Log</p>
          <p className="text-[11px] text-amber-500/80 mb-3">Meal-linked reminders fire 10 minutes before saved meal times.</p>
          <div className="space-y-2">
            {(["breakfast", "lunch", "dinner"] as MealKey[]).map((meal) => (
              <div key={meal} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-[var(--bg-card)] p-3">
                <div>
                  <p className="text-xs font-semibold capitalize theme-text">{meal}</p>
                  <p className="text-[10px] theme-text-faint mt-0.5">Reminder at {formatTime(minusMinutes(mealTimes[meal], 10))}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(["taken", "pending", "skipped"] as MealDoseStatus[]).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setBinderLog((prev) => ({ ...prev, [meal]: status }))}
                      className={cn(
                        "h-8 rounded-lg border px-3 text-[10px] font-semibold capitalize transition-all",
                        binderLog[meal] === status
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20"
                          : "border-[var(--border-primary)] bg-[var(--bg-elevated)] theme-text-muted hover:theme-text hover:border-[var(--border-hover)]",
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
  const wizardStepContent = (
    <div className="space-y-3">
      <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] uppercase tracking-wider theme-text-dimmed">Add Medication Wizard</p>
          <p className="text-xs font-medium theme-text">Step {wizardStep} / 4</p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-elevated)" }}>
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(wizardStep / 4) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}>
        {wizardStep === 1 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Medication name</label>
              <input
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value })}
                placeholder="Start typing medication"
                className="h-11 w-full rounded-xl border px-4 text-sm theme-text placeholder:theme-text-faint transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {medicationSearchSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => updateDraft({ name: suggestion })}
                    className="min-h-11 rounded-full border px-3 text-[11px] theme-text-muted"
                    style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Start date</label>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(event) => updateDraft({ startDate: event.target.value })}
                  className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">End date (optional)</label>
                <input
                  type="date"
                  value={draft.endDate}
                  onChange={(event) => updateDraft({ endDate: event.target.value })}
                  className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Prescribing doctor</label>
              <input
                value={draft.prescribingDoctor}
                onChange={(event) => updateDraft({ prescribingDoctor: event.target.value })}
                placeholder="Doctor name"
                className="h-11 w-full rounded-xl border px-4 text-sm theme-text placeholder:theme-text-faint transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
              />
            </div>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Dose amount</label>
                <input
                  type="number"
                  min={0}
                  value={draft.doseAmount}
                  onChange={(event) => updateDraft({ doseAmount: event.target.value })}
                  placeholder="e.g. 500"
                  className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Unit</label>
                <select
                  value={draft.unit}
                  onChange={(event) => updateDraft({ unit: event.target.value as MedicationUnit })}
                  className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                >
                  <option value="mg">mg</option>
                  <option value="ml">ml</option>
                  <option value="units">units</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Route</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(["oral", "injection", "iv", "topical"] as MedicationRoute[]).map((route) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => updateDraft({ route })}
                    className={cn(
                      "min-h-11 rounded-xl border px-3 text-xs font-medium capitalize",
                      draft.route === route ? "text-white" : "theme-text-muted",
                    )}
                    style={{
                      borderColor: draft.route === route ? "rgba(16,185,129,0.5)" : "var(--border-primary)",
                      background: draft.route === route ? "rgba(16,185,129,0.35)" : "var(--bg-elevated)",
                    }}
                  >
                    {route}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-3">
            <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Frequency</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([
                ["once_daily", "Once daily"],
                ["twice_daily", "Twice daily"],
                ["with_meals", "With meals"],
                ["at_bedtime", "At bedtime"],
                ["every_other_day", "Every other day"],
                ["custom", "Custom times"],
              ] as Array<[MedicationFrequency, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateDraft({ frequency: value })}
                  className={cn(
                    "min-h-11 rounded-xl border px-3 text-left text-xs font-medium",
                    draft.frequency === value ? "text-white" : "theme-text-muted",
                  )}
                  style={{
                    borderColor: draft.frequency === value ? "rgba(16,185,129,0.5)" : "var(--border-primary)",
                    background: draft.frequency === value ? "rgba(16,185,129,0.35)" : "var(--bg-elevated)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {draft.frequency === "with_meals" && (
              <div className="rounded-lg border p-2" style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.10)" }}>
                <p className="text-[10px] uppercase tracking-wider text-amber-300">Meal-linked reminders</p>
                <p className="text-[11px] text-amber-200">Reminders fire 10 minutes before saved meal times.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {(["breakfast", "lunch", "dinner"] as MealKey[]).map((meal) => (
                    <button
                      key={meal}
                      type="button"
                      onClick={() => updateDraft({ mealLinks: { ...draft.mealLinks, [meal]: !draft.mealLinks[meal] } })}
                      className={cn(
                        "min-h-11 rounded-xl border px-3 text-left text-xs font-medium capitalize",
                        draft.mealLinks[meal] ? "text-white" : "text-amber-100",
                      )}
                      style={{
                        borderColor: draft.mealLinks[meal] ? "rgba(16,185,129,0.5)" : "rgba(245,158,11,0.35)",
                        background: draft.mealLinks[meal] ? "rgba(16,185,129,0.35)" : "rgba(245,158,11,0.12)",
                      }}
                    >
                      {meal} · {formatTime(mealTimes[meal])}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {draft.frequency === "custom" && (
              <div className="space-y-2 rounded-lg border p-2" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
                <p className="text-[10px] uppercase tracking-wider theme-text-dimmed">Custom schedule times</p>
                {draft.customTimes.map((time, index) => (
                  <div key={`${time}-${index}`} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(event) => {
                        const nextTimes = [...draft.customTimes];
                        nextTimes[index] = event.target.value;
                        updateDraft({ customTimes: nextTimes });
                      }}
                      className="min-h-11 flex-1 rounded-xl border px-3 text-sm theme-text"
                      style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (draft.customTimes.length === 1) return;
                        updateDraft({ customTimes: draft.customTimes.filter((_, itemIndex) => itemIndex !== index) });
                      }}
                      className="min-h-11 rounded-xl border px-3 text-xs theme-text-muted"
                      style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateDraft({ customTimes: [...draft.customTimes, "12:00"] })}
                  className="min-h-11 rounded-xl border px-3 text-xs theme-text"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}
                >
                  Add Time
                </button>
              </div>
            )}
          </div>
        )}

        {wizardStep === 4 && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Quantity on hand</label>
                <input
                  type="number"
                  min={0}
                  value={draft.quantityOnHand}
                  onChange={(event) => updateDraft({ quantityOnHand: event.target.value })}
                  className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Refill alert threshold (days)</label>
                <input
                  type="number"
                  min={1}
                  value={draft.refillAlertThresholdDays}
                  onChange={(event) => updateDraft({ refillAlertThresholdDays: Number(event.target.value) || 7 })}
                  className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">Optional pill photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  updateDraft({ pillPhotoName: file?.name ?? "" });
                }}
                className="min-h-11 w-full rounded-xl border px-3 py-2 text-sm theme-text"
                style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
              />
              {draft.pillPhotoName && <p className="mt-1 text-[11px] theme-text-dimmed">Selected: {draft.pillPhotoName}</p>}
            </div>

            <label className="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-xs theme-text" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
              <input
                type="checkbox"
                checked={draft.isPhosphateBinder}
                onChange={(event) => updateDraft({ isPhosphateBinder: event.target.checked })}
              />
              This medication is a phosphate binder
            </label>

            <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider theme-text-dimmed">Drug interaction checker</p>
                <button
                  type="button"
                  onClick={runInteractionAsync}
                  disabled={interactionLoading}
                  className="min-h-11 rounded-full border px-3 text-xs theme-text"
                  style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}
                >
                  {interactionLoading ? "Checking..." : "Run Check"}
                </button>
              </div>

              {!interaction && (
                <p className="text-[11px] theme-text-dimmed">Interaction results will appear here before saving.</p>
              )}

              {interaction && (
                <div className="space-y-2 text-[11px]">
                  <div className="rounded-lg border p-2" style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)" }}>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-red-300">Severe</p>
                    {interaction.severe.length === 0 ? (
                      <p className="text-red-200/90">No severe interactions found.</p>
                    ) : (
                      <ul className="space-y-1 text-red-100">
                        {interaction.severe.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border p-2" style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.10)" }}>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-amber-300">Moderate</p>
                    {interaction.moderate.length === 0 ? (
                      <p className="text-amber-200/90">No moderate interactions found.</p>
                    ) : (
                      <ul className="space-y-1 text-amber-100">
                        {interaction.moderate.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border p-2" style={{ borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.10)" }}>
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-300">None</p>
                    {interaction.none.length === 0 ? (
                      <p className="text-emerald-200/90">No additional clear notes.</p>
                    ) : (
                      <ul className="space-y-1 text-emerald-100">
                        {interaction.none.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
                      </ul>
                    )}
                  </div>

                  {interaction.severe.length > 0 && (
                    <label className="flex min-h-11 items-center gap-2 rounded-lg border px-2 py-2 text-[11px] text-red-200" style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)" }}>
                      <input
                        type="checkbox"
                        checked={severeAcknowledged}
                        onChange={(event) => setSevereAcknowledged(event.target.checked)}
                      />
                      I acknowledge severe interaction warnings and want to continue.
                    </label>
                  )}

                  <p className="text-[10px] theme-text-dimmed">Last checked: {formatDateTime(interaction.checkedAt)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {wizardError && (
          <p className="mt-3 rounded-lg border px-3 py-2 text-xs text-red-300" style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)" }}>
            {wizardError}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            if (wizardStep === 1) {
              closeWizard();
              return;
            }
            setWizardStep((prev) => Math.max(1, prev - 1));
          }}
          className="min-h-11 rounded-full border px-4 text-xs font-medium theme-text"
          style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}
        >
          {wizardStep === 1 ? "Cancel" : "Back"}
        </button>

        {wizardStep < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (!canProceedFromStep) {
                setWizardError("Fill required fields before moving to next step.");
                return;
              }
              setWizardError("");
              setWizardStep((prev) => Math.min(4, prev + 1));
            }}
            className="min-h-11 rounded-full px-4 text-xs font-medium text-white"
            style={{ background: "#10b981" }}
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={saveMedication}
            disabled={saveLoading || interactionLoading}
            className="min-h-11 rounded-full px-4 text-xs font-medium text-white disabled:opacity-60"
            style={{ background: "#10b981" }}
          >
            {saveLoading ? "Saving..." : "Save Medication"}
          </button>
        )}
      </div>
    </div>
  );

  const homePanel = (
    <div className="space-y-3">
      {criticalMedicationMetrics.length > 0 && (
        <div className="rounded-xl border px-3 py-3" style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.12)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-300">Refill Warning</p>
              <p className="text-xs text-amber-100">{criticalMedicationMetrics.length} medication(s) have less than 7 days remaining.</p>
            </div>
            <button
              type="button"
              onClick={generateRefillList}
              className="min-h-11 rounded-full border px-3 text-[11px] text-amber-100"
              style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.16)" }}
            >
              Generate refill list
            </button>
          </div>
          {generatedRefillList && (
            <pre className="mt-2 whitespace-pre-wrap rounded-lg border p-2 text-[10px] text-amber-100" style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.07)" }}>
              {generatedRefillList}
            </pre>
          )}
        </div>
      )}

      <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] uppercase tracking-wider theme-text-dimmed">Bundled schedule notifications</p>
          <button
            onClick={() => setIsAddSlotOpen(true)}
            className="text-emerald-500 hover:text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Add Slot
          </button>
        </div>
        <div className="mt-2 space-y-2">
          {reminderBundles.length === 0 ? (
            <p className="text-xs theme-text-dimmed">No scheduled reminders available.</p>
          ) : reminderBundles.map((bundle) => {
            const isDisabled = disabledBundles.includes(bundle.time);
            const isEditing = editingBundleTime === bundle.time;

            return (
              <div key={bundle.time} className={cn("rounded-lg border p-3 flex items-center justify-between transition-all duration-200", isDisabled ? "opacity-60 bg-[var(--bg-card)]" : "bg-[var(--bg-elevated)]")} style={{ borderColor: "var(--border-primary)" }}>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="time"
                      defaultValue={bundle.time}
                      autoFocus
                      onBlur={(e) => {
                        if (e.target.value && e.target.value !== bundle.time) {
                          updateBundleTime(bundle.time, e.target.value);
                        }
                        setEditingBundleTime(null);
                      }}
                      className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded px-2 py-1 text-sm theme-text outline-none focus:border-emerald-500/50"
                    />
                  ) : (
                    <p className={cn("text-sm font-medium", isDisabled ? "theme-text-muted line-through" : "theme-text")}>{formatTime(bundle.time)}</p>
                  )}
                  <p className="text-[11px] theme-text-dimmed mt-0.5 truncate">{bundle.medicationNames.join(" · ")}</p>
                </div>

                <div className="flex items-center gap-3 pl-3">
                  <button
                    onClick={() => toggleBundle(bundle.time)}
                    className={cn("w-8 h-4 rounded-full transition-colors relative", isDisabled ? "bg-gray-500/30" : "bg-emerald-500")}
                    title={isDisabled ? "Enable reminder" : "Disable reminder"}
                  >
                    <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all", isDisabled ? "left-0.5" : "left-4.5")} />
                  </button>

                  <button
                    onClick={() => setEditingBundleTime(isEditing ? null : bundle.time)}
                    className="text-[var(--text-muted)] hover:text-emerald-500 transition-colors"
                    title="Edit time"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.89l12.685-12.685zM16.862 4.487L19.5 7.125" /></svg>
                  </button>

                  <button
                    onClick={() => deleteBundleTime(bundle.time)}
                    className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
                    title="Delete slot entirely"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {isAddSlotOpen && (
          <div className="mt-4 p-3 border rounded-xl" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
            <p className="text-[10px] uppercase tracking-wider theme-text-dimmed mb-2">Add New Custom Slot</p>
            <div className="space-y-2">
              <select
                value={newSlotData.medicationId}
                onChange={e => setNewSlotData(prev => ({ ...prev, medicationId: e.target.value }))}
                className="w-full bg-transparent border rounded-lg px-2 py-1.5 text-xs theme-text outline-none focus:border-emerald-500/50"
                style={{ borderColor: "var(--border-input)" }}
              >
                <option value="" className="text-black dark:text-black">Select Medication</option>
                {medications.map(m => (
                  <option key={m.id} value={m.id} className="text-black dark:text-black">{m.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newSlotData.time}
                  onChange={e => setNewSlotData(prev => ({ ...prev, time: e.target.value }))}
                  className="flex-1 bg-transparent border rounded-lg px-2 py-1.5 text-xs theme-text outline-none focus:border-emerald-500/50"
                  style={{ borderColor: "var(--border-input)" }}
                />
                <button
                  onClick={addCustomSlot}
                  disabled={!newSlotData.medicationId || !newSlotData.time}
                  className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddSlotOpen(false)}
                  className="border hover:bg-black/5 dark:hover:bg-white/5 theme-text px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{ borderColor: "var(--border-primary)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const alertsPanel = (
    <div className="space-y-3">
      <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}>
        <p className="text-[10px] uppercase tracking-wider theme-text-dimmed">Missed dose handling</p>
        <p className="text-xs theme-text-muted">Follow-up is scheduled 15–30 minutes after a missed dose.</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={markDoseTaken}
            className="min-h-11 rounded-full border px-3 text-xs font-medium theme-text"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
          >
            Taken
          </button>
          <button
            type="button"
            onClick={markDoseSkipped}
            className="min-h-11 rounded-full border px-3 text-xs font-medium text-amber-300"
            style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.12)" }}
          >
            Skipped
          </button>
          <button
            type="button"
            onClick={remindLater}
            className="min-h-11 rounded-full border px-3 text-xs font-medium theme-text"
            style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
          >
            Remind in 30 min
          </button>
        </div>

        {missedDoseAction.status === "skipped" && (
          <div className="mt-3 rounded-lg border p-2" style={{ borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.10)" }}>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-amber-300">Skip reason</label>
            <select
              value={missedDoseAction.skipReason}
              onChange={(event) => setMissedDoseAction((prev) => ({ ...prev, skipReason: event.target.value }))}
              className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
            >
              <option value="">Select reason</option>
              <option value="Forgot">Forgot</option>
              <option value="Side effects">Side effects</option>
              <option value="Out of stock">Out of stock</option>
              <option value="Doctor said stop">Doctor said stop</option>
              <option value="Other">Other</option>
            </select>
            <p className="mt-2 text-[11px] text-amber-100">{catchUpGuidance}</p>
          </div>
        )}

        {(missedDoseAction.status === "skipped" || missedDoseAction.status === "remind_later") && (
          <p className="mt-2 text-[11px] theme-text-dimmed">Follow-up reminder at {formatDateTime(missedDoseAction.followUpAt)}</p>
        )}
      </div>

      {criticalMedicationMetrics.length > 0 && (
        <div className="rounded-xl border p-3" style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.10)" }}>
          <p className="text-[10px] uppercase tracking-wider text-red-300">Critical refill alerts</p>
          <div className="mt-2 space-y-2">
            {criticalMedicationMetrics.map(({ medication, daysRemaining }) => (
              <div key={medication.id} className="rounded-lg border p-2" style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)" }}>
                <p className="text-sm font-medium text-red-100">{medication.name}</p>
                <p className="text-[11px] text-red-200">{Math.floor(daysRemaining)} days left</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const profilePanel = (
    <div className="space-y-3">
      <div className="rounded-xl border p-3" style={{ borderColor: "var(--border-primary)", background: "var(--bg-card)" }}>
        <p className="text-[10px] uppercase tracking-wider theme-text-dimmed">Meal Time Settings</p>
        <p className="text-xs theme-text-muted">These saved meal times are used for with-meals and phosphate binder reminders.</p>

        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(["breakfast", "lunch", "dinner"] as MealKey[]).map((meal) => (
            <label key={meal} className="rounded-lg border p-2" style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}>
              <span className="mb-1 block text-[10px] uppercase tracking-wider theme-text-dimmed">{meal}</span>
              <input
                type="time"
                value={mealTimes[meal]}
                onChange={(event) => updateMealTime(meal, event.target.value)}
                className="h-11 w-full rounded-xl border px-4 text-sm theme-text transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                style={{ borderColor: "var(--border-primary)", background: "var(--bg-elevated)" }}
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );


  return (
    <section className="min-w-0 space-y-4 pb-12">
      {topSummaryCard}

      {/* Main Layout */}
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">

        {/* Left Column */}
        <div className="min-w-0 space-y-4">
          {homePanel}
          {medicationListPanel}
        </div>

        {/* Right Column */}
        <div className="min-w-0 space-y-4">
          {isWizardOpen ? (
            <div className={cn("fixed inset-x-0 z-[70] overflow-y-auto border-t p-3 md:static md:z-auto md:border-0 md:p-0 bg-[var(--bg-primary)] md:bg-transparent", isMobile ? "bottom-0 top-14" : "")}>
              <div className="mx-auto w-full max-w-3xl">{wizardStepContent}</div>
            </div>
          ) : (
            <>
              {selectedMedicationPanel}
              {alertsPanel}
              {profilePanel}
            </>
          )}
        </div>
      </div>
    </section>
  );
}