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
    const u = await getUser();
    setUser(u);

    if (u?.role === 'doctor') {
      const p = await listPatients();
      setPatients(p || []);
    }
  };

  const buildDateTime = () => {
    return `${form.consult_date}T${form.consult_time}:00`;
  };

  const schedule = async () => {
    try {
      if (!form.patient_id) {
        Alert.alert('Select patient');
        return;
      }

      await createTeleconsultation({
        patient_id: Number(form.patient_id),
        doctor_id: user.id,
        appointment_time: buildDateTime(),
        meeting_link: form.meeting_link || null,
        summary: form.summary || null,
        status: 'scheduled',
      });

      Alert.alert('Success', 'Consultation scheduled');
    } catch (e) {
      Alert.alert('Error', JSON.stringify(e?.response?.data || e.message));
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
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Schedule Consultation</Text>

      <SectionCard title="Select Patient">
        <ScrollView horizontal>
          {patients.map((p) => (
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
              <Text style={styles.chipText}>
                {p.user_name || `Patient ${p.id}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SectionCard>

      <TextInput
        style={styles.input}
        placeholder="Date (YYYY-MM-DD)"
        value={form.consult_date}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, consult_date: v }))
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Time (HH:MM)"
        value={form.consult_time}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, consult_time: v }))
        }
      />

      <TextInput
        style={styles.input}
        placeholder="Meeting link"
        value={form.meeting_link}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, meeting_link: v }))
        }
      />

      <TextInput
        style={[styles.input, { height: 80 }]}
        multiline
        placeholder="Summary"
        value={form.summary}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, summary: v }))
        }
      />

      <TouchableOpacity style={styles.button} onPress={schedule}>
        <Text style={styles.buttonText}>Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },

  chip: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#2563EB',
  },
  chipText: { color: '#000' },

  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    borderRadius: 10,
  },

  button: {
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});