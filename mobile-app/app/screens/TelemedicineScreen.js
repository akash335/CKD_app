import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SectionCard from '../components/SectionCard';
import { getUser } from '../services/storage';
import { getMyPatientProfile, listPatients } from '../services/patientService';
import {
  createTeleconsultation,
  getTeleconsultationsForDoctor,
  getTeleconsultationsForPatient,
} from '../services/telemedicineService';
import { colors } from '../utils/theme';

export default function TelemedicineScreen() {
  const [items, setItems] = useState([]);
  const [role, setRole] = useState('patient');
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    patient_id: '',
    consult_date: '',
    consult_time: '',
    meeting_link: '',
    summary: '',
    doctor_advice: '',
    prescription_note: '',
    patient_instruction: '',
  });

  const buildIsoDateTime = (dateValue, timeValue) => {
    if (!dateValue || !timeValue) return null;

    const cleanDate = dateValue.trim().replace(/\//g, '-');
    const cleanTime = timeValue.trim().toLowerCase();

    let year, month, day;
    const dateParts = cleanDate.split('-').map((x) => x.trim());

    if (dateParts.length !== 3) return null;

    if (dateParts[0].length === 4) {
      year = dateParts[0];
      month = dateParts[1];
      day = dateParts[2];
    } else {
      day = dateParts[0];
      month = dateParts[1];
      year = dateParts[2];
    }

    if (!year || !month || !day) return null;

    day = String(day).padStart(2, '0');
    month = String(month).padStart(2, '0');

    let hours = 0;
    let minutes = 0;

    const timeMatch = cleanTime.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!timeMatch) return null;

    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2] || '0', 10);
    const meridian = timeMatch[3];

    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (minutes < 0 || minutes > 59) return null;

    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    if (hours < 0 || hours > 23) return null;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');

    return `${year}-${month}-${day}T${hh}:${mm}:00`;
  };

  const getPatientDisplayName = (patient) => {
    return (
      patient?.name ||
      patient?.user_name ||
      patient?.patient_name ||
      patient?.full_name ||
      `Patient #${patient?.id}`
    );
  };

  const load = async () => {
    setRefreshing(true);
    try {
      const savedUser = await getUser();
      setUser(savedUser);
      setRole(savedUser?.role || 'patient');

      if (savedUser?.role === 'doctor') {
        const [consultations, roster] = await Promise.all([
          getTeleconsultationsForDoctor(savedUser.id),
          listPatients(),
        ]);
        setItems(Array.isArray(consultations) ? consultations : []);
        setPatients(Array.isArray(roster) ? roster : []);
      } else {
        const patient = await getMyPatientProfile();
        const consultations = await getTeleconsultationsForPatient(patient.id);
        setItems(Array.isArray(consultations) ? consultations : []);
      }
    } catch (error) {
      console.log(
        'CKD CONSULT LOAD ERROR:',
        error?.response?.data || error.message
      );
      setItems([]);
      setPatients([]);
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
    }, [])
  );

  const scheduleConsultation = async () => {
    try {
      if (!form.patient_id || !form.consult_date || !form.consult_time) {
        Alert.alert(
          'Missing details',
          'Choose a patient, consult date, and consult time.'
        );
        return;
      }

      const appointment_time = buildIsoDateTime(
        form.consult_date,
        form.consult_time
      );

      if (!appointment_time) {
        Alert.alert(
          'Invalid date or time',
          'Enter date like 25-04-2026 and time like 7:00pm or 17:00.'
        );
        return;
      }

      await createTeleconsultation({
        patient_id: Number(form.patient_id),
        doctor_id: user.id,
        appointment_time,
        meeting_link: form.meeting_link || null,
        summary: form.summary || null,
        doctor_advice: form.doctor_advice || null,
        prescription_note: form.prescription_note || null,
        patient_instruction: form.patient_instruction || null,
        status: 'scheduled',
      });

      Alert.alert('Scheduled', 'CKD consultation created successfully.');

      setForm({
        patient_id: '',
        consult_date: '',
        consult_time: '',
        meeting_link: '',
        summary: '',
        doctor_advice: '',
        prescription_note: '',
        patient_instruction: '',
      });

      load();
    } catch (error) {
      Alert.alert(
        'Unable to schedule consultation',
        JSON.stringify(error?.response?.data || error.message)
      );
    }
  };

  const renderHealthOverview = (item) => (
    <View style={styles.overviewBox}>
      <Text style={styles.overviewTitle}>CKD / Health Overview</Text>

      <View style={styles.metricGrid}>
        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.latest_risk_score != null ? item.latest_risk_score : '--'}
          </Text>
          <Text style={styles.metricLabel}>Risk score</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.latest_risk_level || '--'}
          </Text>
          <Text style={styles.metricLabel}>Risk level</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.trend_status || '--'}
          </Text>
          <Text style={styles.metricLabel}>Trend</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.latest_creatinine ?? '--'}
          </Text>
          <Text style={styles.metricLabel}>Creatinine</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.latest_acr ?? '--'}
          </Text>
          <Text style={styles.metricLabel}>Urine ACR</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.latest_egfr ?? '--'}
          </Text>
          <Text style={styles.metricLabel}>eGFR</Text>
        </View>

        <View style={styles.metricTile}>
          <Text style={styles.metricValue}>
            {item.latest_systolic_bp ?? '--'}/{item.latest_diastolic_bp ?? '--'}
          </Text>
          <Text style={styles.metricLabel}>Blood pressure</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
    >
      <Text style={styles.kicker}>CKD Guardian</Text>
      <Text style={styles.title}>Consultation History</Text>
      <Text style={styles.subtitle}>
        {role === 'doctor'
          ? `Dr. ${user?.name || 'Doctor'}, review consultation history, patient names, and kidney health overview.`
          : `${user?.name || 'Patient'}, view your past consultations, doctor notes, and CKD overview.`}
      </Text>

      {role === 'doctor' ? (
        <SectionCard
          title="Schedule doctor review"
          subtitle="Choose patient, date, time, and consultation details"
        >
          <Text style={styles.label}>Patient</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.patientScroll}
          >
            {patients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={[
                  styles.choice,
                  String(patient.id) === String(form.patient_id) &&
                  styles.choiceActive,
                ]}
                onPress={() =>
                  setForm((prev) => ({
                    ...prev,
                    patient_id: String(patient.id),
                  }))
                }
              >
                <Text
                  style={[
                    styles.choiceText,
                    String(patient.id) === String(form.patient_id) &&
                    styles.choiceTextActive,
                  ]}
                >
                  {getPatientDisplayName(patient)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Consult date</Text>
          <TextInput
            style={styles.input}
            placeholder="25-04-2026"
            value={form.consult_date}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, consult_date: value }))
            }
          />

          <Text style={styles.label}>Consult time</Text>
          <TextInput
            style={styles.input}
            placeholder="7:00pm"
            value={form.consult_time}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, consult_time: value }))
            }
          />

          <Text style={styles.label}>Meeting link</Text>
          <TextInput
            style={styles.input}
            placeholder="https://meet.google.com/..."
            value={form.meeting_link}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, meeting_link: value }))
            }
          />

          <Text style={styles.label}>Consultation summary</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Review CKD risk trend, kidney markers, and next treatment steps"
            value={form.summary}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, summary: value }))
            }
          />

          <Text style={styles.label}>Doctor advice</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Advise hydration, BP monitoring, renal diet, and repeat tests"
            value={form.doctor_advice}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, doctor_advice: value }))
            }
          />

          <Text style={styles.label}>Prescription note</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="Add prescribed medicines or emergency medication note"
            value={form.prescription_note}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, prescription_note: value }))
            }
          />

          <Text style={styles.label}>Patient instruction</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            multiline
            placeholder="What patient should do before consultation"
            value={form.patient_instruction}
            onChangeText={(value) =>
              setForm((prev) => ({ ...prev, patient_instruction: value }))
            }
          />

          <TouchableOpacity style={styles.button} onPress={scheduleConsultation}>
            <Text style={styles.buttonText}>Schedule CKD Consultation</Text>
          </TouchableOpacity>
        </SectionCard>
      ) : null}

      <SectionCard
        title={role === 'doctor' ? 'All consultation history' : 'Your consultation history'}
        subtitle={
          role === 'doctor'
            ? 'View all consultations with patient names and CKD overview'
            : 'View your doctor follow-up history and disease overview'
        }
      >
        {items.length === 0 ? (
          <Text style={styles.body}>
            No CKD consultations are currently scheduled.
          </Text>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {role === 'doctor'
                      ? item.patient_name || `Patient #${item.patient_id}`
                      : item.doctor_name || `Doctor #${item.doctor_id}`}
                  </Text>
                  <Text style={styles.itemSub}>
                    {role === 'doctor'
                      ? `Doctor: ${item.doctor_name || 'Unknown doctor'}`
                      : `Patient: ${item.patient_name || 'Unknown patient'}`}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    item.needs_immediate_attention && styles.statusPillUrgent,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      item.needs_immediate_attention && styles.statusPillTextUrgent,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.body}>
                Time: {new Date(item.appointment_time).toLocaleString()}
              </Text>
              <Text style={styles.body}>Urgency: {item.urgency}</Text>

              {renderHealthOverview(item)}

              {item.meeting_link ? (
                <>
                  <Text style={styles.subhead}>Meeting link</Text>
                  <Text style={styles.link}>{item.meeting_link}</Text>
                </>
              ) : null}

              {item.summary ? (
                <>
                  <Text style={styles.subhead}>Consultation summary</Text>
                  <Text style={styles.body}>{item.summary}</Text>
                </>
              ) : null}

              {item.doctor_advice ? (
                <>
                  <Text style={styles.subhead}>Doctor advice</Text>
                  <Text style={styles.body}>{item.doctor_advice}</Text>
                </>
              ) : null}

              {item.prescription_note ? (
                <>
                  <Text style={styles.subhead}>Prescription note</Text>
                  <Text style={styles.body}>{item.prescription_note}</Text>
                </>
              ) : null}

              {item.patient_instruction ? (
                <>
                  <Text style={styles.subhead}>Patient instruction</Text>
                  <Text style={styles.body}>{item.patient_instruction}</Text>
                </>
              ) : null}
            </View>
          ))
        )}
      </SectionCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  patientScroll: {
    marginBottom: 12,
  },
  label: {
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: colors.text,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  choice: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.softBlue,
    marginRight: 8,
  },
  choiceActive: {
    backgroundColor: colors.primary,
  },
  choiceText: {
    color: colors.accent,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: '#fff',
  },
  itemCard: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  itemSub: {
    color: colors.muted,
    fontSize: 13,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.softBlue,
  },
  statusPillUrgent: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusPillTextUrgent: {
    color: '#B91C1C',
  },
  overviewBox: {
    backgroundColor: colors.softBlue,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  overviewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricTile: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    marginTop: 4,
    color: colors.muted,
    fontSize: 12,
  },
  subhead: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  body: {
    color: colors.muted,
    lineHeight: 22,
    marginBottom: 8,
  },
  link: {
    color: colors.accent,
    marginBottom: 8,
  },
});