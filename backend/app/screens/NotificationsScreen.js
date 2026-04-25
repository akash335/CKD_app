import React, { useEffect, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    RefreshControl,
    View,
} from 'react-native';
import { getNotifications, markNotificationRead } from '../services/notificationService';
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
            console.log('NOTIFICATION LOAD ERROR:', error?.response?.data || error.message);
            setItems([]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const onRead = async (id) => {
        try {
            await markNotificationRead(id);
            load();
        } catch (error) {
            console.log('READ ERROR:', error?.response?.data || error.message);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
        >
            <Text style={styles.kicker}>CKD Guardian</Text>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
                Alerts, consultation updates, and doctor review activity appear here.
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
                            {!item.is_read ? <Text style={styles.badge}>NEW</Text> : null}
                        </View>
                        <Text style={styles.message}>{item.message}</Text>
                        <Text style={styles.meta}>{item.type}</Text>
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
    subtitle: { color: colors.muted, marginTop: 8, marginBottom: 16, lineHeight: 21 },
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
        color: '#fff',
        backgroundColor: colors.accent,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: '700',
    },
    message: {
        marginTop: 10,
        color: colors.muted,
        lineHeight: 20,
    },
    meta: {
        marginTop: 10,
        color: colors.muted,
        fontSize: 12,
        textTransform: 'uppercase',
    },
});