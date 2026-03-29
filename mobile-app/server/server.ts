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
import { createIntent, listIntents } from './intent';
import { readCultureSnapshot } from './culture';

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
}

// ─── State ─────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.GSTACK_PROGRESS_PORT ?? '7891', 10);
const BUFFER_CAPACITY = 200;
const HEARTBEAT_MS = 15_000;
const startedAt = Date.now();

const eventBuffer = new CircularBuffer<ProgressEvent>(BUFFER_CAPACITY);
let nextId = 1;

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
  const event: ProgressEvent = {
    id: makeId(),
    ts: partial.ts ?? now(),
    ...partial,
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

      // Heartbeat
      heartbeat = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          subscribers.delete(ctrl);
        }
      }, HEARTBEAT_MS);
    },
    cancel(ctrl) {
      clearInterval(heartbeat);
      subscribers.delete(ctrl as unknown as SSEController);
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

    // POST /agents — register a new tracked agent
    if (req.method === 'POST' && url.pathname === '/agents') {
      let body: { name?: string; description?: string } = {};
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
      };
      trackedAgents.set(agent.id, agent);
      broadcastAgentUpdate(agent);
      return new Response(JSON.stringify(agent), {
        status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // PATCH /agents/:id — update a tracked agent's status/message
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
        updated_at: now(),
      };
      trackedAgents.set(agentId, updated);
      broadcastAgentUpdate(updated);
      return new Response(JSON.stringify(updated), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // DELETE /agents/:id — remove a tracked agent
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

    // GET /agents — list all tracked agents
    if (req.method === 'GET' && url.pathname === '/agents') {
      const agents = Array.from(trackedAgents.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return new Response(JSON.stringify({ agents }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // POST /progress
    if (req.method === 'POST' && url.pathname === '/progress') {
      let body: Partial<ProgressEvent> = {};
      try {
        body = await req.json();
      } catch {
        // accept even if body is malformed — still acknowledge
      }
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

    // GET /events/stream — SSE
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

    // GET /events/history?limit=N
    if (req.method === 'GET' && url.pathname === '/events/history') {
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
      const events = eventBuffer.last(limit);
      return new Response(JSON.stringify({ events, total: eventBuffer.totalAdded }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // GET /health
    if (req.method === 'GET' && url.pathname === '/health') {
      return new Response(JSON.stringify({
        ok: true,
        events: eventBuffer.totalAdded,
        buffered: eventBuffer.length,
        subscribers: subscribers.size,
        uptime: Math.floor((Date.now() - startedAt) / 1000),
        jsonl: JSONL_PATH,
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // GET /intentra/files — list all .intentra/ files with contents
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

    // GET /intentra/latest — latest handoff entry from HANDOFFS.md
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

    // POST /intentra/intent — create a new intent artifact
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
      return new Response(JSON.stringify(artifact), {
        status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // GET /intentra/intents — list all intent artifacts
    if (req.method === 'GET' && url.pathname === '/intentra/intents') {
      const intents = listIntents();
      return new Response(JSON.stringify({ intents, count: intents.length }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // GET /intentra/culture — gstack culture.json (read-only; Intentra demonstration surface)
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
