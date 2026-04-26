import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import api from '../services/api';

export default function HistoryScreen() {
    const [data, setData] = useState([]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const res = await api.get('/teleconsultations'); // adjust if needed
            setData(res.data);
        } catch (e) {
            console.log("HISTORY ERROR:", e?.response?.data || e.message);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Consultation History</Text>

            {data.length === 0 ? (
                <Text style={styles.empty}>No consultations yet</Text>
            ) : (
                data.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <Text style={styles.name}>
                            {item.patient_name || `Patient #${item.patient_id}`}
                        </Text>

                        <Text>Doctor: {item.doctor_name || 'Unknown'}</Text>
                        <Text>Status: {item.status}</Text>
                        <Text>Urgency: {item.urgency}</Text>

                        <Text style={styles.summary}>
                            {item.summary || 'No summary'}
                        </Text>
                    </View>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
    empty: { textAlign: 'center', marginTop: 50, color: '#888' },

    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },

    name: { fontWeight: 'bold', fontSize: 16 },
    summary: { marginTop: 8, color: '#444' },
});