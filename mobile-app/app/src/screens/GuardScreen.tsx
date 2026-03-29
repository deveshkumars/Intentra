import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { progressFetchHeaders } from '../apiHeaders';
import type { ProgressEvent } from '../types';

interface Props {
  serverUrl: string | null;
  authToken?: string | null;
  /** Live SSE stream — we extract hook_fire events from it in real time. */
  events?: ProgressEvent[];
}

interface GuardRule {
  id: string;
  category: string;
  base_risk: number;
  description: string;
}

interface TelemetryEntry {
  event: string;
  verdict: 'deny' | 'warn' | 'allow';
  pattern?: string;
  ts: string;
  risk_score?: number;
  guard_engine_version?: number;
}

interface TelemetryStats {
  total: number;
  deny: number;
  warn: number;
  allow: number;
  by_pattern: Record<string, number>;
}

const VERDICT_COLOR: Record<string, string> = {
  deny: '#f87171',
  warn: '#f59e0b',
  allow: '#4ade80',
};

const CATEGORY_ICON: Record<string, string> = {
  filesystem: '🗂',
  sql: '🗄',
  vcs: '⎇',
  orchestration: '☸',
  container: '🐳',
};

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function riskColor(score: number): string {
  if (score >= 85) return '#f87171';
  if (score >= 70) return '#f59e0b';
  return '#4ade80';
}

export function GuardScreen({ serverUrl, authToken = null, events }: Props) {
  const [rules, setRules] = useState<GuardRule[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>([]);
  const [stats, setStats] = useState<TelemetryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const lastEventIdRef = useRef<string | null>(null);

  // Live hook_fire events from SSE stream
  const liveHookFires = (events ?? []).filter(e => e.kind === 'hook_fire');

  const fetchData = useCallback(async () => {
    if (!serverUrl) return;
    setLoading(true);
    setError(null);
    try {
      const h = progressFetchHeaders(authToken);
      const [rulesRes, telemetryRes] = await Promise.all([
        fetch(`${serverUrl}/intentra/guard/rules`, { headers: h }),
        fetch(`${serverUrl}/intentra/guard/telemetry?limit=50`, { headers: h }),
      ]);
      if (rulesRes.ok) {
        const data = await rulesRes.json() as { rules?: GuardRule[] };
        setRules(data.rules ?? []);
      }
      if (telemetryRes.ok) {
        const data = await telemetryRes.json() as { entries?: TelemetryEntry[]; stats?: TelemetryStats };
        setTelemetry((data.entries ?? []).reverse()); // newest first
        setStats(data.stats ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch guard data');
    } finally {
      setLoading(false);
    }
  }, [serverUrl, authToken]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh telemetry when new hook_fire events arrive via SSE
  useEffect(() => {
    if (!events || events.length === 0) return;
    const latest = events[events.length - 1];
    if (!latest || latest.id === lastEventIdRef.current) return;
    lastEventIdRef.current = latest.id;
    if (latest.kind === 'hook_fire') {
      // Refresh telemetry file contents to stay in sync
      fetchData();
    }
  }, [events, fetchData]);

  if (!serverUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Guard Engine</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No server connected</Text>
        </View>
      </View>
    );
  }

  if (loading && rules.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Guard Engine</Text>
        </View>
        <View style={styles.empty}>
          <ActivityIndicator color="#4ade80" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Guard Engine</Text>
          <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Guard Engine</Text>
        <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
          <Text style={styles.retryText}>↻</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor="#475569" />
        }
      >
        {/* Stats summary */}
        {stats && stats.total > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNum}>{stats.total}</Text>
              <Text style={styles.statLabel}>total</Text>
            </View>
            <View style={[styles.statChip, { borderColor: VERDICT_COLOR.deny }]}>
              <Text style={[styles.statNum, { color: VERDICT_COLOR.deny }]}>{stats.deny}</Text>
              <Text style={styles.statLabel}>denied</Text>
            </View>
            <View style={[styles.statChip, { borderColor: VERDICT_COLOR.warn }]}>
              <Text style={[styles.statNum, { color: VERDICT_COLOR.warn }]}>{stats.warn}</Text>
              <Text style={styles.statLabel}>warned</Text>
            </View>
            <View style={[styles.statChip, { borderColor: VERDICT_COLOR.allow }]}>
              <Text style={[styles.statNum, { color: VERDICT_COLOR.allow }]}>{stats.allow}</Text>
              <Text style={styles.statLabel}>allowed</Text>
            </View>
          </View>
        )}

        {/* Top patterns */}
        {stats && Object.keys(stats.by_pattern).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Top triggered patterns</Text>
            {Object.entries(stats.by_pattern)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([pattern, count]) => (
                <View key={pattern} style={styles.patternRow}>
                  <Text style={styles.patternName}>{pattern}</Text>
                  <View style={styles.patternCountBg}>
                    <Text style={styles.patternCount}>{count}×</Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Live hook_fire events from SSE */}
        {liveHookFires.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Live hook fires (this session)</Text>
            {liveHookFires.slice(0, 10).map(e => (
              <View key={e.id} style={styles.liveRow}>
                <Text style={[styles.liveVerdict, { color: '#f87171' }]}>BLOCK</Text>
                <Text style={styles.livePattern} numberOfLines={1}>
                  {e.step ?? e.skill ?? 'hook'}
                </Text>
                <Text style={styles.liveTime}>{relativeTime(e.ts)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recent telemetry log */}
        {telemetry.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Guard log</Text>
            {telemetry.slice(0, 20).map((entry, i) => {
              const verdictColor = VERDICT_COLOR[entry.verdict] ?? '#94a3b8';
              return (
                <View key={i} style={styles.telemetryRow}>
                  <View style={[styles.verdictBadge, { backgroundColor: verdictColor + '22', borderColor: verdictColor }]}>
                    <Text style={[styles.verdictText, { color: verdictColor }]}>
                      {entry.verdict.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.telemetryBody}>
                    <Text style={styles.telemetryPattern} numberOfLines={1}>
                      {entry.pattern ?? '—'}
                    </Text>
                    {entry.risk_score != null && (
                      <Text style={[styles.telemetryRisk, { color: riskColor(entry.risk_score) }]}>
                        risk {entry.risk_score}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.telemetryTime}>{relativeTime(entry.ts)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Guard rule registry */}
        {rules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{rules.length} registered rules</Text>
            {rules.map(rule => {
              const isExpanded = expandedRule === rule.id;
              const icon = CATEGORY_ICON[rule.category] ?? '🛡';
              return (
                <TouchableOpacity
                  key={rule.id}
                  style={styles.ruleCard}
                  onPress={() => setExpandedRule(isExpanded ? null : rule.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.ruleHeader}>
                    <Text style={styles.ruleIcon}>{icon}</Text>
                    <View style={styles.ruleInfo}>
                      <Text style={styles.ruleId}>{rule.id}</Text>
                      <Text style={styles.ruleCategory}>{rule.category}</Text>
                    </View>
                    <View style={styles.ruleRiskWrap}>
                      <Text style={[styles.ruleRisk, { color: riskColor(rule.base_risk) }]}>
                        {rule.base_risk}
                      </Text>
                      <Text style={styles.ruleRiskLabel}>risk</Text>
                    </View>
                    <Text style={styles.ruleChevron}>{isExpanded ? '▲' : '▼'}</Text>
                  </View>
                  {isExpanded && (
                    <Text style={styles.ruleDesc}>{rule.description}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {telemetry.length === 0 && rules.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No guard activity yet</Text>
            <Text style={styles.emptySubtext}>
              Run /careful or POST /intentra/guard to trigger evaluations
            </Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
  retryBtn: {
    padding: 6,
  },
  retryText: {
    color: '#64748b',
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statNum: {
    color: '#f1f5f9',
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  patternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  patternName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  patternCountBg: {
    backgroundColor: '#1e293b',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  patternCount: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  liveVerdict: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    minWidth: 40,
  },
  livePattern: {
    color: '#e2e8f0',
    fontSize: 13,
    flex: 1,
    fontFamily: 'monospace',
  },
  liveTime: {
    color: '#475569',
    fontSize: 11,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 10,
  },
  verdictBadge: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    minWidth: 48,
    alignItems: 'center',
  },
  verdictText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  telemetryBody: {
    flex: 1,
    gap: 2,
  },
  telemetryPattern: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  telemetryRisk: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  telemetryTime: {
    color: '#475569',
    fontSize: 11,
    minWidth: 52,
    textAlign: 'right',
  },
  ruleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleIcon: {
    fontSize: 20,
  },
  ruleInfo: {
    flex: 1,
  },
  ruleId: {
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  ruleCategory: {
    color: '#64748b',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  ruleRiskWrap: {
    alignItems: 'center',
  },
  ruleRisk: {
    fontSize: 18,
    fontWeight: '700',
  },
  ruleRiskLabel: {
    color: '#475569',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  ruleChevron: {
    color: '#475569',
    fontSize: 10,
    paddingLeft: 4,
  },
  ruleDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 18,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: {
    color: '#475569',
    fontSize: 15,
  },
  emptySubtext: {
    color: '#334155',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
