// ─── CKD Risk & Health Types ────────────────────────────────────────────────

export type CKDStage = 1 | 2 | 3 | 4 | 5;

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export type TrendDirection = "improving" | "stable" | "declining";

export type DataSource = "hospital" | "urea" | "medical-report";

// ─── Metric Interfaces ─────────────────────────────────────────────────────

export interface HealthMetric {
  label: string;
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
  trend: TrendDirection;
  lastUpdated: string; // ISO 8601
}

export interface RiskAssessment {
  level: RiskLevel;
  stage: CKDStage;
  confidence: number; // 0–100
  factors: string[];
}

export interface HealthScore {
  overall: number; // 0–100
  kidney: number;
  metabolic: number;
  cardiovascular: number;
  trend: TrendDirection;
  delta: number; // change from last assessment
}

export interface DataSourceStatus {
  source: DataSource;
  label: string;
  lastSync: string; // ISO 8601
  isConnected: boolean;
  recordCount: number;
}

// ─── Patient Overview ───────────────────────────────────────────────────────

export interface PatientOverview {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  avatarInitials: string;
  hasRecords: boolean; // false = new user with no data (show healthy defaults)
  risk: RiskAssessment;
  healthScore: HealthScore;
  keyMetrics: HealthMetric[];
  dataSources: DataSourceStatus[];
  lastUpdated: string; // ISO 8601
  nextCheckup: string; // ISO 8601
}
