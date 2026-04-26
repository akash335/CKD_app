import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { login } from '../services/authService';
import { colors, spacing } from '../utils/theme';

export default function LoginScreen({ navigation, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password;

      if (!cleanEmail || !cleanPassword) {
        Alert.alert('Missing details', 'Please enter email and password.');
        return;
      }

      setLoading(true);
      const result = await login(cleanEmail, cleanPassword);
      onAuthSuccess?.(result.user);
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        'Please check your credentials and try again.';

      Alert.alert(
        'Login failed',
        typeof detail === 'string' ? detail : JSON.stringify(detail)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.hero}>
        <Text style={styles.brand}>CKD Guardian</Text>
        <Text style={styles.tagline}>
          ML-based CKD detection, remote monitoring, alerts, and doctor follow-up.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign in</Text>
        <Text style={styles.cardSubtitle}>
          Access your patient or doctor workspace.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={colors.muted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={colors.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>New to CKD Guardian? Create an account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  hero: {
    marginBottom: spacing.xl,
  },
  brand: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
  },
  tagline: {
    marginTop: 10,
    color: colors.muted,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: 6,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.background,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 14,
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
  link: {
    marginTop: 18,
    textAlign: 'center',
    color: colors.accent,
    fontWeight: '600',
  },
});