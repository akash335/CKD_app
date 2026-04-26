import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { getUser } from '../services/storage';
import {
    getTeleconsultationsForDoctor,
    getTeleconsultationsForPatient,
} from '../services/telemedicineService';
import { getMyPatientProfile } from '../services/patientService';

export default function HistoryScreen() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            const user = await getUser();

            let res = [];

            if (user.role === 'doctor') {
                res = await getTeleconsultationsForDoctor(user.id);
            } else {
                const patient = await getMyPatientProfile();
                res = await getTeleconsultationsForPatient(patient.id);
            }

            setData(res || []);
        } catch (e) {
            console.log('ERROR:', e?.response?.data || e.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

    if (!data.length)
        return (
            <View style={styles.center}>
                <Text>No history available</Text>
            </View>
        );

    return (
        <ScrollView style={styles.container}>
            {data.map((item) => (
                <View key={item.id} style={styles.card}>
                    <Text style={styles.title}>{item.patient_name}</Text>

                    <Text>Doctor: {item.doctor_name}</Text>
                    <Text>
                        {new Date(item.appointment_time).toLocaleString()}
                    </Text>

                    <Text>Urgency: {item.urgency}</Text>

                    {item.summary && <Text>Summary: {item.summary}</Text>}
                    {item.doctor_advice && <Text>Advice: {item.doctor_advice}</Text>}
                    {item.prescription_note && (
                        <Text>Prescription: {item.prescription_note}</Text>
                    )}

                    {/* CKD DATA */}
                    {item.latest_risk_score && (
                        <Text>Risk: {item.latest_risk_score}</Text>
                    )}
                    {item.latest_egfr && <Text>eGFR: {item.latest_egfr}</Text>}
                    {item.latest_creatinine && (
                        <Text>Creatinine: {item.latest_creatinine}</Text>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16 },

    card: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: '#f5f5f5',
    },

    title: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 6,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});