# gstack monitor — mobile app

Real-time agent activity feed for gstack skills. Watch Claude work from your phone.

**Intentra:** Progress server routes, auth, and `/intentra/*` APIs are inventoried in [`INTENTRA.md`](../INTENTRA.md). Architecture diagrams + full route/auth matrix: [`docs/intentra-architecture.md`](../docs/intentra-architecture.md). Deploy: [`DEPLOY.md`](../DEPLOY.md). The canonical product plan is [`masterdoc3.md`](../masterdoc3.md).

```
Claude Code (running a skill)
        │
        ├── ~/.gstack/analytics/skill-usage.jsonl (auto-watched)
        ├── bin/gstack-progress (optional manual updates)
        └── PostToolUse hook (optional, every tool call)
                        │
               progress server (localhost:7891)
                        │
                      ngrok
                        │
               Expo Go on your phone
           Dashboard → Agent cards → Detail timeline
```

---

## Quick start

### 1 — Start the progress server

```bash
cd mobile-app/server
bun install
bun run server.ts
```

The server starts on `http://localhost:7891` and immediately begins watching
`~/.gstack/analytics/skill-usage.jsonl` for skill start/end events.

### 2 — Expose via ngrok

```bash
ngrok http 7891
```

Copy the `https://xxxx.ngrok-free.app` URL — you'll paste it into the app.

### 3 — Start the Expo app

```bash
cd mobile-app/app
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS App Store / Google Play).

### 4 — Configure the app

On first launch, the app shows a setup screen. Paste your ngrok URL and tap **Connect**.

> To test on the same machine (iOS Simulator or LAN): use your machine's LAN IP
> instead of ngrok, e.g. `http://192.168.1.42:7891`.

---

## Seeing events

### Automatic — skill start/end

Any skill whose telemetry tier is `anonymous` or `community` (set via `gstack config set telemetry anonymous`)
will emit `skill_end` events automatically when it finishes. No changes required.

### Manual — from within a skill

Call `bin/gstack-progress` at any point during a skill to push a progress update:

```bash
gstack-progress --message "Running tests" --step "jest" --pct 60
gstack-progress --message "All tests passed" --step "jest" --pct 100
```

Available flags:

| Flag | Description |
|------|-------------|
| `--message` | Human-readable update shown in the app |
| `--step` | Current step label (e.g. `lint`, `build`, `deploy`) |
| `--pct` | Percentage complete (0–100) |
| `--skill` | Override skill name (auto-read from `$GSTACK_SKILL`) |

The script reads `$CLAUDE_SESSION_ID` automatically — no extra setup needed.

To make it available globally, symlink it:

```bash
ln -sf "$(pwd)/bin/gstack-progress" ~/.local/bin/gstack-progress
```

### Optional — PostToolUse hook (every tool call)

To see every tool Claude uses (Read, Edit, Bash, etc.) in real time, add this to
`~/.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "curl -s -m 1 -X POST http://localhost:7891/progress -H 'Content-Type: application/json' -d \"{\\\"kind\\\":\\\"tool_use\\\",\\\"source\\\":\\\"hook\\\",\\\"tool_name\\\":\\\"$CLAUDE_TOOL_NAME\\\",\\\"session_id\\\":\\\"$CLAUDE_SESSION_ID\\\",\\\"ts\\\":\\\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\\\"}\" >/dev/null 2>&1 || true"
          }
        ]
      }
    ]
  }
}
```

**Heads up:** this fires on every single tool call. It adds ~1–2ms per call (the
`-m 1` timeout caps it). `|| true` ensures it never stalls Claude.

---

## App screens

**Setup** — URL entry and connection check. Accessible anytime via the gear icon.

**Dashboard** — live event feed (newest first) + scrollable agent cards at the top.
Pull down to reconnect. Tap an agent card to see its full timeline.

**Detail** — per-session event timeline with absolute timestamps, kind badges,
step labels, and outcome.

---

## Server API

### Tracked agents

Register named agents and update their status — they appear as cards in the app dashboard.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/agents` | Create a tracked agent (`status: running`) |
| `PATCH` | `/agents/:id` | Update status / message |
| `DELETE` | `/agents/:id` | Remove agent |
| `GET` | `/agents` | List all tracked agents |

Status values: `running`, `done`, `error`.

```bash
# Create an agent
curl -s -X POST http://localhost:7891/agents \
  -H 'Content-Type: application/json' \
  -d '{"name": "my-task", "description": "optional description"}'
# → {"id":"agent_...","name":"my-task","status":"running",...}

# Mark done (use the id from the create response)
curl -s -X PATCH http://localhost:7891/agents/<id> \
  -H 'Content-Type: application/json' \
  -d '{"status": "done"}'

# Mark errored with a message
curl -s -X PATCH http://localhost:7891/agents/<id> \
  -H 'Content-Type: application/json' \
  -d '{"status": "error", "message": "something went wrong"}'

# List all agents
curl -s http://localhost:7891/agents

# Delete an agent
curl -s -X DELETE http://localhost:7891/agents/<id>
```

### Progress events

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/progress` | Push a progress event. Never returns an error. |
| `GET` | `/events/stream` | SSE stream. Replays buffer on connect, then live. |
| `GET` | `/events/history?limit=N` | REST fallback (max 200). |
| `GET` | `/health` | Connection check — `{ ok, events, subscribers, uptime }` |

```bash
# Health check
curl http://localhost:7891/health

# Push a test event
curl -X POST http://localhost:7891/progress \
  -H 'Content-Type: application/json' \
  -d '{"kind":"progress","message":"hello from curl","skill":"test"}'

# Watch the SSE stream
curl -N http://localhost:7891/events/stream
```

### Intentra HTTP (repo artifacts)

Resolve `.intentra/` from `INTENTRA_REPO_ROOT` if set, otherwise the server’s current working directory.

| Method | Path | Auth if `INTENTRA_TOKEN` set | Description |
|--------|------|------------------------------|-------------|
| `GET` | `/intentra/files` | No | List non-hidden files under `.intentra/` with full text |
| `GET` | `/intentra/latest` | No | Last `---`-separated block from `HANDOFFS.md` |
| `GET` | `/intentra/intents` | No | List parsed intent JSON artifacts |
| `GET` | `/intentra/culture` | No | Snapshot of `culture.json` from `GSTACK_STATE_DIR` (same file gstack loads; Intentra re-serves for mobile audit) |
| `POST` | `/intentra/intent` | Yes (`Bearer`) | Create intent JSON (`prompt` required; optional `repo`, `constraints`, `culture_ref`, `plan`). If `culture_ref` is omitted and `culture.json` exists, server sets `culture_ref` to that path. |

```bash
# List intent JSON files (empty array if none)
curl -s http://localhost:7891/intentra/intents

# Create an intent (add Authorization when INTENTRA_TOKEN is set)
curl -s -X POST http://localhost:7891/intentra/intent \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Ship feature X with tests","repo":{"path":".","branch":"main"}}'

# With bearer token
curl -s -X POST http://localhost:7891/intentra/intent \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{"prompt":"Example"}'
```

`POST /progress` accepts optional `intent_id` to tie events to an intent across sessions.

### Intentra command guard (policy engine)

**Pipeline:** Unicode **NFKC** normalization → **shell-like tokenizer** (quotes + basic escapes) → **ordered rule registry** (`guard-policy.ts`: category, `base_risk`, optional CWE documentation hints, `default_verdict`) → **`culture.json` → `intentra.risk_gates`** per pattern. Unknown `risk_gates` keys produce **`culture_warnings`** (catch typos / drift).

`GET /intentra/guard/rules` returns the public rule metadata and engine version (no secrets).

`POST /intentra/guard` with JSON `{ "command": "…", "session_id?": "…", "debug?": true }` returns `verdict`, `pattern`, `rule` (id, category, baseRisk), `risk_score` (0–100), optional `trace` (per-rule match/skip when `debug: true` or header **`X-Intentra-Guard-Debug: 1`**).

On `deny` or `warn`, the server appends to **`.intentra/telemetry/intentra-guard.jsonl`** (includes `risk_score`) and emits SSE (`upstream_kind: intentra_guard`). Requires `Authorization: Bearer …` when `INTENTRA_TOKEN` is set (same as other POSTs).

```bash
curl -s http://localhost:7891/intentra/guard/rules | head -c 400

curl -s -X POST http://localhost:7891/intentra/guard \
  -H 'Content-Type: application/json' \
  -d '{"command":"git push --force origin main"}'
# → verdict, pattern, rule{category}, risk_score, …

curl -s -X POST http://localhost:7891/intentra/guard \
  -H 'Content-Type: application/json' \
  -d '{"command":"ls","debug":true}'
```

Committed **sample** gstack JSONL (for docs/tests): [`fixtures/skill-usage-evaluator-sample.jsonl`](fixtures/skill-usage-evaluator-sample.jsonl) (not watched automatically).

### Telemetry lanes (Intentra-native provenance)

Events from the JSONL watcher include **`ingest_lane`: `intentra_jsonl_bridge`** and **`upstream_kind`**: `gstack_skill_run` (skill telemetry) or `gstack_hook_fire` (safety hooks from `event: hook_fire` lines). HTTP posts default to **`ingest_lane`: `intentra_http`**. The mobile feed shows `hook_fire` as a distinct row (shield icon) so gstack safety telemetry is visible **through** Intentra’s pipeline, not only in raw JSONL.

### Docker (optional)

```bash
docker build -f mobile-app/server/Dockerfile -t intentra-progress mobile-app/server
docker run --rm -p 7891:7891 \
  -v "$HOME/.gstack:/data/gstack" \
  -v "$(pwd):/repo" \
  -e GSTACK_STATE_DIR=/data/gstack \
  -e INTENTRA_REPO_ROOT=/repo \
  intentra-progress
```

---

## Environment variables (server)

| Variable | Default | Description |
|----------|---------|-------------|
| `GSTACK_PROGRESS_PORT` | `7891` | Server port |
| `GSTACK_STATE_DIR` | `~/.gstack` | gstack state dir (for JSONL watcher) |
| `INTENTRA_TOKEN` | _(unset)_ | If set, requires `Authorization: Bearer <token>` on every `POST`, `PATCH`, and `DELETE` |
| `INTENTRA_REPO_ROOT` | server `cwd` | Repo root used for `.intentra/` reads and intent JSON writes |

## Environment variables (gstack-progress script)

| Variable | Default | Description |
|----------|---------|-------------|
| `GSTACK_PROGRESS_PORT` | `7891` | Port to POST to |
| `GSTACK_PROGRESS_URL` | `http://localhost:$PORT` | Full URL override |
| `GSTACK_SKILL` | `` | Auto-set in skill preambles |
| `CLAUDE_SESSION_ID` | `` | Set by Claude Code runtime |

---

## File structure

```
mobile-app/
├── README.md          ← you are here
├── server/
│   ├── server.ts      ← Bun HTTP server (progress + Intentra routes)
│   ├── intent.ts      ← Intent-as-Code file I/O + schema types
│   ├── culture.ts     ← read gstack culture.json for GET /intentra/culture
│   ├── guard.ts           ← POST /intentra/guard facade + telemetry
│   ├── guard-policy.ts    ← rule registry + matchers
│   ├── guard-command.ts   ← NFKC normalize + shell tokenizer
│   ├── guard-types.ts     ← shared types
│   ├── Dockerfile     ← optional container deploy
│   ├── smoke.test.ts  ← smoke tests (bun test)
│   └── package.json
└── app/
    ├── App.tsx        ← navigation root
    ├── src/
    │   ├── types.ts              ← ProgressEvent, TrackedAgent, …
    │   ├── storage.ts            ← AsyncStorage wrapper
    │   ├── useEventStream.ts     ← SSE hook + reconnect
    │   ├── screens/
    │   │   ├── SetupScreen.tsx
    │   │   ├── DashboardScreen.tsx
    │   │   ├── DetailScreen.tsx
    │   │   └── IntentScreen.tsx
    │   └── components/
    │       ├── EventRow.tsx
    │       └── AgentCard.tsx
    └── package.json
```
