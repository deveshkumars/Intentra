# Mobile app — architecture overview

The Intentra mobile app is a React Native Expo app (`mobile-app/app/`) that connects to the progress server via SSE and displays agent activity in real time. This document covers the screen layout, data model, SSE hook, and how to extend it.

**Related:** [Quickstart](quickstart.md) · [API Reference](api-reference.md) · [Testing Guide](../mobile-app/TESTING.md)

---

## Screen layout

The app has four screens managed by a simple stack + tab model in `App.tsx`:

| Screen | File | What it shows |
|--------|------|---------------|
| **Setup** | `SetupScreen.tsx` | Server URL + optional Bearer token entry. State persisted via AsyncStorage (`storage.ts`). Shown first if no URL is configured. |
| **Dashboard** | `DashboardScreen.tsx` | Live agent cards + event feed. SSE connection status dot. Intent filter chips. Pull-to-refresh. |
| **Detail** | `DetailScreen.tsx` | Per-agent event timeline. Filters events by `session_id` match (falls back to time-window). Shows absolute timestamps and session duration. |
| **Handoffs** | `HandoffScreen.tsx` | Three-tab view of `.intentra/HANDOFFS.md`, `PROMPTS.md`, `PLANS.md` fetched via `GET /intentra/files`. Newest block first, pulled from shared `handoff-parse.ts`. |
| **Intents** | `IntentScreen.tsx` | Intent artifact list (`GET /intentra/intents`) + culture config (`GET /intentra/culture`). Expandable cards per intent. |

Navigation: Dashboard ↔ Detail is a push/pop. Setup, Handoffs, and Intents are tabs (or drawer items, depending on screen size).

---

## Data model

Defined in `mobile-app/app/src/types.ts`:

```typescript
type EventKind = 'skill_start' | 'skill_end' | 'progress' | 'tool_use' | 'hook_fire';
type IngestLane = 'intentra_jsonl_bridge' | 'intentra_http';

interface ProgressEvent {
  id: string;
  ts: string;               // ISO-8601 UTC
  kind: EventKind;
  source: 'jsonl_watcher' | 'post' | 'hook';
  session_id?: string;
  intent_id?: string;       // links event to an IntentArtifact
  skill?: string;
  message?: string;
  step?: string;
  pct?: number;
  tool_name?: string;
  outcome?: 'success' | 'error' | 'unknown';
  duration_s?: number;
  ingest_lane?: IngestLane; // provenance — always set for JSONL-backed events
  upstream_kind?: string;   // gstack origin: gstack_skill_run, gstack_hook_fire, etc.
}

interface TrackedAgent {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'done' | 'error';
  created_at: string;
  updated_at: string;
  message?: string;
  session_id?: string;      // links agent to ProgressEvent.session_id
}
```

---

## SSE hook — `useEventStream`

`mobile-app/app/src/useEventStream.ts` is the single state source for the app. It:

1. **Connects** to `GET /events/stream` using `react-native-sse`
2. **Backfills** on connect/reconnect: fetches `GET /events/history?limit=200` + `GET /agents` in parallel to fill any gap while disconnected
3. **Deduplicates** events by `id` (in-memory `Set<string>`) so backfill + live stream don't produce duplicates
4. **Caps** the event list at 200 entries (matches ring buffer capacity)
5. **Reconnects** with exponential backoff: 1s → 2s → 4s → … → 30s max

```
connect → backfill (history + agents) → live stream
                                           ↓ error
                                        backoff → connect
```

The hook returns `{ events, trackedAgents, status, reconnect }`. All screens receive these as props from `App.tsx`.

**ngrok interstitial:** All fetch calls include `ngrok-skip-browser-warning: true` so ngrok tunnels don't inject the browser-warning page into API responses.

**Auth:** The hook accepts an optional `authToken`. If set, all requests include `Authorization: Bearer <token>`.

---

## Event-to-agent linking (Detail screen)

`DetailScreen.tsx` filters the full event list down to events relevant to the tapped agent:

```typescript
function filterAgentEvents(agent: TrackedAgent, events: ProgressEvent[]): ProgressEvent[] {
  // Primary: session_id match
  if (agent.session_id) {
    const bySession = events.filter(e => e.session_id === agent.session_id);
    if (bySession.length > 0) return bySession;
  }
  // Fallback: events within the agent's time window (created_at → updated_at + 5s)
  const start = new Date(agent.created_at).getTime();
  const end   = new Date(agent.updated_at).getTime() + 5_000;
  return events.filter(e => {
    const t = new Date(e.ts).getTime();
    return t >= start && t <= end;
  });
}
```

The `session_id` match is exact and preferred. The time-window fallback handles agents created before `session_id` linking was wired up.

---

## Intent filter (Dashboard)

The Dashboard fetches `GET /intentra/intents` and renders up to 12 intent IDs as filter chips. Tapping a chip sets `intentEventFilter` — the event list is then filtered to events whose `intent_id` matches. Tapping again clears the filter.

---

## Local state persistence

`mobile-app/app/src/storage.ts` wraps `@react-native-async-storage/async-storage` with two keys:

- `intentra_server_url` — the server URL entered in Setup
- `intentra_auth_token` — the optional Bearer token

Both are read on app launch and written on Setup form submission.

---

## Key components

| Component | What it renders |
|-----------|----------------|
| `AgentCard` | Status badge + name + description + last message. Tappable → Detail screen. |
| `EventRow` | Single event row: kind badge, message, timestamp, optional `pct` progress bar, optional `duration_s`. |
| `ConnectionStatus` | Dot (green/amber/gray/red) + label reflecting `useEventStream` status. |

---

## Adding a new screen

1. Create `mobile-app/app/src/screens/MyScreen.tsx`
2. Add it to the navigation in `App.tsx` (tab or stack)
3. If it needs server data: fetch directly from `serverUrl` (passed as prop) or add state to the `useEventStream` hook if it requires SSE data
4. Update `mobile-app/TESTING.md` with smoke test expectations

---

## Running locally

```bash
cd mobile-app/app
bun install
bunx expo start
```

Scan the QR code with Expo Go. On the Setup screen, enter your server URL (e.g. the ngrok URL from `docs/quickstart.md`).
