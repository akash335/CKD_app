import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import SectionCard from '../components/SectionCard';
import StatPill from '../components/StatPill';
import { listPatients } from '../services/patientService';
import { getLatestPrediction } from '../services/predictionService';
import { getAlerts } from '../services/alertService';
import { colors } from '../utils/theme';

export default function DoctorDashboardScreen() {
  const [patients, setPatients] = useState([]);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [alertsMap, setAlertsMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const roster = await listPatients();
      setPatients(roster);

      const predictionEntries = await Promise.all(
        roster.map(async (patient) => {
          try {
            return [patient.id, await getLatestPrediction(patient.id)];
          } catch {
            return [patient.id, null];
          }
        })
      );

      const alertEntries = await Promise.all(
        roster.map(async (patient) => {
          try {
            return [patient.id, await getAlerts(patient.id)];
          } catch {
            return [patient.id, []];
          }
        })
      );

      setPredictionsMap(Object.fromEntries(predictionEntries));
      setAlertsMap(Object.fromEntries(alertEntries));
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const predictions = Object.values(predictionsMap).filter(Boolean);
    const openAlerts = Object.values(alertsMap)
      .flat()
      .filter((item) => !item.is_resolved);

    return {
      patientCount: patients.length,
      highRisk: predictions.filter((p) => p.risk_level === 'High').length,
      moderateRisk: predictions.filter((p) => p.risk_level === 'Moderate').length,
      openAlerts: openAlerts.length,
    };
  }, [patients, predictionsMap, alertsMap]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <Text style={styles.kicker}>CKD Guardian</Text>
      <Text style={styles.title}>CKD Guardian Doctor Desk</Text>
      <Text style={styles.subtitle}>
        A doctor-facing view of monitored patients, open CKD risk signals, and
        ML-based follow-up priorities.
      </Text>

      <SectionCard
        title="Live monitoring summary"
        subtitle="Aggregated across all CKD patient records in the current backend"
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{summary.patientCount}</Text>
            <Text style={styles.summaryLabel}>Patients</Text>
          </View>

          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{summary.highRisk}</Text>
            <Text style={styles.summaryLabel}>High risk</Text>
          </View>

          <View style={styles.summaryTile}>
            <Text style={styles.summaryValue}>{summary.openAlerts}</Text>
            <Text style={styles.summaryLabel}>Open alerts</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard
        title="Patient roster"
        subtitle="Latest ML-based CKD interpretation for each monitored patient"
      >
        {patients.length === 0 ? (
          <Text style={styles.empty}>
            No patient records yet. Register a patient account and create a profile
            to populate the roster.
          </Text>
        ) : (
          patients.map((patient) => {
            const prediction = predictionsMap[patient.id];
            const openAlerts = (alertsMap[patient.id] || []).filter(
              (item) => !item.is_resolved
            ).length;

            const tone = !prediction
              ? 'neutral'
              : prediction.risk_level === 'High'
                ? 'danger'
                : prediction.risk_level === 'Moderate'
                  ? 'warning'
                  : 'success';

            return (
              <View key={patient.id} style={styles.patientCard}>
                <View style={styles.patientHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>Patient #{patient.id}</Text>
                    <Text style={styles.patientMeta}>
                      Age {patient.age ?? '--'} • {patient.sex || 'Unknown sex'} • Weight {patient.weight ?? '--'} kg
                    </Text>
                  </View>

                  <StatPill
                    label={prediction?.risk_level || 'No prediction'}
                    tone={tone}
                  />
                </View>

                <Text style={styles.patientSummary}>
                  {prediction
                    ? `Risk ${Math.round(prediction.risk_score)}% • Trend ${prediction.trend_status} • Confidence ${Math.round((prediction.model_confidence || 0) * 100)}%`
                    : 'Awaiting first CKD reading'}
                </Text>

                <Text style={styles.patientMeta}>Open alerts: {openAlerts}</Text>
              </View>
            );
          })
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  kicker: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: 6,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 21,
  },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryTile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  summaryLabel: {
    marginTop: 4,
    color: colors.muted,
  },
  patientCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  patientHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  patientMeta: {
    color: colors.muted,
    marginTop: 4,
  },
  patientSummary: {
    marginTop: 10,
    color: colors.text,
    lineHeight: 21,
  },
  empty: {
    color: colors.muted,
  },
});