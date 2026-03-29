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

function formatDuration(s: number): string {
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
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

  const hasPct = typeof event.pct === 'number';
  const hasDuration = event.kind === 'skill_end' && typeof event.duration_s === 'number';

  return (
    <View style={styles.row}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
          {hasDuration && (
            <Text style={styles.duration}>{formatDuration(event.duration_s!)}</Text>
          )}
          {hasPct && !hasDuration && (
            <Text style={styles.pctText}>{event.pct}%</Text>
          )}
        </View>

        {/* Progress bar for events with pct */}
        {hasPct && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(100, event.pct!)}%` as any, backgroundColor: color }]} />
          </View>
        )}

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
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  icon: {
    fontSize: 14,
    width: 22,
    textAlign: 'center',
    paddingTop: 1,
  },
  body: {
    flex: 1,
    marginHorizontal: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 14,
    flex: 1,
  },
  duration: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  pctText: {
    color: '#60a5fa',
    fontSize: 11,
    fontFamily: 'monospace',
    minWidth: 32,
    textAlign: 'right',
  },
  progressTrack: {
    height: 2,
    backgroundColor: '#1e293b',
    borderRadius: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
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
    paddingTop: 1,
  },
});
