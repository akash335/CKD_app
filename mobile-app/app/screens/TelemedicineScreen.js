import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getUser } from '../services/storage';
import {
  getMyPatientProfile,
  listPatients,
} from '../services/patientService';
import {
  createTeleconsultation,
  getTeleconsultationsForPatient,
} from '../services/telemedicineService';
import { colors } from '../utils/theme';

export default function TelemedicineScreen() {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientConsultations, setPatientConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    patient_id: '',
    consult_date: '',
    consult_time: '',
    meeting_link: '',
    doctor_advice: '',
    prescription_note: '',
    patient_instruction: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setRefreshing(true);

      const savedUser = await getUser();
      setUser(savedUser);

      if (savedUser?.role === 'doctor') {
        const rows = await listPatients();

        const unique = [];
        const seen = new Set();

        (rows || []).forEach((patient) => {
          const key = patient.user_id || patient.id;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(patient);
          }
        });

        setPatients(unique);
      } else {
        const patientProfile = await getMyPatientProfile();
        const rows = await getTeleconsultationsForPatient(patientProfile.id);
        setPatientConsultations(Array.isArray(rows) ? rows : []);
      }
    } catch (e) {
      console.log('CONSULT LOAD ERROR:', e?.response?.data || e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const selectedPatient = useMemo(() => {
    return patients.find((p) => String(p.id) === String(form.patient_id));
  }, [patients, form.patient_id]);

  const selectedPatientName =
    selectedPatient?.user_name ||
    selectedPatient?.name ||
    selectedPatient?.patient_name ||
    'Patient';

  const latestPatientConsultation = useMemo(() => {
    if (!patientConsultations.length) return null;

    return [...patientConsultations].sort((a, b) => {
      return new Date(b.appointment_time) - new Date(a.appointment_time);
    })[0];
  }, [patientConsultations]);

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildAppointmentDateTime = () => {
    if (!form.consult_date || !form.consult_time) return null;

    const dateText = form.consult_date.trim().toLowerCase();
    const timeText = form.consult_time.trim().toLowerCase();

    let year;
    let month;
    let day;

    const monthMap = {
      jan: 1,
      january: 1,
      feb: 2,
      february: 2,
      mar: 3,
      march: 3,
      apr: 4,
      april: 4,
      may: 5,
      jun: 6,
      june: 6,
      jul: 7,
      july: 7,
      aug: 8,
      august: 8,
      sep: 9,
      sept: 9,
      september: 9,
      oct: 10,
      october: 10,
      nov: 11,
      november: 11,
      dec: 12,
      december: 12,
    };

    const cleanedDate = dateText
      .replace(/,/g, ' ')
      .replace(/\//g, '-')
      .replace(/\./g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    const dateParts = cleanedDate.includes('-')
      ? cleanedDate.split('-').map((x) => x.trim())
      : cleanedDate.split(' ').map((x) => x.trim());

    if (dateParts.length !== 3) return null;

    const hasMonthName = dateParts.some((part) => monthMap[part]);

    if (hasMonthName) {
      if (monthMap[dateParts[0]]) {
        month = monthMap[dateParts[0]];
        day = parseInt(dateParts[1], 10);
        year = parseInt(dateParts[2], 10);
      } else if (monthMap[dateParts[1]]) {
        day = parseInt(dateParts[0], 10);
        month = monthMap[dateParts[1]];
        year = parseInt(dateParts[2], 10);
      } else {
        return null;
      }
    } else {
      const a = parseInt(dateParts[0], 10);
      const b = parseInt(dateParts[1], 10);
      const c = parseInt(dateParts[2], 10);

      if ([a, b, c].some(Number.isNaN)) return null;

      if (String(dateParts[0]).length === 4) {
        year = a;
        month = b;
        day = c;
      } else if (String(dateParts[2]).length === 4) {
        day = a;
        month = b;
        year = c;
      } else {
        return null;
      }
    }

    if (!year || !month || !day) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const cleanedTime = timeText
      .replace(/\./g, ':')
      .replace(/\s+/g, '')
      .trim();

    const timeMatch = cleanedTime.match(/^(\d{1,2})(?::(\d{1,2}))?(am|pm)?$/);
    if (!timeMatch) return null;

    let hour = parseInt(timeMatch[1], 10);
    const minute = parseInt(timeMatch[2] || '0', 10);
    const meridian = timeMatch[3];

    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    if (minute < 0 || minute > 59) return null;

    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;

    if (hour < 0 || hour > 23) return null;

    const localDate = new Date(year, month - 1, day, hour, minute, 0);

    const yyyy = String(localDate.getFullYear()).padStart(4, '0');
    const mm = String(localDate.getMonth() + 1).padStart(2, '0');
    const dd = String(localDate.getDate()).padStart(2, '0');
    const hh = String(localDate.getHours()).padStart(2, '0');
    const min = String(localDate.getMinutes()).padStart(2, '0');

    const offsetMinutes = -localDate.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absOffset = Math.abs(offsetMinutes);
    const offsetHour = String(Math.floor(absOffset / 60)).padStart(2, '0');
    const offsetMin = String(absOffset % 60).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}T${hh}:${min}:00${sign}${offsetHour}:${offsetMin}`;
  };

  const scheduleConsultation = async () => {
    try {
      if (!form.patient_id) {
        Alert.alert('Select patient', 'Please select a patient first.');
        return;
      }

      if (!form.consult_date || !form.consult_time) {
        Alert.alert('Missing time', 'Please enter consultation date and time.');
        return;
      }

      const appointment_time = buildAppointmentDateTime();

      if (!appointment_time) {
        Alert.alert(
          'Invalid date or time',
          'You can enter dates like 2026-04-26, 26-04-2026, 26 Apr 2026, or Apr 26 2026. Time can be 17:00, 5pm, 5:00pm, or 5.30pm.'
        );
        return;
      }

      setLoading(true);

      await createTeleconsultation({
        patient_id: Number(form.patient_id),
        doctor_id: user.id,
        appointment_time,
        meeting_link: form.meeting_link || null,
        summary: form.doctor_advice || null,
        doctor_advice: form.doctor_advice || null,
        prescription_note: form.prescription_note || null,
        patient_instruction: form.patient_instruction || null,
        status: 'scheduled',
        urgency: 'routine',
        needs_immediate_attention: false,
      });

      Alert.alert('Success', 'Consultation scheduled and email sent.');

      setForm({
        patient_id: '',
        consult_date: '',
        consult_time: '',
        meeting_link: '',
        doctor_advice: '',
        prescription_note: '',
        patient_instruction: '',
      });
    } catch (e) {
      Alert.alert(
        'Unable to schedule',
        e?.response?.data?.detail ||
        JSON.stringify(e?.response?.data || e.message)
      );
    } finally {
      setLoading(false);
    }
  };

  const openMeetingLink = async (url) => {
    if (!url) return;

    try {
      const finalUrl =
        url.startsWith('http://') || url.startsWith('https://')
          ? url
          : `https://${url}`;

      await Linking.openURL(finalUrl);
    } catch {
      Alert.alert('Unable to open meeting link');
    }
  };

  const renderPatientConsultation = () => {
    if (!latestPatientConsultation) {
      return (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.patientEmptyContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={load} />
          }
        >
          <View style={styles.centerCard}>
            <Text style={styles.emptyTitle}>Consultation</Text>
            <Text style={styles.emptyText}>
              No consultation has been scheduled yet. Pull down to refresh after your doctor schedules one.
            </Text>
          </View>
        </ScrollView>
      );
    }

    const item = latestPatientConsultation;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
      >
        <Text style={styles.pageTitle}>Your Consultation</Text>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>CKD Guardian</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Consultation Scheduled</Text>

            <Text style={styles.paragraph}>
              Hello <Text style={styles.bold}>{user?.name || item.patient_name || 'Patient'}</Text>,
            </Text>

            <Text style={styles.paragraph}>
              Your CKD consultation has been scheduled.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>
                <Text style={styles.infoLineBold}>Appointment time: </Text>
                {new Date(item.appointment_time).toLocaleString()}
              </Text>

              <Text style={styles.infoLine}>
                <Text style={styles.infoLineBold}>Doctor: </Text>
                {item.doctor_name || 'Doctor'}
              </Text>

              <Text style={styles.infoLine}>
                <Text style={styles.infoLineBold}>Meeting link: </Text>
                {item.meeting_link || 'Will be shared soon'}
              </Text>
            </View>

            {item.meeting_link ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => openMeetingLink(item.meeting_link)}
              >
                <Text style={styles.secondaryButtonText}>Open Meeting Link</Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.noteTitle}>Doctor Advice</Text>
            <Text style={styles.patientText}>
              {item.doctor_advice || item.summary || 'No advice added yet.'}
            </Text>

            <Text style={styles.noteTitle}>Prescription Note</Text>
            <Text style={styles.patientText}>
              {item.prescription_note || 'No prescription note added yet.'}
            </Text>

            <Text style={styles.noteTitle}>What you should do now</Text>
            <Text style={styles.patientText}>
              {item.patient_instruction || 'Please check the app for updates.'}
            </Text>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Important: If you cannot attend immediately, follow the prescribed medication advice from your doctor.
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.footerText}>© CKD Guardian • Stay Healthy</Text>
          </View>
        </View>
      </ScrollView>
    );
  };

  if (user?.role !== 'doctor') {
    return renderPatientConsultation();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={load} />
      }
    >
      <Text style={styles.pageTitle}>Schedule Consultation</Text>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderText}>CKD Guardian</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Consultation Scheduled</Text>

          <Text style={styles.paragraph}>
            Hello <Text style={styles.bold}>{selectedPatientName}</Text>,
          </Text>

          <Text style={styles.paragraph}>
            Your CKD consultation has been scheduled.
          </Text>

          <Text style={styles.label}>Select Patient</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.patientRow}
          >
            {patients.map((patient) => {
              const name =
                patient.user_name ||
                patient.name ||
                patient.patient_name ||
                `Patient ${patient.id}`;

              const active = String(form.patient_id) === String(patient.id);

              return (
                <TouchableOpacity
                  key={patient.id}
                  style={[styles.patientChip, active && styles.patientChipActive]}
                  onPress={() => setField('patient_id', patient.id)}
                >
                  <Text
                    style={[
                      styles.patientChipText,
                      active && styles.patientChipTextActive,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Appointment time</Text>

            <View style={styles.row}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Date: 2026-04-26 / 26 Apr 2026"
                placeholderTextColor="#6B7280"
                value={form.consult_date}
                onChangeText={(v) => setField('consult_date', v)}
              />

              <TextInput
                style={[styles.input, styles.halfInput]}
                placeholder="Time: 17:00 / 5pm / 5.30pm"
                placeholderTextColor="#6B7280"
                value={form.consult_time}
                onChangeText={(v) => setField('consult_time', v)}
              />
            </View>

            <Text style={styles.infoLabel}>Meeting link</Text>

            <TextInput
              style={styles.input}
              placeholder="https://meet.google.com/..."
              placeholderTextColor="#6B7280"
              value={form.meeting_link}
              onChangeText={(v) => setField('meeting_link', v)}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.noteTitle}>Doctor Advice</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Example: Please attend the consultation and monitor BP regularly."
            placeholderTextColor="#6B7280"
            multiline
            value={form.doctor_advice}
            onChangeText={(v) => setField('doctor_advice', v)}
          />

          <Text style={styles.noteTitle}>Prescription Note</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Example: Take the prescribed medicines as advised."
            placeholderTextColor="#6B7280"
            multiline
            value={form.prescription_note}
            onChangeText={(v) => setField('prescription_note', v)}
          />

          <Text style={styles.noteTitle}>What you should do now</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Example: If unable to attend, take prescribed medicines ASAP."
            placeholderTextColor="#6B7280"
            multiline
            value={form.patient_instruction}
            onChangeText={(v) => setField('patient_instruction', v)}
          />

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Important: If the patient cannot attend immediately, they should follow the prescribed medication advice.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={scheduleConsultation}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Scheduling...' : 'Schedule Consultation'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>© CKD Guardian • Stay Healthy</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background || '#F1F5F9',
  },
  content: {
    padding: 18,
    paddingBottom: 36,
  },
  patientEmptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.text || '#0F172A',
    marginBottom: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  cardHeader: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardHeaderText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  cardBody: {
    padding: 22,
  },
  cardTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 18,
  },
  paragraph: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 24,
    marginBottom: 12,
  },
  bold: {
    fontWeight: '900',
  },
  label: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginTop: 8,
    marginBottom: 12,
  },
  patientRow: {
    paddingRight: 8,
    marginBottom: 16,
  },
  patientChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#EEF2F7',
    marginRight: 10,
  },
  patientChipActive: {
    backgroundColor: '#2563EB',
  },
  patientChipText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 15,
  },
  patientChipTextActive: {
    color: '#FFFFFF',
  },
  infoBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '900',
    marginBottom: 8,
  },
  infoLine: {
    color: '#111827',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 8,
  },
  infoLineBold: {
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#111827',
    fontSize: 15,
  },
  noteTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 14,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 88,
    paddingHorizontal: 12,
    paddingVertical: 12,
    textAlignVertical: 'top',
    color: '#111827',
    fontSize: 15,
  },
  patientText: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 23,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  warningBox: {
    marginTop: 20,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    color: '#92400E',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  button: {
    marginTop: 22,
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  cardFooter: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  centerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});