# gstack monitor — mobile app

Real-time agent activity feed for gstack skills. Watch Claude work from your phone.

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

---

## Environment variables (server)

| Variable | Default | Description |
|----------|---------|-------------|
| `GSTACK_PROGRESS_PORT` | `7891` | Server port |
| `GSTACK_STATE_DIR` | `~/.gstack` | gstack state dir (for JSONL watcher) |

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
│   ├── server.ts      ← Bun HTTP server (~180 lines)
│   └── package.json
└── app/
    ├── App.tsx        ← navigation root
    ├── src/
    │   ├── types.ts              ← ProgressEvent, AgentSession
    │   ├── storage.ts            ← AsyncStorage wrapper
    │   ├── useEventStream.ts     ← SSE hook + reconnect
    │   ├── screens/
    │   │   ├── SetupScreen.tsx
    │   │   ├── DashboardScreen.tsx
    │   │   └── DetailScreen.tsx
    │   └── components/
    │       ├── EventRow.tsx
    │       └── AgentCard.tsx
    └── package.json
```
