/**
 * Spawns the real progress server on a free port and hits a few routes.
 * Run: cd mobile-app/server && bun test
 */
import path from 'node:path';
import { describe, test, expect, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { parseEntries } from '../shared/handoff-parse.ts';

const PORT = 18000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe('progress server smoke', () => {
  let proc: Subprocess;

  afterAll(() => {
    try {
      proc?.kill();
    } catch {
      /* ignore */
    }
  });

  test('starts and serves GET /health', async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: {
        ...process.env,
        GSTACK_PROGRESS_PORT: String(PORT),
        HOME: process.env.HOME ?? '/tmp',
      },
      stdout: 'ignore',
      stderr: 'pipe',
    });

    let ok = false;
    for (let i = 0; i < 80; i++) {
      try {
        const r = await fetch(`${BASE}/health`);
        if (r.ok) {
          const j = (await r.json()) as {
            ok?: boolean;
            guard_engine_version?: number;
            rule_count?: number;
            metrics?: {
              post_progress_total?: number;
              sse_subscriber_opens_total?: number;
            };
          };
          if (
            j.ok === true
            && typeof j.guard_engine_version === 'number'
            && typeof j.rule_count === 'number'
            && j.metrics
            && typeof j.metrics.post_progress_total === 'number'
            && typeof j.metrics.sse_subscriber_opens_total === 'number'
          ) {
            ok = true;
            break;
          }
        }
      } catch {
        /* server not up yet */
      }
      await wait(50);
    }
    expect(ok).toBe(true);
  });

  test('GET /intentra/intents', async () => {
    const r = await fetch(`${BASE}/intentra/intents`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as { intents?: unknown[]; count?: number };
    expect(Array.isArray(j.intents)).toBe(true);
    expect(typeof j.count).toBe('number');
  });

  test('GET /intentra/culture returns snapshot shape', async () => {
    const r = await fetch(`${BASE}/intentra/culture`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as {
      path?: string;
      loaded?: boolean;
      culture?: unknown;
      note?: string;
    };
    expect(typeof j.path).toBe('string');
    expect(typeof j.loaded).toBe('boolean');
    expect(j.note).toContain('gstack');
  });

  test('GET /intentra/guard/rules exposes registry', async () => {
    const r = await fetch(`${BASE}/intentra/guard/rules`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as { rules?: unknown[]; engine?: { version?: number } };
    expect(Array.isArray(j.rules)).toBe(true);
    expect((j.rules as []).length).toBeGreaterThanOrEqual(8);
    expect(j.engine?.version).toBeGreaterThanOrEqual(3);
  });

  test('GET /intentra/guard/schema returns rule_ids and schema', async () => {
    const r = await fetch(`${BASE}/intentra/guard/schema`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as {
      rule_ids?: string[];
      rule_count?: number;
      culture_fragment_schema?: { title?: string };
    };
    expect(Array.isArray(j.rule_ids)).toBe(true);
    expect(j.rule_ids!.length).toBeGreaterThanOrEqual(8);
    expect(j.rule_count).toBe(j.rule_ids!.length);
    expect(j.culture_fragment_schema?.title).toBeDefined();
  });

  test('GET /health metrics increment on POST /progress', async () => {
    const h0 = await fetch(`${BASE}/health`);
    const j0 = (await h0.json()) as { metrics?: { post_progress_total: number } };
    const before = j0.metrics?.post_progress_total ?? 0;
    await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'progress', message: 'metric probe' }),
    });
    const h1 = await fetch(`${BASE}/health`);
    const j1 = (await h1.json()) as { metrics?: { post_progress_total: number } };
    expect(j1.metrics!.post_progress_total).toBeGreaterThanOrEqual(before + 1);
  });

  test('PATCH /intentra/intent sets outcome', async () => {
    const cr = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'smoke intent outcome' }),
    });
    expect(cr.ok).toBe(true);
    const art = (await cr.json()) as { intent_id: string };
    const pr = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: art.intent_id, outcome: 'success' }),
    });
    expect(pr.ok).toBe(true);
    const updated = (await pr.json()) as { outcome: string };
    expect(updated.outcome).toBe('success');
  });

  test('POST /intentra/guard denies destructive command', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'git push --force origin main' }),
    });
    expect(r.ok).toBe(true);
    const j = (await r.json()) as {
      verdict?: string;
      pattern?: string;
      source?: string;
      risk_score?: number;
      rule?: { category?: string };
    };
    expect(j.verdict).toBe('deny');
    expect(j.pattern).toBe('git_force_push');
    expect(j.source).toBe('intentra_guard');
    expect(typeof j.risk_score).toBe('number');
    expect(j.risk_score).toBeGreaterThan(0);
    expect(j.rule?.category).toBe('vcs');
  });

  test('GET /intentra/intent/:id fetches single intent', async () => {
    const cr = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'single lookup test' }),
    });
    expect(cr.ok).toBe(true);
    const art = (await cr.json()) as { intent_id: string; prompt: string };
    const gr = await fetch(`${BASE}/intentra/intent/${encodeURIComponent(art.intent_id)}`);
    expect(gr.ok).toBe(true);
    const fetched = (await gr.json()) as { intent_id: string; prompt: string };
    expect(fetched.intent_id).toBe(art.intent_id);
    expect(fetched.prompt).toBe('single lookup test');
  });

  test('GET /intentra/intent/:id returns 404 for unknown', async () => {
    const r = await fetch(`${BASE}/intentra/intent/intent_nonexistent`);
    expect(r.status).toBe(404);
  });

  test('POST /progress with intent_id links event', async () => {
    const intentId = 'intent_smoke_link_test';
    const pr = await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'progress',
        message: 'linked event test',
        intent_id: intentId,
      }),
    });
    expect(pr.ok).toBe(true);
    const hr = await fetch(`${BASE}/events/history?limit=1`);
    const hj = (await hr.json()) as { events: Array<{ intent_id?: string; message?: string }> };
    expect(hj.events.length).toBeGreaterThanOrEqual(1);
    // The most recent event should have our intent_id
    const last = hj.events[hj.events.length - 1];
    expect(last!.intent_id).toBe(intentId);
  });

  test('POST /intentra/guard debug trace returns trace array', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'ls -la', debug: true }),
    });
    expect(r.ok).toBe(true);
    const j = (await r.json()) as { verdict: string; trace?: Array<{ phase: string }> };
    expect(j.verdict).toBe('allow');
    expect(Array.isArray(j.trace)).toBe(true);
    expect(j.trace!.length).toBeGreaterThan(0);
  });

  test('POST /intentra/intent emits SSE intent_created event', async () => {
    const h0 = await fetch(`${BASE}/health`);
    const j0 = (await h0.json()) as { events: number };
    const beforeCount = j0.events;
    await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'sse emission test' }),
    });
    const h1 = await fetch(`${BASE}/health`);
    const j1 = (await h1.json()) as { events: number };
    // Creating an intent should add at least 1 event (the intent_created SSE)
    expect(j1.events).toBeGreaterThan(beforeCount);
  });

  test('GET /intentra/files serves .intentra from INTENTRA_REPO_ROOT (Handoffs tab data)', async () => {
    proc.kill();
    await wait(200);

    const repoRoot = path.resolve(import.meta.dir, '..', '..');
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: {
        ...process.env,
        GSTACK_PROGRESS_PORT: String(PORT),
        HOME: process.env.HOME ?? '/tmp',
        INTENTRA_REPO_ROOT: repoRoot,
      },
      stdout: 'ignore',
      stderr: 'pipe',
    });

    let up = false;
    for (let i = 0; i < 80; i++) {
      try {
        const r = await fetch(`${BASE}/health`);
        if (r.ok) {
          up = true;
          break;
        }
      } catch {
        /* retry */
      }
      await wait(50);
    }
    expect(up).toBe(true);

    const r = await fetch(`${BASE}/intentra/files`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as { files: Array<{ name: string; content: string }> };
    const names = j.files.map(f => f.name);
    expect(names).toContain('HANDOFFS.md');
    const handoff = j.files.find(f => f.name === 'HANDOFFS.md');
    expect(handoff?.content.length).toBeGreaterThan(20);
    expect(parseEntries(handoff!.content).length).toBeGreaterThan(0);

    const sr = await fetch(`${BASE}/intentra/handoffs/summary`);
    expect(sr.ok).toBe(true);
    const sj = (await sr.json()) as {
      count: number;
      block_count: number;
      entries: Array<{ date: string | null; summary: string }>;
    };
    expect(sj.count).toBeGreaterThan(0);
    expect(sj.block_count).toBeGreaterThan(0);
    expect(Array.isArray(sj.entries)).toBe(true);
    expect(sj.entries.length).toBe(sj.count);
  });

  test('INTENTRA_TOKEN rejects POST without Bearer', async () => {
    proc.kill();
    await wait(200);

    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: {
        ...process.env,
        GSTACK_PROGRESS_PORT: String(PORT),
        HOME: process.env.HOME ?? '/tmp',
        INTENTRA_TOKEN: 'smoke-test-secret',
      },
      stdout: 'ignore',
      stderr: 'pipe',
    });

    let up = false;
    for (let i = 0; i < 80; i++) {
      try {
        const r = await fetch(`${BASE}/health`);
        if (r.ok) {
          up = true;
          break;
        }
      } catch {
        /* retry */
      }
      await wait(50);
    }
    expect(up).toBe(true);

    const denied = await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'progress', message: 'x' }),
    });
    expect(denied.status).toBe(401);

    const allowed = await fetch(`${BASE}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer smoke-test-secret',
      },
      body: JSON.stringify({ kind: 'progress', message: 'ok' }),
    });
    expect(allowed.ok).toBe(true);

    const patchDenied = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: 'intent_x', outcome: 'success' }),
    });
    expect(patchDenied.status).toBe(401);

    const patchOk = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer smoke-test-secret',
      },
      body: JSON.stringify({ intent_id: 'intent_x', outcome: 'success' }),
    });
    expect(patchOk.status).toBe(404);
  });
});
