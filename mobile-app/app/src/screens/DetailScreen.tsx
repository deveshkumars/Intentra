import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { TrackedAgent, ProgressEvent } from '../types';
import { EventRow } from '../components/EventRow';

interface Props {
  agent: TrackedAgent;
  events: ProgressEvent[];
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

/** Filter events relevant to this agent.
 * Priority: session_id match → time-window fallback.
 * Time window: events between created_at and (updated_at + 5s buffer).
 */
function filterAgentEvents(agent: TrackedAgent, events: ProgressEvent[]): ProgressEvent[] {
  if (agent.session_id) {
    const bySession = events.filter(e => e.session_id === agent.session_id);
    if (bySession.length > 0) {
      return [...bySession].sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    }
  }
  // Time-window fallback: events that occurred while the agent was running
  const start = new Date(agent.created_at).getTime();
  const end = new Date(agent.updated_at).getTime() + 5_000;
  const list = events.filter(e => {
    const t = new Date(e.ts).getTime();
    return t >= start && t <= end;
  });
  return list.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

export function DetailScreen({ agent, events, onBack }: Props) {
  const statusColor = STATUS_COLOR[agent.status];
  const agentEvents = filterAgentEvents(agent, events);

  // Safety summary for this agent's session
  const hookFires = agentEvents.filter(e => e.kind === 'hook_fire');
  const toolCalls = agentEvents.filter(e => e.kind === 'tool_use').length;
  const skillEnds = agentEvents.filter(e => e.kind === 'skill_end');
  const lastSkillEnd = skillEnds[0]; // agentEvents is sorted newest-first

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

        {/* Session safety summary */}
        {agentEvents.length > 0 && (
          <View style={styles.safetyRow}>
            <View style={styles.safetyStat}>
              <Text style={styles.safetyNum}>{agentEvents.length}</Text>
              <Text style={styles.safetyLabel}>events</Text>
            </View>
            {toolCalls > 0 && (
              <View style={styles.safetyStat}>
                <Text style={styles.safetyNum}>{toolCalls}</Text>
                <Text style={styles.safetyLabel}>tool calls</Text>
              </View>
            )}
            {hookFires.length > 0 && (
              <View style={[styles.safetyStat, styles.safetyStatDanger]}>
                <Text style={[styles.safetyNum, { color: '#f87171' }]}>{hookFires.length}</Text>
                <Text style={[styles.safetyLabel, { color: '#f87171' }]}>blocked</Text>
              </View>
            )}
            {lastSkillEnd?.duration_s != null && (
              <View style={styles.safetyStat}>
                <Text style={styles.safetyNum}>{lastSkillEnd.duration_s.toFixed(0)}s</Text>
                <Text style={styles.safetyLabel}>duration</Text>
              </View>
            )}
          </View>
        )}

        {/* Hook fire detail (if any) */}
        {hookFires.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: '#f87171' }]}>
              Safety blocks ({hookFires.length})
            </Text>
            {hookFires.map(e => (
              <View key={e.id} style={styles.hookRow}>
                <Text style={styles.hookIcon}>!</Text>
                <Text style={styles.hookPattern} numberOfLines={1}>
                  {e.step ?? e.skill ?? 'hook'}
                </Text>
                <Text style={styles.hookTime}>{absoluteTime(e.ts)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Metadata */}
        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaKey}>Agent ID</Text>
            <Text style={styles.metaVal}>{agent.id}</Text>
          </View>
          {agent.session_id && (
            <View style={styles.metaRow}>
              <Text style={styles.metaKey}>Session</Text>
              <Text style={styles.metaVal}>{agent.session_id}</Text>
            </View>
          )}
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

        {/* Event timeline */}
        <View style={styles.timelineSection}>
          <Text style={styles.timelineLabel}>
            Event Timeline
            {agentEvents.length > 0 && (
              <Text style={styles.timelineCount}> · {agentEvents.length}</Text>
            )}
          </Text>

          {agentEvents.length === 0 ? (
            <View style={styles.noEvents}>
              <Text style={styles.noEventsText}>
                {agent.session_id
                  ? 'No events for this session yet'
                  : 'No events in this time window'}
              </Text>
              {!agent.session_id && (
                <Text style={styles.noEventsHint}>
                  Pass session_id when creating agent to link events precisely
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.eventList}>
              {agentEvents.map(event => (
                <EventRow key={event.id} event={event} />
              ))}
            </View>
          )}
        </View>

        {/* How to update hint */}
        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Update from Claude</Text>
          <Text style={styles.hintCode}>
            {`curl -X PATCH <server>/agents/${agent.id} \\\n  -H 'Content-Type: application/json' \\\n  -d '{"status":"done","message":"Task complete"}'`}
          </Text>
          <Text style={styles.hintNote}>
            If the server uses INTENTRA_TOKEN, add{' '}
            <Text style={styles.hintMono}>-H &apos;Authorization: Bearer …&apos;</Text>
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
  safetyRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  safetyStat: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  safetyStatDanger: {
    backgroundColor: '#1a0a0a',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  safetyNum: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  safetyLabel: {
    color: '#64748b',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  hookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1e293b',
  },
  hookIcon: {
    color: '#f87171',
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  hookPattern: {
    color: '#fca5a5',
    fontSize: 13,
    fontFamily: 'monospace',
    flex: 1,
  },
  hookTime: {
    color: '#475569',
    fontSize: 11,
  },
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
  metaVal: { color: '#94a3b8', fontSize: 12, fontFamily: 'monospace', flex: 1, textAlign: 'right' },
  timelineSection: { gap: 8 },
  timelineLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timelineCount: {
    color: '#4ade80',
    fontWeight: '700',
  },
  noEvents: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    gap: 6,
    alignItems: 'center',
  },
  noEventsText: { color: '#475569', fontSize: 13 },
  noEventsHint: { color: '#334155', fontSize: 11, textAlign: 'center', lineHeight: 16 },
  eventList: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    overflow: 'hidden',
  },
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
  hintNote: {
    color: '#475569',
    fontSize: 11,
    lineHeight: 16,
  },
  hintMono: {
    fontFamily: 'monospace',
    color: '#64748b',
  },
});
