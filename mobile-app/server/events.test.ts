/**
 * Events/history, CircularBuffer capacity, SSE headers, and /progress field passthrough.
 * Uses port range 22000–23999 to avoid conflicts with other test files.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';

const PORT = 22000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

let proc: Subprocess;

async function postProgress(msg: string, extra?: Record<string, unknown>): Promise<void> {
  await fetch(`${BASE}/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'progress', message: msg, ...extra }),
  });
}

async function getHistory(limit?: number | string): Promise<{ events: Array<Record<string, unknown>>; total: number }> {
  const q = limit !== undefined ? `?limit=${limit}` : '';
  const r = await fetch(`${BASE}/events/history${q}`);
  return r.json() as Promise<{ events: Array<Record<string, unknown>>; total: number }>;
}

beforeAll(async () => {
  proc = spawn({
    cmd: ['bun', 'run', 'server.ts'],
    cwd: import.meta.dir,
    env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT), HOME: process.env.HOME ?? '/tmp' },
    stdout: 'ignore',
    stderr: 'pipe',
  });
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`${BASE}/health`); if (r.ok) break; } catch { /* */ }
    await wait(50);
  }
});

afterAll(() => { try { proc?.kill(); } catch { /* */ } });

// ─── GET /events/history ────────────────────────────────────────────────────

describe('GET /events/history', () => {
  test('fresh server: { events: [], total: 0 } shape', async () => {
    const j = await getHistory();
    expect(Array.isArray(j.events)).toBe(true);
    expect(typeof j.total).toBe('number');
  });

  test('seeded events appear in history', async () => {
    await postProgress('seed-a');
    await postProgress('seed-b');
    await postProgress('seed-c');
    const j = await getHistory(10);
    expect(j.events.length).toBeGreaterThanOrEqual(3);
  });

  test('limit=1 returns only the most recently pushed event', async () => {
    await postProgress('last-event-marker');
    const j = await getHistory(1);
    expect(j.events.length).toBe(1);
    expect(j.events[0]!.message).toBe('last-event-marker');
  });

  test('limit=0 returns empty events array', async () => {
    const j = await getHistory(0);
    expect(j.events.length).toBe(0);
  });

  test('limit=9999 capped at 200', async () => {
    const j = await getHistory(9999);
    expect(j.events.length).toBeLessThanOrEqual(200);
  });

  test('limit=foo (non-numeric) → events is [] — NaN propagation contract', async () => {
    // parseInt('foo') = NaN → Math.min(NaN,200) = NaN → last(NaN) = [] (for-loop i<NaN is false)
    const j = await getHistory('foo');
    expect(j.events.length).toBe(0);
  });

  test('events ordered oldest-to-newest within window', async () => {
    await postProgress('order-alpha');
    await postProgress('order-beta');
    const j = await getHistory(2);
    expect(j.events[0]!.message).toBe('order-alpha');
    expect(j.events[1]!.message).toBe('order-beta');
  });

  test('event shape has id, ts, kind, source', async () => {
    await postProgress('shape-check');
    const j = await getHistory(1);
    const ev = j.events[0]!;
    expect(typeof ev.id).toBe('string');
    expect(typeof ev.ts).toBe('string');
    expect(typeof ev.kind).toBe('string');
    expect(typeof ev.source).toBe('string');
  });
});

// ─── CircularBuffer capacity via HTTP ───────────────────────────────────────

describe('CircularBuffer capacity via HTTP', () => {
  // Use a separate server to control the buffer state precisely
  let bufProc: Subprocess;
  const BUF_PORT = PORT + 100;
  const BUF = `http://127.0.0.1:${BUF_PORT}`;

  beforeAll(async () => {
    bufProc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(BUF_PORT), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    for (let i = 0; i < 80; i++) {
      try { const r = await fetch(`${BUF}/health`); if (r.ok) break; } catch { /* */ }
      await wait(50);
    }
  });

  afterAll(() => { try { bufProc?.kill(); } catch { /* */ } });

  async function postMsg(msg: string): Promise<void> {
    await fetch(`${BUF}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'progress', message: msg }),
    });
  }

  test('buffer evicts oldest on overflow', async () => {
    // POST 205 events (capacity = 200), first 5 should be evicted
    for (let i = 0; i < 205; i++) await postMsg(String(i));
    const j = await (async () => {
      const r = await fetch(`${BUF}/events/history?limit=200`);
      return r.json() as Promise<{ events: Array<Record<string, unknown>>; total: number }>;
    })();
    const messages = j.events.map((e) => e.message);
    expect(messages).not.toContain('0');   // evicted
    expect(messages).toContain('204');     // present (most recent)
  });

  test('total keeps counting past capacity', async () => {
    const r = await fetch(`${BUF}/events/history?limit=1`);
    const j = (await r.json()) as { total: number };
    expect(j.total).toBeGreaterThanOrEqual(205);
  });

  test('buffer holds at most 200 events', async () => {
    const r = await fetch(`${BUF}/events/history?limit=200`);
    const j = (await r.json()) as { events: unknown[] };
    expect(j.events.length).toBe(200);
  });

  test('last(N) is contiguous window from tail', async () => {
    // Fresh server for clean state
    const cleanPort = BUF_PORT + 100;
    const cleanProc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(cleanPort), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    try {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(`http://127.0.0.1:${cleanPort}/health`); if (r.ok) break; } catch { /* */ }
        await wait(50);
      }
      for (let i = 1; i <= 10; i++) {
        await fetch(`http://127.0.0.1:${cleanPort}/progress`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: String(i) }),
        });
      }
      const r = await fetch(`http://127.0.0.1:${cleanPort}/events/history?limit=3`);
      const j = (await r.json()) as { events: Array<Record<string, unknown>> };
      expect(j.events.map((e) => e.message)).toEqual(['8', '9', '10']);
    } finally {
      try { cleanProc.kill(); } catch { /* */ }
    }
  });
});

// ─── GET /events/stream SSE ─────────────────────────────────────────────────

describe('GET /events/stream SSE', () => {
  test('Content-Type is text/event-stream', async () => {
    const controller = new AbortController();
    const r = await fetch(`${BASE}/events/stream`, { signal: controller.signal });
    const ct = r.headers.get('Content-Type') ?? '';
    controller.abort();
    expect(ct).toContain('text/event-stream');
  });

  test('Cache-Control is no-cache', async () => {
    const controller = new AbortController();
    const r = await fetch(`${BASE}/events/stream`, { signal: controller.signal });
    const cc = r.headers.get('Cache-Control') ?? '';
    controller.abort();
    expect(cc).toBe('no-cache');
  });

  test('sse_subscriber_opens_total increments on connect', async () => {
    const h0 = await fetch(`${BASE}/health`);
    const j0 = (await h0.json()) as { metrics: { sse_subscriber_opens_total: number } };
    const before = j0.metrics.sse_subscriber_opens_total;
    const controller = new AbortController();
    await fetch(`${BASE}/events/stream`, { signal: controller.signal });
    controller.abort();
    // Allow server to register the connection
    await wait(50);
    const h1 = await fetch(`${BASE}/health`);
    const j1 = (await h1.json()) as { metrics: { sse_subscriber_opens_total: number } };
    expect(j1.metrics.sse_subscriber_opens_total).toBeGreaterThanOrEqual(before + 1);
  });
});

// ─── POST /progress field passthrough ───────────────────────────────────────

describe('POST /progress field passthrough', () => {
  test('all optional fields preserved in history', async () => {
    await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'tool_use',
        source: 'hook',
        session_id: 'sess-passthrough',
        intent_id: 'intent_passthrough',
        skill: 'ship',
        message: 'passthrough-msg',
        step: 'step1',
        pct: 42,
        tool_name: 'Edit',
      }),
    });
    const j = await getHistory(1);
    const ev = j.events[0]!;
    expect(ev.kind).toBe('tool_use');
    expect(ev.source).toBe('hook');
    expect(ev.session_id).toBe('sess-passthrough');
    expect(ev.intent_id).toBe('intent_passthrough');
    expect(ev.skill).toBe('ship');
    expect(ev.message).toBe('passthrough-msg');
    expect(ev.step).toBe('step1');
    expect(ev.pct).toBe(42);
    expect(ev.tool_name).toBe('Edit');
  });

  test('defaults kind to progress when omitted', async () => {
    await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'no-kind' }),
    });
    const j = await getHistory(1);
    expect(j.events[0]!.kind).toBe('progress');
  });

  test('malformed JSON body — server still returns 201', async () => {
    const r = await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json at all',
    });
    expect(r.status).toBe(201);
  });
});
