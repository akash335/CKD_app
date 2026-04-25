import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

export default function StatPill({ label, tone = 'neutral' }) {
  const toneStyles = {
    neutral: { backgroundColor: '#EEF2FF', color: colors.accent },
    success: { backgroundColor: colors.successBg, color: colors.success },
    warning: { backgroundColor: colors.warningBg, color: colors.warning },
    danger: { backgroundColor: colors.dangerBg, color: colors.danger },
  }[tone] || { backgroundColor: '#EEF2FF', color: colors.accent };

  return (
    <Text
      style={[
        styles.pill,
        {
          color: toneStyles.color,
          backgroundColor: toneStyles.backgroundColor,
        },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
});