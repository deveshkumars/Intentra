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
| `GET /intentra/guard/rules` | Rule registry returns 8+ rules with engine metadata (version ≥ 3) |
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

### Handoff markdown parsing (`shared/handoff-parse.test.ts`)

Pure unit tests for `parseEntry`, `parseEntries`, `formatDate`, and `countHandoffBlocks` — the same logic the **Handoffs** tab and **`GET /intentra/handoffs/summary`** use for `HANDOFFS.md` / `PROMPTS.md` / `PLANS.md` (including CRLF newline normalization). Run from repo root:

```bash
bun test mobile-app/shared/handoff-parse.test.ts
```

Smoke tests also restart the server with **`INTENTRA_REPO_ROOT`** set to the git repo root and assert **`GET /intentra/files`** returns **`HANDOFFS.md`** whose content parses to at least one entry, and **`GET /intentra/handoffs/summary`** returns a matching `count` (end-to-end with committed `.intentra/`).

### Mobile app (manual completeness checks)

The Expo app is exercised manually via Expo Go. After auth-related changes, sanity-check:

- **Setup:** With `INTENTRA_TOKEN` unset, Connect succeeds. With the server started **with** `INTENTRA_TOKEN`, Connect **without** a bearer token should show a clear error; with the correct token, Connect succeeds (the app probes `POST /agents` before saving settings).
- **Dashboard / Intent / Handoffs:** Pull-to-refresh and tab switches still load after updating the stored token (SSE reconnects and REST calls include `Authorization` when present).

### Agent CRUD tests (`agents.test.ts`)

Full coverage of the tracked agent lifecycle — POST, GET, PATCH, DELETE with error cases, ordering, auth gates, and multi-agent roundtrips.

### Events and CircularBuffer tests (`events.test.ts`)

Ring buffer capacity verification (200 cap, FIFO eviction), history endpoint limit/ordering, SSE headers, subscriber metrics, and field passthrough on POST /progress.

### SSE live event flow tests (`sse-live.test.ts`)

End-to-end SSE verification — events POSTed to /progress flow through SSE to connected subscribers, agent lifecycle events (create/update/delete) broadcast correctly, buffer replay on reconnect, and multiple concurrent subscribers receive the same events.

### CORS and HTTP contract tests (`cors-http.test.ts`)

CORS headers on all endpoints, OPTIONS preflight 204 responses with correct Allow headers, 404 handling for unknown paths, health endpoint shape validation, Content-Type verification, and uptime counter progression.

### Intent HTTP validation tests (`intent-http.test.ts`)

POST /intentra/intent validation (missing prompt, empty string, wrong type), PATCH validation (missing intent_id, invalid outcome), full create→patch→verify lifecycle through HTTP, all three outcomes via API, and guard validation edge cases.

### Guard tests

Unit tests for the guard policy engine modules (tokenizer, normalizer, rule matching). Located alongside the guard source files.

### Guard culture integration tests (`guard-culture.test.ts`)

Exhaustive allow/warn/deny override testing for all 8 guard rules via culture risk_gates, risk score formula verification, validateRiskGateKeys for unknown keys, and culture_warnings surfacing in guard responses.

### Guard segment advanced tests (`guard-segment-advanced.test.ts`)

Compound command splitting edge cases — pipe passthrough, nested quotes, escaped characters, trailing operators, real-world compound chains, and multi-segment guard evaluation with culture overrides.

### Guard telemetry tests (`guard-telemetry.test.ts`)

Verifies appendIntentraGuardTelemetry creates directories, writes JSONL entries, appends multiple entries correctly, includes repo basename, and never throws on unwritable paths.

### Guard edge cases (`guard-edge.test.ts`)

Exact risk score formulas, rm_recursive with quoted/safe/mixed paths, git_force_push flag variants, SQL edge cases (DROP IF EXISTS, bare truncate, word boundaries), empty/boundary commands, Unicode NFKC normalization, and culture.ts readCultureSnapshot.

### Guard fuzz tests (`guard-fuzz.test.ts`)

Random input fuzzing for normalizeCommand, tokenizeShell, buildCommandContext, splitGuardSegments, and evaluateCommandGuard — verifies no crashes and verdict/risk_score invariants hold across 900+ random inputs.

### Guard performance tests (`guard-perf.test.ts`)

Benchmark: 50 iterations × 7 representative commands complete within budget (<10ms per batch).

### Guard compound tests (`guard-compound.test.ts`)

Compound command evaluation — deny propagation across segments, debug trace prefixes, max risk_score aggregation.

### Handoff parse advanced tests (`shared/handoff-parse-advanced.test.ts`)

Complex markdown scenarios — en-dash/hyphen separators, multi-line body preservation, long summary truncation, code block handling, all 12 months in formatDate, block counting edge cases, and case-sensitive filename matching.

### Fixture integration tests (`fixtures/`)

Cross-validates real telemetry fixtures against the live guard engine rule registry — ensures hook_fire patterns map to actual rules and all 8 categories are covered.

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
