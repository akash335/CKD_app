import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import RiskCard from '../components/RiskCard';
import TrendChart from '../components/TrendChart';
import SectionCard from '../components/SectionCard';

import {
  createPatientProfile,
  getMyPatientProfile,
} from '../services/patientService';
import {
  getLatestPrediction,
  getPredictions,
} from '../services/predictionService';
import { getLatestReading } from '../services/readingService';
import { getToken } from '../services/storage';
import { colors } from '../utils/theme';

export default function DashboardScreen({ navigation, onSessionExpired }) {
  const [patient, setPatient] = useState(null);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const bootstrap = async () => {
    setRefreshing(true);
    try {
      const token = await getToken();

      if (!token) {
        if (onSessionExpired) {
          await onSessionExpired();
        }
        return;
      }

      let profile;

      try {
        profile = await getMyPatientProfile();
      } catch (error) {
        const status = error?.response?.status;

        if (status === 404) {
          profile = await createPatientProfile({
            age: 35,
            sex: 'male',
            weight: 70,
            diabetes: false,
            hypertension: true,
            family_history: false,
          });
        } else if (status === 401) {
          if (onSessionExpired) {
            await onSessionExpired();
          }
          return;
        } else {
          throw error;
        }
      }

      setPatient(profile);

      try {
        const latestPred = await getLatestPrediction(profile.id);
        setLatestPrediction(latestPred);
      } catch {
        setLatestPrediction(null);
      }

      try {
        const predictionHistory = await getPredictions(profile.id);
        setPredictions(Array.isArray(predictionHistory) ? predictionHistory : []);
      } catch {
        setPredictions([]);
      }

      try {
        const latestRead = await getLatestReading(profile.id);
        setLatestReading(latestRead);
      } catch {
        setLatestReading(null);
      }
    } catch (error) {
      console.log('DASHBOARD ERROR:', error?.response?.data || error.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={bootstrap} />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.appName}>CKD Guardian</Text>
        <Text style={styles.title}>CKD Risk Overview</Text>
        <Text style={styles.subtitle}>
          ML-based CKD detection, renal risk monitoring, alerts, and doctor follow-up.
        </Text>
      </View>

      <RiskCard prediction={latestPrediction} />

      <SectionCard
        title="Latest kidney markers"
        subtitle="Most recent CKD-related lab and pressure values"
      >
        {latestReading ? (
          <View style={styles.metricGrid}>
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {latestReading.creatinine_value ?? '--'}
              </Text>
              <Text style={styles.metricLabel}>Creatinine</Text>
            </View>

            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {latestReading.acr ?? '--'}
              </Text>
              <Text style={styles.metricLabel}>Urine ACR</Text>
            </View>

            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {latestReading.egfr ?? '--'}
              </Text>
              <Text style={styles.metricLabel}>eGFR</Text>
            </View>

            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {latestReading.systolic_bp ?? '--'}/{latestReading.diastolic_bp ?? '--'}
              </Text>
              <Text style={styles.metricLabel}>Blood pressure</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.empty}>No kidney reading has been submitted yet.</Text>
        )}
      </SectionCard>

      <View style={styles.row}>
        <TouchableOpacity
          style={styles.actionPrimary}
          onPress={() =>
            navigation?.navigate('Readings', { patientId: patient?.id })
          }
        >
          <Text style={styles.actionPrimaryText}>Submit CKD Reading</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionSecondary}
          onPress={() =>
            navigation?.navigate('Alerts', { patientId: patient?.id })
          }
        >
          <Text style={styles.actionSecondaryText}>View CKD Alerts</Text>
        </TouchableOpacity>
      </View>

      <TrendChart predictions={predictions} />

      <SectionCard
        title="What CKD Guardian does"
        subtitle="Simple kidney-focused workflow"
      >
        <Text style={styles.pathItem}>
          1. Captures kidney-focused biomarker readings.
        </Text>
        <Text style={styles.pathItem}>
          2. Runs ML-based risk scoring for CKD severity and trend direction.
        </Text>
        <Text style={styles.pathItem}>
          3. Surfaces CKD warning flags for abnormal values.
        </Text>
        <Text style={styles.pathItem}>
          4. Prepares follow-up for doctor consultation and treatment planning.
        </Text>
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { marginBottom: 8 },
  appName: {
    color: colors.accent,
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
  subtitle: {
    color: colors.muted,
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 21,
  },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 14,
  },
  metricValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  metricLabel: { marginTop: 4, color: colors.muted },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 16,
  },
  actionPrimaryText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  actionSecondary: {
    flex: 1,
    backgroundColor: colors.softBlue,
    padding: 15,
    borderRadius: 16,
  },
  actionSecondaryText: {
    color: colors.accent,
    fontWeight: '700',
    textAlign: 'center',
  },
  pathItem: { color: colors.muted, lineHeight: 22, marginBottom: 8 },
  empty: { color: colors.muted },
});