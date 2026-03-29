import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet,
  TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { TrackedAgent, ProgressEvent } from '../types';
import { AgentCard } from '../components/AgentCard';
import { EventRow } from '../components/EventRow';
import { ConnectionStatus } from '../useEventStream';
import { progressFetchHeaders } from '../apiHeaders';

interface Props {
  events: ProgressEvent[];
  trackedAgents: TrackedAgent[];
  status: ConnectionStatus;
  serverUrl: string | null;
  authToken?: string | null;
  intentEventFilter: string | null;
  /** Increment to trigger an immediate re-fetch of intent IDs (e.g. when intent_created SSE arrives). */
  intentRefreshKey?: number;
  onIntentEventFilterChange: (intentId: string | null) => void;
  onReconnect: () => void;
  onAgentPress: (agent: TrackedAgent) => void;
  onSetupPress: () => void;
}

function shortIntentLabel(id: string): string {
  return id.length > 30 ? `${id.slice(0, 28)}…` : id;
}

const STATUS_DOT_COLOR: Record<ConnectionStatus, string> = {
  connected: '#4ade80',
  connecting: '#f59e0b',
  disconnected: '#475569',
  error: '#f87171',
};

export function DashboardScreen({
  events,
  trackedAgents,
  status,
  serverUrl,
  authToken = null,
  intentEventFilter,
  intentRefreshKey,
  onIntentEventFilterChange,
  onReconnect,
  onAgentPress,
  onSetupPress,
}: Props) {
  const dotColor = STATUS_DOT_COLOR[status];
  const [intentIds, setIntentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchIntentIds = useCallback(async () => {
    if (!serverUrl) {
      setIntentIds([]);
      return;
    }
    try {
      const r = await fetch(`${serverUrl}/intentra/intents`, {
        headers: progressFetchHeaders(authToken),
      });
      if (!r.ok) return;
      const data = (await r.json()) as { intents?: { intent_id: string }[] };
      const ids = (data.intents ?? []).map(i => i.intent_id);
      setIntentIds(ids.slice(-12).reverse());
    } catch {
      setIntentIds([]);
    }
  }, [serverUrl, authToken]);

  useEffect(() => {
    fetchIntentIds();
    // intentRefreshKey is incremented by App when intent_created SSE arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchIntentIds, intentRefreshKey]);

  const handleRefresh = useCallback(() => {
    onReconnect();
    fetchIntentIds();
  }, [onReconnect, fetchIntentIds]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e =>
      (e.message ?? '').toLowerCase().includes(q) ||
      (e.skill ?? '').toLowerCase().includes(q) ||
      (e.tool_name ?? '').toLowerCase().includes(q) ||
      e.kind.toLowerCase().includes(q),
    );
  }, [events, searchQuery]);

  // Quick stats for the header summary row
  const hookFires = useMemo(() => events.filter(e => e.kind === 'hook_fire').length, [events]);
  const runningAgents = trackedAgents.filter(a => a.status === 'running').length;

  const renderEvent = useCallback(({ item }: { item: ProgressEvent }) => (
    <EventRow event={item} />
  ), []);

  const renderAgent = useCallback((agent: TrackedAgent) => (
    <AgentCard
      key={agent.id}
      agent={agent}
      onPress={() => onAgentPress(agent)}
    />
  ), [onAgentPress]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>gstack monitor</Text>
        <View style={styles.headerRight}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <TouchableOpacity onPress={onSetupPress} style={styles.gearBtn}>
            <Text style={styles.gear}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats summary row */}
      {events.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{events.length}</Text>
            <Text style={styles.statLabel}>events</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, runningAgents > 0 && styles.statNumActive]}>
              {runningAgents}
            </Text>
            <Text style={styles.statLabel}>running</Text>
          </View>
          {hookFires > 0 && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: '#f87171' }]}>{hookFires}</Text>
                <Text style={styles.statLabel}>blocked</Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search events…"
          placeholderTextColor="#334155"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Tracked agent cards */}
      {trackedAgents.length > 0 && (
        <View style={styles.sessionsSection}>
          <Text style={styles.sectionLabel}>Tracked agents</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessionScroll}>
            {trackedAgents.map(renderAgent)}
          </ScrollView>
        </View>
      )}

      {/* Intent filter — cross-session linkage (POST /progress + intent_id) */}
      {(intentIds.length > 0 || intentEventFilter) && serverUrl && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Filter by intent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => onIntentEventFilterChange(null)}
              style={[styles.filterChip, !intentEventFilter && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, !intentEventFilter && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {intentIds.map(id => (
              <TouchableOpacity
                key={id}
                onPress={() => onIntentEventFilterChange(intentEventFilter === id ? null : id)}
                style={[
                  styles.filterChip,
                  intentEventFilter === id && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    intentEventFilter === id && styles.filterChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {shortIntentLabel(id)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Event feed */}
      <Text style={styles.feedLabel}>
        {searchQuery.trim()
          ? `${filteredEvents.length} result${filteredEvents.length === 1 ? '' : 's'}`
          : 'Live events'}
      </Text>
      {filteredEvents.length === 0 ? (
        <View style={styles.empty}>
          {searchQuery.trim()
            ? <Text style={styles.emptyText}>No events match "{searchQuery}"</Text>
            : status === 'connected'
              ? <Text style={styles.emptyText}>Waiting for agents...</Text>
              : status === 'connecting'
                ? <Text style={styles.emptyText}>Connecting...</Text>
                : (
                  <View style={styles.emptyAction}>
                    <Text style={styles.emptyText}>Not connected</Text>
                    <TouchableOpacity onPress={onSetupPress} style={styles.setupBtn}>
                      <Text style={styles.setupBtnText}>Set up server</Text>
                    </TouchableOpacity>
                  </View>
                )
          }
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={e => e.id}
          renderItem={renderEvent}
          style={styles.feed}
          refreshControl={
            <RefreshControl
              refreshing={status === 'connecting'}
              onRefresh={handleRefresh}
              tintColor="#475569"
            />
          }
        />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  gearBtn: {
    padding: 4,
  },
  gear: {
    color: '#64748b',
    fontSize: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statNum: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },
  statNumActive: {
    color: '#4ade80',
  },
  statLabel: {
    color: '#475569',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1e293b',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  searchInput: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#e2e8f0',
    fontSize: 14,
  },
  sessionsSection: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  filterSection: {
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  filterLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  filterScroll: {
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 8,
  },
  filterChip: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: 200,
  },
  filterChipActive: {
    backgroundColor: '#312e81',
    borderWidth: 1,
    borderColor: '#818cf8',
  },
  filterChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  filterChipTextActive: {
    color: '#e0e7ff',
  },
  feedLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
  },
  sessionScroll: {
    paddingLeft: 16,
  },
  feed: {
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
  emptyAction: {
    alignItems: 'center',
    gap: 16,
  },
  setupBtn: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  setupBtnText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
