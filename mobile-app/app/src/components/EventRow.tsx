import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressEvent } from '../types';

interface Props {
  event: ProgressEvent;
}

const KIND_ICON: Record<string, string> = {
  skill_start: '▶',
  skill_end: '■',
  progress: '●',
  tool_use: '⚙',
  hook_fire: '!',
};

const KIND_COLOR: Record<string, string> = {
  skill_start: '#4ade80',  // green
  skill_end: '#94a3b8',    // grey
  progress: '#60a5fa',     // blue
  tool_use: '#f59e0b',     // amber
  hook_fire: '#f472b6',    // pink — safety / culture gate
};

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function EventRow({ event }: Props) {
  const icon = KIND_ICON[event.kind] ?? '·';
  const color = KIND_COLOR[event.kind] ?? '#94a3b8';

  const label =
    event.message ??
    event.tool_name ??
    (event.kind === 'skill_start' ? `${event.skill ?? 'skill'} started` : null) ??
    (event.kind === 'skill_end' ? `${event.skill ?? 'skill'} ${event.outcome ?? 'done'}` : null) ??
    (event.kind === 'hook_fire' ? `${event.skill ?? 'hook'} · ${event.step ?? 'block'}` : null) ??
    event.kind;

  return (
    <View style={styles.row}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {event.skill && event.kind !== 'skill_start' && event.kind !== 'skill_end' && event.kind !== 'hook_fire' && (
          <Text style={styles.skill}>{event.skill}</Text>
        )}
        {event.intent_id && (
          <Text style={styles.intentId} numberOfLines={1}>
            intent: {event.intent_id}
          </Text>
        )}
        {event.ingest_lane && (
          <Text style={styles.lane} numberOfLines={1}>
            {event.ingest_lane}
            {event.upstream_kind ? ` · ${event.upstream_kind}` : ''}
          </Text>
        )}
      </View>
      <Text style={styles.time}>{relativeTime(event.ts)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  icon: {
    fontSize: 14,
    width: 22,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    marginHorizontal: 10,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  skill: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 1,
  },
  intentId: {
    color: '#a78bfa',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  lane: {
    color: '#475569',
    fontSize: 9,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  time: {
    color: '#475569',
    fontSize: 11,
    minWidth: 52,
    textAlign: 'right',
  },
});
