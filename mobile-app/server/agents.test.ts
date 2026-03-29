/**
 * Agent CRUD routes — first test coverage of POST/PATCH/DELETE/GET /agents.
 * Spawns a real server on a dedicated port range (20000–21999) to avoid
 * conflicts with smoke.test.ts (18000–19999).
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';

const PORT = 20000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function waitForServer(proc: Subprocess): Promise<void> {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await wait(50);
  }
  throw new Error('Server did not start in time');
}

// ─── Main server instance ──────────────────────────────────────────────────

describe('POST /agents', () => {
  let proc: Subprocess;

  beforeAll(async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    await waitForServer(proc);
  });

  afterAll(() => {
    try { proc?.kill(); } catch { /* ignore */ }
  });

  test('creates agent with name only — status 201, correct shape', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'bot-alpha' }),
    });
    expect(r.status).toBe(201);
    const agent = (await r.json()) as Record<string, unknown>;
    expect(typeof agent.id).toBe('string');
    expect(agent.name).toBe('bot-alpha');
    expect(agent.status).toBe('running');
    expect(typeof agent.created_at).toBe('string');
    expect(typeof agent.updated_at).toBe('string');
  });

  test('creates agent with description', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'bot-beta', description: 'runs evals' }),
    });
    expect(r.status).toBe(201);
    const agent = (await r.json()) as Record<string, unknown>;
    expect(agent.description).toBe('runs evals');
  });

  test('400 when name missing', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.error).toBe('name is required');
  });

  test('400 when name is empty string', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(r.status).toBe(400);
  });

  test('two agents get distinct ids', async () => {
    const r1 = await fetch(`${BASE}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
    });
    const r2 = await fetch(`${BASE}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'y' }),
    });
    const a1 = (await r1.json()) as Record<string, unknown>;
    const a2 = (await r2.json()) as Record<string, unknown>;
    expect(a1.id).not.toBe(a2.id);
  });

  test('id always starts with agent_', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'z' }),
    });
    const agent = (await r.json()) as Record<string, unknown>;
    expect((agent.id as string).startsWith('agent_')).toBe(true);
  });

  test('created_at is a valid ISO date', async () => {
    const r = await fetch(`${BASE}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ts-check' }),
    });
    const agent = (await r.json()) as Record<string, unknown>;
    expect(Number.isNaN(new Date(agent.created_at as string).getTime())).toBe(false);
  });
});

// ─── GET /agents ────────────────────────────────────────────────────────────

describe('GET /agents', () => {
  let proc: Subprocess;
  const PORT2 = PORT + 100;
  const BASE2 = `http://127.0.0.1:${PORT2}`;

  beforeAll(async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT2), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    await (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(`${BASE2}/health`); if (r.ok) return; } catch { /* */ }
        await wait(50);
      }
    })();
  });

  afterAll(() => { try { proc?.kill(); } catch { /* */ } });

  test('returns { agents: [] } on fresh server', async () => {
    const r = await fetch(`${BASE2}/agents`);
    expect(r.ok).toBe(true);
    const j = (await r.json()) as Record<string, unknown>;
    expect(Array.isArray(j.agents)).toBe(true);
    expect((j.agents as unknown[]).length).toBe(0);
  });

  test('lists created agent', async () => {
    const cr = await fetch(`${BASE2}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'listed' }),
    });
    const created = (await cr.json()) as Record<string, unknown>;
    const lr = await fetch(`${BASE2}/agents`);
    const j = (await lr.json()) as { agents: Array<Record<string, unknown>> };
    expect(j.agents.some((a) => a.id === created.id)).toBe(true);
  });

  test('sorts newest-first', async () => {
    await fetch(`${BASE2}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'agent-older' }),
    });
    await wait(2);
    const r2 = await fetch(`${BASE2}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'agent-newer' }),
    });
    const newer = (await r2.json()) as Record<string, unknown>;
    const lr = await fetch(`${BASE2}/agents`);
    const j = (await lr.json()) as { agents: Array<Record<string, unknown>> };
    expect(j.agents[0]!.id).toBe(newer.id);
  });
});

// ─── PATCH /agents/:id ──────────────────────────────────────────────────────

describe('PATCH /agents/:id', () => {
  let proc: Subprocess;
  const PORT3 = PORT + 200;
  const BASE3 = `http://127.0.0.1:${PORT3}`;

  beforeAll(async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT3), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    await (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(`${BASE3}/health`); if (r.ok) return; } catch { /* */ }
        await wait(50);
      }
    })();
  });

  afterAll(() => { try { proc?.kill(); } catch { /* */ } });

  async function createAgent(name: string): Promise<Record<string, unknown>> {
    const r = await fetch(`${BASE3}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return r.json() as Promise<Record<string, unknown>>;
  }

  test('updates status to done', async () => {
    const agent = await createAgent('patch-status');
    const r = await fetch(`${BASE3}/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    expect(r.ok).toBe(true);
    const updated = (await r.json()) as Record<string, unknown>;
    expect(updated.status).toBe('done');
  });

  test('updates message field', async () => {
    const agent = await createAgent('patch-msg');
    const r = await fetch(`${BASE3}/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'processing file 3/10' }),
    });
    const updated = (await r.json()) as Record<string, unknown>;
    expect(updated.message).toBe('processing file 3/10');
  });

  test('updates name field', async () => {
    const agent = await createAgent('patch-name-old');
    const r = await fetch(`${BASE3}/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'patch-name-new' }),
    });
    const updated = (await r.json()) as Record<string, unknown>;
    expect(updated.name).toBe('patch-name-new');
  });

  test('updated_at advances after patch', async () => {
    const agent = await createAgent('patch-ts');
    const originalTs = new Date(agent.updated_at as string).getTime();
    await wait(2);
    const r = await fetch(`${BASE3}/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    const updated = (await r.json()) as Record<string, unknown>;
    const newTs = new Date(updated.updated_at as string).getTime();
    expect(newTs).toBeGreaterThanOrEqual(originalTs);
  });

  test('404 for nonexistent id', async () => {
    const r = await fetch(`${BASE3}/agents/agent_does_not_exist`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    expect(r.status).toBe(404);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.error).toBe('not found');
  });

  test('empty body patch is no-op — still 200', async () => {
    const agent = await createAgent('patch-empty');
    const r = await fetch(`${BASE3}/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(r.ok).toBe(true);
    const updated = (await r.json()) as Record<string, unknown>;
    expect(updated.id).toBe(agent.id);
  });
});

// ─── DELETE /agents/:id ─────────────────────────────────────────────────────

describe('DELETE /agents/:id', () => {
  let proc: Subprocess;
  const PORT4 = PORT + 300;
  const BASE4 = `http://127.0.0.1:${PORT4}`;

  beforeAll(async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT4), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    await (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(`${BASE4}/health`); if (r.ok) return; } catch { /* */ }
        await wait(50);
      }
    })();
  });

  afterAll(() => { try { proc?.kill(); } catch { /* */ } });

  async function create(name: string): Promise<Record<string, unknown>> {
    const r = await fetch(`${BASE4}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    return r.json() as Promise<Record<string, unknown>>;
  }

  test('removes agent — absent from subsequent GET', async () => {
    const agent = await create('del-me');
    await fetch(`${BASE4}/agents/${agent.id}`, { method: 'DELETE' });
    const lr = await fetch(`${BASE4}/agents`);
    const j = (await lr.json()) as { agents: Array<Record<string, unknown>> };
    expect(j.agents.some((a) => a.id === agent.id)).toBe(false);
  });

  test('returns { ok: true }, status 200', async () => {
    const agent = await create('del-ok');
    const r = await fetch(`${BASE4}/agents/${agent.id}`, { method: 'DELETE' });
    expect(r.status).toBe(200);
    const j = (await r.json()) as Record<string, unknown>;
    expect(j.ok).toBe(true);
  });

  test('404 for nonexistent id', async () => {
    const r = await fetch(`${BASE4}/agents/agent_never_existed`, { method: 'DELETE' });
    expect(r.status).toBe(404);
  });

  test('double delete — second call is 404', async () => {
    const agent = await create('del-twice');
    await fetch(`${BASE4}/agents/${agent.id}`, { method: 'DELETE' });
    const r2 = await fetch(`${BASE4}/agents/${agent.id}`, { method: 'DELETE' });
    expect(r2.status).toBe(404);
  });
});

// ─── Full roundtrip & multi-agent ───────────────────────────────────────────

describe('Agent lifecycle roundtrip', () => {
  let proc: Subprocess;
  const PORT5 = PORT + 400;
  const BASE5 = `http://127.0.0.1:${PORT5}`;

  beforeAll(async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT5), HOME: process.env.HOME ?? '/tmp' },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    await (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(`${BASE5}/health`); if (r.ok) return; } catch { /* */ }
        await wait(50);
      }
    })();
  });

  afterAll(() => { try { proc?.kill(); } catch { /* */ } });

  test('create → patch → delete → verify gone', async () => {
    const cr = await fetch(`${BASE5}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'lifecycle' }),
    });
    const agent = (await cr.json()) as Record<string, unknown>;
    await fetch(`${BASE5}/agents/${agent.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    await fetch(`${BASE5}/agents/${agent.id}`, { method: 'DELETE' });
    const lr = await fetch(`${BASE5}/agents`);
    const j = (await lr.json()) as { agents: Array<Record<string, unknown>> };
    expect(j.agents.some((a) => a.id === agent.id)).toBe(false);
  });

  test('create 3, delete middle, list returns 2', async () => {
    const ids: string[] = [];
    for (const name of ['first', 'second', 'third']) {
      const r = await fetch(`${BASE5}/agents`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const a = (await r.json()) as Record<string, unknown>;
      ids.push(a.id as string);
    }
    await fetch(`${BASE5}/agents/${ids[1]}`, { method: 'DELETE' });
    const lr = await fetch(`${BASE5}/agents`);
    const j = (await lr.json()) as { agents: Array<Record<string, unknown>> };
    const remaining = j.agents.map((a) => a.id);
    expect(remaining).toContain(ids[0]);
    expect(remaining).not.toContain(ids[1]);
    expect(remaining).toContain(ids[2]);
  });
});

// ─── Auth gate ───────────────────────────────────────────────────────────────

describe('Auth gate on agents', () => {
  let proc: Subprocess;
  const PORT6 = PORT + 500;
  const BASE6 = `http://127.0.0.1:${PORT6}`;
  const TOKEN = 'agents-test-secret';
  let agentId: string;

  beforeAll(async () => {
    proc = spawn({
      cmd: ['bun', 'run', 'server.ts'],
      cwd: import.meta.dir,
      env: { ...process.env, GSTACK_PROGRESS_PORT: String(PORT6), HOME: process.env.HOME ?? '/tmp', INTENTRA_TOKEN: TOKEN },
      stdout: 'ignore',
      stderr: 'pipe',
    });
    await (async () => {
      for (let i = 0; i < 80; i++) {
        try { const r = await fetch(`${BASE6}/health`); if (r.ok) return; } catch { /* */ }
        await wait(50);
      }
    })();
    // Create an agent with auth for use in patch/delete tests
    const r = await fetch(`${BASE6}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ name: 'auth-agent' }),
    });
    const a = (await r.json()) as Record<string, unknown>;
    agentId = a.id as string;
  });

  afterAll(() => { try { proc?.kill(); } catch { /* */ } });

  test('POST without Bearer → 401', async () => {
    const r = await fetch(`${BASE6}/agents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'unauth' }),
    });
    expect(r.status).toBe(401);
  });

  test('POST with correct Bearer → 201', async () => {
    const r = await fetch(`${BASE6}/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ name: 'authed' }),
    });
    expect(r.status).toBe(201);
  });

  test('PATCH without Bearer → 401', async () => {
    const r = await fetch(`${BASE6}/agents/${agentId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    expect(r.status).toBe(401);
  });

  test('DELETE without Bearer → 401', async () => {
    const r = await fetch(`${BASE6}/agents/${agentId}`, { method: 'DELETE' });
    expect(r.status).toBe(401);
  });
});
