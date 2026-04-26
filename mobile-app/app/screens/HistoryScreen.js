import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { getUser } from '../services/storage';
import {
    clearTeleconsultationHistory,
    getTeleconsultationsForDoctor,
    getTeleconsultationsForPatient,
} from '../services/telemedicineService';
import { getMyPatientProfile } from '../services/patientService';
import { colors } from '../utils/theme';

export default function HistoryScreen() {
    const [user, setUser] = useState(null);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [clearing, setClearing] = useState(false);

    useEffect(() => {
        load();
    }, []);

    useFocusEffect(
        useCallback(() => {
            load(false);
        }, [])
    );

    const sortLatestFirst = (rows) => {
        return [...rows].sort((a, b) => {
            const dateA = new Date(a.appointment_time).getTime();
            const dateB = new Date(b.appointment_time).getTime();

            if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
                return dateB - dateA;
            }

            return (b.id || 0) - (a.id || 0);
        });
    };

    const load = async (showLoader = true) => {
        try {
            if (showLoader) setLoading(true);
            setRefreshing(true);

            const savedUser = await getUser();
            setUser(savedUser);

            let res = [];

            if (savedUser?.role === 'doctor') {
                res = await getTeleconsultationsForDoctor(savedUser.id);
            } else {
                const patient = await getMyPatientProfile();
                res = await getTeleconsultationsForPatient(patient.id);
            }

            const rows = Array.isArray(res) ? sortLatestFirst(res) : [];
            setData(rows);
        } catch (e) {
            console.log('HISTORY ERROR:', e?.response?.data || e.message);
            setData([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const clearHistory = async () => {
        Alert.alert(
            'Clear history?',
            'This will remove all consultation history for this account.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setClearing(true);
                            await clearTeleconsultationHistory();
                            setData([]);
                            Alert.alert('Cleared', 'Consultation history cleared.');
                        } catch (e) {
                            Alert.alert(
                                'Unable to clear',
                                e?.response?.data?.detail ||
                                JSON.stringify(e?.response?.data || e.message)
                            );
                        } finally {
                            setClearing(false);
                        }
                    },
                },
            ]
        );
    };

    const title = useMemo(() => {
        if (user?.role === 'doctor') return 'Patient Consultation History';
        return 'Your Consultation History';
    }, [user]);

    const subtitle = useMemo(() => {
        if (user?.role === 'doctor') {
            return 'Latest consultations appear first. Review patient names, advice, prescriptions, appointment time, and CKD overview.';
        }

        return 'Latest consultations appear first. View your doctor notes, prescription, appointment time, and CKD overview.';
    }, [user]);

    const formatDateTime = (value) => {
        if (!value) return 'Not scheduled';

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
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

    const renderInfoRow = (label, value) => {
        if (value === undefined || value === null || value === '') return null;

        return (
            <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoValue}>{String(value)}</Text>
            </View>
        );
    };

    const renderTextSection = (label, value, fallback = 'Not added yet') => {
        return (
            <View style={styles.textSection}>
                <Text style={styles.sectionTitle}>{label}</Text>
                <Text style={styles.sectionText}>{value || fallback}</Text>
            </View>
        );
    };

    const renderMetric = (label, value) => {
        const hasValue = value !== undefined && value !== null && value !== '';

        return (
            <View style={styles.metricTile}>
                <Text style={styles.metricValue}>{hasValue ? value : '--'}</Text>
                <Text style={styles.metricLabel}>{label}</Text>
            </View>
        );
    };

    const renderHealthOverview = (item) => {
        const hasAnyHealthData =
            item.latest_risk_score !== undefined ||
            item.latest_risk_level ||
            item.trend_status ||
            item.latest_creatinine !== undefined ||
            item.latest_acr !== undefined ||
            item.latest_egfr !== undefined ||
            item.latest_systolic_bp !== undefined ||
            item.latest_diastolic_bp !== undefined;

        return (
            <View style={styles.healthBox}>
                <Text style={styles.healthTitle}>CKD / Health Overview</Text>

                {!hasAnyHealthData ? (
                    <Text style={styles.noDataText}>
                        No CKD reading data linked to this consultation yet.
                    </Text>
                ) : (
                    <View style={styles.metricGrid}>
                        {renderMetric('Risk score', item.latest_risk_score)}
                        {renderMetric('Risk level', item.latest_risk_level)}
                        {renderMetric('Trend', item.trend_status)}
                        {renderMetric('Creatinine', item.latest_creatinine)}
                        {renderMetric('Urine ACR', item.latest_acr)}
                        {renderMetric('eGFR', item.latest_egfr)}
                        {renderMetric(
                            'Blood pressure',
                            item.latest_systolic_bp !== undefined &&
                                item.latest_diastolic_bp !== undefined
                                ? `${item.latest_systolic_bp}/${item.latest_diastolic_bp}`
                                : null
                        )}
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading consultation history...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={data.length ? styles.content : styles.emptyWrap}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(false)} />}
        >
            <View style={styles.topRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.kicker}>CKD Guardian</Text>
                    <Text style={styles.pageTitle}>{title}</Text>
                </View>

                {data.length > 0 ? (
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearHistory}
                        disabled={clearing}
                    >
                        <Text style={styles.clearButtonText}>
                            {clearing ? 'Clearing...' : 'Clear'}
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            <Text style={styles.subtitle}>{subtitle}</Text>

            {!data.length ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No history available</Text>
                    <Text style={styles.emptyText}>
                        {user?.role === 'doctor'
                            ? 'Consultations you schedule will appear here with patient details.'
                            : 'Your doctor-scheduled consultations will appear here.'}
                    </Text>
                </View>
            ) : (
                data.map((item, index) => {
                    const patientName =
                        item.patient_name ||
                        item.patient?.user?.name ||
                        item.patient?.name ||
                        `Patient ${item.patient_id}`;

                    const doctorName =
                        item.doctor_name ||
                        item.doctor?.name ||
                        `Doctor ${item.doctor_id}`;

                    const displayName = user?.role === 'doctor' ? patientName : doctorName;

                    const secondaryName =
                        user?.role === 'doctor'
                            ? `Doctor: ${doctorName}`
                            : `Patient: ${patientName}`;

                    return (
                        <View key={item.id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.cardTitle}>{displayName}</Text>
                                    <Text style={styles.cardSubtitle}>{secondaryName}</Text>
                                    <Text style={styles.orderText}>
                                        {index === 0 ? 'Latest consultation' : `History item ${index + 1}`}
                                    </Text>
                                </View>

                                <View
                                    style={[
                                        styles.statusPill,
                                        item.needs_immediate_attention && styles.urgentPill,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.statusText,
                                            item.needs_immediate_attention && styles.urgentText,
                                        ]}
                                    >
                                        {item.status || 'scheduled'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.infoBox}>
                                {renderInfoRow(
                                    'Appointment time',
                                    formatDateTime(item.appointment_time)
                                )}
                                {renderInfoRow('Urgency', item.urgency || 'routine')}
                                {renderInfoRow(
                                    'Meeting link',
                                    item.meeting_link || 'Will be shared soon'
                                )}
                            </View>

                            {item.meeting_link ? (
                                <TouchableOpacity
                                    style={styles.meetingButton}
                                    onPress={() => openMeetingLink(item.meeting_link)}
                                >
                                    <Text style={styles.meetingButtonText}>Open Meeting Link</Text>
                                </TouchableOpacity>
                            ) : null}

                            {renderTextSection('Consultation Summary', item.summary)}
                            {renderTextSection('Doctor Advice', item.doctor_advice)}
                            {renderTextSection('Prescription Note', item.prescription_note)}
                            {renderTextSection('Patient Instructions', item.patient_instruction)}

                            {renderHealthOverview(item)}
                        </View>
                    );
                })
            )}
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
    emptyWrap: {
        flexGrow: 1,
        padding: 18,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    kicker: {
        color: '#2563EB',
        fontWeight: '900',
        marginBottom: 6,
        fontSize: 15,
    },
    pageTitle: {
        fontSize: 30,
        fontWeight: '900',
        color: colors.text || '#0F172A',
        marginBottom: 8,
    },
    subtitle: {
        color: '#64748B',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 18,
    },
    clearButton: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
    },
    clearButtonText: {
        color: '#B91C1C',
        fontWeight: '900',
        fontSize: 13,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#DBEAFE',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 14,
        gap: 10,
    },
    cardTitle: {
        fontSize: 21,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    cardSubtitle: {
        color: '#64748B',
        fontSize: 14,
        fontWeight: '600',
    },
    orderText: {
        color: '#2563EB',
        fontSize: 12,
        fontWeight: '900',
        marginTop: 6,
    },
    statusPill: {
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 999,
    },
    urgentPill: {
        backgroundColor: '#FEE2E2',
    },
    statusText: {
        color: '#2563EB',
        fontWeight: '900',
        textTransform: 'capitalize',
        fontSize: 12,
    },
    urgentText: {
        color: '#B91C1C',
    },
    infoBox: {
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 12,
    },
    infoRow: {
        marginBottom: 10,
    },
    infoLabel: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '800',
        marginBottom: 3,
    },
    infoValue: {
        color: '#111827',
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 21,
    },
    meetingButton: {
        backgroundColor: '#2563EB',
        paddingVertical: 13,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    meetingButtonText: {
        color: '#FFFFFF',
        fontWeight: '900',
        fontSize: 15,
    },
    textSection: {
        marginTop: 12,
    },
    sectionTitle: {
        color: '#111827',
        fontSize: 15,
        fontWeight: '900',
        marginBottom: 6,
    },
    sectionText: {
        color: '#374151',
        fontSize: 15,
        lineHeight: 22,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    healthBox: {
        marginTop: 16,
        backgroundColor: '#EFF6FF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    healthTitle: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 12,
    },
    noDataText: {
        color: '#64748B',
        lineHeight: 21,
        fontSize: 14,
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    metricTile: {
        width: '47%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
    },
    metricValue: {
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 4,
    },
    metricLabel: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
    },
    loadingWrap: {
        flex: 1,
        backgroundColor: colors.background || '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontWeight: '700',
    },
    emptyCard: {
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
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
    },
});