import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { progressFetchHeaders } from '../apiHeaders';
import type { ProgressEvent } from '../types';

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
  /** SSE event stream — used to auto-refresh when intent_created or intent_resolved arrives */
  events?: ProgressEvent[];
}

interface CulturePayload {
  path: string;
  culture: Record<string, unknown> | null;
  loaded: boolean;
  error: string | null;
  note?: string;
}

export function IntentScreen({ serverUrl, authToken, events }: Props) {
  const [intents, setIntents] = useState<IntentArtifact[]>([]);
  const [culture, setCulture] = useState<CulturePayload | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Create intent sheet state
  const [createVisible, setCreateVisible] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');
  const [newRisk, setNewRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!serverUrl) return;
    setLoading(true);
    setError(null);
    try {
      const h = progressFetchHeaders(authToken ?? null);
      const [intentsRes, cultureRes] = await Promise.all([
        fetch(`${serverUrl}/intentra/intents`, { headers: h }),
        fetch(`${serverUrl}/intentra/culture`, { headers: h }),
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
  }, [serverUrl, authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh when intent_created or intent_resolved SSE events arrive
  useEffect(() => {
    if (!events || events.length === 0) return;
    const latest = events[events.length - 1];
    if (!latest) return;
    if (latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;
    const isIntentEvent =
      latest.upstream_kind === 'intent_created' ||
      latest.upstream_kind === 'intent_resolved';
    if (isIntentEvent) fetchData();
  }, [events, fetchData]);

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setOutcome = async (
    intent: IntentArtifact,
    outcome: 'success' | 'error' | 'cancelled',
  ) => {
    if (!serverUrl) return;
    try {
      const r = await fetch(`${serverUrl}/intentra/intent`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...progressFetchHeaders(authToken ?? null),
        },
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

  const handleCreateIntent = useCallback(async () => {
    if (!serverUrl || !newPrompt.trim()) return;
    setCreating(true);
    try {
      const r = await fetch(`${serverUrl}/intentra/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...progressFetchHeaders(authToken ?? null),
        },
        body: JSON.stringify({
          prompt: newPrompt.trim(),
          constraints: { risk_tolerance: newRisk },
        }),
      });
      if (!r.ok) {
        const txt = await r.text();
        Alert.alert('Could not create intent', txt.slice(0, 200));
        return;
      }
      setCreateVisible(false);
      setNewPrompt('');
      setNewRisk('medium');
      await fetchData();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }, [serverUrl, authToken, newPrompt, newRisk, fetchData]);

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
        <TouchableOpacity
          onPress={() => setCreateVisible(true)}
          style={styles.createBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.createBtnText}>+ Intent</Text>
        </TouchableOpacity>
      </View>

      {/* Create Intent Modal */}
      <Modal
        visible={createVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setCreateVisible(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Intent</Text>
            <TouchableOpacity
              onPress={handleCreateIntent}
              disabled={creating || !newPrompt.trim()}
              style={[styles.saveBtn, (!newPrompt.trim() || creating) && styles.saveBtnDisabled]}
            >
              {creating
                ? <ActivityIndicator color="#4ade80" size="small" />
                : <Text style={styles.saveText}>Create</Text>
              }
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.fieldLabel}>Prompt</Text>
            <TextInput
              style={styles.promptInput}
              value={newPrompt}
              onChangeText={setNewPrompt}
              placeholder="What should the agent do?"
              placeholderTextColor="#475569"
              multiline
              autoFocus
              returnKeyType="default"
            />

            <Text style={styles.fieldLabel}>Risk tolerance</Text>
            <View style={styles.riskRow}>
              {(['low', 'medium', 'high'] as const).map(level => (
                <TouchableOpacity
                  key={level}
                  style={[styles.riskChip, newRisk === level && styles.riskChipActive]}
                  onPress={() => setNewRisk(level)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.riskChipText, newRisk === level && styles.riskChipTextActive]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalHint}>
              Creates a structured JSON artifact in .intentra/ and emits an
              intent_created SSE event to all connected clients.
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  createBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#4ade80',
  },
  createBtnText: {
    color: '#4ade80',
    fontSize: 13,
    fontWeight: '600',
  },
  // Create intent modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '600',
  },
  cancelBtn: { padding: 4 },
  cancelText: { color: '#64748b', fontSize: 16 },
  saveBtn: { padding: 4 },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { color: '#4ade80', fontSize: 16, fontWeight: '600' },
  modalBody: {
    padding: 20,
    gap: 14,
  },
  fieldLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  promptInput: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    color: '#f1f5f9',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  riskRow: {
    flexDirection: 'row',
    gap: 10,
  },
  riskChip: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  riskChipActive: {
    backgroundColor: '#0c2a2a',
    borderColor: '#4ade80',
  },
  riskChipText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  riskChipTextActive: {
    color: '#4ade80',
  },
  modalHint: {
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
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
