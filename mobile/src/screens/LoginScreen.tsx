import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@fieldsync.dev');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the server. Check the API URL and your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>FieldSync</Text>
        <Text style={styles.subtitle}>Sign in to sync your jobs</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting || !password}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonLabel}>Sign in</Text>}
        </Pressable>

        <Text style={styles.hint}>Jobs and submissions still work fully offline once signed in — signing in only enables sync.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 32 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: { color: '#DC2626', fontSize: 13, marginTop: 16 },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonLabel: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  hint: { color: '#9CA3AF', fontSize: 12, marginTop: 20, textAlign: 'center' },
});
