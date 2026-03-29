# gstack monitor — mobile app

Real-time agent activity feed for gstack skills. Watch Claude work from your phone.

**Intentra:** Progress server routes, auth, and `/intentra/*` APIs are inventoried in [`INTENTRA.md`](../INTENTRA.md). Architecture diagrams + full route/auth matrix: [`docs/intentra-architecture.md`](../docs/intentra-architecture.md). Deploy: [`DEPLOY.md`](../DEPLOY.md). The canonical product plan is [`masterdoc3.md`](../masterdoc3.md).

**New here?** Start with the [Quickstart](../docs/quickstart.md). Full endpoint schemas: [API Reference](../docs/api-reference.md). Testing: [TESTING.md](TESTING.md). Stuck? [Troubleshooting](../docs/troubleshooting.md). Env vars: [Env Reference](../docs/env-reference.md).

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

The app has a dark theme (`#0d0d0d` background) designed for glanceable monitoring.

**Tab bar:** **Dashboard** (live SSE feed + agents), **Handoffs** (structured view of `HANDOFFS.md` / `PROMPTS.md` / `PLANS.md` from `GET /intentra/files`), **Intent** (culture + Markdown + intent JSON artifacts).

### Setup screen

First screen on launch (or anytime via the ⚙ gear icon). Enter your server URL (ngrok or LAN) and tap **Connect**. The app hits `GET /health` with an 8-second timeout to verify the connection. On success, the URL is persisted in AsyncStorage.

- **Input:** URL field with `https://abc123.ngrok-free.app` placeholder
- **Feedback:** Loading spinner during connection, red error text on failure
- **Hint:** Shows the quick-start commands at the bottom (server + ngrok)

### Dashboard screen

The main screen. Three sections from top to bottom:

**Header bar** — "gstack monitor" title + connection status dot + ⚙ gear icon.

| Dot color | Meaning |
|-----------|---------|
| Green (`#4ade80`) | Connected — SSE stream active |
| Amber (`#f59e0b`) | Connecting — attempting to establish SSE |
| Grey (`#475569`) | Disconnected — no server URL configured |
| Red (`#f87171`) | Error — connection failed |

**Tracked agents** — Horizontal scrollable cards (170px wide each). Each card shows:
- Agent name (bold, top-left)
- Status dot (top-right): green=running (pulsing animation), blue=done, red=error
- Description (grey, 1 line)
- Error message (italic, if status is `error`)
- Status label + relative time ("3m ago") in the footer

Tap a card to navigate to the Detail screen. Cards appear/update/disappear in real-time via SSE `agent_update` and `agent_delete` events.

**Intent filter** — When intent artifacts exist, a row of filter chips appears. Tap an intent ID to filter the live feed to events linked to that intent. Tap "All" to clear the filter.

**Live events feed** — Reverse-chronological list of `ProgressEvent` items. Each row shows:

| Icon | Color | Event kind | Example label |
|------|-------|-----------|--------------|
| ▶ | Green | `skill_start` | "ship started" |
| ■ | Grey | `skill_end` | "ship success" |
| ● | Blue | `progress` | "Running tests" |
| ⚙ | Amber | `tool_use` | "Edit" |
| ! | Pink | `hook_fire` | "careful · rm_recursive" |

Each row also shows:
- Skill name (when applicable, grey subtext)
- Intent ID (purple monospace, when linked)
- Ingest lane + upstream kind (tiny grey monospace — e.g., `intentra_http · intent_created`)
- Relative timestamp ("just now", "5s ago", "2m ago")

**Pull-to-refresh** reconnects the SSE stream and re-fetches intent IDs.

### Detail screen

Tap an agent card on the Dashboard to see its full detail:

- **Status badge** — colored pill (amber=RUNNING, green=DONE, red=ERROR)
- **Description** — full agent description text
- **Message** — error message or completion note (when set)
- **Metadata card** — dark card with:
  - Agent ID (monospace)
  - Started time (HH:MM:SS)
  - Last update time
  - Duration (shown only when agent is done/errored)
- **Update hint** — shows the curl command to update this agent's status

Tap **← Back** to return to the Dashboard.

### Handoffs screen

Dedicated visibility for append-only handoff Markdown (aligned with masterdoc “stateful handoffs”):

- **Source:** `GET /intentra/files` — same `.intentra/` directory as the Intent tab, but focused on the three narrative files.
- **Chips:** Switch between Handoffs, Prompts, and Plans; badge shows `---`-separated entry count per file.
- **Cards:** Newest entry first; **LATEST** on the top card; tap to expand full body text.
- **Parsing:** Implemented in [`shared/handoff-parse.ts`](shared/handoff-parse.ts) (unit-tested — see [`TESTING.md`](TESTING.md)). Optional API: `GET /intentra/handoffs/summary` (same parser on the server).

Set **`INTENTRA_REPO_ROOT`** to your git repo root when running the server so `.intentra/` resolves to the project you care about.

### Intent Context screen

Accessed via tab navigation. Shows the `.intentra/` contents and culture configuration:

**Team culture (gstack)** — Expandable section showing `culture.json` from the server's `GSTACK_STATE_DIR`. Shows the full JSON (monospace), file path, and a note explaining that gstack writes and consumes this file.

**PROMPTS / PLANS / HANDOFFS** — One expandable section per `.intentra/` Markdown file (same files as the **Handoffs** tab, which offers a card-based reader). Badge shows the entry count (entries separated by `---`). Content is rendered as monospace text.

**Intent Artifacts** — Cards for each intent JSON artifact:
- Intent ID (monospace, grey)
- Prompt (white, main text)
- Branch name (chip)
- Outcome badge: green=success, red=error, amber=cancelled, grey=open
- Risk tolerance (when set in constraints)
- Plan steps (numbered list, when present)
- **Action buttons:** Done (green), Failed (red), Cancelled (amber) — calls `PATCH /intentra/intent` to set outcome. Shows an alert if the server returns 401 (auth required).

Pull-to-refresh reloads all data from the server.

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
| `GET` | `/intentra/intent/:id` | No | Fetch a single intent artifact by id |
| `GET` | `/intentra/culture` | No | Snapshot of `culture.json` from `GSTACK_STATE_DIR` (same file gstack loads; Intentra re-serves for mobile audit) |
| `POST` | `/intentra/intent` | Yes (`Bearer`) | Create intent JSON (`prompt` required; optional `repo`, `constraints`, `culture_ref`, `plan`). Emits SSE `intent_created` event. If `culture_ref` is omitted and `culture.json` exists, server sets `culture_ref` to that path. |
| `PATCH` | `/intentra/intent` | Yes (`Bearer`) | Set `outcome`: JSON `{ "intent_id": "…", "outcome": "success" \| "error" \| "cancelled" }`. Emits SSE `intent_resolved` event. |

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

`POST /progress` accepts optional `intent_id` to tie events to an intent across sessions. The **Dashboard** loads known intents from `GET /intentra/intents` and can **filter** the live feed by `intent_id`. The **Intent** tab can set outcome via `PATCH` (open servers) or shows an auth hint if `INTENTRA_TOKEN` is enabled.

**gstack-progress:** pass `--intent-id <id>` or set **`INTENTRA_INTENT_ID`** so progress lines carry the same `intent_id` as your `.intentra/{id}.json` artifact.

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
docker build -f mobile-app/server/Dockerfile -t intentra-progress .
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
| `INTENTRA_INTENT_ID` | `` | Optional; forwarded as `intent_id` on `POST /progress` |

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
