import React from 'react';
import { Dimensions, ScrollView, Text, View, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import SectionCard from './SectionCard';
import { colors, radius, typography } from '../utils/theme';

const width = Dimensions.get('window').width - 64;

export default function TrendChart({ predictions }) {
  if (!predictions?.length) {
    return (
      <SectionCard
        title="Trend overview"
        subtitle="ML-based CKD risk trend over time"
      >
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No trend data yet</Text>
          <Text style={styles.emptyText}>
            Trend data will appear after multiple CKD readings are recorded.
          </Text>
        </View>
      </SectionCard>
    );
  }

  const series = [...predictions].reverse().slice(-6);
  const labels = series.map((_, index) => `R${index + 1}`);
  const data = series.map((item) => Math.round(item.risk_score));

  return (
    <SectionCard
      title="Trend overview"
      subtitle="Recent CKD risk progression across submitted readings"
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={{ labels, datasets: [{ data }] }}
          width={Math.max(width, labels.length * 72)}
          height={220}
          yAxisSuffix="%"
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surface,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: colors.accentDark || '#1D4ED8',
            },
            propsForBackgroundLines: {
              stroke: '#E2E8F0',
            },
            fillShadowGradient: colors.accent,
            fillShadowGradientOpacity: 0.08,
          }}
          bezier
          style={styles.chart}
        />
      </ScrollView>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  chart: {
    borderRadius: radius?.lg || 18,
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