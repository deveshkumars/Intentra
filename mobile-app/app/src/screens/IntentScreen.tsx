import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';

interface IntentArtifact {
  intent_id: string;
  prompt: string;
  repo: { path: string; branch: string };
  constraints?: Record<string, unknown>;
  culture_ref?: string;
  plan?: Array<{ type: string; [k: string]: unknown }>;
  outcome?: string | null;
}

interface Props {
  serverUrl: string | null;
  authToken?: string | null;
}

interface CulturePayload {
  path: string;
  culture: Record<string, unknown> | null;
  loaded: boolean;
  error: string | null;
  note?: string;
}

export function IntentScreen({ serverUrl, authToken }: Props) {
  const [intents, setIntents] = useState<IntentArtifact[]>([]);
  const [culture, setCulture] = useState<CulturePayload | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!serverUrl) return;
    setLoading(true);
    setError(null);
    try {
      const [intentsRes, cultureRes] = await Promise.all([
        fetch(`${serverUrl}/intentra/intents`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        }),
        fetch(`${serverUrl}/intentra/culture`, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
        }),
      ]);
      if (intentsRes.ok) {
        const data = await intentsRes.json() as { intents: IntentArtifact[] };
        setIntents(data.intents);
      }
      if (cultureRes.ok) {
        const data = await cultureRes.json() as CulturePayload;
        setCulture(data);
      } else {
        setCulture(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setOutcome = async (
    intent: IntentArtifact,
    outcome: 'success' | 'error' | 'cancelled',
  ) => {
    if (!serverUrl) return;
    try {
      const patchHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      };
      if (authToken) patchHeaders['Authorization'] = `Bearer ${authToken}`;
      const r = await fetch(`${serverUrl}/intentra/intent`, {
        method: 'PATCH',
        headers: patchHeaders,
        body: JSON.stringify({ intent_id: intent.intent_id, outcome }),
      });
      const body = await r.text();
      if (!r.ok) {
        Alert.alert(
          'Could not update intent',
          r.status === 401
            ? 'Server requires INTENTRA_TOKEN — set Bearer auth for PATCH in your client.'
            : body.slice(0, 200),
        );
        return;
      }
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    }
  };

  if (!serverUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Intent Context</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No server connected</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Intent Context</Text>
      </View>

      {loading && intents.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#4ade80" />
        </View>
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchData}
              tintColor="#475569"
            />
          }
        >
          {/* gstack culture.json — surfaced by Intentra for audit (same file skills load) */}
          {culture && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggle('_culture')}
                activeOpacity={0.7}
              >
                <Text style={styles.chevron}>
                  {expanded['_culture'] ? '▼' : '▶'}
                </Text>
                <Text style={styles.sectionTitle}>Team culture (gstack)</Text>
                <Text style={styles.badge}>
                  {culture.loaded ? 'loaded' : 'none'}
                </Text>
              </TouchableOpacity>
              {expanded['_culture'] && (
                <View style={styles.sectionBody}>
                  <Text style={styles.culturePath}>{culture.path}</Text>
                  {culture.error ? (
                    <Text style={styles.errorText}>{culture.error}</Text>
                  ) : culture.loaded && culture.culture ? (
                    <Text style={styles.markdown}>
                      {JSON.stringify(culture.culture, null, 2)}
                    </Text>
                  ) : (
                    <Text style={styles.emptyInline}>
                      No culture.json at this path (create with /setup-culture or copy manually).
                    </Text>
                  )}
                  {culture.note ? (
                    <Text style={styles.cultureNote}>{culture.note}</Text>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* Intent artifacts */}
          {intents.length > 0 && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggle('_intents')}
                activeOpacity={0.7}
              >
                <Text style={styles.chevron}>
                  {expanded['_intents'] ? '▼' : '▶'}
                </Text>
                <Text style={styles.sectionTitle}>Intent Artifacts</Text>
                <Text style={styles.badge}>{intents.length}</Text>
              </TouchableOpacity>
              {expanded['_intents'] && intents.map(intent => (
                <View key={intent.intent_id} style={styles.intentCard}>
                  <Text style={styles.intentId}>{intent.intent_id}</Text>
                  <Text style={styles.intentPrompt}>{intent.prompt}</Text>
                  <View style={styles.intentMeta}>
                    <Text style={styles.metaLabel}>
                      {intent.repo.branch}
                    </Text>
                    <Text
                      style={[
                        styles.metaLabel,
                        intent.outcome === 'success' && styles.metaSuccess,
                        intent.outcome === 'error' && styles.metaError,
                        intent.outcome === 'cancelled' && styles.metaCancelled,
                        !intent.outcome && styles.metaOpen,
                      ]}
                    >
                      {intent.outcome ?? 'open'}
                    </Text>
                    {!!intent.constraints?.risk_tolerance && (
                      <Text style={styles.metaLabel}>
                        risk: {String(intent.constraints.risk_tolerance)}
                      </Text>
                    )}
                  </View>
                  {intent.plan && intent.plan.length > 0 && (
                    <View style={styles.planSteps}>
                      {intent.plan.map((step, i) => (
                        <Text key={i} style={styles.planStep}>
                          {i + 1}. {step.type}
                        </Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.outcomeRow}>
                    <TouchableOpacity
                      style={[styles.outcomeBtn, styles.outcomeSuccess]}
                      onPress={() => setOutcome(intent, 'success')}
                    >
                      <Text style={styles.outcomeBtnText}>Done</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.outcomeBtn, styles.outcomeError]}
                      onPress={() => setOutcome(intent, 'error')}
                    >
                      <Text style={styles.outcomeBtnText}>Failed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.outcomeBtn, styles.outcomeCancelled]}
                      onPress={() => setOutcome(intent, 'cancelled')}
                    >
                      <Text style={styles.outcomeBtnText}>Cancelled</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  title: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  section: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  chevron: {
    color: '#475569',
    fontSize: 10,
    width: 14,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    color: '#475569',
    fontSize: 12,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  markdown: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  intentCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
  },
  intentId: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  intentPrompt: {
    color: '#f1f5f9',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  intentMeta: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metaLabel: {
    color: '#64748b',
    fontSize: 11,
    backgroundColor: '#0d0d0d',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  metaSuccess: {
    color: '#4ade80',
  },
  metaError: {
    color: '#f87171',
  },
  metaCancelled: {
    color: '#fbbf24',
  },
  metaOpen: {
    color: '#94a3b8',
  },
  outcomeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  outcomeBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outcomeSuccess: { backgroundColor: '#14532d' },
  outcomeError: { backgroundColor: '#7f1d1d' },
  outcomeCancelled: { backgroundColor: '#713f12' },
  outcomeBtnText: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '600',
  },
  planSteps: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#334155',
  },
  planStep: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 20,
    fontFamily: 'monospace',
  },
  culturePath: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 10,
  },
  emptyInline: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
  },
  cultureNote: {
    color: '#475569',
    fontSize: 11,
    marginTop: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
