/**
 * CORS headers and HTTP contract tests — validates that CORS is properly set
 * on all endpoints, OPTIONS preflight works, and 404 handling is correct.
 *
 * Uses port range 26000–27999 to avoid conflicts.
 * All tests pass.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';

const PORT = 26000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

let proc: Subprocess;

beforeAll(async () => {
  proc = spawn({
    cmd: ['bun', 'run', 'server.ts'],
    cwd: import.meta.dir,
    env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT), HOME: process.env.HOME ?? '/tmp' },
    stdout: 'ignore',
    stderr: 'pipe',
  });
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    await wait(50);
  }
});

afterAll(() => {
  try { proc?.kill(); } catch { /* ignore */ }
});

// ─── CORS on GET endpoints ──────────────────────────────────────────────────

describe('CORS headers on GET endpoints', () => {
  const endpoints = [
    '/health',
    '/agents',
    '/events/history',
    '/intentra/intents',
    '/intentra/culture',
    '/intentra/guard/rules',
    '/intentra/guard/schema',
  ];

  for (const endpoint of endpoints) {
    test(`GET ${endpoint} includes Access-Control-Allow-Origin`, async () => {
      const r = await fetch(`${BASE}${endpoint}`, {
        headers: { Origin: 'https://example.ngrok.io' },
      });
      const acao = r.headers.get('Access-Control-Allow-Origin');
      expect(acao).toBeTruthy();
    });
  }
});

// ─── CORS on POST endpoints ─────────────────────────────────────────────────

describe('CORS headers on POST endpoints', () => {
  test('POST /progress includes CORS headers', async () => {
    const r = await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://my-app.ngrok.io',
      },
      body: JSON.stringify({ kind: 'progress', message: 'cors test' }),
    });
    expect(r.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });

  test('POST /agents includes CORS headers', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://my-app.ngrok.io',
      },
      body: JSON.stringify({ name: 'cors-agent' }),
    });
    expect(r.headers.get('Access-Control-Allow-Origin')).toBeTruthy();
  });
});

// ─── OPTIONS preflight ──────────────────────────────────────────────────────

describe('OPTIONS preflight', () => {
  test('OPTIONS returns 204 with correct headers', async () => {
    const r = await fetch(`${BASE}/progress`, {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.com' },
    });
    expect(r.status).toBe(204);
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('PATCH');
    expect(r.headers.get('Access-Control-Allow-Methods')).toContain('DELETE');
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    expect(r.headers.get('Access-Control-Allow-Headers')).toContain('ngrok-skip-browser-warning');
  });

  test('OPTIONS on /agents returns 204', async () => {
    const r = await fetch(`${BASE}/agents`, { method: 'OPTIONS' });
    expect(r.status).toBe(204);
  });

  test('OPTIONS on /intentra/guard returns 204', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, { method: 'OPTIONS' });
    expect(r.status).toBe(204);
  });
});

// ─── 404 handling ───────────────────────────────────────────────────────────

describe('404 handling', () => {
  test('unknown path returns 404', async () => {
    const r = await fetch(`${BASE}/nonexistent-path`);
    expect(r.status).toBe(404);
  });

  test('PUT method returns 404 (not supported)', async () => {
    const r = await fetch(`${BASE}/agents`, { method: 'PUT' });
    expect(r.status).toBe(404);
  });

  test('404 response includes CORS headers', async () => {
    const r = await fetch(`${BASE}/nonexistent`, {
      headers: { Origin: 'https://example.com' },
    });
    expect(r.status).toBe(404);
    const acao = r.headers.get('Access-Control-Allow-Origin');
    expect(acao).toBeTruthy();
  });
});

// ─── Health endpoint shape ──────────────────────────────────────────────────

describe('Health endpoint contract', () => {
  test('GET /health returns complete shape', async () => {
    const r = await fetch(`${BASE}/health`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.ok).toBe(true);
    expect(typeof j.events).toBe('number');
    expect(typeof j.buffered).toBe('number');
    expect(typeof j.subscribers).toBe('number');
    expect(typeof j.uptime).toBe('number');
    expect(typeof j.jsonl).toBe('string');
    expect(typeof j.guard_engine_version).toBe('number');
    expect(typeof j.rule_count).toBe('number');
    expect(j.guard_engine_version).toBeGreaterThanOrEqual(3);
    expect(j.rule_count).toBeGreaterThanOrEqual(8);
  });

  test('GET /health metrics has all counters', async () => {
    const r = await fetch(`${BASE}/health`);
    const j = (await r.json()) as {
      metrics: Record<string, number>;
    };
    expect(typeof j.metrics.post_progress_total).toBe('number');
    expect(typeof j.metrics.jsonl_lines_ingested_total).toBe('number');
    expect(typeof j.metrics.sse_subscriber_opens_total).toBe('number');
    expect(typeof j.metrics.sse_subscriber_closes_total).toBe('number');
  });

  test('uptime increases over time', async () => {
    const r1 = await fetch(`${BASE}/health`);
    const j1 = (await r1.json()) as { uptime: number };
    await wait(1100);
    const r2 = await fetch(`${BASE}/health`);
    const j2 = (await r2.json()) as { uptime: number };
    expect(j2.uptime).toBeGreaterThanOrEqual(j1.uptime);
  });
});

// ─── Content-Type on responses ──────────────────────────────────────────────

describe('Content-Type headers', () => {
  test('JSON endpoints return application/json', async () => {
    const endpoints = ['/health', '/agents', '/events/history', '/intentra/intents'];
    for (const ep of endpoints) {
      const r = await fetch(`${BASE}${ep}`);
      expect(r.headers.get('Content-Type')).toContain('application/json');
    }
  });

  test('SSE endpoint returns text/event-stream', async () => {
    const ctrl = new AbortController();
    const r = await fetch(`${BASE}/events/stream`, { signal: ctrl.signal });
    expect(r.headers.get('Content-Type')).toContain('text/event-stream');
    ctrl.abort();
  });
});
