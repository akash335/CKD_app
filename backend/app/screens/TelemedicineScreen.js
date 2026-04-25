import React, { useEffect, useState } from 'react';
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
import SectionCard from '../components/SectionCard';
import { getUser } from '../services/storage';
import { getMyPatientProfile, listPatients } from '../services/patientService';
import {
    createTeleconsultation,
    getTeleconsultationsForDoctor,
    getTeleconsultationsForPatient,
    updateTeleconsultation,
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
        appointment_time: '',
        meeting_link: '',
        summary: '',
        urgency: 'routine',
        doctor_advice: '',
        prescription_note: '',
        patient_instruction: '',
    });

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
                setItems(consultations);
                setPatients(roster);
            } else {
                const patient = await getMyPatientProfile();
                const consultations = await getTeleconsultationsForPatient(patient.id);
                setItems(consultations);
            }
        } catch (error) {
            console.log('CONSULT LOAD ERROR:', error?.response?.data || error.message);
            setItems([]);
            setPatients([]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const scheduleConsultation = async () => {
        try {
            if (!form.patient_id || !form.appointment_time) {
                Alert.alert('Missing details', 'Choose a patient and appointment time.');
                return;
            }

            await createTeleconsultation({
                patient_id: Number(form.patient_id),
                doctor_id: user.id,
                appointment_time: form.appointment_time,
                meeting_link: form.meeting_link || null,
                summary: form.summary || null,
                status: 'scheduled',
                urgency: form.urgency,
                needs_immediate_attention: form.urgency === 'urgent',
                doctor_advice: form.doctor_advice || null,
                prescription_note: form.prescription_note || null,
                patient_instruction: form.patient_instruction || null,
            });

            Alert.alert('Scheduled', 'Renal consultation and doctor response created.');
            setForm({
                patient_id: '',
                appointment_time: '',
                meeting_link: '',
                summary: '',
                urgency: 'routine',
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

    const markReviewed = async (item) => {
        try {
            await updateTeleconsultation(item.id, {
                status: 'reviewed',
                needs_immediate_attention: false,
            });
            load();
        } catch (error) {
            Alert.alert('Unable to update consultation', JSON.stringify(error?.response?.data || error.message));
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        >
            <Text style={styles.title}>Renal Consult</Text>
            <Text style={styles.subtitle}>
                Clean nephrology workflow: urgent review, doctor advice, temporary medicine guidance,
                and consultation planning.
            </Text>

            {role === 'doctor' ? (
                <SectionCard
                    title="Doctor quick response desk"
                    subtitle="Create a simple, immediate CKD response without making the workflow confusing"
                >
                    <Text style={styles.label}>Patient</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        {patients.map((patient) => (
                            <TouchableOpacity
                                key={patient.id}
                                style={[
                                    styles.choice,
                                    String(patient.id) === String(form.patient_id) && styles.choiceActive,
                                ]}
                                onPress={() => setForm((prev) => ({ ...prev, patient_id: String(patient.id) }))}
                            >
                                <Text
                                    style={[
                                        styles.choiceText,
                                        String(patient.id) === String(form.patient_id) && styles.choiceTextActive,
                                    ]}
                                >
                                    Patient #{patient.id}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.label}>Urgency</Text>
                    <View style={styles.rowChoices}>
                        {['routine', 'priority', 'urgent'].map((level) => (
                            <TouchableOpacity
                                key={level}
                                style={[styles.choice, form.urgency === level && styles.choiceActive]}
                                onPress={() => setForm((prev) => ({ ...prev, urgency: level }))}
                            >
                                <Text style={[styles.choiceText, form.urgency === level && styles.choiceTextActive]}>
                                    {level}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>Consultation time</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="2026-04-26T15:30:00"
                        value={form.appointment_time}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, appointment_time: value }))}
                    />

                    <Text style={styles.label}>Meeting link</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="https://meet.google.com/..."
                        value={form.meeting_link}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, meeting_link: value }))}
                    />

                    <Text style={styles.label}>Case summary</Text>
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        multiline
                        placeholder="High kidney risk, reduced eGFR, elevated ACR, urgent renal review recommended"
                        value={form.summary}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, summary: value }))}
                    />

                    <Text style={styles.label}>Immediate doctor advice</Text>
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        multiline
                        placeholder="Repeat blood pressure, maintain hydration, avoid delay in renal review"
                        value={form.doctor_advice}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, doctor_advice: value }))}
                    />

                    <Text style={styles.label}>Temporary medicine / prescription note</Text>
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        multiline
                        placeholder="Example: review antihypertensive plan, continue prescribed BP medication as directed"
                        value={form.prescription_note}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, prescription_note: value }))}
                    />

                    <Text style={styles.label}>Patient instruction</Text>
                    <TextInput
                        style={[styles.input, styles.multiline]}
                        multiline
                        placeholder="If severe swelling, dizziness, chest pain, or sharply reduced urine occurs, seek urgent medical care"
                        value={form.patient_instruction}
                        onChangeText={(value) => setForm((prev) => ({ ...prev, patient_instruction: value }))}
                    />

                    <TouchableOpacity style={styles.button} onPress={scheduleConsultation}>
                        <Text style={styles.buttonText}>Send doctor response + schedule consult</Text>
                    </TouchableOpacity>
                </SectionCard>
            ) : null}

            <SectionCard
                title={role === 'doctor' ? 'Renal consult queue' : 'Doctor response and consultation plan'}
                subtitle={role === 'doctor' ? 'Open patient cases and immediate response tasks' : 'Clear next steps from your doctor'}
            >
                {items.length === 0 ? (
                    <Text style={styles.body}>No teleconsultations are currently scheduled.</Text>
                ) : (
                    items.map((item) => (
                        <View key={item.id} style={styles.item}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemTitle}>Consultation #{item.id}</Text>
                                <Text style={[styles.badge, item.urgency === 'urgent' ? styles.badgeUrgent : item.urgency === 'priority' ? styles.badgePriority : styles.badgeRoutine]}>
                                    {item.urgency}
                                </Text>
                            </View>

                            <Text style={styles.body}>Status: {item.status}</Text>
                            <Text style={styles.body}>Time: {new Date(item.appointment_time).toLocaleString()}</Text>

                            {role === 'doctor' ? (
                                <Text style={styles.body}>Patient ID {item.patient_id}</Text>
                            ) : null}

                            {item.summary ? (
                                <>
                                    <Text style={styles.subhead}>Clinical summary</Text>
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
                                    <Text style={styles.subhead}>Medicine / prescription note</Text>
                                    <Text style={styles.body}>{item.prescription_note}</Text>
                                </>
                            ) : null}

                            {item.patient_instruction ? (
                                <>
                                    <Text style={styles.subhead}>What patient should do now</Text>
                                    <Text style={styles.body}>{item.patient_instruction}</Text>
                                </>
                            ) : null}

                            {item.meeting_link ? (
                                <>
                                    <Text style={styles.subhead}>Meeting link</Text>
                                    <Text style={styles.link}>{item.meeting_link}</Text>
                                </>
                            ) : null}

                            {role === 'doctor' && item.status !== 'reviewed' ? (
                                <TouchableOpacity style={styles.secondaryButton} onPress={() => markReviewed(item)}>
                                    <Text style={styles.secondaryButtonText}>Mark reviewed</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    ))
                )}
            </SectionCard>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: { fontSize: 30, fontWeight: '800', color: colors.text },
    subtitle: { color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 21 },
    body: { color: colors.muted, lineHeight: 22, marginBottom: 8 },
    subhead: { fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 6 },
    item: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    itemTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: 'hidden', color: '#fff', fontWeight: '700', textTransform: 'capitalize' },
    badgeRoutine: { backgroundColor: '#64748b' },
    badgePriority: { backgroundColor: '#f59e0b' },
    badgeUrgent: { backgroundColor: '#dc2626' },
    link: { color: colors.accent, marginBottom: 8 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12, marginBottom: 12 },
    multiline: { minHeight: 88, textAlignVertical: 'top' },
    label: { fontWeight: '700', color: colors.text, marginBottom: 8 },
    button: { backgroundColor: colors.primary, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
    buttonText: { color: '#fff', fontWeight: '700' },
    secondaryButton: { marginTop: 10, backgroundColor: colors.softBlue, padding: 12, borderRadius: 12, alignItems: 'center' },
    secondaryButtonText: { color: colors.accent, fontWeight: '700' },
    choice: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.softBlue, marginRight: 8, marginBottom: 8 },
    choiceActive: { backgroundColor: colors.primary },
    choiceText: { color: colors.accent, fontWeight: '600', textTransform: 'capitalize' },
    choiceTextActive: { color: '#fff' },
    rowChoices: { flexDirection: 'row', marginBottom: 12 },
});