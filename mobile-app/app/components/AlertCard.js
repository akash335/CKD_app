import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';
import StatPill from './StatPill';

export default function AlertCard({ alert }) {
  if (!alert) return null;

  const severity = (alert.severity || 'info').toLowerCase();

  const tone =
    severity === 'high'
      ? 'danger'
      : severity === 'medium'
        ? 'warning'
        : severity === 'low'
          ? 'success'
          : 'neutral';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {alert.alert_type ? String(alert.alert_type).replace(/_/g, ' ') : 'Clinical alert'}
        </Text>
        <StatPill
          label={(alert.severity || 'info').toUpperCase()}
          tone={tone}
        />
      </View>

      <Text style={styles.message}>
        {alert.message || 'No alert message available.'}
      </Text>

      <Text style={styles.meta}>
        {alert.is_resolved ? 'Resolved' : 'Open'} • Patient ID {alert.patient_id}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'capitalize',
  },
  message: {
    marginTop: 10,
    color: colors.muted,
    lineHeight: 20,
  },
  meta: {
    marginTop: 10,
    color: colors.muted,
    fontSize: 12,
  },
});