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
import HistoryScreen from '../screens/HistoryScreen';

import { getUser } from '../services/storage';
import { logout } from '../services/authService';
import { getUnreadNotificationCount } from '../services/notificationService';
import { useAppTheme } from '../utils/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/* ---------- UI HELPERS ---------- */

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
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          backgroundColor: colors.accent,
          marginRight: 10,
        }}
      />
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>
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
      height: 75,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: colors.surface,
    },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
  };
}

function createHeader(title, onLogout, colors) {
  return {
    headerTitle: () => <HeaderTitle title={title} colors={colors} />,
    headerRight: () => (
      <TouchableOpacity
        onPress={onLogout}
        style={{
          backgroundColor: colors.primarySoft,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 999,
        }}
      >
        <Text style={{ color: colors.accent, fontWeight: '800' }}>
          Sign out
        </Text>
      </TouchableOpacity>
    ),
  };
}

/* ---------- PATIENT TABS ---------- */

function PatientTabs({ onLogout, colors, unreadCount }) {
  return (
    <Tab.Navigator screenOptions={createBaseTabOptions(colors)}>

      <Tab.Screen
        name="Home"
        options={{
          ...createHeader('CKD Guardian', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused, colors),
        }}
      >
        {(props) => <DashboardScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen
        name="Readings"
        options={{
          ...createHeader('New Reading', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('🧪', focused, colors),
        }}
      >
        {(props) => <AddReadingScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen
        name="Alerts"
        options={{
          ...createHeader('Alerts', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('⚠', focused, colors),
        }}
      >
        {(props) => <AlertsScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen
        name="Notify"
        options={{
          ...createHeader('Notifications', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('🔔', focused, colors),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      >
        {(props) => <NotificationsScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen
        name="Consult"
        options={{
          ...createHeader('Consultation', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('🩺', focused, colors),
        }}
      >
        {(props) => <TelemedicineScreen {...props} />}
      </Tab.Screen>

      {/* ✅ HISTORY */}
      <Tab.Screen
        name="History"
        options={{
          ...createHeader('History', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('⏱', focused, colors),
        }}
      >
        {(props) => <HistoryScreen {...props} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
}

/* ---------- DOCTOR TABS ---------- */

function DoctorTabs({ onLogout, colors, unreadCount }) {
  return (
    <Tab.Navigator screenOptions={createBaseTabOptions(colors)}>

      <Tab.Screen
        name="Overview"
        component={DoctorDashboardScreen}
        options={{
          ...createHeader('Doctor Overview', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused, colors),
        }}
      />

      <Tab.Screen
        name="Notify"
        component={NotificationsScreen}
        options={{
          ...createHeader('Notifications', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('🔔', focused, colors),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />

      <Tab.Screen
        name="Consult"
        component={TelemedicineScreen}
        options={{
          ...createHeader('Consult Queue', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('🩺', focused, colors),
        }}
      />

      {/* ✅ HISTORY */}
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          ...createHeader('History', onLogout, colors),
          tabBarIcon: ({ focused }) => tabIcon('⏱', focused, colors),
        }}
      />

    </Tab.Navigator>
  );
}

/* ---------- MAIN NAV ---------- */

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
    const loadUnread = async () => {
      try {
        const count = await getUnreadNotificationCount();
        setUnreadCount(count);
        await Notifications.setBadgeCountAsync(count);
      } catch { }
    };

    loadUnread();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUnreadCount(0);
  };

  if (booting) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <>
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} onAuthSuccess={setUser} />}
          </Stack.Screen>

          <Stack.Screen name="Register">
            {(props) => <RegisterScreen {...props} onAuthSuccess={setUser} />}
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
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
  });
}