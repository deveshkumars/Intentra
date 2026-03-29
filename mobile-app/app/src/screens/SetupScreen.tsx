import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { setServerUrl, setAuthToken } from '../storage';

interface Props {
  onConnected: (url: string, token: string | null) => void;
}

export function SetupScreen({ onConnected }: Props) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) {
      setError('Please enter a URL.');
      return;
    }
    setError(null);
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(`${trimmed}/health`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      await setServerUrl(trimmed);
      const resolvedToken = token.trim() || null;
      await setAuthToken(token.trim());
      onConnected(trimmed, resolvedToken);
    } catch (err: unknown) {
      clearTimeout(timer);
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Could not connect: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Connect to gstack</Text>
        <Text style={styles.subtitle}>
          Enter your ngrok URL to monitor agent progress in real time.
        </Text>

        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://abc123.ngrok-free.app"
          placeholderTextColor="#475569"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="next"
        />

        <TextInput
          style={styles.input}
          value={token}
          onChangeText={setToken}
          placeholder="Bearer token (optional, if INTENTRA_TOKEN is set)"
          placeholderTextColor="#475569"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleConnect}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#0d0d0d" />
            : <Text style={styles.buttonText}>Connect</Text>
          }
        </TouchableOpacity>

        <Text style={styles.hint}>
          Start the progress server:{'\n'}
          <Text style={styles.code}>cd mobile-app/server{'\n'}bun run server.ts{'\n'}ngrok http 7891</Text>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#f1f5f9',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  error: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#4ade80',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#0d0d0d',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  code: {
    fontFamily: 'monospace',
    color: '#94a3b8',
  },
});
