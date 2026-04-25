import React, { useCallback, useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    RefreshControl,
    View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    getNotifications,
    markNotificationRead,
} from '../services/notificationService';
import { colors } from '../utils/theme';

export default function NotificationsScreen() {
    const [items, setItems] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const load = async () => {
        setRefreshing(true);
        try {
            const data = await getNotifications();
            setItems(Array.isArray(data) ? data : []);
        } catch (error) {
            console.log(
                'NOTIFICATION LOAD ERROR:',
                error?.response?.data || error.message
            );
            setItems([]);
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

    const onRead = async (id) => {
        try {
            await markNotificationRead(id);
            load();
        } catch (error) {
            console.log('READ ERROR:', error?.response?.data || error.message);
        }
    };

    const badgeTone = (type) => {
        if (type === 'urgent') return styles.urgentBadge;
        if (type === 'consultation') return styles.consultBadge;
        return styles.infoBadge;
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={load} />
            }
        >
            <Text style={styles.kicker}>CKD Guardian</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
                Alerts, urgent reviews, and consultation updates appear here.
            </Text>

            {items.length === 0 ? (
                <Text style={styles.empty}>No notifications yet.</Text>
            ) : (
                items.map((item) => (
                    <TouchableOpacity
                        key={item.id}
                        style={[styles.card, !item.is_read && styles.unreadCard]}
                        onPress={() => onRead(item.id)}
                    >
                        <View style={styles.row}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={[styles.badge, badgeTone(item.type)]}>
                                {(item.type || 'info').toUpperCase()}
                            </Text>
                        </View>

                        <Text style={styles.message}>{item.message}</Text>

                        <View style={styles.metaRow}>
                            <Text style={styles.meta}>
                                {item.is_read ? 'Read' : 'Unread'}
                            </Text>
                            {!item.is_read ? <Text style={styles.newDot}>• New</Text> : null}
                        </View>
                    </TouchableOpacity>
                ))
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    kicker: { color: colors.accent, fontWeight: '800', marginBottom: 6 },
    title: { fontSize: 30, fontWeight: '800', color: colors.text },
    subtitle: {
        color: colors.muted,
        marginTop: 8,
        marginBottom: 16,
        lineHeight: 21,
    },
    empty: { color: colors.muted },
    card: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
    },
    unreadCard: {
        borderColor: colors.accent,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
        alignItems: 'center',
    },
    cardTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
    },
    urgentBadge: {
        backgroundColor: '#DC2626',
    },
    consultBadge: {
        backgroundColor: '#2563EB',
    },
    infoBadge: {
        backgroundColor: '#475569',
    },
    message: {
        marginTop: 10,
        color: colors.muted,
        lineHeight: 20,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        alignItems: 'center',
    },
    meta: {
        color: colors.muted,
        fontSize: 12,
    },
    newDot: {
        color: colors.accent,
        fontSize: 12,
        fontWeight: '700',
    },
});