# Error handling

How the Intentra progress server communicates errors, and how clients should handle them.

**Related docs:** [API Reference](api-reference.md) · [Troubleshooting](troubleshooting.md) · [Architecture](intentra-architecture.md) · [Security](security.md)

---

## HTTP error responses

Every error response is JSON with a consistent shape:

```json
{
  "error": "short_error_description"
}
```

The `Content-Type` header is always `application/json` on error responses.

### Status codes

| Code | When | Example `error` value | Client action |
|------|------|----------------------|---------------|
| **400** | Missing or invalid required field | `"name is required"`, `"prompt is required"`, `"command is required"`, `"outcome must be success, error, or cancelled"` | Fix the request body and retry |
| **401** | `INTENTRA_TOKEN` is set but `Authorization` header is missing or wrong | `"unauthorized"` | Add `Authorization: Bearer <token>` header |
| **404** | Resource not found | `"not found"`, `"intent not found"` | Check the ID exists via the list endpoint |
| **500** | Internal server error (rare) | `"schema_unavailable"` | Server-side issue — check server logs |

### Which endpoints return which errors

| Endpoint | 400 | 401 | 404 |
|----------|-----|-----|-----|
| `POST /agents` | Missing `name` | Token mismatch | — |
| `PATCH /agents/:id` | — | Token mismatch | Unknown agent ID |
| `DELETE /agents/:id` | — | Token mismatch | Unknown agent ID |
| `POST /progress` | Never (accepts any body) | Token mismatch | — |
| `POST /intentra/intent` | Missing `prompt` | Token mismatch | — |
| `PATCH /intentra/intent` | Missing `intent_id` or invalid `outcome` | Token mismatch | Unknown intent ID |
| `GET /intentra/intent/:id` | — | — | Unknown intent ID |
| `POST /intentra/guard` | Missing `command` | Token mismatch | — |
| `GET /intentra/guard/schema` | — | — | — (returns 500 if schema file missing) |

### Safe endpoints (never error)

These GET endpoints always return 200, even with empty data:

- `GET /health` — always returns `{"ok": true, ...}`
- `GET /agents` — returns `{"agents": []}` if none exist
- `GET /events/stream` — opens an SSE stream (never errors)
- `GET /events/history` — returns `{"events": [], "total": 0}` if empty
- `GET /intentra/files` — returns `{"files": []}` if `.intentra/` doesn't exist
- `GET /intentra/latest` — returns `{"latest": null}` if no handoffs
- `GET /intentra/intents` — returns `{"intents": [], "count": 0}` if none
- `GET /intentra/culture` — returns the culture snapshot (empty object if no `culture.json`)
- `GET /intentra/guard/rules` — always returns engine metadata + rule list

---

## Guard evaluation responses

The guard engine (`POST /intentra/guard`) always returns 200 with a structured evaluation, even when denying a command. This is intentional — the verdict is data, not an HTTP error.

### Response structure

```json
{
  "verdict": "deny",
  "pattern": "rm_recursive",
  "message": "[intentra guard] DENY: Recursive file deletion outside known safe artifact directories.",
  "source": "intentra_guard",
  "rule": {
    "id": "rm_recursive",
    "category": "filesystem",
    "baseRisk": 88,
    "cwe_hints": ["CWE-782"]
  },
  "risk_score": 88,
  "culture_warnings": [],
  "trace": []
}
```

### Verdict values

| Verdict | Meaning | `risk_score` formula |
|---------|---------|---------------------|
| `allow` | No rule matched, or culture overrides to allow | `0` (no match) or `baseRisk × 0.12` (culture allow) |
| `warn` | Rule matched; culture downgrades deny → warn | `baseRisk × 0.72` |
| `deny` | Rule matched; default or culture-confirmed deny | `baseRisk` (capped at 100) |

### Culture warnings

The `culture_warnings` array catches typos in `culture.json`. If a key in `intentra.risk_gates` doesn't match any known rule ID, a warning is returned:

```json
{
  "culture_warnings": [
    "unknown intentra.risk_gates key \"rm_recurisve\" (not in policy registry)"
  ]
}
```

This is informational — the evaluation still proceeds with other valid keys.

---

## SSE event types

The SSE stream (`GET /events/stream`) emits three event types:

| SSE event name | `data` payload | When |
|----------------|---------------|------|
| `progress` | `ProgressEvent` JSON | New progress event (from POST, JSONL watcher, or guard) |
| `agent_update` | `TrackedAgent` JSON | Agent created or status changed |
| `agent_delete` | `{"id": "agent_..."}` | Agent removed |

### Heartbeat

A comment line (`: heartbeat`) is sent every 15 seconds to keep the connection alive. This is not a named event — SSE clients should ignore comment lines automatically.

### Reconnection strategy

When the SSE connection drops:

1. **Wait** before reconnecting (exponential backoff recommended: 1s, 2s, 4s, 8s, max 30s)
2. **Reconnect** to `GET /events/stream` — the server replays the ring buffer (up to 200 events) and all tracked agents on every new connection
3. **Deduplicate** events by `id` — the replayed events may overlap with events you already received

The mobile app (`useEventStream.ts`) implements this pattern with built-in reconnection and deduplication.

---

## POST /progress: graceful by design

`POST /progress` is intentionally permissive:

- It **always** returns `201` with `{"ok": true}`, even if the body is malformed JSON or empty
- Missing fields are silently filled with defaults (`kind: "progress"`, `source: "post"`)
- This is by design — progress events should never fail because they're fire-and-forget from hooks and scripts

The `|| true` in the PostToolUse hook ensures Claude is never stalled by a progress post failure.

---

## Client error handling patterns

### Bash / curl

```bash
# Check for errors with jq
response=$(curl -s -w "\n%{http_code}" -X POST http://localhost:7891/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent"}')
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -1)

if [ "$http_code" -ge 400 ]; then
  echo "Error $http_code: $(echo "$body" | jq -r .error)"
fi
```

### TypeScript / fetch

```typescript
const res = await fetch(`${baseUrl}/agents`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
  body: JSON.stringify({ name: 'my-agent' }),
});

if (!res.ok) {
  const { error } = await res.json();
  if (res.status === 401) {
    // Token missing or wrong — prompt user to re-enter
  } else if (res.status === 404) {
    // Resource doesn't exist — refresh the list
  } else {
    // Unexpected error — log and show generic message
  }
}
```

### SSE reconnection (EventSource)

```typescript
function connectSSE(url: string, onEvent: (e: ProgressEvent) => void) {
  let retryDelay = 1000;

  function connect() {
    const source = new EventSource(url);

    source.addEventListener('progress', (e) => {
      retryDelay = 1000; // reset on successful data
      onEvent(JSON.parse(e.data));
    });

    source.onerror = () => {
      source.close();
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    };
  }

  connect();
}
```
