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
};

const KIND_COLOR: Record<string, string> = {
  skill_start: '#4ade80',  // green
  skill_end: '#94a3b8',    // grey
  progress: '#60a5fa',     // blue
  tool_use: '#f59e0b',     // amber
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
    event.kind;

  return (
    <View style={styles.row}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {event.skill && event.kind !== 'skill_start' && event.kind !== 'skill_end' && (
          <Text style={styles.skill}>{event.skill}</Text>
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
  time: {
    color: '#475569',
    fontSize: 11,
    minWidth: 52,
    textAlign: 'right',
  },
});
