import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, shadows, typography } from '../utils/theme';
import SectionCard from './SectionCard';
import StatPill from './StatPill';

export default function RiskCard({ prediction }) {
  if (!prediction) {
    return (
      <SectionCard
        title="Current CKD risk"
        subtitle="Your first reading will unlock ML-based CKD monitoring."
      >
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No prediction yet</Text>
          <Text style={styles.emptyText}>
            Submit your first CKD reading to generate a risk score, confidence level,
            and kidney trend summary.
          </Text>
        </View>
      </SectionCard>
    );
  }

  const tone =
    prediction.risk_level === 'High'
      ? 'danger'
      : prediction.risk_level === 'Moderate'
        ? 'warning'
        : 'success';

  return (
    <SectionCard
      title="Current CKD risk"
      subtitle="ML-based interpretation from kidney biomarkers, symptoms, and sensor readings"
      right={<StatPill label={prediction.risk_level} tone={tone} />}
    >
      <View style={styles.metricRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {Math.round(prediction.risk_score)}%
          </Text>
          <Text style={styles.metricLabel}>Risk score</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>
            {Math.round((prediction.model_confidence || 0) * 100)}%
          </Text>
          <Text style={styles.metricLabel}>Confidence</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricValue}>{prediction.trend_status}</Text>
          <Text style={styles.metricLabel}>Trend</Text>
        </View>
      </View>

      {prediction.explanation ? (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>ML prediction summary</Text>
          <Text style={styles.explainer}>{prediction.explanation}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt || colors.background,
    borderRadius: radius?.lg || 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...(shadows?.card || {}),
  },
  metricValue: {
    fontSize: typography?.h2 || 24,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    marginTop: 6,
    color: colors.muted,
    fontSize: typography?.small || 13,
  },
  summaryBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: radius?.lg || 18,
    backgroundColor: colors.primarySoft || '#DCEBFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    fontSize: typography?.body || 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  explainer: {
    color: colors.textSoft || colors.muted,
    lineHeight: 21,
    fontSize: typography?.small || 13,
  },
  emptyBox: {
    padding: 14,
    borderRadius: radius?.lg || 18,
    backgroundColor: colors.surfaceAlt || colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: typography?.h3 || 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyText: {
    color: colors.muted,
    lineHeight: 21,
    fontSize: typography?.small || 13,
  },
});