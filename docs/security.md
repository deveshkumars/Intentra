# Security

Security model, authentication, data protection, and best practices for the Intentra progress server.

**Related docs:** [Documentation hub](README.md) · [Env Reference](env-reference.md) · [Architecture](intentra-architecture.md) · [Error Handling](error-handling.md) · [Troubleshooting](troubleshooting.md) · [API Reference](api-reference.md) · [Risks and Benefits](risks-and-benefits.md) · [Use Cases](use-cases.md)

---

## Authentication model

### Bearer token auth

When `INTENTRA_TOKEN` is set, the server requires `Authorization: Bearer <token>` on all **write** endpoints (`POST`, `PATCH`, `DELETE`). Read endpoints (`GET`) are always public.

```bash
# Start with auth enabled
INTENTRA_TOKEN=my-secret bun run server.ts

# Authenticated request
curl -X POST http://localhost:7891/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-secret" \
  -d '{"name": "agent-1"}'
```

### Open mode

When `INTENTRA_TOKEN` is not set (or empty), **all endpoints are public**. This is the default for local development. No credentials are checked.

### What's protected vs. public

| Access level | Endpoints | Auth required |
|-------------|-----------|---------------|
| **Public** (always) | `GET /health`, `GET /agents`, `GET /events/stream`, `GET /events/history`, `GET /intentra/*` (reads) | Never |
| **Protected** (when token set) | `POST /agents`, `PATCH /agents/:id`, `DELETE /agents/:id`, `POST /progress`, `POST /intentra/intent`, `PATCH /intentra/intent`, `POST /intentra/guard` | Bearer token |

### Token best practices

- **Generate a strong token:** Use a random string (`openssl rand -hex 32`)
- **Store in environment, not code:** Set via `INTENTRA_TOKEN` env var, not hardcoded
- **Use secrets management for cloud deploys:** `fly secrets set INTENTRA_TOKEN=...`, not `fly.toml`
- **Rotate by restarting:** Change the env var and restart the server. All clients using the old token get 401 until updated.
- **Never commit tokens:** The token should only exist in your shell environment or secrets manager

---

## CORS policy

The server allows requests from **any origin**:

```
Access-Control-Allow-Origin: <requesting origin> or *
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, ngrok-skip-browser-warning
```

### Why open CORS

The primary client is the Expo mobile app connecting through ngrok. The ngrok URL changes frequently (free tier), and the mobile app's origin varies by device and development mode. Restricting origins would break the main use case.

### When this matters

- **Local development:** Fine — you control all clients
- **Cloud deployment:** Consider adding origin restrictions if the server is publicly accessible and you want to prevent unauthorized browser-based access. However, bearer token auth already protects write endpoints.
- **Note:** CORS only applies to browser/webview requests. `curl`, scripts, and native apps are not subject to CORS restrictions.

---

## Data at rest

### Event buffer

Events are stored **in memory only** in a ring buffer. They are lost on server restart. No events are persisted to disk by the server itself.

### Intent artifacts

Intent JSON files are written to `.intentra/` under `INTENTRA_REPO_ROOT`. These are plain text JSON files with standard filesystem permissions.

- **Location:** `$INTENTRA_REPO_ROOT/.intentra/*.json`
- **Permissions:** Inherited from the parent directory (typically `644` on macOS/Linux)
- **Sensitivity:** Intent artifacts contain prompts (what the agent was asked to do), repo paths, and branch names. They do not contain credentials, secrets, or code.

### Guard telemetry

Guard deny/warn events are appended to `.intentra/telemetry/intentra-guard.jsonl`. This file contains:
- The guard verdict and matched pattern
- Risk score and engine version
- Repo name (basename only, not full path)
- **Not included:** The actual command that was evaluated (for privacy — raw commands may contain secrets)

### JSONL telemetry

The server watches `$GSTACK_STATE_DIR/analytics/skill-usage.jsonl` (default: `~/.gstack/analytics/skill-usage.jsonl`). This file is owned by gstack and contains skill run metadata. Intentra reads it but never writes to it.

- **Permissions:** Standard user-owned file under `~/.gstack/`
- **Sensitivity:** Contains skill names, session IDs, and timestamps. Does not contain code or prompts.

### Handoff files

`.intentra/HANDOFFS.md`, `PLANS.md`, and `PROMPTS.md` are append-only Markdown files. They may contain user prompts and implementation plans. These are intended to be committed to the repo — visibility is controlled by git access.

---

## Data in transit

### Local development

All traffic between the server and local clients is over **unencrypted HTTP** on localhost. This is acceptable for local development — the traffic never leaves your machine.

### ngrok tunnel

ngrok provides **TLS encryption** between the mobile app and the ngrok edge. Traffic between ngrok's edge and your local server is over a secure tunnel.

```
Phone ──HTTPS──> ngrok edge ──tunnel──> localhost:7891
```

### Cloud deployment

When deployed to Fly.io or behind a reverse proxy, configure TLS at the edge. The server itself does not handle TLS — it expects a reverse proxy (Fly, nginx, Cloudflare) to terminate TLS.

---

## Input validation and sanitization

### Command guard

The guard engine sanitizes input commands via:
1. **NFKC normalization** — collapses Unicode variants (prevents homoglyph attacks)
2. **Whitespace collapsing** — normalizes tabs, multiple spaces
3. **Shell-aware tokenization** — properly handles quoted strings

The raw command is **never logged** to disk (only the matched pattern and verdict are recorded in telemetry). This prevents accidental secret exposure in guard logs.

### Intent artifacts

Intent IDs are validated to prevent path traversal:
- Must not contain `..`
- Must not contain `/`
- Invalid IDs return 404 without creating files

### JSONL parsing

Malformed JSONL lines are silently skipped. The parser never throws — a corrupt line cannot crash the server.

---

## Threat model

### What the server protects against

| Threat | Mitigation |
|--------|-----------|
| Unauthorized write access | Bearer token auth on all write endpoints |
| Path traversal via intent IDs | Validation rejects `..` and `/` |
| Unicode confusable attacks on guard rules | NFKC normalization before pattern matching |
| Stale SSE connections consuming memory | Heartbeat-based cleanup of dead subscribers |
| JSONL corruption crashing server | Silent skip of malformed lines |
| Typos in culture.json risk_gates | `culture_warnings` in guard response |

### What it does NOT protect against

| Threat | Status |
|--------|--------|
| DDoS / rate limiting | Not implemented — rely on infrastructure (ngrok, Fly, Cloudflare) |
| Per-user auth (multi-tenant) | Not implemented — single shared token only |
| Encrypted storage at rest | Not implemented — standard filesystem permissions |
| Audit logging | Partial — guard telemetry only, no general access log |
| Token rotation without downtime | Not implemented — requires server restart |

These are acceptable tradeoffs for a developer tool designed for small teams. For production multi-tenant deployment, add a reverse proxy with rate limiting and per-user auth.
