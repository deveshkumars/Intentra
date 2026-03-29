/**
 * gstack progress server — real-time agent activity feed for the mobile monitor app.
 *
 * Sources:
 *   POST /progress           — agents call this (via bin/gstack-progress or directly)
 *   fs.watch skill-usage.jsonl — picks up skill_start / skill_end from telemetry
 *   PostToolUse hook (opt.)  — tool-use events from Claude Code settings.json
 *
 * Consumers:
 *   GET /events/stream       — SSE, replays ring buffer then live broadcast
 *   GET /events/history      — REST fallback for backfill on reconnect
 *   GET /health              — no auth, used by app to verify connection
 *
 * Port: 7891 (fixed — ngrok needs a stable target)
 */

import fs from 'fs';
import path from 'path';
import { createIntent, getIntent, listIntents, updateIntentOutcome, isIntentOutcome } from './intent';
import { readCultureSnapshot } from './culture';
import {
  appendIntentraGuardTelemetry,
  evaluateCommandGuard,
  listGuardRulePublicMeta,
} from './guard';
import { countHandoffBlocks, parseEntries } from '../shared/handoff-parse.ts';
import { GUARD_ENGINE, GUARD_RULE_COUNT, GUARD_RULE_IDS } from './guard-policy';

// ─── CircularBuffer (copied verbatim from browse/src/buffers.ts) ───────────

class CircularBuffer<T> {
  private buffer: (T | undefined)[];
  private head: number = 0;
  private _size: number = 0;
  private _totalAdded: number = 0;
  readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(entry: T): void {
    const index = (this.head + this._size) % this.capacity;
    this.buffer[index] = entry;
    if (this._size < this.capacity) {
      this._size++;
    } else {
      this.head = (this.head + 1) % this.capacity;
    }
    this._totalAdded++;
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this._size; i++) {
      result.push(this.buffer[(this.head + i) % this.capacity] as T);
    }
    return result;
  }

  last(n: number): T[] {
    const count = Math.min(n, this._size);
    const result: T[] = [];
    const start = (this.head + this._size - count) % this.capacity;
    for (let i = 0; i < count; i++) {
      result.push(this.buffer[(start + i) % this.capacity] as T);
    }
    return result;
  }

  get length(): number { return this._size; }
  get totalAdded(): number { return this._totalAdded; }
}

// ─── Types ─────────────────────────────────────────────────────────────────

export type EventKind = 'skill_start' | 'skill_end' | 'progress' | 'tool_use' | 'hook_fire';

export type IngestLane = 'intentra_jsonl_bridge' | 'intentra_http';

export interface ProgressEvent {
  id: string;
  ts: string;
  kind: EventKind;
  source: 'jsonl_watcher' | 'post' | 'hook';
  session_id?: string;
  intent_id?: string;
  skill?: string;
  message?: string;
  step?: string;
  pct?: number;
  tool_name?: string;
  outcome?: 'success' | 'error' | 'unknown';
  duration_s?: number;
  ingest_lane?: IngestLane;
  upstream_kind?: string;
}

export interface TrackedAgent {
  id: string;
  name: string;
  description?: string;
  status: 'running' | 'done' | 'error';
  created_at: string;
  updated_at: string;
  message?: string;
  /** Optional session_id linking this agent to ProgressEvent.session_id for event filtering. */
  session_id?: string;
}

// ─── State ─────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.GSTACK_PROGRESS_PORT ?? '7891', 10);
const BUFFER_CAPACITY = 200;
const HEARTBEAT_MS = 15_000;
const startedAt = Date.now();

const eventBuffer = new CircularBuffer<ProgressEvent>(BUFFER_CAPACITY);
let nextId = 1;

/** MVP counters (evaluator-verifiable via GET /health). */
const serverMetrics = {
  post_progress_total: 0,
  jsonl_lines_ingested_total: 0,
  sse_subscriber_opens_total: 0,
  sse_subscriber_closes_total: 0,
};

type SSEController = ReadableStreamDefaultController<Uint8Array>;
const subscribers = new Set<SSEController>();

// ─── Tracked agents ────────────────────────────────────────────────────────

const trackedAgents = new Map<string, TrackedAgent>();
let agentCounter = 1;

function makeAgentId(): string {
  return `agent_${Date.now()}_${agentCounter++}`;
}

function broadcastAgentUpdate(agent: TrackedAgent): void {
  const line = `event: agent_update\ndata: ${JSON.stringify(agent)}\n\n`;
  const bytes = new TextEncoder().encode(line);
  for (const ctrl of subscribers) {
    try {
      ctrl.enqueue(bytes);
    } catch {
      subscribers.delete(ctrl);
    }
  }
}

// ─── Event helpers ─────────────────────────────────────────────────────────

function makeId(): string {
  return String(nextId++);
}

function now(): string {
  return new Date().toISOString();
}

function addEvent(partial: Omit<ProgressEvent, 'id' | 'ts'> & { ts?: string }): ProgressEvent {
  // Destructure ts out before spreading so `ts: undefined` in partial
  // cannot override the computed timestamp.
  const { ts: partialTs, ...rest } = partial;
  const event: ProgressEvent = {
    id: makeId(),
    ts: partialTs ?? now(),
    ...rest,
  };
  eventBuffer.push(event);
  broadcast(event);
  return event;
}

function broadcast(event: ProgressEvent): void {
  const line = `event: progress\ndata: ${JSON.stringify(event)}\n\n`;
  const bytes = new TextEncoder().encode(line);
  for (const ctrl of subscribers) {
    try {
      ctrl.enqueue(bytes);
    } catch {
      subscribers.delete(ctrl);
    }
  }
}

// ─── JSONL watcher (skill-usage.jsonl → skill_start / skill_end) ───────────

const STATE_DIR = process.env.GSTACK_STATE_DIR ?? path.join(process.env.HOME ?? '~', '.gstack');
const JSONL_PATH = path.join(STATE_DIR, 'analytics', 'skill-usage.jsonl');

let jsonlOffset = 0;

function readNewJsonlLines(): void {
  try {
    const stat = fs.statSync(JSONL_PATH);
    if (stat.size <= jsonlOffset) return;
    const fd = fs.openSync(JSONL_PATH, 'r');
    const buf = Buffer.alloc(stat.size - jsonlOffset);
    fs.readSync(fd, buf, 0, buf.length, jsonlOffset);
    fs.closeSync(fd);
    jsonlOffset = stat.size;

    const lines = buf.toString('utf-8').split('\n').filter(Boolean);
    serverMetrics.jsonl_lines_ingested_total += lines.length;
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as Record<string, unknown>;
        // gstack hook telemetry (careful/freeze) — Intentra normalizes into the shared feed
        if (entry.event === 'hook_fire') {
          const pattern = typeof entry.pattern === 'string' ? entry.pattern : 'unknown';
          const hookSkill = typeof entry.skill === 'string' ? entry.skill : 'hook';
          addEvent({
            kind: 'hook_fire',
            source: 'jsonl_watcher',
            ingest_lane: 'intentra_jsonl_bridge',
            upstream_kind: 'gstack_hook_fire',
            skill: hookSkill,
            step: pattern,
            message: `Safety hook blocked: ${hookSkill} · ${pattern}`,
            session_id: typeof entry.session_id === 'string' ? entry.session_id : undefined,
            ts: typeof entry.ts === 'string' ? entry.ts : now(),
          });
          continue;
        }
        // skill-usage.jsonl — gstack-telemetry-log uses event_type: "skill_run"
        if (entry.event_type === 'skill_run') {
          addEvent({
            kind: 'skill_end',
            source: 'jsonl_watcher',
            ingest_lane: 'intentra_jsonl_bridge',
            upstream_kind: 'gstack_skill_run',
            skill: typeof entry.skill === 'string' ? entry.skill : undefined,
            session_id: typeof entry.session_id === 'string' ? entry.session_id : undefined,
            outcome: (entry.outcome as ProgressEvent['outcome']) ?? 'unknown',
            duration_s: typeof entry.duration_s === 'number' ? entry.duration_s : undefined,
            ts: typeof entry.ts === 'string' ? entry.ts : now(),
          });
          continue;
        }
        // Plain entries written by the preamble — no event/event_type field.
        // Discriminate by presence of duration_s: epilogue entries (skill completion)
        // have duration_s; preamble start entries do not.
        if (typeof entry.skill === 'string' && !entry.event && !entry.event_type) {
          const hasDuration = typeof entry.duration_s === 'number' || typeof entry.duration_s === 'string';
          const sessionId = typeof entry.session_id === 'string' ? entry.session_id
            : typeof entry.session === 'string' ? entry.session : undefined;
          if (hasDuration) {
            // Telemetry epilogue: {"skill":"...","duration_s":"...","outcome":"...","ts":"..."}
            const durationS = typeof entry.duration_s === 'number' ? entry.duration_s
              : parseFloat(entry.duration_s as string) || undefined;
            addEvent({
              kind: 'skill_end',
              source: 'jsonl_watcher',
              ingest_lane: 'intentra_jsonl_bridge',
              upstream_kind: 'gstack_skill_run',
              skill: entry.skill,
              session_id: sessionId,
              outcome: (entry.outcome as ProgressEvent['outcome']) ?? 'unknown',
              duration_s: durationS,
              message: `Completed: ${entry.skill} (${entry.outcome ?? 'unknown'})`,
              ts: typeof entry.ts === 'string' ? entry.ts : now(),
            });
          } else {
            // Preamble start entry: {"skill":"...","ts":"...","repo":"...","session_id":"..."}
            addEvent({
              kind: 'skill_start',
              source: 'jsonl_watcher',
              ingest_lane: 'intentra_jsonl_bridge',
              upstream_kind: 'gstack_skill_run',
              skill: entry.skill,
              session_id: sessionId,
              message: `Started: ${entry.skill}`,
              ts: typeof entry.ts === 'string' ? entry.ts : now(),
            });
          }
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file doesn't exist yet — fine, will try again on next change
  }
}

// Initialise offset to current file size so we don't replay historical events on startup
try {
  jsonlOffset = fs.statSync(JSONL_PATH).size;
} catch {
  jsonlOffset = 0;
}

// Watch for appends
try {
  fs.watch(JSONL_PATH, () => readNewJsonlLines());
} catch {
  // File may not exist yet; also watch the parent directory for creation
  try {
    fs.watch(path.dirname(JSONL_PATH), (event, filename) => {
      if (filename === 'skill-usage.jsonl') readNewJsonlLines();
    });
  } catch {
    // analytics dir doesn't exist yet — polling fallback
    setInterval(() => {
      try {
        const size = fs.statSync(JSONL_PATH).size;
        if (size > jsonlOffset) readNewJsonlLines();
      } catch { /* still not there */ }
    }, 2000);
  }
}

// ─── SSE stream builder ────────────────────────────────────────────────────

function makeSSEStream(): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval>;

  return new ReadableStream<Uint8Array>({
    start(ctrl) {
      // Replay tracked agents
      for (const agent of trackedAgents.values()) {
        ctrl.enqueue(enc.encode(`event: agent_update\ndata: ${JSON.stringify(agent)}\n\n`));
      }
      // Replay event buffer
      for (const ev of eventBuffer.toArray()) {
        ctrl.enqueue(enc.encode(`event: progress\ndata: ${JSON.stringify(ev)}\n\n`));
      }
      subscribers.add(ctrl);
      serverMetrics.sse_subscriber_opens_total++;

      // Heartbeat
      heartbeat = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          if (subscribers.delete(ctrl)) serverMetrics.sse_subscriber_closes_total++;
        }
      }, HEARTBEAT_MS);
    },
    cancel(ctrl) {
      clearInterval(heartbeat);
      if (subscribers.delete(ctrl as unknown as SSEController)) {
        serverMetrics.sse_subscriber_closes_total++;
      }
    },
  });
}

// ─── Auth ─────────────────────────────────────────────────────────────────

const AUTH_TOKEN = process.env.INTENTRA_TOKEN ?? null;

/** Returns a 401 Response if auth fails, or null if auth passes. */
function checkAuth(req: Request, corsHeaders: Record<string, string>): Response | null {
  if (!AUTH_TOKEN) return null; // no token configured — open mode
  const header = req.headers.get('authorization') ?? '';
  if (header === `Bearer ${AUTH_TOKEN}`) return null;
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// ─── HTTP server ───────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS — allow ngrok + localhost origins
    const origin = req.headers.get('origin') ?? '*';
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, ngrok-skip-browser-warning',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Auth gate — protect write endpoints (POST, PATCH, DELETE)
    if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE') {
      const denied = checkAuth(req, corsHeaders);
      if (denied) return denied;
    }

    /**
     * POST /agents — register a new tracked agent.
     * Requires JSON body with `name` (string, required) and optional `description`.
     * Returns 201 with the created TrackedAgent. Broadcasts `agent_update` SSE event.
     * Returns 400 if `name` is missing.
     */
    if (req.method === 'POST' && url.pathname === '/agents') {
      let body: { name?: string; description?: string; session_id?: string } = {};
      try { body = await req.json(); } catch { /* ignore */ }
      if (!body.name) {
        return new Response(JSON.stringify({ error: 'name is required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const agent: TrackedAgent = {
        id: makeAgentId(),
        name: body.name,
        description: body.description,
        status: 'running',
        created_at: now(),
        updated_at: now(),
        ...(body.session_id ? { session_id: body.session_id } : {}),
      };
      trackedAgents.set(agent.id, agent);
      broadcastAgentUpdate(agent);
      return new Response(JSON.stringify(agent), {
        status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * PATCH /agents/:id — update a tracked agent's status, name, description, or message.
     * Accepts partial TrackedAgent JSON body. Broadcasts `agent_update` SSE event.
     * Returns 404 if the agent ID doesn't exist.
     */
    if (req.method === 'PATCH' && url.pathname.startsWith('/agents/')) {
      const agentId = url.pathname.slice('/agents/'.length);
      const agent = trackedAgents.get(agentId);
      if (!agent) {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      let body: Partial<TrackedAgent> = {};
      try { body = await req.json(); } catch { /* ignore */ }
      const updated: TrackedAgent = {
        ...agent,
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.message !== undefined && { message: body.message }),
        ...(body.session_id !== undefined && { session_id: body.session_id }),
        updated_at: now(),
      };
      trackedAgents.set(agentId, updated);
      broadcastAgentUpdate(updated);
      return new Response(JSON.stringify(updated), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * DELETE /agents/:id — remove a tracked agent.
     * Broadcasts `agent_delete` SSE event with the removed agent's ID.
     * Returns 404 if the agent ID doesn't exist.
     */
    if (req.method === 'DELETE' && url.pathname.startsWith('/agents/')) {
      const agentId = url.pathname.slice('/agents/'.length);
      if (!trackedAgents.has(agentId)) {
        return new Response(JSON.stringify({ error: 'not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      trackedAgents.delete(agentId);
      const enc = new TextEncoder();
      const line = `event: agent_delete\ndata: ${JSON.stringify({ id: agentId })}\n\n`;
      const bytes = enc.encode(line);
      for (const ctrl of subscribers) {
        try { ctrl.enqueue(bytes); } catch { subscribers.delete(ctrl); }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /agents — list all tracked agents sorted by creation time (newest first). */
    if (req.method === 'GET' && url.pathname === '/agents') {
      const agents = Array.from(trackedAgents.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return new Response(JSON.stringify({ agents }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * POST /progress — ingest a progress event. Always returns 201, even with
     * malformed or empty body (fire-and-forget design for hooks and scripts).
     * Defaults: kind='progress', source='post', ingest_lane='intentra_http'.
     */
    if (req.method === 'POST' && url.pathname === '/progress') {
      let body: Partial<ProgressEvent> = {};
      try {
        body = await req.json();
      } catch {
        // accept even if body is malformed — still acknowledge
      }
      serverMetrics.post_progress_total++;
      addEvent({
        kind: body.kind ?? 'progress',
        source: body.source ?? 'post',
        ingest_lane: body.ingest_lane ?? 'intentra_http',
        upstream_kind: body.upstream_kind,
        session_id: body.session_id,
        intent_id: body.intent_id,
        skill: body.skill,
        message: body.message,
        step: body.step,
        pct: body.pct,
        tool_name: body.tool_name,
        outcome: body.outcome,
        duration_s: body.duration_s,
        ts: body.ts,
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * GET /events/stream — Server-Sent Events stream.
     * On connect: replays all tracked agents (agent_update events) and the ring
     * buffer (progress events), then streams live events. 15s heartbeat keep-alive.
     */
    if (req.method === 'GET' && url.pathname === '/events/stream') {
      return new Response(makeSSEStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders,
        },
      });
    }

    /**
     * GET /events/history?limit=N — REST fallback for event backfill.
     * Returns the last N events from the ring buffer (default 50, max 200).
     * Use this when SSE reconnect needs historical context.
     */
    if (req.method === 'GET' && url.pathname === '/events/history') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
      const events = eventBuffer.last(limit);
      return new Response(JSON.stringify({ events, total: eventBuffer.totalAdded }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * GET /health — connection check (no auth, no side effects).
     * Returns ok status, event/subscriber counts, uptime, guard engine metadata,
     * and MVP metrics counters for evaluator verification.
     */
    if (req.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        events: eventBuffer.totalAdded,
        buffered: eventBuffer.length,
        subscribers: subscribers.size,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        jsonl: JSONL_PATH,
        guard_engine_version: GUARD_ENGINE.version,
        rule_count: GUARD_RULE_COUNT,
        metrics: { ...serverMetrics },
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /intentra/files — list all non-hidden files in .intentra/ with full text content. */
    if (req.method === 'GET' && url.pathname === '/intentra/files') {
      const dir = path.join(process.env.INTENTRA_REPO_ROOT ?? process.cwd(), '.intentra');
      if (!fs.existsSync(dir)) {
        return new Response(JSON.stringify({ files: [] }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const entries = fs.readdirSync(dir).filter(f => !f.startsWith('.')).sort();
      const files = entries.map(name => ({
        name,
        content: fs.readFileSync(path.join(dir, name), 'utf-8'),
      }));
      return new Response(JSON.stringify({ files }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * GET /intentra/handoffs/summary — parsed HANDOFFS.md entries (same parser as mobile Handoffs tab).
     * Uses shared `parseEntries` / `countHandoffBlocks` from `mobile-app/shared/handoff-parse.ts`.
     */
    if (req.method === 'GET' && url.pathname === '/intentra/handoffs/summary') {
      const handoffsPath = path.join(
        process.env.INTENTRA_REPO_ROOT ?? process.cwd(), '.intentra', 'HANDOFFS.md'
      );
      if (!fs.existsSync(handoffsPath)) {
        return new Response(JSON.stringify({ entries: [], count: 0, block_count: 0 }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const raw = fs.readFileSync(handoffsPath, 'utf-8');
      const entries = parseEntries(raw);
      const slim = entries.map(e => ({
        date: e.date,
        author: e.author,
        summary: e.summary,
      }));
      return new Response(JSON.stringify({
        count: entries.length,
        block_count: countHandoffBlocks(raw),
        entries: slim,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /intentra/latest — extract the last '---'-separated entry from HANDOFFS.md. */
    if (req.method === 'GET' && url.pathname === '/intentra/latest') {
      const handoffsPath = path.join(
        process.env.INTENTRA_REPO_ROOT ?? process.cwd(), '.intentra', 'HANDOFFS.md'
      );
      if (!fs.existsSync(handoffsPath)) {
        return new Response(JSON.stringify({ latest: null }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const raw = fs.readFileSync(handoffsPath, 'utf-8');
      // Entries are separated by "\n---\n". Last non-empty block is the latest.
      const blocks = raw.split(/\n---\n/).map(b => b.trim()).filter(Boolean);
      const latest = blocks.length > 0 ? blocks[blocks.length - 1] : null;
      return new Response(JSON.stringify({ latest }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /intentra/intent/:id — fetch a single intent artifact by its exact ID. Returns 404 if not found. */
    if (req.method === 'GET' && url.pathname.startsWith('/intentra/intent/')) {
      const intentId = decodeURIComponent(url.pathname.slice('/intentra/intent/'.length));
      const intent = getIntent(intentId);
      if (!intent) {
        return new Response(JSON.stringify({ error: 'intent not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      return new Response(JSON.stringify(intent), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * PATCH /intentra/intent — set outcome on an existing intent artifact.
     * Body: { intent_id: string, outcome: 'success'|'error'|'cancelled' }.
     * Emits SSE event with upstream_kind='intent_resolved'. Returns 400 for
     * invalid outcome, 404 if intent not found.
     */
    if (req.method === 'PATCH' && url.pathname === '/intentra/intent') {
      let body: { intent_id?: string; outcome?: string } = {};
      try {
        body = await req.json();
      } catch {
        /* ignore */
      }
      if (!body.intent_id || typeof body.intent_id !== 'string') {
        return new Response(JSON.stringify({ error: 'intent_id is required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      if (!body.outcome || !isIntentOutcome(body.outcome)) {
        return new Response(
          JSON.stringify({ error: 'outcome must be success, error, or cancelled' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      }
      const updated = updateIntentOutcome(body.intent_id, body.outcome);
      if (!updated) {
        return new Response(JSON.stringify({ error: 'intent not found' }), {
          status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      // Emit SSE so mobile gets notified of resolution
      addEvent({
        kind: 'progress',
        source: 'post',
        ingest_lane: 'intentra_http',
        upstream_kind: 'intent_resolved',
        intent_id: updated.intent_id,
        outcome: body.outcome as ProgressEvent['outcome'],
        message: `Intent resolved: ${body.outcome} — ${updated.prompt.slice(0, 60)}`,
      });
      return new Response(JSON.stringify(updated), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /**
     * POST /intentra/intent — create a new intent artifact under .intentra/.
     * Body: { prompt (required), repo?, constraints?, culture_ref?, plan? }.
     * Auto-detects git branch and culture.json path. Emits SSE event with
     * upstream_kind='intent_created'. Returns 400 if prompt is missing.
     */
    if (req.method === 'POST' && url.pathname === '/intentra/intent') {
      let body: Record<string, unknown> = {};
      try { body = await req.json(); } catch { /* ignore */ }
      if (!body.prompt || typeof body.prompt !== 'string') {
        return new Response(JSON.stringify({ error: 'prompt is required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const artifact = createIntent({
        prompt: body.prompt as string,
        repo: body.repo as { path?: string; branch?: string } | undefined,
        constraints: body.constraints as Record<string, unknown> | undefined,
        culture_ref: body.culture_ref as string | undefined,
        plan: body.plan as Array<{ type: string; [k: string]: unknown }> | undefined,
      });
      // Emit SSE so mobile gets notified without polling
      addEvent({
        kind: 'progress',
        source: 'post',
        ingest_lane: 'intentra_http',
        upstream_kind: 'intent_created',
        intent_id: artifact.intent_id,
        message: `Intent created: ${artifact.prompt.slice(0, 80)}`,
      });
      return new Response(JSON.stringify(artifact), {
        status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /intentra/intents — list all intent JSON artifacts from .intentra/, sorted chronologically. */
    if (req.method === 'GET' && url.pathname === '/intentra/intents') {
      const intents = listIntents();
      return new Response(JSON.stringify({ intents, count: intents.length }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /intentra/guard/rules — public guard rule metadata (ids, categories, risk scores). No matcher functions exposed. */
    if (req.method === 'GET' && url.pathname === '/intentra/guard/rules') {
      return new Response(
        JSON.stringify({
          engine: { ...GUARD_ENGINE },
          rules: listGuardRulePublicMeta(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    /** GET /intentra/guard/schema — JSON Schema for culture.json intentra fragment + valid rule IDs. */
    if (req.method === 'GET' && url.pathname === '/intentra/guard/schema') {
      try {
        const schemaPath = path.join(import.meta.dir, 'schemas', 'culture-intentra.fragment.json');
        const raw = fs.readFileSync(schemaPath, 'utf-8');
        const culture_fragment_schema = JSON.parse(raw) as unknown;
        return new Response(
          JSON.stringify({
            culture_fragment_schema,
            culture_fragment_schema_path: 'mobile-app/server/schemas/culture-intentra.fragment.json',
            rule_ids: [...GUARD_RULE_IDS].sort(),
            engine: { ...GUARD_ENGINE },
            rule_count: GUARD_RULE_COUNT,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
        );
      } catch {
        return new Response(JSON.stringify({ error: 'schema_unavailable' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }

    /**
     * POST /intentra/guard — evaluate a command against the guard policy engine.
     * Body: { command (required), session_id?, debug? }. Returns verdict (allow/warn/deny),
     * pattern, risk_score, rule metadata, and optional debug trace. On deny/warn, appends
     * to .intentra/telemetry/intentra-guard.jsonl and emits SSE hook_fire event.
     * Enable debug via body `debug: true` or header `X-Intentra-Guard-Debug: 1`.
     */
    if (req.method === 'POST' && url.pathname === '/intentra/guard') {
      let body: { command?: string; session_id?: string; debug?: boolean } = {};
      try {
        body = await req.json();
      } catch {
        /* ignore */
      }
      if (!body.command || typeof body.command !== 'string') {
        return new Response(JSON.stringify({ error: 'command is required' }), {
          status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const debug =
        body.debug === true || req.headers.get('x-intentra-guard-debug') === '1';
      const snap = readCultureSnapshot();
      const result = evaluateCommandGuard(body.command, snap.culture, { debug });
      const ts = now();
      if (result.verdict === 'deny' || result.verdict === 'warn') {
        appendIntentraGuardTelemetry({
          event: 'intentra_guard',
          verdict: result.verdict,
          pattern: result.pattern,
          ts,
          risk_score: result.risk_score,
          guard_engine_version: GUARD_ENGINE.version,
        });
        addEvent({
          kind: 'hook_fire',
          source: 'post',
          ingest_lane: 'intentra_http',
          upstream_kind: 'intentra_guard',
          skill: 'intentra_guard',
          step: result.pattern,
          message: result.message,
          session_id: body.session_id,
          ts,
        });
      }
      return new Response(JSON.stringify(result), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    /** GET /intentra/culture — re-serve gstack's culture.json for mobile audit and intent linkage (read-only). */
    if (req.method === 'GET' && url.pathname === '/intentra/culture') {
      const snap = readCultureSnapshot();
      return new Response(
        JSON.stringify({
          ...snap,
          note:
            'File is written and consumed by gstack skills; Intentra re-serves it for mobile audit and intent linkage.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } },
      );
    }

    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
});

console.log(`gstack progress server running on http://localhost:${PORT}`);
console.log(`Watching: ${JSONL_PATH}`);
console.log(`\nStart ngrok:  ngrok http ${PORT}`);
console.log(`Then paste the ngrok URL into the Expo app setup screen.\n`);
