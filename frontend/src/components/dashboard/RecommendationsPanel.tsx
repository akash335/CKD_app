"use client";

import { RecommendationData } from "@/lib/api-client";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface RecommendationsPanelProps {
  recommendations: RecommendationData[];
}

const priorityBadge: Record<string, string> = {
  high: "bg-red-500/10 text-red-400 border-red-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

const categoryLabels: Record<string, string> = {
  diet: "Diet", hydration: "Hydration", monitoring: "Monitoring",
  lifestyle: "Lifestyle", medical: "Medical",
};

/**
 * Actionable recommendations panel — diet, hydration, monitoring,
 * lifestyle, and medical suggestions based on risk level and trends.
 */
export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (recommendations.length === 0) return null;

  const categories = [...new Set(recommendations.map((r) => r.category))];

  return (
    <GlassCard padding="md">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-500/10">
            <svg className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold theme-text">Recommendations</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
          {recommendations.length} suggestions
        </span>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const catRecs = recommendations.filter((r) => r.category === cat);
          return (
            <div key={cat}>
              <p className="text-[10px] font-medium uppercase tracking-wider theme-text-dimmed mb-2.5">
                {categoryLabels[cat] || cat}
              </p>
              <div className="space-y-2">
                {catRecs.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border px-4 py-3 transition-all duration-200"
                    style={{ borderColor: 'var(--border-primary)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0 mt-0.5">{rec.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="text-xs font-medium theme-text">{rec.title}</h4>
                          <span className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full border capitalize", priorityBadge[rec.priority] || priorityBadge.medium)}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-[11px] theme-text-muted leading-relaxed">{rec.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
