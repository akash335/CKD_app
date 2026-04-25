import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getAlerts } from '../services/alertService';
import { getMyPatientProfile } from '../services/patientService';
import AlertCard from '../components/AlertCard';
import { colors } from '../utils/theme';

export default function AlertsScreen({ route }) {
  const [patientId, setPatientId] = useState(route?.params?.patientId || null);
  const [alerts, setAlerts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      let resolvedPatientId = patientId;

      if (!resolvedPatientId) {
        const patient = await getMyPatientProfile();
        resolvedPatientId = patient.id;
        setPatientId(patient.id);
      }

      const data = await getAlerts(resolvedPatientId);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('ALERTS LOAD ERROR:', error?.response?.data || error.message);
      setAlerts([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [patientId])
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
    >
      <Text style={styles.kicker}>CKD Guardian</Text>
      <Text style={styles.title}>CKD Alerts</Text>
      <Text style={styles.subtitle}>
        Critical CKD warnings, abnormal kidney markers, and doctor-review flags appear here.
      </Text>

      {alerts.length === 0 ? (
        <Text style={styles.empty}>
          No CKD alerts are currently open for this patient profile.
        </Text>
      ) : (
        alerts.map((item) => <AlertCard key={item.id} alert={item} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  kicker: { color: colors.accent, fontWeight: '800' },
  title: { fontSize: 30, fontWeight: '800', color: colors.text, marginTop: 6 },
  subtitle: { color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 21 },
  empty: { color: colors.muted },
});