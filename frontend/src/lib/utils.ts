import { RiskLevel, TrendDirection } from "@/types/patient";

/**
 * Merge Tailwind class names, filtering out falsy values.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Format an ISO timestamp into a human-readable relative time string.
 */
export function timeAgo(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Format an ISO date string into a readable date.
 */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Get design tokens for a given risk level.
 */
export function getRiskTheme(level: RiskLevel) {
  const themes = {
    low: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/20",
      gradient: "from-emerald-500 to-teal-400",
      dot: "bg-emerald-400",
      label: "Low Risk",
    },
    moderate: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/20",
      gradient: "from-amber-500 to-orange-400",
      dot: "bg-amber-400",
      label: "Moderate Risk",
    },
    high: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-400",
      glow: "shadow-orange-500/20",
      gradient: "from-orange-500 to-red-400",
      dot: "bg-orange-400",
      label: "High Risk",
    },
    critical: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      glow: "shadow-red-500/20",
      gradient: "from-red-500 to-rose-400",
      dot: "bg-red-400",
      label: "Critical",
    },
  };
  return themes[level];
}

/**
 * Get icon and color for a trend direction.
 */
export function getTrendInfo(trend: TrendDirection) {
  const info = {
    improving: { icon: "↑", color: "text-emerald-400", label: "Improving" },
    stable: { icon: "→", color: "text-slate-400", label: "Stable" },
    declining: { icon: "↓", color: "text-red-400", label: "Declining" },
  };
  return info[trend];
}

/**
 * Calculate the score color based on value (0–100).
 */
export function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function getScoreGradient(score: number): string {
  if (score >= 80) return "from-emerald-500 to-teal-400";
  if (score >= 60) return "from-amber-500 to-yellow-400";
  if (score >= 40) return "from-orange-500 to-amber-400";
  return "from-red-500 to-rose-400";
}
