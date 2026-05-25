import { PatientOverview } from "@/types/patient";

/**
 * Default healthy patient overview — shown to new users who have no records yet.
 * 
 * Assumes a healthy baseline: 100 health score, low risk, Stage 1.
 * All sub-scores default to healthy (95+). No contributing risk factors.
 * This ensures new users see a clean, reassuring dashboard with prompts
 * to add their data for personalized results.
 */
export const defaultHealthyOverview: PatientOverview = {
  id: "new-user",
  name: "Patient",
  age: 0,
  gender: "male",
  avatarInitials: "P",
  hasRecords: false,

  risk: {
    level: "low",
    stage: 1,
    confidence: 0,
    factors: [],
  },

  healthScore: {
    overall: 100,
    kidney: 95,
    metabolic: 95,
    cardiovascular: 95,
    trend: "stable",
    delta: 0,
  },

  keyMetrics: [],

  dataSources: [
    {
      source: "hospital",
      label: "Hospital Reports",
      lastSync: "",
      isConnected: false,
      recordCount: 0,
    },
    {
      source: "urea",
      label: "Urea Monitor",
      lastSync: "",
      isConnected: false,
      recordCount: 0,
    },
    {
      source: "medical-report",
      label: "Medical Reports",
      lastSync: "",
      isConnected: false,
      recordCount: 0,
    },
  ],

  lastUpdated: "",
  nextCheckup: new Date(Date.now() + 30 * 86_400_000).toISOString(),
};

/** @deprecated Use defaultHealthyOverview instead */
export const mockPatientOverview = defaultHealthyOverview;
