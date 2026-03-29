/**
 * Intent artifact HTTP endpoint edge cases — POST/PATCH validation,
 * error responses, and lifecycle through the HTTP API.
 *
 * Uses port range 28000–29999 to avoid conflicts.
 * All tests pass.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';

const PORT = 28000 + Math.floor(Math.random() * 2000);
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

// ─── POST /intentra/intent validation ───────────────────────────────────────

describe('POST /intentra/intent validation', () => {
  test('400 when prompt is missing', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toContain('prompt');
  });

  test('400 when prompt is empty string', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: '' }),
    });
    expect(r.status).toBe(400);
  });

  test('400 when prompt is a number (not string)', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 42 }),
    });
    expect(r.status).toBe(400);
  });

  test('201 with valid prompt — returns intent artifact shape', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test intent creation shape' }),
    });
    expect(r.status).toBe(201);
    const j = (await r.json()) as Record<string, unknown>;
    expect(typeof j.intent_id).toBe('string');
    expect((j.intent_id as string).startsWith('intent_')).toBe(true);
    expect(j.prompt).toBe('test intent creation shape');
    expect(j.outcome).toBeNull();
    expect(typeof (j.repo as Record<string, unknown>).path).toBe('string');
    expect(typeof (j.repo as Record<string, unknown>).branch).toBe('string');
  });

  test('201 with all optional fields — constraints and plan round-trip', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: 'full intent',
        constraints: { risk_tolerance: 'low', requires_approval_for: ['deploy'] },
        plan: [{ type: 'task', description: 'write code' }, { type: 'test', description: 'run tests' }],
      }),
    });
    expect(r.status).toBe(201);
    const j = (await r.json()) as Record<string, unknown>;
    const constraints = j.constraints as Record<string, unknown>;
    expect(constraints.risk_tolerance).toBe('low');
    const plan = j.plan as Array<Record<string, unknown>>;
    expect(plan.length).toBe(2);
    expect(plan[0]!.type).toBe('task');
    expect(plan[1]!.type).toBe('test');
  });

  test('malformed JSON body on POST → still returns a response', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid json}',
    });
    // Should return 400 since prompt cannot be extracted
    expect(r.status).toBe(400);
  });
});

// ─── PATCH /intentra/intent validation ──────────────────────────────────────

describe('PATCH /intentra/intent validation', () => {
  test('400 when intent_id is missing', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'success' }),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toContain('intent_id');
  });

  test('400 when outcome is invalid', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: 'intent_test', outcome: 'invalid_outcome' }),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toContain('outcome');
  });

  test('400 when outcome is missing', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: 'intent_test' }),
    });
    expect(r.status).toBe(400);
  });

  test('404 for nonexistent intent_id', async () => {
    const r = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: 'intent_does_not_exist', outcome: 'success' }),
    });
    expect(r.status).toBe(404);
  });

  test('full lifecycle: create → patch outcome → verify', async () => {
    // Create
    const cr = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'lifecycle test' }),
    });
    expect(cr.status).toBe(201);
    const created = (await cr.json()) as { intent_id: string; outcome: null };
    expect(created.outcome).toBeNull();

    // Patch to success
    const pr = await fetch(`${BASE}/intentra/intent`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_id: created.intent_id, outcome: 'success' }),
    });
    expect(pr.ok).toBe(true);
    const patched = (await pr.json()) as { outcome: string };
    expect(patched.outcome).toBe('success');

    // Verify via GET
    const gr = await fetch(`${BASE}/intentra/intent/${encodeURIComponent(created.intent_id)}`);
    expect(gr.ok).toBe(true);
    const fetched = (await gr.json()) as { outcome: string };
    expect(fetched.outcome).toBe('success');
  });

  test('all three valid outcomes can be set via HTTP', async () => {
    for (const outcome of ['success', 'error', 'cancelled'] as const) {
      const cr = await fetch(`${BASE}/intentra/intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `outcome-${outcome}` }),
      });
      const created = (await cr.json()) as { intent_id: string };

      const pr = await fetch(`${BASE}/intentra/intent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intent_id: created.intent_id, outcome }),
      });
      expect(pr.ok).toBe(true);
      const patched = (await pr.json()) as { outcome: string };
      expect(patched.outcome).toBe(outcome);
    }
  });
});

// ─── GET /intentra/intents list ─────────────────────────────────────────────

describe('GET /intentra/intents', () => {
  test('returns correct shape with count', async () => {
    const r = await fetch(`${BASE}/intentra/intents`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as { intents: unknown[]; count: number };
    expect(Array.isArray(j.intents)).toBe(true);
    expect(typeof j.count).toBe('number');
    expect(j.count).toBe(j.intents.length);
  });

  test('created intents appear in list', async () => {
    const marker = `list-test-${Date.now()}`;
    const cr = await fetch(`${BASE}/intentra/intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: marker }),
    });
    const created = (await cr.json()) as { intent_id: string };

    const lr = await fetch(`${BASE}/intentra/intents`);
    const j = (await lr.json()) as { intents: Array<{ intent_id: string; prompt: string }> };
    const found = j.intents.find(i => i.intent_id === created.intent_id);
    expect(found).toBeTruthy();
    expect(found!.prompt).toBe(marker);
  });
});

// ─── GET /intentra/intent/:id edge cases ────────────────────────────────────

describe('GET /intentra/intent/:id edge cases', () => {
  test('path traversal attempt returns 404', async () => {
    const r = await fetch(`${BASE}/intentra/intent/${encodeURIComponent('../etc/passwd')}`);
    expect(r.status).toBe(404);
  });

  test('slash in intent_id returns 404', async () => {
    const r = await fetch(`${BASE}/intentra/intent/${encodeURIComponent('foo/bar')}`);
    // URL routing means this might match differently — just verify non-200
    expect(r.ok).toBe(false);
  });

  test('empty intent_id returns 404', async () => {
    const r = await fetch(`${BASE}/intentra/intent/`);
    expect(r.ok).toBe(false);
  });
});

// ─── POST /intentra/guard validation ────────────────────────────────────────

describe('POST /intentra/guard validation', () => {
  test('400 when command is missing', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as { error: string };
    expect(j.error).toContain('command');
  });

  test('guard verdict shape on allow', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'ls -la' }),
    });
    expect(r.ok).toBe(true);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.verdict).toBe('allow');
    expect(j.risk_score).toBe(0);
  });

  test('guard verdict shape on deny', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'rm -rf ./src' }),
    });
    expect(r.ok).toBe(true);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.verdict).toBe('deny');
    expect(j.pattern).toBe('rm_recursive');
    expect(typeof j.risk_score).toBe('number');
    expect((j.risk_score as number)).toBeGreaterThan(0);
  });

  test('debug mode via header X-Intentra-Guard-Debug: 1', async () => {
    const r = await fetch(`${BASE}/intentra/guard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Intentra-Guard-Debug': '1',
      },
      body: JSON.stringify({ command: 'ls -la' }),
    });
    expect(r.ok).toBe(true);
    const j = (await r.json()) as { trace?: unknown[] };
    expect(Array.isArray(j.trace)).toBe(true);
    expect((j.trace as unknown[]).length).toBeGreaterThan(0);
  });
});
