import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { TrackedAgent } from '../types';

interface Props {
  agent: TrackedAgent;
  onPress: () => void;
}

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

const STATUS_COLOR = {
  running: '#4ade80',
  done: '#60a5fa',
  error: '#f87171',
};

const STATUS_LABEL = {
  running: 'running',
  done: 'done',
  error: 'error',
};

export function AgentCard({ agent, onPress }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (agent.status !== 'running') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [agent.status, pulse]);

  const color = STATUS_COLOR[agent.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{agent.name}</Text>
        <Animated.View style={[styles.dot, { backgroundColor: color, opacity: agent.status === 'running' ? pulse : 1 }]} />
      </View>
      {agent.description && (
        <Text style={styles.description} numberOfLines={1}>{agent.description}</Text>
      )}
      {agent.message && (
        <Text style={styles.message} numberOfLines={1}>{agent.message}</Text>
      )}
      <View style={styles.footer}>
        <Text style={[styles.status, { color }]}>{STATUS_LABEL[agent.status]}</Text>
        <Text style={styles.meta}>{relativeTime(agent.updated_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    width: 170,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  description: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  message: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  status: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meta: {
    color: '#475569',
    fontSize: 10,
  },
});
