import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import SectionCard from '../components/SectionCard';
import StatPill from '../components/StatPill';
import {
  archiveRecentPatientOverview,
  listPastOverviewPatients,
  listRecentOverviewPatients,
} from '../services/patientService';
import { getLatestPrediction } from '../services/predictionService';
import { getAlerts } from '../services/alertService';
import { colors } from '../utils/theme';

export default function DoctorDashboardScreen() {
  const [mode, setMode] = useState('recent');
  const [patients, setPatients] = useState([]);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [alertsMap, setAlertsMap] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = async (selectedMode = mode) => {
    setRefreshing(true);

    try {
      const roster =
        selectedMode === 'past'
          ? await listPastOverviewPatients()
          : await listRecentOverviewPatients();

      const safeRoster = Array.isArray(roster) ? roster : [];
      setPatients(safeRoster);

      const predictionEntries = await Promise.all(
        safeRoster.map(async (patient) => {
          try {
            return [patient.id, await getLatestPrediction(patient.id)];
          } catch {
            return [patient.id, null];
          }
        })
      );

      const alertEntries = await Promise.all(
        safeRoster.map(async (patient) => {
          try {
            return [patient.id, await getAlerts(patient.id)];
          } catch {
            return [patient.id, []];
          }
        })
      );

      setPredictionsMap(Object.fromEntries(predictionEntries));
      setAlertsMap(Object.fromEntries(alertEntries));
    } catch (e) {
      Alert.alert(
        'Unable to load dashboard',
        e?.response?.data?.detail || JSON.stringify(e?.response?.data || e.message)
      );
    } finally {
      setRefreshing(false);
    }
  };

  const switchMode = async (nextMode) => {
    setMode(nextMode);
    await load(nextMode);
  };

  const clearRecentOverview = async () => {
    try {
      const confirmed =
        typeof globalThis !== 'undefined' && typeof globalThis.confirm === 'function'
          ? globalThis.confirm('Move recent patient overview to Past?')
          : true;

      if (!confirmed) return;

      setClearing(true);

      const response = await archiveRecentPatientOverview();

      Alert.alert(
        'Moved to Past',
        `Recent patient overview moved to Past. Archived: ${response?.archived ?? 0}`
      );

      await load('recent');
    } catch (e) {
      Alert.alert(
        'Unable to clear overview',
        e?.response?.data?.detail || JSON.stringify(e?.response?.data || e.message)
      );
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    load('recent');
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
      contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(mode)} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>CKD Guardian</Text>
          <Text style={styles.title}>CKD Guardian Doctor Desk</Text>
        </View>

        {mode === 'recent' ? (
          <TouchableOpacity
            style={[styles.clearButton, clearing && styles.clearButtonDisabled]}
            onPress={clearRecentOverview}
            disabled={clearing}
          >
            <Text style={styles.clearButtonText}>
              {clearing ? 'Clearing...' : 'Clear recent overview'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.subtitle}>
        View recent patient overview, or open Past to review cleared patient overview data.
      </Text>

      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segmentButton, mode === 'recent' && styles.segmentButtonActive]}
          onPress={() => switchMode('recent')}
        >
          <Text style={[styles.segmentText, mode === 'recent' && styles.segmentTextActive]}>
            Recent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentButton, mode === 'past' && styles.segmentButtonActive]}
          onPress={() => switchMode('past')}
        >
          <Text style={[styles.segmentText, mode === 'past' && styles.segmentTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      <SectionCard
        title={mode === 'past' ? 'Past overview summary' : 'Live monitoring summary'}
        subtitle={
          mode === 'past'
            ? 'Patient overview data moved from Recent appears here.'
            : 'Aggregated across recent CKD patient records.'
        }
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
        title={mode === 'past' ? 'Past patient overview' : 'Recent patient roster'}
        subtitle={
          mode === 'past'
            ? 'Cleared patient overview records are still visible here.'
            : 'Latest ML-based CKD interpretation for each recent patient.'
        }
      >
        {patients.length === 0 ? (
          <Text style={styles.empty}>
            {mode === 'past'
              ? 'No past patient overview yet.'
              : 'No recent patient records yet.'}
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

            const patientName =
              patient.user_name ||
              patient.name ||
              patient.patient_name ||
              `Patient #${patient.id}`;

            return (
              <View key={patient.id} style={styles.patientCard}>
                <View style={styles.patientHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <Text style={styles.patientMeta}>
                      {[
                        patient.age ? `Age ${patient.age}` : null,
                        patient.sex ? patient.sex : null,
                        patient.weight ? `Weight ${patient.weight} kg` : null,
                      ]
                        .filter(Boolean)
                        .join(' • ') || 'Patient profile details not added yet'}
                    </Text>

                    {mode === 'past' && patient.overview_archived_at ? (
                      <Text style={styles.archivedText}>
                        Moved to Past: {new Date(patient.overview_archived_at).toLocaleString()}
                      </Text>
                    ) : null}
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

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  kicker: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
  },

  subtitle: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 21,
  },

  clearButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 4,
  },

  clearButtonDisabled: {
    opacity: 0.6,
  },

  clearButtonText: {
    color: '#B91C1C',
    fontWeight: '900',
    fontSize: 13,
  },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: '#EAF1FF',
    borderRadius: 999,
    padding: 5,
    marginBottom: 16,
    gap: 6,
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: 'center',
  },

  segmentButtonActive: {
    backgroundColor: '#2563EB',
  },

  segmentText: {
    color: '#64748B',
    fontWeight: '900',
  },

  segmentTextActive: {
    color: '#FFFFFF',
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

  archivedText: {
    color: '#2563EB',
    marginTop: 5,
    fontWeight: '800',
    fontSize: 12,
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