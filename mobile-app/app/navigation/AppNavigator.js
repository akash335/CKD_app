import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
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
import { colors } from '../utils/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(symbol, focused) {
  return (
    <Text
      style={{
        fontSize: 18,
        opacity: focused ? 1 : 0.55,
        color: focused ? colors.accent : colors.muted,
      }}
    >
      {symbol}
    </Text>
  );
}

function baseTabOptions() {
  return {
    headerShadowVisible: false,
    tabBarHideOnKeyboard: true,
    tabBarStyle: {
      height: 72,
      paddingTop: 8,
      paddingBottom: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.surface,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700',
    },
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.muted,
    headerStyle: { backgroundColor: colors.surface },
    headerTitleStyle: { color: colors.text, fontWeight: '800' },
  };
}

function screenHeader(title, onLogout) {
  return {
    title,
    headerShadowVisible: false,
    headerRight: () => (
      <TouchableOpacity onPress={onLogout}>
        <Text style={{ color: colors.accent, fontWeight: '700' }}>
          Sign out
        </Text>
      </TouchableOpacity>
    ),
  };
}

function PatientTabs({ onLogout }) {
  return (
    <Tab.Navigator screenOptions={baseTabOptions}>
      <Tab.Screen
        name="Home"
        options={{
          ...screenHeader('CKD Guardian', onLogout),
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused),
        }}
      >
        {(props) => <DashboardScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Readings"
        options={{
          ...screenHeader('Submit CKD Reading', onLogout),
          tabBarLabel: 'Readings',
          tabBarIcon: ({ focused }) => tabIcon('🧪', focused),
        }}
      >
        {(props) => <AddReadingScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Alerts"
        options={{
          ...screenHeader('CKD Alerts', onLogout),
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => tabIcon('⚠', focused),
        }}
      >
        {(props) => <AlertsScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>

      <Tab.Screen
        name="Notifications"
        options={{
          ...screenHeader('Notifications', onLogout),
          tabBarLabel: 'Notify',
          tabBarIcon: ({ focused }) => tabIcon('🔔', focused),
        }}
      >
        {(props) => (
          <NotificationsScreen {...props} onSessionExpired={onLogout} />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Consult"
        options={{
          ...screenHeader('CKD Consult', onLogout),
          tabBarLabel: 'Consult',
          tabBarIcon: ({ focused }) => tabIcon('🩺', focused),
        }}
      >
        {(props) => <TelemedicineScreen {...props} onSessionExpired={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function DoctorTabs({ onLogout }) {
  return (
    <Tab.Navigator screenOptions={baseTabOptions}>
      <Tab.Screen
        name="Overview"
        component={DoctorDashboardScreen}
        options={{
          ...screenHeader('CKD Guardian — Doctor', onLogout),
          tabBarLabel: 'Overview',
          tabBarIcon: ({ focused }) => tabIcon('⌂', focused),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          ...screenHeader('Doctor Notifications', onLogout),
          tabBarLabel: 'Notify',
          tabBarIcon: ({ focused }) => tabIcon('🔔', focused),
        }}
      />
      <Tab.Screen
        name="Consult"
        component={TelemedicineScreen}
        options={{
          ...screenHeader('CKD Consult Queue', onLogout),
          tabBarLabel: 'Consult',
          tabBarIcon: ({ focused }) => tabIcon('🩺', focused),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const savedUser = await getUser();
      setUser(savedUser);
      setBooting(false);
    })();
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
  };

  const authProps = useMemo(() => ({ onAuthSuccess: setUser }), []);

  if (booting) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ marginTop: 12, color: colors.muted }}>
          Launching CKD Guardian...
        </Text>
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
            options={{ title: 'Create your CKD Guardian account' }}
          >
            {(props) => <RegisterScreen {...props} {...authProps} />}
          </Stack.Screen>
        </>
      ) : user.role === 'doctor' ? (
        <Stack.Screen name="DoctorApp" options={{ headerShown: false }}>
          {() => <DoctorTabs onLogout={handleLogout} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="PatientApp" options={{ headerShown: false }}>
          {() => <PatientTabs onLogout={handleLogout} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}