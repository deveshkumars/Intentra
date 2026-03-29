import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { setServerUrl, setAuthToken } from '../storage';

interface ServerHealth {
  ok: boolean;
  events: number;
  uptime: number;
  guard_engine_version: number;
  rule_count: number;
  metrics: {
    post_progress_total: number;
    hook_fires_total?: number;
    intents_created_total?: number;
    guard_evaluations_total?: number;
  };
}

interface Props {
  onConnected: (url: string, token: string | null) => void;
}

export function SetupScreen({ onConnected }: Props) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<ServerHealth | null>(null);

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
      try {
        const h = await res.json() as ServerHealth;
        setHealth(h);
      } catch { /* health parse failure — non-fatal */ }

      // Mutating routes require Bearer when INTENTRA_TOKEN is set — probe so we fail fast in setup.
      const controller2 = new AbortController();
      const timer2 = setTimeout(() => controller2.abort(), 8000);
      const authHeader = token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {};
      let mutProbe: Response;
      try {
        mutProbe = await fetch(`${trimmed}/agents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            ...authHeader,
          },
          body: '{}',
          signal: controller2.signal,
        });
      } finally {
        clearTimeout(timer2);
      }
      if (mutProbe.status === 401 && !token.trim()) {
        throw new Error(
          'This server requires a bearer token (INTENTRA_TOKEN). Enter it below and tap Connect again.',
        );
      }
      if (token.trim() && mutProbe.status === 401) {
        throw new Error('Bearer token was rejected (401). Check it matches the server’s INTENTRA_TOKEN.');
      }

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

        {/* Server health panel — shown after a successful health probe */}
        {health && !error && (
          <View style={styles.healthPanel}>
            <Text style={styles.healthTitle}>Server info</Text>
            <View style={styles.healthRow}>
              <Text style={styles.healthKey}>Guard engine</Text>
              <Text style={styles.healthVal}>v{health.guard_engine_version} · {health.rule_count} rules</Text>
            </View>
            <View style={styles.healthRow}>
              <Text style={styles.healthKey}>Uptime</Text>
              <Text style={styles.healthVal}>{health.uptime}s</Text>
            </View>
            <View style={styles.healthRow}>
              <Text style={styles.healthKey}>Events</Text>
              <Text style={styles.healthVal}>{health.events}</Text>
            </View>
            {(health.metrics.hook_fires_total ?? 0) > 0 && (
              <View style={styles.healthRow}>
                <Text style={styles.healthKey}>Hook fires</Text>
                <Text style={[styles.healthVal, { color: '#f87171' }]}>
                  {health.metrics.hook_fires_total}
                </Text>
              </View>
            )}
            {(health.metrics.intents_created_total ?? 0) > 0 && (
              <View style={styles.healthRow}>
                <Text style={styles.healthKey}>Intents</Text>
                <Text style={styles.healthVal}>{health.metrics.intents_created_total}</Text>
              </View>
            )}
          </View>
        )}

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
  healthPanel: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#4ade8044',
  },
  healthTitle: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  healthKey: {
    color: '#64748b',
    fontSize: 13,
  },
  healthVal: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'monospace',
  },
});
