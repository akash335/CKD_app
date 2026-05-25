"use client";

import { useState } from "react";
import { useRole } from "@/lib/role-context";
import { GlassCard } from "@/components/ui/GlassCard";
import { FormField } from "@/components/forms/FormField";
import { PredictionResult } from "@/components/dashboard/PredictionResult";
import {
  InputMode,
  PredictionResponse,
  predictHospital,
  predictUrea,
  extractMedicalReport,
  saveRecord,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ── Mode definitions ──────────────────────────────────────────────────────

const modes: { id: InputMode; label: string; description: string; icon: React.ReactNode; accent: string }[] = [
  {
    id: "hospital",
    label: "Hospital Data",
    description: "Full lab panel with multiple biomarkers",
    accent: "sky",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
      </svg>
    ),
  },
  {
    id: "urea",
    label: "Urea Only",
    description: "Quick single-value reading",
    accent: "violet",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082" />
      </svg>
    ),
  },
  {
    id: "medical-report",
    label: "Medical Report",
    description: "Upload PDF/image, auto-extract data",
    accent: "emerald",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0013.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12a3 3 0 110-6H8.25a9.013 9.013 0 010-18H12a9 9 0 019 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    ),
  },
];

const accentClasses: Record<string, { activeBg: string; activeText: string; activeBorder: string; iconBg: string; ring: string }> = {
  sky: { activeBg: "bg-sky-500/[0.06]", activeText: "text-sky-400", activeBorder: "border-sky-500/25", iconBg: "bg-sky-500/15", ring: "ring-sky-500/20" },
  violet: { activeBg: "bg-violet-500/[0.06]", activeText: "text-violet-400", activeBorder: "border-violet-500/25", iconBg: "bg-violet-500/15", ring: "ring-violet-500/20" },
  emerald: { activeBg: "bg-emerald-500/[0.06]", activeText: "text-emerald-400", activeBorder: "border-emerald-500/25", iconBg: "bg-emerald-500/15", ring: "ring-emerald-500/20" },
};

// ── Validation helpers ────────────────────────────────────────────────────

function validateRange(val: string, min: number, max: number, label: string): string | undefined {
  if (!val) return `${label} is required`;
  const n = parseFloat(val);
  if (isNaN(n)) return `Enter a valid number`;
  if (n < min || n > max) return `Must be between ${min}–${max}`;
  return undefined;
}

// ── Component ─────────────────────────────────────────────────────────────

export function InputSection() {
  const { userId } = useRole();
  const [selectedMode, setSelectedMode] = useState<InputMode>("hospital");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentMode = modes.find((m) => m.id === selectedMode)!;
  const accent = accentClasses[currentMode.accent];

  const updateField = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const resetAll = () => {
    setFormData({});
    setErrors({});
    setResult(null);
    setApiError(null);
  };

  const switchMode = (mode: InputMode) => {
    setSelectedMode(mode);
    resetAll();
  };

  // Count how many fields are filled
  const getFieldCount = () => {
    if (selectedMode === "hospital") return { filled: ["creatinine", "urea", "egfr", "hemoglobin"].filter(f => formData[f]).length, total: 4 };
    if (selectedMode === "urea") return { filled: formData.urea ? 1 : 0, total: 1 };
    return { filled: uploadedFile ? 1 : 0, total: 1 }; // medical-report
  };

  const { filled, total } = getFieldCount();
  const progress = total > 0 ? (filled / total) * 100 : 0;

  const validateAndSubmit = async () => {
    const newErrors: Record<string, string> = {};

    if (selectedMode === "hospital") {
      const cr = validateRange(formData.creatinine, 0.1, 30, "Creatinine");
      const ur = validateRange(formData.urea, 1, 300, "Urea");
      const eg = validateRange(formData.egfr, 1, 150, "eGFR");
      const hb = validateRange(formData.hemoglobin, 2, 25, "Hemoglobin");
      if (cr) newErrors.creatinine = cr;
      if (ur) newErrors.urea = ur;
      if (eg) newErrors.egfr = eg;
      if (hb) newErrors.hemoglobin = hb;
      if (formData.age) {
        const ag = validateRange(formData.age, 1, 120, "Age");
        if (ag) newErrors.age = ag;
      }
    } else if (selectedMode === "urea") {
      const ur = validateRange(formData.urea, 1, 300, "Urea");
      if (ur) newErrors.urea = ur;
    } else if (selectedMode === "medical-report") {
      if (!uploadedFile) {
        setApiError("Please upload a medical report file");
        return;
      }
      // For medical report, we need all 4 fields (either extracted or manually filled)
      const cr = validateRange(formData.creatinine, 0.1, 30, "Creatinine");
      const ur = validateRange(formData.urea, 1, 300, "Urea");
      const eg = validateRange(formData.egfr, 1, 150, "eGFR");
      const hb = validateRange(formData.hemoglobin, 2, 25, "Hemoglobin");
      if (cr) newErrors.creatinine = cr;
      if (ur) newErrors.urea = ur;
      if (eg) newErrors.egfr = eg;
      if (hb) newErrors.hemoglobin = hb;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setApiError(null);

    try {
      let prediction: PredictionResponse;
      if (selectedMode === "hospital") {
        prediction = await predictHospital({
          creatinine: parseFloat(formData.creatinine),
          urea: parseFloat(formData.urea),
          egfr: parseFloat(formData.egfr),
          hemoglobin: parseFloat(formData.hemoglobin),
          age: formData.age ? parseInt(formData.age) : undefined,
        });
      } else if (selectedMode === "urea") {
        prediction = await predictUrea({
          urea: parseFloat(formData.urea),
        });
      } else {
        // medical-report: use the extracted/filled values
        prediction = await predictHospital({
          creatinine: parseFloat(formData.creatinine),
          urea: parseFloat(formData.urea),
          egfr: parseFloat(formData.egfr),
          hemoglobin: parseFloat(formData.hemoglobin),
          age: formData.age ? parseInt(formData.age) : undefined,
        });
      }
      setResult(prediction);

      // Auto-save to history
      try {
        const numericValues: Record<string, number> = {};
        if (selectedMode === "medical-report") {
          numericValues.creatinine = parseFloat(formData.creatinine);
          numericValues.urea = parseFloat(formData.urea);
          numericValues.egfr = parseFloat(formData.egfr);
          numericValues.hemoglobin = parseFloat(formData.hemoglobin);
          if (formData.age) numericValues.age = parseInt(formData.age);
        } else {
          for (const [k, v] of Object.entries(formData)) {
            const n = parseFloat(v);
            if (!isNaN(n)) numericValues[k] = n;
          }
        }
        await saveRecord({
          input_mode: prediction.input_mode,
          input_values: numericValues,
          risk_level: prediction.risk_level,
          confidence: prediction.confidence,
          health_score: prediction.health_score,
          explanation: prediction.explanation,
          contributing_factors: prediction.contributing_factors,
          user_id: userId || "",
        });
        // Notify other sections to refresh their data
        window.dispatchEvent(new CustomEvent("refresh-records"));
      } catch {
        // Silent fail — don't block the user from seeing their result
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setApiError(e.message || "Prediction failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setApiError("Only PDF and image files (PNG, JPG) are supported");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setApiError("File size must be less than 10MB");
      return;
    }

    setUploadedFile(file);
    setExtractionLoading(true);
    setApiError(null);

    try {
      const extracted = await extractMedicalReport(file);

      // Fill only the values that were extracted (ignore null values)
      const newFormData: Record<string, string> = {};
      if (extracted.creatinine !== null) newFormData.creatinine = extracted.creatinine.toString();
      if (extracted.urea !== null) newFormData.urea = extracted.urea.toString();
      if (extracted.egfr !== null) newFormData.egfr = extracted.egfr.toString();
      if (extracted.hemoglobin !== null) newFormData.hemoglobin = extracted.hemoglobin.toString();
      if (extracted.age !== undefined && extracted.age !== null) newFormData.age = extracted.age.toString();

      // Check if anything was extracted
      if (Object.keys(newFormData).length === 0) {
        setApiError(
          "No lab values found in the report. Please ensure it contains: Creatinine, Urea, eGFR, or Hemoglobin. You can also enter values manually."
        );
        setExtractionLoading(false);
        return;
      }

      setFormData(newFormData);

      // Show info about extracted values
      const extractedFields = Object.keys(newFormData);
      const missingFields = ["creatinine", "urea", "egfr", "hemoglobin"].filter(
        (f) => !extractedFields.includes(f)
      );
      if (missingFields.length > 0) {
        setApiError(
          `Extracted: ${extractedFields.join(", ")}. ${missingFields.length > 0 ? `Please enter: ${missingFields.join(", ")}` : ""
          }`
        );
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setApiError(e.message || "Failed to extract data from report. Please enter values manually.");
    } finally {
      setExtractionLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // If we have a result, show it
  if (result) {
    return <PredictionResult result={result} onReset={resetAll} />;
  }

  return (
    <div className="space-y-6">
      {/* ── Section header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-violet-500 shadow-lg shadow-sky-500/20">
            <svg className="h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m-9.5 3h10.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold theme-text">CKD Risk Analysis</h2>
            <p className="text-[11px] theme-text-muted">Enter biomarker values for prediction</p>
          </div>
        </div>

        {/* Progress pill */}
        <div className="hidden sm:flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  progress === 100
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                    : "bg-gradient-to-r from-sky-500 to-violet-400"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-medium tabular-nums theme-text-muted">
              {filled}/{total}
            </span>
          </div>
        </div>
      </div>

      {/* ── Mode selector cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const active = mode.id === selectedMode;
          const ac = accentClasses[mode.accent];
          return (
            <button
              key={mode.id}
              onClick={() => switchMode(mode.id)}
              className={cn(
                "group relative flex items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-300",
                active
                  ? cn(ac.activeBorder, ac.activeBg, "ring-1", ac.ring, "shadow-sm")
                  : "hover:scale-[1.01] theme-transition"
              )}
              style={!active ? { borderColor: 'var(--border-primary)', background: 'var(--bg-card)' } : undefined}
            >
              {/* Active indicator dot */}
              {active && (
                <div className={cn(
                  "absolute -top-px -right-px h-2.5 w-2.5 rounded-full border-2 animate-in fade-in duration-300",
                  ac.activeText.replace("text-", "bg-")
                )} style={{ borderColor: 'var(--bg-primary)' }} />
              )}

              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                active ? cn(ac.iconBg, ac.activeText) : "theme-text-dimmed"
              )} style={!active ? { background: 'var(--bg-elevated)' } : undefined}>
                {mode.icon}
              </div>
              <div className="min-w-0">
                <p className={cn(
                  "text-xs font-semibold transition-colors duration-200",
                  active ? "theme-text" : "theme-text-muted"
                )}>
                  {mode.label}
                </p>
                <p className="text-[10px] theme-text-faint truncate">{mode.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Form card ──────────────────────────────────────────────────── */}
      <GlassCard padding="lg">
        {/* Form header inside card */}
        <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border-primary)' }}>
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-md",
            accent.iconBg, accent.activeText
          )}>
            {currentMode.icon}
          </div>
          <span className="text-xs font-semibold theme-text">{currentMode.label}</span>
          <span className="text-[10px] theme-text-faint">— enter values below</span>
        </div>

        <div className="space-y-1">
          {selectedMode === "hospital" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
                <FormField label="Creatinine" name="creatinine" value={formData.creatinine || ""} onChange={updateField} unit="mg/dL" hint="Normal: 0.7–1.3" error={errors.creatinine} min={0.1} max={30} step={0.1} />
                <FormField label="Urea (BUN)" name="urea" value={formData.urea || ""} onChange={updateField} unit="mg/dL" hint="Normal: 7–20" error={errors.urea} min={1} max={300} step={0.1} />
                <FormField label="eGFR" name="egfr" value={formData.egfr || ""} onChange={updateField} unit="mL/min" hint="Normal: >60" error={errors.egfr} min={1} max={150} step={0.1} />
                <FormField label="Hemoglobin" name="hemoglobin" value={formData.hemoglobin || ""} onChange={updateField} unit="g/dL" hint="Normal: 12–17.5" error={errors.hemoglobin} min={2} max={25} step={0.1} />
              </div>

              {/* Optional age field with visual separator */}
              <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--border-primary)' }}>
                <div className="max-w-xs">
                  <FormField label="Age" name="age" value={formData.age || ""} onChange={updateField} unit="years" hint="Optional — refines prediction accuracy" error={errors.age} required={false} min={1} max={120} step={1} />
                </div>
              </div>
            </>
          )}

          {selectedMode === "urea" && (
            <div className="max-w-sm mx-auto">
              <FormField label="Urea (BUN)" name="urea" value={formData.urea || ""} onChange={updateField} unit="mg/dL" hint="Normal range: 7–20 mg/dL" error={errors.urea} min={1} max={300} step={0.1} />
            </div>
          )}

          {selectedMode === "medical-report" && (
            <div className="space-y-4">
              {/* File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative rounded-xl border-2 border-dashed transition-all ${isDragging
                    ? "border-emerald-500 bg-emerald-500/[0.15]"
                    : "border-emerald-500/30 bg-emerald-500/[0.03] hover:border-emerald-500/50 hover:bg-emerald-500/[0.06]"
                  } p-8`}
              >
                <label className="flex flex-col items-center gap-3 cursor-pointer">
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/jpg"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                    className="hidden"
                    disabled={extractionLoading}
                  />

                  {uploadedFile ? (
                    <>
                      <svg className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-emerald-400">File uploaded</p>
                        <p className="text-[10px] text-emerald-400/70 mt-1">{uploadedFile.name}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="h-8 w-8 text-emerald-500/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0116.5 19.5H6.75z" />
                      </svg>
                      <div className="text-center">
                        <p className="text-xs font-semibold theme-text">Upload medical report</p>
                        <p className="text-[10px] theme-text-muted mt-1">PDF or image (PNG, JPG) — Max 10MB</p>
                      </div>
                    </>
                  )}
                </label>
              </div>

              {/* Extracted Fields */}
              {extractionLoading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <svg className="h-4 w-4 animate-spin theme-text-muted" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="text-xs theme-text-muted">Extracting data from report...</span>
                </div>
              ) : uploadedFile && Object.keys(formData).length > 0 ? (
                <div className="space-y-1">
                  <div className="text-xs font-semibold theme-text mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Extracted values
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1">
                    <FormField label="Creatinine" name="creatinine" value={formData.creatinine || ""} onChange={updateField} unit="mg/dL" error={errors.creatinine} min={0.1} max={30} step={0.1} />
                    <FormField label="Urea (BUN)" name="urea" value={formData.urea || ""} onChange={updateField} unit="mg/dL" error={errors.urea} min={1} max={300} step={0.1} />
                    <FormField label="eGFR" name="egfr" value={formData.egfr || ""} onChange={updateField} unit="mL/min" error={errors.egfr} min={1} max={150} step={0.1} />
                    <FormField label="Hemoglobin" name="hemoglobin" value={formData.hemoglobin || ""} onChange={updateField} unit="g/dL" error={errors.hemoglobin} min={2} max={25} step={0.1} />
                  </div>

                  <div className="pt-3 mt-3" style={{ borderTop: '1px dashed var(--border-primary)' }}>
                    <div className="max-w-xs">
                      <FormField label="Age" name="age" value={formData.age || ""} onChange={updateField} unit="years" hint="Optional — refines prediction accuracy" error={errors.age} required={false} min={1} max={120} step={1} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Error banner */}
        {apiError && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/20 px-4 py-3 text-xs text-red-400 animate-in fade-in duration-200">
            <svg className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <div>
              <p className="font-medium">Analysis failed</p>
              <p className="mt-0.5 opacity-80">{apiError}</p>
            </div>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={validateAndSubmit}
          disabled={loading || (selectedMode === "medical-report" ? (!uploadedFile || filled < 4) : filled === 0)}
          className={cn(
            "group relative mt-6 w-full overflow-hidden rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-300",
            "bg-gradient-to-r from-sky-500 via-violet-500 to-violet-600",
            "shadow-lg shadow-violet-500/20",
            "hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.01]",
            "active:scale-[0.99]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
          )}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />

          <span className="relative flex items-center justify-center gap-2.5">
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing biomarkers...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M17.5 21.5h-11" />
                </svg>
                {selectedMode === "medical-report"
                  ? `Run CKD Analysis (${filled}/4 required)`
                  : "Run CKD Risk Analysis"}
              </>
            )}
          </span>
        </button>

        {/* Privacy note */}
        <p className="mt-3 text-center text-[10px] theme-text-faint">
          Your data is analyzed locally and stored securely. Results are saved to your health history.
        </p>
      </GlassCard>
    </div>
  );
}
