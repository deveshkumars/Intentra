# Use cases and example scenarios

Practical walkthroughs showing how Intentra's features work in real-world situations. Each scenario includes the problem, the solution with curl commands, what the mobile app shows, and what to watch out for.

**Related docs:** [Documentation hub](README.md) · [Quickstart](quickstart.md) · [API reference](api-reference.md) · [Guard engine](guard-engine.md) · [Intent lifecycle](intent-lifecycle.md) · [Culture config](culture-config.md)

---

## Scenario 1: Solo developer tracking a multi-step feature

**Situation:** You're building a feature across several hours. You want to track progress on your phone so you know where things stand when you step away.

### Setup

Start the server and expose it:

```bash
INTENTRA_REPO_ROOT=$(pwd) bun run mobile-app/server/server.ts &
ngrok http 7891
```

Paste the ngrok URL into the Expo Go app.

### Create an intent for the feature

```bash
curl -s -X POST http://localhost:7891/intentra/intent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Add user profile page with avatar upload",
    "constraints": { "risk_tolerance": "medium" },
    "plan": [
      { "type": "task", "description": "Create ProfileScreen component" },
      { "type": "task", "description": "Add avatar upload endpoint" },
      { "type": "task", "description": "Wire S3 storage" },
      { "type": "test", "description": "E2E test profile flow" }
    ]
  }' | jq .intent_id
# → "intent_2026-03-29T14:00:00Z"
```

### Send progress as you work

```bash
# Step 1 complete
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "progress", "message": "ProfileScreen component done",
    "step": "create_profile", "pct": 25,
    "intent_id": "intent_2026-03-29T14:00:00Z"
  }'

# Step 2 complete
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "progress", "message": "Avatar upload endpoint working",
    "step": "avatar_endpoint", "pct": 50,
    "intent_id": "intent_2026-03-29T14:00:00Z"
  }'

# Guard blocks a dangerous command mid-session
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "rm -rf ./uploads", "session_id": "sess-123"}'
# → verdict: "deny", pattern: "rm_recursive"
```

### What you see on mobile

- **Dashboard tab:** Events stream in real-time. Each shows the step name and percentage.
- **Intent tab:** The intent appears with its plan steps. Tap to filter events linked to this intent.
- **Guard block:** A red `hook_fire` event appears showing the guard denied `rm -rf ./uploads`.

### Resolve when done

```bash
curl -s -X PATCH http://localhost:7891/intentra/intent \
  -H "Content-Type: application/json" \
  -d '{"intent_id": "intent_2026-03-29T14:00:00Z", "outcome": "success"}'
```

The intent card on mobile changes to green.

---

## Scenario 2: Team of 3 with bearer token auth

**Situation:** Three developers share one Intentra server. You want each person's events visible to everyone, but you don't want random internet traffic writing to the server.

### Setup with auth

```bash
# Generate a shared token
export INTENTRA_TOKEN=$(openssl rand -hex 32)
echo "Share this token with your team: $INTENTRA_TOKEN"

# Start the server
INTENTRA_TOKEN=$INTENTRA_TOKEN INTENTRA_REPO_ROOT=$(pwd) bun run mobile-app/server/server.ts
```

### Each developer's workflow

Each developer adds the token to their shell profile or passes it with requests:

```bash
# Developer A sends a progress event
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INTENTRA_TOKEN" \
  -d '{"kind": "progress", "message": "Auth module done", "session_id": "dev-alice"}'

# Developer B creates a tracked agent
curl -s -X POST http://localhost:7891/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INTENTRA_TOKEN" \
  -d '{"name": "lint-fix-agent", "description": "Fixing all ESLint warnings", "session_id": "dev-bob"}'
```

### What happens without the token

```bash
# Missing auth header → 401
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{"kind": "progress", "message": "should fail"}'
# → { "error": "unauthorized" }

# Read endpoints still work without auth
curl -s http://localhost:7891/health
# → { "ok": true, ... }
```

### Mobile app setup

In the Expo Go setup screen, enter both the ngrok URL and the bearer token. The app stores the token and includes it on all write requests automatically. If the token is wrong, the setup screen shows a clear error.

### Key considerations

- **Token rotation:** Change the token by restarting the server with a new `INTENTRA_TOKEN`. All clients get 401 until they update. There is no zero-downtime rotation — for a developer tool, this is acceptable.
- **No per-user auth:** All developers share one token. The server cannot distinguish who sent an event — use `session_id` to tag events by developer.
- **Read access is public:** Anyone with the URL can read events and health status. This is intentional — the mobile dashboard needs unauthenticated SSE for reliable reconnection.

---

## Scenario 3: Claude Code hooks for automatic progress tracking

**Situation:** You want every tool invocation in Claude Code to automatically appear in the Intentra feed — no manual curl calls needed.

### Wire the PostToolUse hook

Add to your Claude Code `settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "command": "gstack-progress --kind tool_use --tool-name $CLAUDE_TOOL_NAME --message \"$CLAUDE_TOOL_NAME completed\" --session-id $CLAUDE_SESSION_ID"
      }
    ]
  }
}
```

### Wire the guard as a PreToolUse hook

```bash
# Install the guard HTTP hook
chmod +x bin/intentra-guard-http

# Add to settings.json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "bin/intentra-guard-http"
      }
    ]
  }
}
```

Now when Claude tries `rm -rf ./src`, the guard hook blocks it before execution and the deny event appears on mobile.

### What the mobile feed looks like

With hooks wired, the Dashboard shows a real-time stream of tool invocations:

- `Edit completed` (tool_use, session sess-abc)
- `Write completed` (tool_use, session sess-abc)
- `Bash completed` (tool_use, session sess-abc)
- `[DENY] rm -rf ./src` (hook_fire, guard block)

Each event has a session_id so you can filter by agent session.

### Benefits of automatic tracking

- **Zero effort:** No manual curl calls. Every Claude Code action is tracked.
- **Guard integration:** Dangerous commands are blocked before execution, with the block visible on your phone.
- **Session correlation:** `session_id` links events to specific Claude Code sessions.

### Risks to be aware of

- **Event volume:** Busy sessions generate 100+ events per minute. The 200-event ring buffer means old events drop after a few minutes of high activity.
- **Hook latency:** Each hook call adds ~5-10ms. For most workflows this is unnoticeable.
- **Guard is cooperative:** The guard returns a verdict to the hook script. If the hook script ignores the verdict, the command still runs.

---

## Scenario 4: Debugging a guard false positive

**Situation:** The guard is blocking a command you believe should be allowed. You want to understand why and fix it.

### The problem

```bash
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "docker rm -f old-container"}'
# → { "verdict": "deny", "pattern": "docker_destructive", "risk_score": 75 }
```

You want to allow `docker rm -f` for development cleanup.

### Step 1: Get the debug trace

```bash
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "docker rm -f old-container", "debug": true}' | jq .trace
```

The trace shows every pipeline stage:

```json
[
  { "phase": "compound", "detail": "segments=1;split=&&|;quote_aware" },
  { "phase": "s1:normalize", "detail": "nfkc+ws; len=27" },
  { "phase": "s1:tokenize", "detail": "tokens=4" },
  { "phase": "s1:rule:rm_recursive", "detail": "skip" },
  { "phase": "s1:rule:docker_destructive", "detail": "matched" },
  { "phase": "s1:match", "detail": "first_hit=docker_destructive" }
]
```

### Step 2: Override via culture.json

Create or edit `~/.gstack/culture.json`:

```json
{
  "intentra": {
    "risk_gates": {
      "docker_destructive": "warn"
    }
  }
}
```

### Step 3: Verify the override

```bash
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "docker rm -f old-container"}'
# → { "verdict": "warn", "pattern": "docker_destructive", "risk_score": 54 }
```

Now the command is allowed with a warning. Risk score dropped from 75 to 54 (75 × 0.72).

### Step 4: Check for typos

If you mistype the rule ID:

```bash
# culture.json has "docker_destrictive" (typo)
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "ls"}' | jq .culture_warnings
# → ["unknown intentra.risk_gates key \"docker_destrictive\" (not in policy registry)"]
```

### When to allow vs. warn vs. deny

- **deny** (default): The command is blocked. Use for commands that should never run automatically.
- **warn**: The command runs, but a warning event appears on mobile and in telemetry. Use when you want visibility without blocking.
- **allow**: The command runs silently. Risk score drops to 12% of base. Use when the default is too aggressive for your workflow.

---

## Scenario 5: Handoff between agent sessions

**Situation:** You're ending a coding session and want to hand off context to the next agent (or your future self).

### Record what happened

Append to `.intentra/HANDOFFS.md`:

```markdown
---

**2026-03-29 — Gordon Beckler**

Branch: `feature/profile-page`
Last commit: `abc123f` — "Add avatar upload component"

**Status:** 75% complete. ProfileScreen renders, avatar upload works locally.

**Decisions made:**
- Used S3 presigned URLs for upload (not direct multipart)
- Chose 500px max avatar size (balance quality vs. storage)

**Blockers:**
- S3 CORS config not tested with production bucket

**Next actions:**
- [ ] Test S3 upload with production bucket credentials
- [ ] Add loading state to avatar upload button
- [ ] Write E2E test for profile flow
```

### View the handoff on mobile

The Handoffs tab parses `HANDOFFS.md` and shows:
- Date and author extracted from the bold header line
- Summary from the first meaningful content line
- The latest entry is auto-expanded and marked with a "LATEST" badge
- Older entries are collapsed but tappable

### View via API

```bash
# Latest entry only
curl -s http://localhost:7891/intentra/latest | jq .latest

# Parsed summary of all entries
curl -s http://localhost:7891/intentra/handoffs/summary | jq .
# → { "count": 3, "block_count": 3, "entries": [...] }

# Raw file content
curl -s http://localhost:7891/intentra/files | jq '.files[] | select(.name == "HANDOFFS.md")'
```

### Handoff best practices

- **Separate entries with `---`** on its own line. The parser splits on this.
- **Start with a bold date line:** `**2026-03-29 — Your Name**`. The parser extracts date and author.
- **Include "Next actions"** as a checklist. This is what the next agent reads first.
- **Mention the branch and last commit.** The next agent needs to know where to start.
- **Don't edit old entries.** HANDOFFS.md is append-only by convention.

---

## Scenario 6: Monitoring agent progress from your phone

**Situation:** You kicked off a long-running agent and want to monitor it while you're away from your desk.

### Register the agent

```bash
AGENT=$(curl -s -X POST http://localhost:7891/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "deploy-agent", "description": "Deploying v2.1 to production"}' | jq -r .id)
echo "Agent ID: $AGENT"
```

### Send progress events

```bash
# Stage 1
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{"kind": "progress", "message": "Building Docker image", "step": "build", "pct": 20}'

# Stage 2
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{"kind": "progress", "message": "Running integration tests", "step": "test", "pct": 50}'

# Stage 3
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{"kind": "progress", "message": "Deploying to Fly.io", "step": "deploy", "pct": 80}'
```

### Mark completion

```bash
# Success
curl -s -X PATCH http://localhost:7891/agents/$AGENT \
  -H "Content-Type: application/json" \
  -d '{"status": "done", "message": "v2.1 deployed successfully"}'

# Or failure
curl -s -X PATCH http://localhost:7891/agents/$AGENT \
  -H "Content-Type: application/json" \
  -d '{"status": "error", "message": "Integration tests failed: 3 failures in auth module"}'
```

### What you see on mobile

- **Dashboard:** Agent card shows name, description, and status (green dot for running, checkmark for done, red for error).
- **Detail view:** Tap the agent to see its event timeline with step names and percentages.
- **Real-time updates:** Status changes appear instantly via SSE. You don't need to refresh.

### How the ring buffer affects monitoring

The event buffer holds 200 events. In a busy session:
- 200 events ÷ ~2 events/second = ~100 seconds of history
- Events older than this window are evicted (FIFO)
- The `/events/history?limit=200` endpoint returns whatever is currently in the buffer
- SSE subscribers receive all events in real-time — nothing is lost while connected
- On reconnect, SSE replays the current buffer contents

**Implication:** If you disconnect for 5+ minutes during a busy session, you may miss some events. The agent status (tracked agents) is always current regardless of buffer state.

---

## Scenario 7: End-to-end observability trace

**Situation:** You want to trace a complete feature from intent creation through guard blocks to resolution — the full audit trail.

### 1. Create the intent

```bash
curl -s -X POST http://localhost:7891/intentra/intent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Migrate database schema to v3"}' | jq .intent_id
# → "intent_2026-03-29T16:00:00Z"
```

### 2. Guard evaluates commands during execution

```bash
# Safe command → allow
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "bun run migrate:up", "session_id": "sess-456"}'
# → { "verdict": "allow", "risk_score": 0 }

# Dangerous command → deny (logged to telemetry)
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "DROP TABLE users", "session_id": "sess-456"}'
# → { "verdict": "deny", "pattern": "drop_table", "risk_score": 92 }
```

### 3. Check what happened

```bash
# Guard telemetry (on disk)
cat .intentra/telemetry/intentra-guard.jsonl | jq .
# → { "event": "intentra_guard", "verdict": "deny", "pattern": "drop_table", "risk_score": 92, ... }

# Recent events (in-memory buffer)
curl -s http://localhost:7891/events/history?limit=5 | jq '.events[] | {kind, message, intent_id}'

# Intent status
curl -s http://localhost:7891/intentra/intent/intent_2026-03-29T16:00:00Z | jq '{prompt, outcome}'
```

### 4. Resolve and review

```bash
curl -s -X PATCH http://localhost:7891/intentra/intent \
  -H "Content-Type: application/json" \
  -d '{"intent_id": "intent_2026-03-29T16:00:00Z", "outcome": "error"}'
```

The audit trail now shows: intent was created, a `DROP TABLE` was blocked, and the intent resolved as `error`. All three data points are queryable through separate APIs and visible on mobile.

---

## See also

- **[Quickstart](quickstart.md)** — 5-minute local setup
- **[Risks and Benefits](risks-and-benefits.md)** — trade-off analysis for each feature
- **[API Reference](api-reference.md)** — full endpoint docs
- **[Guard Engine](guard-engine.md)** — policy pipeline deep dive
- **[Culture Config](culture-config.md)** — customize guard verdicts
- **[Intent Lifecycle](intent-lifecycle.md)** — create → track → resolve workflow
- **[Troubleshooting](troubleshooting.md)** — common issues
