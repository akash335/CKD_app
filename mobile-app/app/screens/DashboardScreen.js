import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
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
import { useAppTheme } from '../utils/theme';

export default function DashboardScreen({ navigation, onSessionExpired }) {
  const { colors, radius, shadows } = useAppTheme();
  const styles = useMemo(
    () => createStyles(colors, radius, shadows),
    [colors, radius, shadows]
  );

  const [patient, setPatient] = useState(null);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [latestReading, setLatestReading] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const sectionAnim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

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

    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(heroAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(sectionAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(buttonAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      bootstrap();
    }, [])
  );

  const heroTranslateY = heroAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const sectionTranslateY = sectionAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const buttonTranslateY = buttonAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={bootstrap} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View
        style={[
          styles.heroShell,
          {
            opacity: heroAnim,
            transform: [{ translateY: heroTranslateY }],
          },
        ]}
      >
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />

        <Text style={styles.appName}>CKD Guardian</Text>
        <Text style={styles.title}>CKD Risk Overview</Text>
        <Text style={styles.subtitle}>
          ML-based CKD detection, renal risk monitoring, alerts, and doctor follow-up.
        </Text>

        <View style={styles.heroChipRow}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>
              {patient ? `Patient ID #${patient.id}` : 'Kidney monitoring'}
            </Text>
          </View>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>Live risk tracking</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={{
          opacity: sectionAnim,
          transform: [{ translateY: sectionTranslateY }],
        }}
      >
        <RiskCard prediction={latestPrediction} />
      </Animated.View>

      <Animated.View
        style={[
          styles.actionRow,
          {
            opacity: buttonAnim,
            transform: [{ translateY: buttonTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.actionPrimary}
          onPress={() =>
            navigation?.navigate('Readings', { patientId: patient?.id })
          }
          activeOpacity={0.9}
        >
          <Text style={styles.actionPrimaryTop}>🧪</Text>
          <Text style={styles.actionPrimaryText}>Submit CKD Reading</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionSecondary}
          onPress={() =>
            navigation?.navigate('Alerts', { patientId: patient?.id })
          }
          activeOpacity={0.9}
        >
          <Text style={styles.actionSecondaryTop}>⚠</Text>
          <Text style={styles.actionSecondaryText}>View CKD Alerts</Text>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        style={{
          opacity: sectionAnim,
          transform: [{ translateY: sectionTranslateY }],
        }}
      >
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
                  {latestReading.systolic_bp ?? '--'}/
                  {latestReading.diastolic_bp ?? '--'}
                </Text>
                <Text style={styles.metricLabel}>Blood pressure</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.empty}>No kidney reading has been submitted yet.</Text>
          )}
        </SectionCard>
      </Animated.View>

      <Animated.View
        style={{
          opacity: sectionAnim,
          transform: [{ translateY: sectionTranslateY }],
        }}
      >
        <TrendChart predictions={predictions} />
      </Animated.View>

      <Animated.View
        style={{
          opacity: sectionAnim,
          transform: [{ translateY: sectionTranslateY }],
        }}
      >
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
      </Animated.View>
    </ScrollView>
  );
}

function createStyles(colors, radius, shadows) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 16,
      paddingBottom: 36,
    },
    heroShell: {
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    heroGlowOne: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 999,
      backgroundColor: colors.glow,
      top: -35,
      right: -30,
    },
    heroGlowTwo: {
      position: 'absolute',
      width: 120,
      height: 120,
      borderRadius: 999,
      backgroundColor: colors.overlay,
      bottom: -24,
      left: -18,
    },
    appName: {
      color: colors.accent,
      fontWeight: '800',
      marginBottom: 8,
      letterSpacing: 0.4,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      color: colors.muted,
      marginTop: 10,
      lineHeight: 22,
      marginBottom: 16,
      maxWidth: '92%',
    },
    heroChipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    heroChip: {
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radius.pill,
    },
    heroChipText: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    actionPrimary: {
      flex: 1,
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 18,
      ...shadows.soft,
    },
    actionPrimaryTop: {
      fontSize: 20,
      marginBottom: 10,
    },
    actionPrimaryText: {
      color: '#fff',
      fontWeight: '800',
      textAlign: 'left',
      lineHeight: 20,
    },
    actionSecondary: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      padding: 16,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.soft,
    },
    actionSecondaryTop: {
      fontSize: 20,
      marginBottom: 10,
    },
    actionSecondaryText: {
      color: colors.accent,
      fontWeight: '800',
      textAlign: 'left',
      lineHeight: 20,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    metricTile: {
      width: '48%',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
    },
    metricLabel: {
      marginTop: 6,
      color: colors.muted,
    },
    pathItem: {
      color: colors.muted,
      lineHeight: 22,
      marginBottom: 8,
    },
    empty: {
      color: colors.muted,
    },
  });
}