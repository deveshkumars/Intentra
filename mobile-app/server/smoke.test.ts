/**
 * Spawns the real progress server on a free port and hits a few routes.
 * Run: cd mobile-app/server && bun test
 */
import { describe, test, expect, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';

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
          const j = (await r.json()) as { ok?: boolean };
          if (j.ok === true) {
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
    expect(j.engine?.version).toBe(1);
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
  });
});
