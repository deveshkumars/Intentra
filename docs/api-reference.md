# API Reference: Intentra Progress Server

Base URL: `http://localhost:7891` (configurable via `GSTACK_PROGRESS_PORT`).

All responses are JSON with `Content-Type: application/json` unless noted. CORS headers are included on every response.

**Machine-readable contract:** OpenAPI 3 subset at [`openapi/intentra-progress.json`](openapi/intentra-progress.json). CI runs `bun run scripts/check-intentra-contracts.ts` (also part of `bun run test:progress-server`) so spec drift fails the build.

**Related:** [INTENTRA.md](../INTENTRA.md) (shipped surface) · [Architecture](intentra-architecture.md) · [Documentation hub](README.md) · [Root README](../README.md) (Intentra section)

## Protocol conventions (integrators)

- **JSON over HTTP:** Request bodies are UTF-8 JSON unless noted. Successful mutating routes typically return **201** (resource created) or **200** with a small `{ "ok": true }` envelope — see each section below for exact status codes.
- **Error shape:** Authentication failures use **401** and body `{"error":"unauthorized"}`. Validation failures (e.g. missing `name` on `POST /agents`) use **400** with `{"error":"<message>"}`.
- **Open mode:** When the server is started **without** `INTENTRA_TOKEN`, every write is unauthenticated. Treat that as **localhost-only** or an explicitly trusted network; it is not a safe default on the public Internet.
- **Server-Sent Events:** `GET /events/stream` responds with `Content-Type: text/event-stream`. Payload lines use the standard `event:` / `data:` framing. Keep-alives are **SSE comments** (`: heartbeat`) on a 15s timer — clients should ignore comment lines rather than parsing them as JSON.
- **Idempotency:** `POST /progress` and `POST /agents` are **not** idempotent; duplicate submissions produce distinct events or agents. Retry logic on the client should dedupe at the application layer if needed.
- **Contract tests:** The OpenAPI subset in [`openapi/intentra-progress.json`](openapi/intentra-progress.json) is enforced by `bun run scripts/check-intentra-contracts.ts`; extend the spec when you add routes.

## Authentication

When `INTENTRA_TOKEN` is set, all `POST`, `PATCH`, and `DELETE` requests require:

```
Authorization: Bearer <token>
```

GET requests and `/health` are always public. Without `INTENTRA_TOKEN`, all endpoints are open.

**401 response:**

```json
{ "error": "unauthorized" }
```

### Mobile client behavior

The Expo app stores the server **base URL** and optional **bearer token** from the Setup screen (AsyncStorage). For API calls after setup:

- If a token was saved, requests that need auth include `Authorization: Bearer <token>` (same value the user entered in Setup).
- **Setup-time probe:** before completing setup, the app calls `GET /health`, then issues a **mutating probe** (`POST /agents` with body `{}`) using the same auth headers. If the server has `INTENTRA_TOKEN` set and the token field is empty, setup fails with a clear error; if a token was entered but returns 401, setup reports a token mismatch. This mirrors server rules: writes require a valid bearer when `INTENTRA_TOKEN` is set.

Ngrok: the app sends the `ngrok-skip-browser-warning: true` header on fetches where applicable so HTML interstitial pages do not break JSON parsing.

---

## Health & Monitoring

### `GET /health`

Server health check. No auth required.

**Response (200):**

```json
{
  "ok": true,
  "events": 142,
  "buffered": 142,
  "subscribers": 2,
  "uptime": 3600,
  "jsonl": "/Users/you/.gstack/analytics/skill-usage.jsonl",
  "guard_engine_version": 3,
  "rule_count": 8,
  "metrics": {
    "post_progress_total": 87,
    "jsonl_lines_ingested_total": 55,
    "sse_subscriber_opens_total": 4,
    "sse_subscriber_closes_total": 2
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | boolean | Always `true` if server is running |
| `events` | number | Total events ever processed |
| `buffered` | number | Events in ring buffer (max 200) |
| `subscribers` | number | Active SSE connections |
| `uptime` | number | Seconds since server start |
| `guard_engine_version` | number | Guard policy engine version |
| `rule_count` | number | Number of guard rules loaded |
| `metrics` | object | Counters for observability |

---

## Progress Events

### `POST /progress`

Submit a progress event. Broadcast to all SSE subscribers immediately.

**Request body:**

```json
{
  "kind": "progress",
  "message": "Building feature X",
  "session_id": "session_abc",
  "intent_id": "intent_2026-03-29T...",
  "skill": "ship",
  "step": "running tests",
  "pct": 45,
  "tool_name": "Bash",
  "outcome": "success",
  "duration_s": 12.5
}
```

All fields except `kind` are optional. Defaults: `kind = "progress"`, `source = "post"`, `ingest_lane = "intentra_http"`.

**Response (201):**

```json
{ "ok": true }
```

### `GET /events/stream`

Server-Sent Events stream. On connect, replays the ring buffer (up to 200 events), then streams live events with 15-second heartbeats.

**Event types:**

| Event | Payload | When |
|-------|---------|------|
| `progress` | `ProgressEvent` JSON | New progress/skill/hook event |
| `agent_update` | `TrackedAgent` JSON | Agent created or status changed |
| `agent_delete` | `{ "id": "..." }` | Agent removed |
| (comment) | `: heartbeat` | Every 15 seconds (keepalive) |

**Example SSE data:**

```
event: progress
data: {"id":"1","ts":"2026-03-29T12:00:00.000Z","kind":"progress","source":"post","message":"Building..."}

event: agent_update
data: {"id":"agent_1711...","name":"my-agent","status":"running","created_at":"...","updated_at":"..."}

: heartbeat
```

### `GET /events/history?limit=N`

REST fallback for backfill. Returns the last N events from the ring buffer (max 200).

**Query params:** `limit` (integer, default 50, max 200)

**Response (200):**

```json
{
  "events": [
    {
      "id": "1",
      "ts": "2026-03-29T12:00:00.000Z",
      "kind": "progress",
      "source": "post",
      "message": "Hello"
    }
  ],
  "total": 142
}
```

---

## Tracked Agents

### `POST /agents`

Register a new tracked agent.

**Request body:**

```json
{
  "name": "my-agent",
  "description": "optional description"
}
```

**Response (201):**

```json
{
  "id": "agent_1711699200000_1",
  "name": "my-agent",
  "description": "optional description",
  "status": "running",
  "created_at": "2026-03-29T12:00:00.000Z",
  "updated_at": "2026-03-29T12:00:00.000Z"
}
```

**400** if `name` is missing.

### `GET /agents`

List all tracked agents, sorted by creation time (newest first).

**Response (200):**

```json
{
  "agents": [
    {
      "id": "agent_1711699200000_1",
      "name": "my-agent",
      "status": "running",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### `PATCH /agents/:id`

Update a tracked agent's status or metadata.

**Request body (all fields optional):**

```json
{
  "status": "done",
  "message": "completed successfully",
  "name": "renamed-agent",
  "description": "new description"
}
```

Status values: `running`, `done`, `error`.

**Response (200):** Updated `TrackedAgent` object. **404** if agent not found.

### `DELETE /agents/:id`

Remove a tracked agent. Broadcasts `agent_delete` SSE event.

**Response (200):**

```json
{ "ok": true }
```

**404** if agent not found.

---

## Intent Artifacts

### `POST /intentra/intent`

Create a new intent artifact. Persists JSON to `.intentra/` and emits an SSE `intent_created` event.

**Request body:**

```json
{
  "prompt": "Add dark mode to settings",
  "repo": { "path": "/Users/me/myproject", "branch": "feature-dark" },
  "constraints": { "risk_tolerance": "low", "requires_approval_for": ["deploy"] },
  "culture_ref": "/Users/me/.gstack/culture.json",
  "plan": [
    { "type": "implement", "target": "settings.tsx" },
    { "type": "test", "target": "settings.test.tsx" }
  ]
}
```

Only `prompt` is required. The server auto-detects `repo.branch` from `.git/HEAD` and `culture_ref` from the gstack culture path if not provided.

**Response (201):**

```json
{
  "intent_id": "intent_2026-03-29T12:00:00Z",
  "prompt": "Add dark mode to settings",
  "repo": { "path": "/Users/me/myproject", "branch": "feature-dark" },
  "constraints": { "risk_tolerance": "low" },
  "culture_ref": "/Users/me/.gstack/culture.json",
  "plan": [{ "type": "implement", "target": "settings.tsx" }],
  "outcome": null
}
```

### `GET /intentra/intents`

List all intent artifacts.

**Response (200):**

```json
{
  "intents": [ /* IntentArtifact[] */ ],
  "count": 5
}
```

### `GET /intentra/intent/:id`

Fetch a single intent artifact by ID.

**Response (200):** `IntentArtifact` JSON.

**Response (404):**

```json
{ "error": "intent not found" }
```

### `PATCH /intentra/intent`

Set the outcome on an existing intent. Emits an SSE `intent_resolved` event.

**Request body:**

```json
{
  "intent_id": "intent_2026-03-29T12:00:00Z",
  "outcome": "success"
}
```

Outcome values: `success`, `error`, `cancelled`.

**Response (200):** Updated `IntentArtifact` with `outcome` set.

**400** if `intent_id` or `outcome` missing/invalid. **404** if intent not found.

---

## Markdown Intent Layer

### `GET /intentra/files`

List all files in `.intentra/` with contents.

**Response (200):**

```json
{
  "files": [
    { "name": "HANDOFFS.md", "content": "# Handoffs\n..." },
    { "name": "PLANS.md", "content": "# Plans\n..." },
    { "name": "PROMPTS.md", "content": "# Prompts\n..." }
  ]
}
```

### `GET /intentra/handoffs/summary`

Structured parse of `.intentra/HANDOFFS.md` using the same `parseEntries` implementation as the mobile Handoffs tab (`mobile-app/shared/handoff-parse.ts`).

**Response (200):**

```json
{
  "count": 3,
  "block_count": 3,
  "entries": [
    {
      "date": "2026-03-28",
      "author": "Session title",
      "summary": "First line of body used as preview…"
    }
  ]
}
```

`count` matches `entries.length` (newest first). `block_count` uses `countHandoffBlocks` (delimiter semantics for `---` blocks). If `HANDOFFS.md` is missing: `{ "entries": [], "count": 0, "block_count": 0 }`.

### `GET /intentra/latest`

Get the latest handoff entry from `HANDOFFS.md`.

**Response (200):**

```json
{
  "latest": "**2026-03-29 — Session title**\n**Author:** ...\n**Status:** done\n..."
}
```

Returns `{ "latest": null }` if `HANDOFFS.md` doesn't exist.

---

## Guard Engine

### `POST /intentra/guard`

Evaluate a command against the guard policy engine. Checks for destructive patterns and applies culture overrides.

**Auth:** Requires Bearer when `INTENTRA_TOKEN` is set (same as all POST routes). This is intentional — the endpoint appends to telemetry on deny/warn verdicts.

**Request body:**

```json
{
  "command": "git push --force origin main",
  "session_id": "optional-session-id",
  "debug": true
}
```

Debug mode can also be triggered via `X-Intentra-Guard-Debug: 1` request header.

**Response (200) — deny:**

```json
{
  "verdict": "deny",
  "pattern": "git_force_push",
  "message": "[intentra guard] DENY: Git force-push (history rewrite on remote).",
  "source": "intentra_guard",
  "rule": {
    "id": "git_force_push",
    "category": "vcs",
    "baseRisk": 82,
    "cwe_hints": ["CWE-183"]
  },
  "risk_score": 82,
  "compound": {
    "segment_count": 1,
    "decisive_segment_index": 1
  }
}
```

Compound commands (`&&`, `;` outside quotes) set `compound.segment_count` ≥ 1 and `decisive_segment_index` to the 1-based segment that first produced **warn** or **deny** (or `null` if all segments **allow**). `risk_score` is the **maximum** across segments.

**Response (200) — allow:**

```json
{
  "verdict": "allow",
  "source": "intentra_guard",
  "risk_score": 0,
  "compound": { "segment_count": 1, "decisive_segment_index": null }
}
```

**Response (200) — allow with debug trace:**

```json
{
  "verdict": "allow",
  "source": "intentra_guard",
  "risk_score": 0,
  "compound": { "segment_count": 1, "decisive_segment_index": null },
  "trace": [
    { "phase": "compound", "detail": "segments=1;split=&&|;quote_aware" },
    { "phase": "s1:normalize", "detail": "nfkc+ws; len=5" },
    { "phase": "s1:tokenize", "detail": "tokens=2" },
    { "phase": "s1:rule:rm_recursive", "detail": "skip" },
    { "phase": "s1:rule:drop_table", "detail": "skip" },
    { "phase": "s1:match", "detail": "no_rule_matched" }
  ]
}
```

### `GET /intentra/guard/rules`

Inspect the guard rule registry (metadata only, no matcher functions).

**Response (200):**

```json
{
  "engine": { "version": 3, "tokenizer": "shell_quote_aware_v1", "normalization": "NFKC_whitespace_collapse" },
  "rules": [
    {
      "id": "rm_recursive",
      "category": "filesystem",
      "default_verdict": "deny",
      "base_risk": 88,
      "description": "Recursive file deletion outside known safe artifact directories.",
      "cwe_hints": ["CWE-782"]
    }
  ]
}
```

### `GET /intentra/guard/schema`

Get the culture fragment JSON Schema and rule IDs for configuration tooling.

**Response (200):**

```json
{
  "culture_fragment_schema": { "title": "intentra risk gates", "..." : "..." },
  "culture_fragment_schema_path": "mobile-app/server/schemas/culture-intentra.fragment.json",
  "rule_ids": ["docker_destructive", "drop_table", "git_discard", "git_force_push", "git_reset_hard", "kubectl_delete", "rm_recursive", "truncate"],
  "engine": { "version": 3 },
  "rule_count": 8
}
```

---

## Culture

### `GET /intentra/culture`

Read the team's `culture.json` (same file gstack skills consume).

**Response (200):**

```json
{
  "path": "/Users/you/.gstack/culture.json",
  "loaded": true,
  "culture": { "org": { "name": "Intentra" }, "..." : "..." },
  "note": "File is written and consumed by gstack skills; Intentra re-serves it for mobile audit and intent linkage."
}
```

If no culture file exists: `"loaded": false`, `"culture": null`.

---

## ProgressEvent Schema

Every event in the SSE stream and history endpoint follows this shape:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Monotonic ID (stringified integer) |
| `ts` | string | yes | ISO-8601 UTC timestamp |
| `kind` | EventKind | yes | `skill_start`, `skill_end`, `progress`, `tool_use`, `hook_fire` |
| `source` | string | yes | `jsonl_watcher`, `post`, or `hook` |
| `session_id` | string | no | Links events to a Claude Code session |
| `intent_id` | string | no | Links events to an intent artifact |
| `skill` | string | no | Skill name (e.g. `ship`, `qa`) |
| `message` | string | no | Human-readable description |
| `step` | string | no | Current step label |
| `pct` | number | no | Progress percentage (0-100) |
| `tool_name` | string | no | Tool name for `tool_use` events |
| `outcome` | string | no | `success`, `error`, or `unknown` |
| `duration_s` | number | no | Duration in seconds |
| `ingest_lane` | string | no | `intentra_jsonl_bridge` or `intentra_http` |
| `upstream_kind` | string | no | Origin taxonomy: `gstack_skill_run`, `gstack_hook_fire`, `intentra_guard`, `intent_created`, `intent_resolved` |

---

## Error Responses

All errors follow this shape:

```json
{ "error": "<message>" }
```

| Status | When |
|--------|------|
| 400 | Missing required field (`name`, `prompt`, `command`, `intent_id`, invalid `outcome`) |
| 401 | `INTENTRA_TOKEN` is set and request lacks valid `Authorization: Bearer` header |
| 404 | Agent or intent not found |
| 500 | Internal error (e.g. schema file unavailable) |
