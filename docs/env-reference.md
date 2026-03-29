# Environment variable reference

All environment variables used by the Intentra progress server, mobile app, and CLI tooling. This is the single source of truth — other docs link here.

**Related docs:** [Documentation hub](README.md) · [Quickstart](quickstart.md) · [Security](security.md) · [Troubleshooting](troubleshooting.md) · [Deploy](../DEPLOY.md) · [INTENTRA.md](../INTENTRA.md)

---

## Progress server

These variables configure the Bun HTTP server in `mobile-app/server/server.ts`.

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `GSTACK_PROGRESS_PORT` | `7891` | Integer (1–65535) | TCP port the server listens on. Must not conflict with other services. |
| `GSTACK_STATE_DIR` | `~/.gstack` | Directory path | Root of gstack state. The server watches `$GSTACK_STATE_DIR/analytics/skill-usage.jsonl` for telemetry. |
| `INTENTRA_TOKEN` | _(unset)_ | String | When set, all `POST`, `PATCH`, and `DELETE` endpoints require `Authorization: Bearer <token>`. GET endpoints are always public. When unset, the server runs in open mode (no auth). |
| `INTENTRA_REPO_ROOT` | Server's `cwd` | Directory path | Repo root for resolving `.intentra/` (intent artifacts, handoffs, telemetry). Must point to a directory containing (or where you want) a `.intentra/` folder. |

### Validation rules

- `GSTACK_PROGRESS_PORT`: Parsed with `parseInt`. Invalid values default to `7891`. Ports below 1024 may require elevated permissions.
- `GSTACK_STATE_DIR`: The directory and `analytics/` subdirectory are not created automatically — gstack creates them on first skill run.
- `INTENTRA_TOKEN`: No format requirements. Any non-empty string works. Empty string is treated as unset (open mode).
- `INTENTRA_REPO_ROOT`: Must be a valid directory path. The `.intentra/` subdirectory is created on first `POST /intentra/intent`.

### Example: local development

```bash
# Minimal (all defaults)
cd mobile-app/server && bun run server.ts

# With auth
INTENTRA_TOKEN=dev-secret bun run server.ts

# Custom port + state dir
GSTACK_PROGRESS_PORT=9000 GSTACK_STATE_DIR=/tmp/gstack bun run server.ts
```

### Example: Docker

```bash
docker run --rm -p 7891:7891 \
  -v "$HOME/.gstack:/data/gstack" \
  -v "$(pwd):/repo" \
  -e GSTACK_STATE_DIR=/data/gstack \
  -e INTENTRA_REPO_ROOT=/repo \
  -e INTENTRA_TOKEN="production-secret-here" \
  intentra-progress
```

---

## gstack-progress CLI

The `bin/gstack-progress` script sends progress events to the server from within skills or terminal sessions.

| Variable | Default | Type | Description |
|----------|---------|------|-------------|
| `GSTACK_PROGRESS_PORT` | `7891` | Integer | Port to POST to (same as server). |
| `GSTACK_PROGRESS_URL` | `http://localhost:$PORT` | URL | Full URL override. Use this when the server is remote or behind a tunnel. |
| `GSTACK_SKILL` | _(empty)_ | String | Skill name. Auto-set by gstack's skill preamble. Forwarded as `skill` on progress events. |
| `CLAUDE_SESSION_ID` | _(empty)_ | String | Set automatically by the Claude Code runtime. Forwarded as `session_id` on progress events. |
| `INTENTRA_INTENT_ID` | _(empty)_ | String | When set, forwarded as `intent_id` on `POST /progress` — links progress events to a specific intent artifact. |

### Example

```bash
# Send a progress update (within a skill)
gstack-progress --message "Running tests" --step "jest" --pct 60

# With explicit intent linking
INTENTRA_INTENT_ID=intent_2026-03-28T10:15:00Z \
  gstack-progress --message "Deploying" --step "fly" --pct 90
```

---

## PostToolUse hook

The optional Claude Code hook sends tool-use events to the server. These variables are set by the Claude Code runtime — you don't set them manually.

| Variable | Set by | Description |
|----------|--------|-------------|
| `CLAUDE_TOOL_NAME` | Claude Code | Name of the tool just used (e.g., `Read`, `Edit`, `Bash`). |
| `CLAUDE_SESSION_ID` | Claude Code | Current session identifier. |

The hook command in `~/.claude/settings.json` references these variables. See [mobile-app/README.md](../mobile-app/README.md) for the full hook configuration.

---

## Mobile app (Expo)

The Expo app has no environment variables — all configuration happens through the in-app Setup screen where you enter the server URL. The URL is persisted in AsyncStorage on the device.

---

## Variable precedence and interactions

```
GSTACK_PROGRESS_URL overrides → GSTACK_PROGRESS_PORT
INTENTRA_REPO_ROOT  overrides → process.cwd()
GSTACK_STATE_DIR    overrides → ~/.gstack
INTENTRA_TOKEN      set       → enables auth on write endpoints
                    unset     → open mode (all endpoints public)
```

### Common configurations

| Scenario | Variables to set |
|----------|-----------------|
| Local dev, no auth | None (all defaults) |
| Local dev, with auth | `INTENTRA_TOKEN` |
| Docker deployment | `GSTACK_STATE_DIR`, `INTENTRA_REPO_ROOT`, `INTENTRA_TOKEN` |
| Fly.io deployment | `INTENTRA_TOKEN` (via `fly secrets set`) |
| Custom port | `GSTACK_PROGRESS_PORT` (server) + update ngrok/tunnel accordingly |
| CI smoke tests | None (tests use random ports internally) |
