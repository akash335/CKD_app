import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DashboardScreen from '../screens/DashboardScreen';
import AddReadingScreen from '../screens/AddReadingScreen';
import AlertsScreen from '../screens/AlertsScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import TelemedicineScreen from '../screens/TelemedicineScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

import { getUser } from '../services/storage';
import { logout } from '../services/authService';
import { getUnreadNotificationCount } from '../services/notificationService';
import { useAppTheme } from '../utils/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(symbol, focused, colors) {
  return (
    <View
      style={{
        minWidth: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? colors.primarySoft : 'transparent',
      }}
    >
      <Text
        style={{
          fontSize: 17,
          opacity: focused ? 1 : 0.6,
          color: focused ? colors.accent : colors.muted,
        }}
      >
        {symbol}
      </Text>
    </View>
  );
}

function HeaderTitle({ title, colors }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', maxWidth: 220 }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: colors.accent,
          marginRight: 10,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          color: colors.text,
          fontSize: 18,
          fontWeight: '800',
          flexShrink: 1,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

function createBaseTabOptions(colors) {
  return {
    headerShadowVisible: false,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      height: 78,
      paddingTop: 8,
      paddingBottom: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '800',
      marginTop: 2,
    },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    tabBarBadgeStyle: {
      backgroundColor: '#DC2626',
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    headerStyle: {
      backgroundColor: colors.surface,
    },
    headerTitleStyle: {
      color: colors.text,
      fontWeight: '800',
    },
  };
}

function createScreenHeader(title, onLogout, colors) {
  return {
    headerTitle: () => <HeaderTitle title={title} colors={colors} />,
    headerShadowVisible: false,
    headerRight: () => (
      <TouchableOpacity
        onPress={onLogout}
        style={{
          backgroundColor: colors.primarySoft,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.accent, fontWeight: '800', fontSize: 13 }}>
          Sign out
        </Text>
      </TouchableOpacity>
    ),
  };
}

function PatientTabs({ onLogout, colors, unreadCount }) {
  return (
    <Tab.Navigator screenOptions={createBaseTabOptions(colors)}>
      <Tab.Screen
        name="Home"
        options={{
          ...createScreenHeader('CKD Guardian', onLogout, colors),
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused, colors),
        }}
      >
        {(props) => <DashboardScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Readings"
        options={{
          ...createScreenHeader('New Reading', onLogout, colors),
          tabBarLabel: 'Readings',
          tabBarIcon: ({ focused }) => tabIcon('🧪', focused, colors),
        }}
      >
        {(props) => <AddReadingScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Alerts"
        options={{
          ...createScreenHeader('CKD Alerts', onLogout, colors),
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => tabIcon('⚠', focused, colors),
        }}
      >
        {(props) => <AlertsScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Notifications"
        options={{
          ...createScreenHeader('Notifications', onLogout, colors),
          tabBarLabel: 'Notify',
          tabBarIcon: ({ focused }) => tabIcon('🔔', focused, colors),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      >
        {(props) => (
          <NotificationsScreen {...props} onSessionExpired={onLogout} />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Consult"
        options={{
          ...createScreenHeader('Consultation', onLogout, colors),
          tabBarLabel: 'Consult',
          tabBarIcon: ({ focused }) => tabIcon('🩺', focused, colors),
        }}
      >
        {(props) => (
          <TelemedicineScreen {...props} onSessionExpired={onLogout} />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function DoctorTabs({ onLogout, colors, unreadCount }) {
  return (
    <Tab.Navigator screenOptions={createBaseTabOptions(colors)}>
      <Tab.Screen
        name="Overview"
        component={DoctorDashboardScreen}
        options={{
          ...createScreenHeader('Doctor Overview', onLogout, colors),
          tabBarLabel: 'Overview',
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused, colors),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          ...createScreenHeader('Notifications', onLogout, colors),
          tabBarLabel: 'Notify',
          tabBarIcon: ({ focused }) => tabIcon('🔔', focused, colors),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tab.Screen
        name="Consult"
        component={TelemedicineScreen}
        options={{
          ...createScreenHeader('Consult Queue', onLogout, colors),
          tabBarLabel: 'Consult',
          tabBarIcon: ({ focused }) => tabIcon('🩺', focused, colors),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    (async () => {
      const savedUser = await getUser();
      setUser(savedUser);
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    let mounted = true;
    let intervalId;

    const requestBadgePermission = async () => {
      try {
        await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
      } catch (err) {
        console.log('NOTIFICATION PERMISSION ERROR:', err?.message || err);
      }
    };

    const syncUnreadCount = async () => {
      try {
        if (!user) {
          if (mounted) setUnreadCount(0);
          try {
            await Notifications.setBadgeCountAsync(0);
          } catch { }
          return;
        }

        const count = await getUnreadNotificationCount();

        if (mounted) {
          setUnreadCount(count);
        }

        try {
          await Notifications.setBadgeCountAsync(count);
        } catch (err) {
          console.log('BADGE COUNT ERROR:', err?.message || err);
        }
      } catch (err) {
        console.log('UNREAD COUNT ERROR:', err?.response?.data || err.message);
      }
    };

    requestBadgePermission();
    syncUnreadCount();
    intervalId = setInterval(syncUnreadCount, 8000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const handleLogout = async () => {
    await logout();
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch { }
    setUnreadCount(0);
    setUser(null);
  };

  const authProps = useMemo(() => ({ onAuthSuccess: setUser }), []);

  if (booting) {
    return (
      <View style={styles.bootWrap}>
        <View style={styles.bootGlow} />
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.bootText}>Launching CKD Guardian...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShadowVisible: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} {...authProps} />}
          </Stack.Screen>

          <Stack.Screen
            name="Register"
            options={{
              title: 'Create your CKD Guardian account',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
              headerTitleStyle: { color: colors.text, fontWeight: '800' },
            }}
          >
            {(props) => <RegisterScreen {...props} {...authProps} />}
          </Stack.Screen>
        </>
      ) : user.role === 'doctor' ? (
        <Stack.Screen name="DoctorApp" options={{ headerShown: false }}>
          {() => (
            <DoctorTabs
              onLogout={handleLogout}
              colors={colors}
              unreadCount={unreadCount}
            />
          )}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="PatientApp" options={{ headerShown: false }}>
          {() => (
            <PatientTabs
              onLogout={handleLogout}
              colors={colors}
              unreadCount={unreadCount}
            />
          )}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
    bootWrap: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    bootGlow: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 999,
      backgroundColor: colors.glow,
      opacity: 0.7,
    },
    bootText: {
      marginTop: 12,
      color: colors.muted,
      fontWeight: '600',
    },
  });
}