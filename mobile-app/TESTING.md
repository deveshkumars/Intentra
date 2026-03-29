# Testing the Intentra Progress Server

## Quick start

```bash
cd mobile-app/server
bun install
bun test
```

This runs all test suites (smoke tests, guard tests, and any other `*.test.ts` files in the server directory).

## Test suites

### Smoke tests (`smoke.test.ts`)

Integration tests that spawn a real server process on a random port and hit actual HTTP endpoints. Covers:

| Test | What it verifies |
|------|-----------------|
| `GET /health` | Server starts, returns health shape with guard engine version, rule count, and metrics |
| `GET /intentra/intents` | Lists intent artifacts (returns array + count) |
| `GET /intentra/culture` | Culture snapshot shape (path, loaded, culture, note) |
| `GET /intentra/guard/rules` | Rule registry returns 8+ rules with engine metadata |
| `GET /intentra/guard/schema` | Schema endpoint returns rule_ids, culture fragment schema, and rule count |
| `GET /health metrics` | POST /progress increments `post_progress_total` counter |
| `PATCH /intentra/intent` | Create intent → PATCH outcome → verify outcome persists |
| `POST /intentra/guard` | Destructive command (`git push --force`) returns `deny` verdict with pattern, risk_score, and category |
| `GET /intentra/intent/:id` | Create intent → fetch by ID → verify fields match |
| `GET /intentra/intent/:id 404` | Unknown intent returns 404 |
| `POST /progress with intent_id` | Progress event with `intent_id` appears in history |
| `POST /intentra/guard debug` | Debug mode returns trace array with pipeline phases |
| `POST /intentra/intent SSE` | Creating an intent increments the event counter (SSE emission) |
| `INTENTRA_TOKEN auth` | Restarts server with token → POST without header returns 401 → with header returns 201 |

### Handoff markdown parsing (`app/src/handoff-parse.test.ts`)

Pure unit tests for `parseEntry`, `parseEntries`, `formatDate`, and `countHandoffBlocks` — the same logic the **Handoffs** tab uses for `HANDOFFS.md` / `PROMPTS.md` / `PLANS.md`. Run from repo root:

```bash
bun test mobile-app/app/src/handoff-parse.test.ts
```

Smoke tests also restart the server with **`INTENTRA_REPO_ROOT`** set to the git repo root and assert **`GET /intentra/files`** returns **`HANDOFFS.md`** whose content parses to at least one entry (end-to-end with committed `.intentra/`).

### Guard tests

Unit tests for the guard policy engine modules (tokenizer, normalizer, rule matching). Located alongside the guard source files.

## Architecture

Tests use the real Bun server binary — no mocking. Each smoke test suite:

1. Picks a random port (`18000 + random(2000)`)
2. Spawns `bun run server.ts` as a subprocess with that port
3. Polls `GET /health` until the server is ready (up to 4 seconds)
4. Runs all tests against `http://127.0.0.1:<port>`
5. Kills the subprocess in `afterAll`

This approach catches real integration issues (import errors, port conflicts, JSON serialization) that unit tests miss.

## Writing new tests

Add tests inside the `describe('progress server smoke', ...)` block in `smoke.test.ts`. Key patterns:

**Testing a GET endpoint:**

```typescript
test('GET /your/endpoint returns expected shape', async () => {
  const r = await fetch(`${BASE}/your/endpoint`);
  expect(r.ok).toBe(true);
  const j = (await r.json()) as { field?: string };
  expect(j.field).toBeDefined();
});
```

**Testing a POST endpoint:**

```typescript
test('POST /your/endpoint creates resource', async () => {
  const r = await fetch(`${BASE}/your/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'value' }),
  });
  expect(r.status).toBe(201);
  const j = (await r.json()) as { id: string };
  expect(j.id).toBeDefined();
});
```

**Testing error cases:**

```typescript
test('POST /your/endpoint rejects missing field', async () => {
  const r = await fetch(`${BASE}/your/endpoint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  expect(r.status).toBe(400);
});
```

## Running in CI

The GitHub Actions workflow (`.github/workflows/intentra-progress-server.yml`) runs `bun test` automatically when files in `mobile-app/server/**` change. The Docker workflow pushes to GHCR only after tests pass.

## Debugging test failures

1. **Server didn't start:** Check that the port isn't in use. The random port range (18000-20000) should avoid conflicts.
2. **Timeout on health check:** The test polls for 4 seconds. If the server takes longer, increase the loop count in the first test.
3. **Auth test restart:** The `INTENTRA_TOKEN` test kills and restarts the server. If it fails intermittently, the previous server process may not have fully released the port — the 200ms wait should handle this.
4. **Run a single test:** `bun test --grep "your test name"` to isolate failures.
