/**
 * SSE hook — connects to /events/stream, replays history on reconnect,
 * and maintains a live event list + tracked agents.
 *
 * Tracked agents are registered via POST /agents and updated via PATCH /agents/:id.
 * The SSE stream broadcasts `agent_update` events; the app listens and updates state.
 *
 * Reconnect: exponential backoff 1s → 2s → 4s → … → 30s
 * Backfill: on reconnect, calls GET /events/history and GET /agents to fill any gap
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import EventSource, { CustomEvent } from 'react-native-sse';
import { ProgressEvent, TrackedAgent } from './types';

const MAX_EVENTS = 200;
const MAX_BACKOFF_MS = 30_000;

// ngrok requires this header to skip the browser-warning interstitial
const NGROK_HEADERS = { 'ngrok-skip-browser-warning': 'true' };

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseEventStreamResult {
  events: ProgressEvent[];
  trackedAgents: TrackedAgent[];
  status: ConnectionStatus;
  reconnect: () => void;
}

function makeHeaders(authToken: string | null): Record<string, string> {
  const h: Record<string, string> = { ...NGROK_HEADERS };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

export function useEventStream(
  serverUrl: string | null,
  authToken: string | null = null,
): UseEventStreamResult {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [trackedAgents, setTrackedAgents] = useState<TrackedAgent[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esRef = useRef<any>(null);
  const backoffRef = useRef(1000);
  const seenIds = useRef(new Set<string>());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track current token for backfill requests
  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  const addEvents = useCallback((incoming: ProgressEvent[]) => {
    const fresh = incoming.filter(e => !seenIds.current.has(e.id));
    if (fresh.length === 0) return;
    fresh.forEach(e => seenIds.current.add(e.id));
    setEvents(prev => [...fresh, ...prev].slice(0, MAX_EVENTS));
  }, []);

  const upsertAgent = useCallback((agent: TrackedAgent) => {
    setTrackedAgents(prev => {
      const idx = prev.findIndex(a => a.id === agent.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = agent;
        return next;
      }
      return [agent, ...prev];
    });
  }, []);

  const backfill = useCallback(async (url: string) => {
    try {
      const headers = makeHeaders(authTokenRef.current);
      const [eventsRes, agentsRes] = await Promise.all([
        fetch(`${url}/events/history?limit=200`, { headers }),
        fetch(`${url}/agents`, { headers }),
      ]);
      if (eventsRes.ok) {
        const data = await eventsRes.json() as { events: ProgressEvent[] };
        addEvents(data.events);
      }
      if (agentsRes.ok) {
        const data = await agentsRes.json() as { agents: TrackedAgent[] };
        setTrackedAgents(data.agents);
      }
    } catch {
      // non-fatal — SSE will carry live updates
    }
  }, [addEvents]);

  const connect = useCallback(() => {
    if (!serverUrl) return;

    setStatus('connecting');
    esRef.current?.close();

    const headers = makeHeaders(authTokenRef.current);
    const es = new EventSource<'progress' | 'agent_update' | 'agent_delete'>(
      `${serverUrl}/events/stream`,
      { headers },
    );
    esRef.current = es as unknown as EventSource;

    es.addEventListener('progress', (e: CustomEvent<'progress'>) => {
      try {
        const event = JSON.parse(e.data ?? '') as ProgressEvent;
        addEvents([event]);
      } catch { /* skip */ }
    });

    es.addEventListener('agent_update', (e: CustomEvent<'agent_update'>) => {
      try {
        const agent = JSON.parse(e.data ?? '') as TrackedAgent;
        upsertAgent(agent);
      } catch { /* skip */ }
    });

    es.addEventListener('agent_delete', (e: CustomEvent<'agent_delete'>) => {
      try {
        const { id } = JSON.parse(e.data ?? '') as { id: string };
        setTrackedAgents(prev => prev.filter(a => a.id !== id));
      } catch { /* skip */ }
    });

    es.addEventListener('open', (_e: unknown) => {
      setStatus('connected');
      backoffRef.current = 1000;
      backfill(serverUrl);
    });

    es.addEventListener('error', (_e: unknown) => {
      setStatus('error');
      es.close();

      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);

      reconnectTimer.current = setTimeout(() => connect(), delay);
    });
    // authToken in deps so changing the bearer token reconnects SSE + backfill with new headers
  }, [serverUrl, authToken, addEvents, upsertAgent, backfill]);

  const reconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    backoffRef.current = 1000;
    seenIds.current.clear();
    setEvents([]);
    setTrackedAgents([]);
    connect();
  }, [connect]);

  useEffect(() => {
    if (!serverUrl) {
      setStatus('disconnected');
      return;
    }
    connect();
    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [serverUrl, authToken, connect]);

  return { events, trackedAgents, status, reconnect };
}
