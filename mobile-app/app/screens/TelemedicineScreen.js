import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getUser } from '../services/storage';
import { listPatients } from '../services/patientService';
import { createTeleconsultation } from '../services/telemedicineService';
import SectionCard from '../components/SectionCard';
import { colors } from '../utils/theme';

export default function TelemedicineScreen() {
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);

  const [form, setForm] = useState({
    patient_id: '',
    consult_date: '',
    consult_time: '',
    meeting_link: '',
    summary: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const u = await getUser();
      setUser(u);

      if (u?.role === 'doctor') {
        const p = await listPatients();

        // ✅ REMOVE DUPLICATES
        const unique = [];
        const seen = new Set();

        (p || []).forEach((item) => {
          const key = item.user_name || item.id;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        });

        setPatients(unique);
      }
    } catch (e) {
      console.log('LOAD ERROR:', e);
    }
  };

  // ✅ SAFE DATE TIME FORMAT
  const buildDateTime = () => {
    if (!form.consult_date || !form.consult_time) return null;
    return `${form.consult_date}T${form.consult_time}:00`;
  };

  const schedule = async () => {
    try {
      if (!form.patient_id) {
        Alert.alert('Select a patient');
        return;
      }

      if (!form.consult_date || !form.consult_time) {
        Alert.alert('Enter date & time');
        return;
      }

      const payload = {
        patient_id: Number(form.patient_id),
        doctor_id: user.id,
        appointment_time: buildDateTime(),
        meeting_link: form.meeting_link || null,
        summary: form.summary || null,
        status: 'scheduled',
      };

      await createTeleconsultation(payload);

      Alert.alert('Success', 'Consultation scheduled');

      // ✅ RESET FORM AFTER SUCCESS
      setForm({
        patient_id: '',
        consult_date: '',
        consult_time: '',
        meeting_link: '',
        summary: '',
      });

    } catch (e) {
      Alert.alert(
        'Error',
        e?.response?.data?.detail || e?.message || 'Something went wrong'
      );
    }
  };

  if (user?.role !== 'doctor') {
    return (
      <View style={styles.center}>
        <Text>No actions available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Schedule Consultation</Text>

      {/* ✅ PATIENT SELECT */}
      <SectionCard title="Select Patient">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {patients.map((p) => {
            const name =
              p.user_name ||
              p.user?.name ||
              `Patient ${p.id}`;

            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.chip,
                  form.patient_id == p.id && styles.chipActive,
                ]}
                onPress={() =>
                  setForm((f) => ({ ...f, patient_id: p.id }))
                }
              >
                <Text
                  style={[
                    styles.chipText,
                    form.patient_id == p.id && styles.chipTextActive,
                  ]}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SectionCard>

      {/* DATE */}
      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={form.consult_date}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, consult_date: v }))
        }
      />

      {/* TIME */}
      <TextInput
        style={styles.input}
        placeholder="Time (HH:MM)"
        value={form.consult_time}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, consult_time: v }))
        }
      />

      {/* LINK */}
      <TextInput
        style={styles.input}
        placeholder="Meeting link"
        value={form.meeting_link}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, meeting_link: v }))
        }
      />

      {/* SUMMARY */}
      <TextInput
        style={[styles.input, { height: 90 }]}
        multiline
        placeholder="Consultation summary"
        value={form.summary}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, summary: v }))
        }
      />

      {/* BUTTON */}
      <TouchableOpacity style={styles.button} onPress={schedule}>
        <Text style={styles.buttonText}>Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.background,
  },

  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
    color: colors.text,
  },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 10,
  },

  chipActive: {
    backgroundColor: '#2563EB',
  },

  chipText: {
    color: '#000',
    fontWeight: '600',
  },

  chipTextActive: {
    color: '#fff',
  },

  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },

  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});