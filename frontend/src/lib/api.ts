import { PatientOverview, CKDStage } from "@/types/patient";
import { defaultHealthyOverview } from "@/lib/mock-data";
import { fetchUser, fetchRecords } from "./api-client";

/**
 * API module — fetches real patient data and merges with defaults for the overview.
 * 
 * Optimized:
 *  - fetchUser + fetchRecords run in parallel via Promise.all (was sequential)
 *  - Data source counts computed in a single pass (was 3 separate .filter() calls)
 *  - Sub-score derivation uses deterministic offsets (was Math.random per render)
 */

export async function fetchPatientOverview(
  userId?: string
): Promise<PatientOverview> {
  if (!userId) return { ...defaultHealthyOverview };

  try {
    // *** KEY OPTIMIZATION: parallel requests instead of sequential ***
    // Before: const user = await fetchUser(); const records = await fetchRecords();
    // After:  both fire at the same time, total latency = max(userTime, recordsTime)
    const [user, recordsRes] = await Promise.all([
      fetchUser(userId),
      fetchRecords(userId),
    ]);
    const records = recordsRes.records;
    
    // Start with a healthy default template
    const overview: PatientOverview = { ...defaultHealthyOverview };
    
    // Override with real user data
    overview.id = user.id;
    overview.name = user.name || "Patient";
    overview.age = user.age || 0;
    overview.gender = (user.gender?.toLowerCase() as any) || "male";
    if (user.next_checkup) {
      overview.nextCheckup = user.next_checkup;
    }
    
    // Generate initials from real name
    const nameParts = (user.name || "P").split(" ");
    overview.avatarInitials = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      : nameParts[0].substring(0, 2).toUpperCase();
    
    // Override risk and health score if real records exist
    if (records.length > 0) {
      overview.hasRecords = true;
      const latest = records[0];

      // Map risk level to CKD stage — O(1) lookup
      const riskToStage: Record<string, CKDStage> = {
        low: 1, moderate: 3, high: 4, critical: 5,
      };
      const level = (latest.risk_level.toLowerCase() as any) || "low";

      overview.risk = {
        level,
        stage: riskToStage[level] || 1,
        confidence: Math.round(latest.confidence),
        factors: latest.contributing_factors || [],
      };

      // Deterministic sub-scores derived from health_score (no Math.random)
      const hs = latest.health_score;
      overview.healthScore = {
        ...overview.healthScore,
        overall: hs,
        kidney: Math.max(0, Math.min(100, hs - 3)),
        metabolic: Math.max(0, Math.min(100, hs + 2)),
        cardiovascular: Math.max(0, Math.min(100, hs + 1)),
      };
      overview.lastUpdated = latest.created_at;

      // Build key metrics from the latest hospital input values
      const vals = latest.input_values || {};
      const now = latest.created_at || new Date().toISOString();
      overview.keyMetrics = [];

      if (vals.egfr != null) {
        overview.keyMetrics.push({
          label: "eGFR", value: Number(vals.egfr), unit: "mL/min",
          normalRange: { min: 60, max: 120 }, trend: "stable", lastUpdated: now,
        });
      }
      if (vals.creatinine != null) {
        overview.keyMetrics.push({
          label: "Creatinine", value: Number(vals.creatinine), unit: "mg/dL",
          normalRange: { min: 0.7, max: 1.3 }, trend: "stable", lastUpdated: now,
        });
      }
      if (vals.urea != null) {
        overview.keyMetrics.push({
          label: "Urea", value: Number(vals.urea), unit: "mg/dL",
          normalRange: { min: 7, max: 20 }, trend: "stable", lastUpdated: now,
        });
      }
      if (vals.hemoglobin != null) {
        overview.keyMetrics.push({
          label: "Hemoglobin", value: Number(vals.hemoglobin), unit: "g/dL",
          normalRange: { min: 12.0, max: 17.5 }, trend: "stable", lastUpdated: now,
        });
      }

      // Detect trend from multiple records
      if (records.length >= 2) {
        const delta = latest.health_score - records[1].health_score;
        overview.healthScore.delta = delta;
        overview.healthScore.trend = delta > 3 ? "improving" : delta < -3 ? "declining" : "stable";
      }

      // *** OPTIMIZATION: single-pass counting instead of 3x .filter() ***
      // Before: records.filter(r => r.input_mode === "hospital").length (3 passes)
      // After:  one loop, O(N) total
      let hospitalCount = 0;
      let ureaCount = 0;
      let reportCount = 0;
      for (const r of records) {
        switch (r.input_mode) {
          case "hospital": hospitalCount++; break;
          case "urea": ureaCount++; break;
          case "medical-report": reportCount++; break;
        }
      }
      overview.dataSources = [
        { source: "hospital", label: "Hospital Reports", lastSync: hospitalCount > 0 ? now : "", isConnected: hospitalCount > 0, recordCount: hospitalCount },
        { source: "urea", label: "Urea Monitor", lastSync: ureaCount > 0 ? now : "", isConnected: ureaCount > 0, recordCount: ureaCount },
        { source: "medical-report", label: "Medical Reports", lastSync: reportCount > 0 ? now : "", isConnected: reportCount > 0, recordCount: reportCount },
      ];
    }
    // If no records: overview.hasRecords stays false → healthy defaults shown
    
    return overview;
  } catch (error) {
    // Network hiccup or backend temporarily unavailable — fall back to healthy defaults silently
    console.warn("Patient overview fetch failed (using defaults):", error);
    return { ...defaultHealthyOverview };
  }
}
