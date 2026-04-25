import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows, typography } from '../utils/theme';

export default function SectionCard({ title, subtitle, children, right }) {
  return (
    <View style={styles.card}>
      {title || right ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      ) : null}

      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius?.xl || 24,
    padding: spacing?.md || 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing?.md || 16,
    ...(shadows?.card || {}),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing?.sm || 12,
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  right: {
    marginLeft: 8,
  },
  title: {
    fontSize: typography?.h3 || 18,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 20,
    fontSize: typography?.small || 13,
  },
});