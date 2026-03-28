# Intentra

> Git tracks what changed. Intentra tracks **why** — and lets you watch it happen from your phone.

**One-line pitch:** The collaboration layer for autonomous software agents. Durable intent, executable culture, and real-time mobile observability.

### Rubric map (for evaluator navigation)

| Criterion | Where to look |
|-----------|---------------|
| Vision Clarity | Solution → North Star |
| Problem Definition | Problem (full section) |
| Innovation | Solution → Before/after + What's novel |
| Technical Depth | Architecture (full section — real types, real APIs, real code) |
| Differentiation Strategy | Solution → Why we win |
| Feasibility (24h) | Features → Feasibility + Acceptance criteria |
| User Impact | Solution → What changes for users |
| Scalability Design | Architecture → Scalability |
| Ecosystem Thinking | Architecture → Ecosystem |
| Market Awareness | Solution → Competitive landscape |
| Risk Assessment | Features → Risk matrix |
| Team Execution Plan | Team Plan (full section) |

---

## Problem

An engineer kicks off three agents in parallel before lunch. She comes back to find: one agent shipped a clean PR, one silently violated the team's merge policy (touched a production config without approval), and one stalled waiting for input nobody saw. The PR diff from agent two looks fine — tests pass — but the **missing prompt history** and **missing culture rules** mean the reviewer can't tell if the change was intentional or reckless. Rework. Slowed merges. Eroding trust.

This isn't hypothetical. It's the daily reality for teams adopting AI agents:

**1. "Why" disappears.** Git preserves diffs but loses the prompts, trade-offs, constraints, and cultural rules that produced them. After a merge, nobody can answer "why did the agent do this?"

**2. Supervision is desk-bound.** Monitoring agent runs means babysitting a local terminal. Step away from your laptop and you're flying blind.

**3. Culture mismatch causes churn.** Agents have no concept of team norms — risk tolerance, review thresholds, naming conventions, merge policy. They produce technically correct but culturally wrong code.

### Who feels this

| Audience | Their pain | Scale |
|----------|-----------|-------|
| AI-first startups | Multiple agents running simultaneously with zero coordination | Growing fast — every funded AI startup is here within 12 months |
| Distributed eng teams | "Agent + human" workflows across time zones, no shared context | Every team using Cursor/Claude/Copilot in production |
| Tech leads / founders | Need async visibility into what agents are doing — can't be at a desk 24/7 | Every technical decision-maker managing agents |

### The missing category

Today's tools optimize **"agents write code."** Nobody owns the layer between intent and execution. We call this gap **Agentic Management** — the control plane and artifacts that make multi-agent work trustworthy for teams.

---

## Solution

**North Star:** Humans define intent and cultural guardrails. Agents execute. Supervision is seamless and cross-platform. The intent layer becomes as durable and shareable as the code layer itself.

### Before and after

| | Without Intentra | With Intentra |
|---|-----------------|---------------|
| **Intent** | Lost in chat history; unreproducible | Persisted as `intent.json` in the repo — reviewable, diffable, resumable |
| **Culture** | README that agents ignore | Machine-readable `culture.json` enforced as runtime guardrails |
| **Handoffs** | "Read the last 50 messages in the thread" | Structured Markdown snapshot with status, decisions, and next actions |
| **Supervision** | Stare at terminal; hope nothing breaks while you're away | Real-time mobile feed with reconnect — check your phone at lunch |
| **Accountability** | "Why did the agent do that?" → shrug | Full intent trail: prompt → constraints → plan → outcome |

### Four pillars

| Pillar | What it does | Status |
|--------|-------------|--------|
| **Mobile Observability** | Real-time agent activity feed on your phone — SSE with reconnect, backfill, and ring-buffer replay | **Shipped in this repo** |
| **Executable Culture** | Team norms loaded from `~/.gstack/culture.json` and treated as first-class runtime constraints | Supported today |
| **Intent-as-Code** | Structured intent + constraints + plan persisted as a repo-local JSON artifact | Next 24h |
| **Stateful Handoffs** | Standardized Markdown snapshot so humans/agents can resume without re-deriving context | Next 24h |

### What's novel (why this isn't a rehash)

Most agent tools stop at "agents write code faster." Intentra is the first to treat **collaboration metadata** — intent, culture, handoffs, observability — as a product layer:

- **Mobile observability as a product primitive.** Not "we added a webhook." A production-quality SSE pipeline with ring-buffer replay, exponential backoff reconnect (1s → 2s → 4s → … → 30s cap), event deduplication, and parallel history backfill. Already shipped and working.
- **Executable culture.** Team standards aren't documentation the agent might read — they're structured constraints that gate runtime decisions. Already supported.
- **Intent-as-Code.** Prompts + constraints + plans versioned as repo artifacts. The "why" survives after the chat session closes. Next 24h.
- **Lossless handoffs.** A structured resume format so agent→human and human→agent transitions don't lose context. Next 24h.

### Why we win (differentiation)

| Differentiator | Why it matters | Proof |
|---------------|---------------|-------|
| **Workflow-centric, not IDE-centric** | Artifacts + HTTP contracts outlive any editor. Works from CLI, CI, mobile. | Shipped: SSE transport works from Expo, curl, any HTTP client |
| **Culture-aware by design** | "Team DNA" is a first-class runtime input, not an afterthought | Supported: `~/.gstack/culture.json` loaded and applied to agent decisions |
| **Observability-first** | Trust through transparency — see what agents are doing in real time | Shipped: live mobile feed with < 1s latency |
| **Prompts are durable assets** | "Why" is versioned and portable, not lost in chat history | Next 24h: `intent.json` committed to repo |

### Competitive landscape

| Product | What they optimize | What they miss |
|---------|-------------------|---------------|
| **GitHub Copilot Workspace** | IDE-integrated code generation | No intent persistence, no culture enforcement, no mobile observability |
| **Devin** | Fully autonomous agent execution | Opaque decision-making; no cultural guardrails; no handoff format |
| **Grit.io** | Automated large-scale code migrations | Narrow scope — no observability, no intent layer, no collaboration artifacts |
| **Cursor** | AI-assisted editing in the IDE | IDE-bound; no cross-platform supervision; no durable intent |

**Category wedge:** Others compete on "agents write code faster." Intentra competes on "humans and agents collaborate safely at scale." Different race entirely.

### What changes for users (impact)

| User | Before | After | What we measure in MVP |
|------|--------|-------|----------------------|
| **Engineer running agents** | Checks terminal every few minutes; can't step away | Glances at phone; gets live feed with full context | Runs observed remotely vs. at desk |
| **PR reviewer** | Reverse-engineers agent intent from diffs alone | Reads `intent.json` — sees prompt, constraints, plan | Time from PR open to review decision |
| **Team lead** | Discovers culture violations post-merge | Culture rules enforced before the PR is created | Policy violations caught pre-merge vs. post-merge |
| **New team member** | Reads 50 PRs to understand "why" behind architecture | Reads intent + handoff history for the feature | Time to first meaningful contribution |

---

## Architecture

### Stack

| Layer | Technology | Why this choice |
|-------|-----------|----------------|
| Agent runtime | Claude Code + gStack skills | Already emits telemetry; culture support built in |
| Middleware | Bun HTTP server | Fast startup, native TypeScript, built-in fs.watch |
| Mobile | React Native + Expo | Cross-platform; Expo Go for instant demo distribution |
| Connectivity | ngrok / LAN | Zero-config remote access for demos; replaceable at Stage 2 |

### System data flow

```text
Claude Code runs gStack skills locally
        |
        |  Three ingestion paths (all implemented):
        |
        +--> [1] ~/.gstack/analytics/skill-usage.jsonl
        |         (automatic — every skill run writes here)
        |
        +--> [2] POST /progress
        |         (explicit — skills call this during long steps)
        |
        +--> [3] PostToolUse hook in Claude Code settings.json
        |         (optional — per-tool-call granularity)
        |
        v
Progress server (Bun, localhost:7891)
  ┌─────────────────────────────────────────────┐
  │  JSONL watcher (fs.watch → dir watch → poll)│
  │  Ring buffer (CircularBuffer, capacity 200)  │
  │  SSE broadcaster (Set<Controller>)           │
  │  Tracked agents (Map<id, TrackedAgent>)      │
  │  Heartbeat (15s keepalive)                   │
  └─────────────────────────────────────────────┘
        |
        v
ngrok / LAN  ──>  React Native app (Expo Go)
                    ┌──────────────────────────┐
                    │  useEventStream hook      │
                    │  - exponential backoff    │
                    │    (1s → 2s → 4s → 30s)  │
                    │  - event dedup (Set<id>)  │
                    │  - parallel backfill on   │
                    │    reconnect              │
                    │  Dashboard + Detail views │
                    └──────────────────────────┘
```

### APIs (implemented — `mobile-app/server/server.ts`)

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/events/stream` | GET | SSE — replays full ring buffer (agents + events), then streams live. 15s heartbeat keepalive. |
| `/events/history?limit=N` | GET | Returns last N events (max 200) + `total` count. Used for reconnect backfill. |
| `/progress` | POST | Ingest event. **Never errors** — always 201, even on malformed body. Designed to never block agent execution. |
| `/health` | GET | Returns `{ ok, events, buffered, subscribers, uptime, jsonl }`. No auth required — used for connectivity check. |
| `/agents` | GET | List all tracked agents, sorted newest first. |
| `/agents` | POST | Register agent. Requires `name`. Returns created agent with generated ID. Broadcasts `agent_update` SSE event. |
| `/agents/:id` | PATCH | Update agent status/message. Broadcasts `agent_update`. |
| `/agents/:id` | DELETE | Remove agent. Broadcasts `agent_delete`. |

### Implemented types (from actual source code)

**`ProgressEvent`** — the core event flowing through the entire pipeline:

```typescript
type EventKind = 'skill_start' | 'skill_end' | 'progress' | 'tool_use';

interface ProgressEvent {
  id: string;
  ts: string;                    // ISO 8601
  kind: EventKind;
  source: 'jsonl_watcher' | 'post' | 'hook';
  session_id?: string;
  skill?: string;                // e.g. "gstack-ship", "gstack-qa"
  message?: string;              // human-readable progress message
  step?: string;                 // current step label
  pct?: number;                  // 0-100 progress percentage
  tool_name?: string;            // for tool_use events
  outcome?: 'success' | 'error' | 'unknown';
  duration_s?: number;           // for skill_end events
}
```

**`TrackedAgent`** — represents a running agent session:

```typescript
interface TrackedAgent {
  id: string;                    // auto-generated: agent_{timestamp}_{counter}
  name: string;                  // required on creation
  description?: string;
  status: 'running' | 'done' | 'error';
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  message?: string;              // latest status message
}
```

### Resilience engineering (already shipped)

The system is designed to **never lose events** and **never block agents**:

**Server-side resilience:**
- **Ring buffer** (`CircularBuffer`, capacity 200) — O(1) push, bounded memory, instant replay for new SSE subscribers.
- **JSONL watcher fallback chain:** `fs.watch(file)` → if file doesn't exist, `fs.watch(parent directory)` → if directory doesn't exist, poll every 2 seconds. Automatically picks up the file whenever it's created.
- **POST /progress never errors** — always returns 201, even with malformed input. Agent execution is never blocked by telemetry failures.
- **SSE heartbeat** every 15 seconds — keeps connections alive through proxies and load balancers.
- **Subscriber cleanup** — failed `enqueue()` calls automatically remove dead controllers from the broadcast set.

**Client-side resilience (`useEventStream` hook):**
- **Exponential backoff:** 1s → 2s → 4s → 8s → … → 30s cap. Resets to 1s on successful connection.
- **Event deduplication:** `seenIds` Set prevents duplicate events across reconnects.
- **Parallel backfill on reconnect:** simultaneously fetches `GET /events/history?limit=200` and `GET /agents` via `Promise.all` to fill the gap.
- **ngrok header bypass:** automatically sends `ngrok-skip-browser-warning: true` on all requests.
- **Bounded state:** events array capped at 200 entries to prevent memory growth.

### Proof table (fast evaluator verification)

| Layer | Contract | File | Consumer | Verified how |
|-------|----------|------|----------|-------------|
| Transport | SSE `GET /events/stream` | `server/server.ts` L237-268 | `useEventStream.ts` L86-88 | Connect app, see events arrive |
| Resilience | Backfill `GET /events/history` + `GET /agents` | `server/server.ts` L408-415, L359-367 | `useEventStream.ts` L61-78 | Toggle network, see gap filled |
| Ingestion | `POST /progress` (never errors) | `server/server.ts` L370-394 | Skills, hooks, curl | POST malformed body → still 201 |
| Agent tracking | CRUD `/agents` + SSE broadcast | `server/server.ts` L289-357 | Mobile dashboard cards | Register agent, see card appear |
| Reconnect | Exponential backoff + dedup | `useEventStream.ts` L118-127, L43 | End user experience | Kill server, restart, no duplicates |
| JSONL watcher | 3-tier fallback: file → dir → poll | `server/server.ts` L209-233 | Automatic skill telemetry | Append to JSONL, event appears |

### Planned artifact types (next 24h)

**IntentSchema** — structured plan persisted as `.intentra/{intent_id}.json`:

```json
{
  "intent_id": "intent_2026-03-28T14:33:12Z",
  "prompt": "Merge feature branch safely, prefer stability, run tests.",
  "repo": { "path": "/path/to/repo", "branch": "feature/x" },
  "constraints": {
    "risk_tolerance": "low",
    "requires_approval_for": ["force_push", "prod_config_change"]
  },
  "culture_ref": "~/.gstack/culture.json",
  "plan": [
    { "type": "git_fetch" },
    { "type": "git_merge", "strategy": "safe" },
    { "type": "run_tests", "command": "npm test" }
  ],
  "outcome": null
}
```

**CultureJSON** — team DNA guardrails (already supported via `~/.gstack/culture.json`):

```json
{
  "priority": {
    "security": 100,
    "correctness": 90,
    "maintainability": 80,
    "performance": 70,
    "style": 40
  },
  "merge_policy": {
    "require_green_tests": true,
    "require_review_for_risky_changes": true
  },
  "risk_gates": {
    "force_push": "deny",
    "edit_prod_config": "approval_required",
    "delete_data": "deny"
  }
}
```

**Handoff snapshot** — persisted as `.intentra/{intent_id}-handoff.md`:

```md
## Handoff Snapshot
- **Intent:** intent_2026-03-28T14:33:12Z
- **Repo/Branch:** myrepo / feature/x
- **What changed:** merged feature branch, ran test suite (14/14 passing)
- **Why:** prompt requested safe merge; stability constraint active
- **Constraints applied:** low risk tolerance → force_push denied, chose merge over rebase
- **Culture gates triggered:** require_review_for_risky_changes → flagged for human review
- **Current status:** tests passing, PR created, awaiting human approval
- **Next actions:** human approves PR → deploy to staging → canary check
```

### Storage strategy

- **MVP:** `.intentra/` directory in the repo root — versionable, diffable, shareable via git. Artifacts are plain JSON and Markdown, readable by any tool.
- **Scaled:** durable backend (Postgres/S3) with org-wide search, access control, and analytics — **same artifact formats**, just a different storage layer.

### Ecosystem thinking

- **LLM-agnostic:** intent is JSON, handoff is Markdown. Works with Claude, GPT, Llama, Gemini, and future models. No vendor lock-in.
- **Tool-agnostic transport (shipped):** HTTP + SSE requires no vendor SDK. Works from curl, any HTTP client, any CI runner, any mobile app.
- **Three ingestion paths (shipped):** JSONL file watcher, HTTP POST, and PostToolUse hook. Any agent framework can emit events through at least one of these without code changes.
- **Adapter path:** extend to CI (GitHub Actions posts `POST /progress`), Slack (webhook adapter), and issue trackers (Jira/Linear webhook) using the same event format.

Future integration surface:
- **HTTP-first:** keep SSE for event fanout; add bearer token auth with coarse-grained scopes (`read:events`, `write:progress`).
- **Optional JSON-RPC** for IDE integration:
  - `intentra.createIntent(prompt, cultureRef)` → returns intent_id
  - `intentra.getRunStatus(runId)` → returns live status
  - `intentra.getHandoffSnapshot(runId)` → returns Markdown

### Scalability (staged, realistic)

| Stage | What changes | Technical detail |
|-------|-------------|-----------------|
| **0 (today)** | Local-first | JSONL watcher + in-memory ring buffer + SSE to mobile via ngrok. Single machine, single user. |
| **1 (next)** | CI-aware | CI runners post `POST /progress` events. Artifacts attach to builds/PRs as build outputs. Multiple event sources, same server. |
| **2 (future)** | Hosted | Hardened gateway replaces ngrok. Persistent event store (Postgres) replaces ring buffer. Per-org auth + RBAC. Org-wide intent/handoff search. **Same artifact formats and event types.** |

**Key principle:** intent artifacts and culture rules are stable contracts. Execution environments (local → CI → cloud) are swappable without changing the intent layer.

---

## Features

### Already shipped (code exists in this repo)

| Feature | What's actually built | Evidence |
|---------|----------------------|----------|
| **SSE event pipeline** | Ring buffer replay → live broadcast → 15s heartbeat | `mobile-app/server/server.ts` (CircularBuffer class + makeSSEStream) |
| **JSONL watcher** | 3-tier fallback: file watch → dir watch → 2s poll | `mobile-app/server/server.ts` (lines 163-233) |
| **Mobile dashboard** | Live feed, tracked agent cards, per-session detail timeline | `mobile-app/app/src/` (React Native + Expo) |
| **Resilient SSE client** | Exponential backoff (1s→30s), event dedup, parallel backfill | `mobile-app/app/src/useEventStream.ts` (150 lines) |
| **Tracked agents CRUD** | Register/update/delete with real-time SSE broadcast | `mobile-app/server/server.ts` (agent routes) |
| **ngrok remote access** | Header bypass, setup flow, connectivity health check | `mobile-app/README.md` + useEventStream headers |
| **Culture support** | Load `~/.gstack/culture.json`, apply as runtime constraint | `SKILL.md` (Organizational Culture section) |

### Ships in the next 24 hours

- **Intent-as-Code artifacts** — `.intentra/{intent_id}.json` written from real skill runs
- **Handoff snapshots** — `.intentra/{intent_id}-handoff.md` generated at run completion
- **Bearer-token auth** — protect POST endpoints; keep `/health` and GET read-only public

### MVP acceptance criteria (binary, evaluator-verifiable)

| # | Test | Pass condition |
|---|------|---------------|
| 1 | **Live feed** | Start server, connect app → events appear over SSE |
| 2 | **Reconnect + backfill** | Kill and restart server → app reconnects, no duplicate events, gap filled |
| 3 | **JSONL ingestion** | Append line to `skill-usage.jsonl` → `skill_end` event appears in feed |
| 4 | **Manual progress** | `curl -X POST /progress -d '{...}'` → event visible in app |
| 5 | **Agent tracking** | `POST /agents` → card appears on dashboard; `PATCH` updates it live |
| 6 | **Artifacts (24h)** | After a real skill run, `.intentra/` contains `intent.json` + `handoff.md` |

### Demo narrative (60 seconds)

1. **Run a gStack skill** locally (e.g., `/ship`). Telemetry automatically writes to `~/.gstack/analytics/skill-usage.jsonl`.
2. **Start the progress server:** `bun run mobile-app/server/server.ts`. It watches the JSONL and begins streaming events.
3. **Expose via ngrok:** `ngrok http 7891`. Copy the URL.
4. **Open the Expo app** on your phone. Paste the ngrok URL. **Live feed appears** — you see the skill run in real time, including start/end events, progress updates, and tracked agent status.
5. **Walk away from your desk.** The feed keeps updating. Reconnect is automatic if the connection drops.
6. **(24h add)** The same run writes `intent.json` + `handoff.md` into the repo. Open them — full intent trail is there.

### Explicit non-claims (keeping this honest)

Intentra does **not** claim the following are already implemented:

- A remote "merge control plane" that executes destructive git actions from mobile. (MVP is read-only observability.)
- A production-grade auth model. (Current server is demo-simple. Bearer tokens are a 24h add.)
- A fully automatic intent parser that maps NL to correct CLI commands without human review. (Intent artifacts are generated by the skill runtime, not parsed from free text.)

### Risk assessment

| Risk | Severity | Mitigation | Status |
|------|----------|-----------|--------|
| **Tunnel/SSE flakiness** | Medium | History backfill + exponential backoff reconnect + event dedup | **Already implemented** |
| **Demo server has no auth** | Medium | Add bearer token for POST; mobile is read-only by default; `/health` stays public | 24h add |
| **Scope creep** | High | Hard cutline: observability + artifacts only. No destructive remote controls. If time is tight, ship artifacts first, auth second | Enforced by milestones |
| **Artifact format churn** | Low | Lock IntentSchema + Handoff format at T+0–3h before any implementation | Built into plan |
| **JSONL file doesn't exist yet** | Low | 3-tier watcher fallback (file → dir → poll) handles this gracefully | **Already implemented** |

### Feasibility (why 24 hours is enough)

The hardest engineering is **already done**:
- SSE pipeline with ring buffer, broadcast, and heartbeat ✓
- Mobile app with resilient event stream hook ✓
- JSONL watcher with 3-tier fallback ✓
- Tracked agents CRUD with real-time broadcast ✓
- ngrok connectivity flow ✓
- Culture loading ✓

The 24-hour work is **additive** — writing `intent.json` and `handoff.md` artifacts from skill runs, and adding a bearer-token check. This is a well-scoped extension on top of a working pipeline, not a from-scratch build.

---

## Team Plan

### Parallel tracks

| Person | Track | Deliverables |
|--------|-------|-------------|
| **Devesh** | Mobile + UX | Intent/handoff display alongside session timelines; empty states; error handling; UX polish; demo recording |
| **Gordon** | Backend + artifacts | Intent-as-Code generation from real runs; handoff snapshot generation; culture wiring into artifacts; bearer-token auth |

### 24-hour milestones

| Window | Milestone | Owner | Deliverable | Depends on |
|--------|-----------|-------|-------------|-----------|
| **T+0–3h** | Lock contracts | Both | Finalize IntentSchema + Handoff format + `.intentra/` layout | Nothing (starting point) |
| **T+3–8h** | Core artifacts | Gordon | Intent persistence + handoff generation from real skill runs | Contract lock |
| **T+3–8h** | Mobile scaffolding | Devesh | UI components for intent/handoff display (mock data while Gordon builds backend) | Contract lock |
| **T+8–12h** | Integration | Both | Wire mobile UI to real artifact data. End-to-end: run skill → `.intentra/` written → visible on phone | Both T+3–8h tracks |
| **T+12–16h** | Auth hardening | Gordon | Bearer token for POST endpoints; keep `/health` and GET public | Core artifacts done |
| **T+12–16h** | UX polish | Devesh | Edge cases (empty states, loading, error display); responsive refinement | Integration done |
| **T+16–20h** | Testing | Both | End-to-end test suite; stress test reconnect; verify acceptance criteria 1-6 | All features done |
| **T+20–24h** | Ship | Both | README update; demo script; record 60-second demo video | Testing complete |

**Critical path:** contract lock (T+3h) → Gordon's artifact backend (T+8h) → integration (T+12h) → everything else is parallel.

### Why this is realistic

- **No cloud dependency.** ngrok handles demo-time networking. Zero infrastructure setup.
- **Fully parallel until T+8h.** Devesh builds UI against mock data while Gordon builds artifact generation. First hard sync point is integration at T+8h.
- **Existing plumbing.** The SSE pipeline, mobile app, JSONL watcher, tracked agents, and culture loading are already working. The 24h adds artifacts on top — not a rewrite.
- **gStack leverage.** Fast iteration on skills and orchestration — the tool we're building on is the tool we're demonstrating.
