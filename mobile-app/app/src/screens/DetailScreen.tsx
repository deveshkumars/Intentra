import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TrackedAgent } from '../types';

interface Props {
  agent: TrackedAgent;
  onBack: () => void;
}

function absoluteTime(ts: string): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function duration(start: string, end: string): string {
  const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  return `${Math.floor(diff / 60)}m ${diff % 60}s`;
}

const STATUS_COLOR = {
  running: '#f59e0b',
  done: '#4ade80',
  error: '#f87171',
};

export function DetailScreen({ agent, onBack }: Props) {
  const statusColor = STATUS_COLOR[agent.status];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{agent.name}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Status badge */}
        <View style={[styles.statusBadge, { borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {agent.status.toUpperCase()}
          </Text>
        </View>

        {/* Description */}
        {agent.description && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.sectionValue}>{agent.description}</Text>
          </View>
        )}

        {/* Message / result */}
        {agent.message && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Message</Text>
            <Text style={styles.sectionValue}>{agent.message}</Text>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Agent ID</Text>
            <Text style={styles.metaVal}>{agent.id}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Started</Text>
            <Text style={styles.metaVal}>{absoluteTime(agent.created_at)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Last update</Text>
            <Text style={styles.metaVal}>{absoluteTime(agent.updated_at)}</Text>
          </View>
          {agent.status !== 'running' && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Duration</Text>
              <Text style={styles.metaVal}>{duration(agent.created_at, agent.updated_at)}</Text>
            </View>
          )}
        </View>

        {/* How to update hint */}
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Update from Claude</Text>
          <Text style={styles.hintCode}>
            {`curl -X PATCH <server>/agents/${agent.id} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"status":"done","message":"Task complete"}'`}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
    gap: 12,
  },
  backBtn: { paddingRight: 4 },
  backText: { color: '#60a5fa', fontSize: 16 },
  title: { color: '#f1f5f9', fontSize: 18, fontWeight: '600', flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 20 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  section: { gap: 6 },
  sectionLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionValue: { color: '#e2e8f0', fontSize: 15, lineHeight: 22 },
  meta: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  metaKey: { color: '#475569', fontSize: 12 },
  metaVal: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' },
  hint: {
    backgroundColor: '#0f1923',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#1e293b',
  },
  hintTitle: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  hintCode: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
});
