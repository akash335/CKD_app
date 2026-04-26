import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { register } from '../services/authService';
import { colors, spacing } from '../utils/theme';

function RoleChip({ active, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.roleChip, active && styles.roleChipActive]}
    >
      <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function RegisterScreen({ onAuthSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    try {
      const cleanName = name.trim();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanName || !cleanEmail || !password.trim()) {
        Alert.alert(
          'Registration failed',
          JSON.stringify(error?.response?.data || error?.message || error)
        );
        return;
      }

      setLoading(true);

      const result = await register(
        cleanName,
        cleanEmail,
        password,
        role.toLowerCase()
      );

      onAuthSuccess?.(result.user);
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data ||
        e?.message ||
        'Please review your details and try again.';

      Alert.alert(
        'Registration failed',
        typeof detail === 'string' ? detail : JSON.stringify(detail)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>CKD Guardian</Text>
        <Text style={styles.brandTagline}>
          ML-based CKD detection and monitoring for patients and doctors.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>
          Set up a patient or doctor account to access the correct CKD workflow.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor={colors.muted}
          value={name}
          onChangeText={setName}
        />

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

        <Text style={styles.sectionLabel}>Account type</Text>
        <View style={styles.roleRow}>
          <RoleChip
            label="Patient"
            active={role === 'patient'}
            onPress={() => setRole('patient')}
          />
          <RoleChip
            label="Doctor"
            active={role === 'doctor'}
            onPress={() => setRole('doctor')}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating account...' : 'Create account'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  brandBlock: {
    marginBottom: spacing.lg,
  },
  brand: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
  },
  brandTagline: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    marginTop: 8,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: spacing.lg,
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
  sectionLabel: {
    marginTop: 4,
    marginBottom: 10,
    color: colors.text,
    fontWeight: '700',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  roleChipActive: {
    backgroundColor: colors.softBlue,
    borderColor: '#93C5FD',
  },
  roleChipText: {
    color: colors.muted,
    fontWeight: '700',
  },
  roleChipTextActive: {
    color: colors.accent,
  },
  button: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
  },
});