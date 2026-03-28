# Intentra

**One-line pitch:** Intentra is the collaboration layer for autonomous software agents. It makes "why" durable (intent, constraints, culture, outcomes) and makes agent execution observable from anywhere, including your phone.

---

## Problem

Current AI agents operate in **context silos**:

- **"Why" disappears.** Git preserves diffs but loses the prompts, trade-offs, constraints, and cultural rules that produced them. Intent is ephemeral chat history.
- **Supervision is desk-bound.** Monitoring agent runs means babysitting a local terminal or IDE. Step away and you lose visibility.
- **Culture mismatch causes churn.** Agents miss team norms (risk tolerance, review thresholds, style rules), producing misaligned merges, rework, and eroding trust.

**Who feels this:**

| Audience | Pain |
|----------|------|
| High-velocity AI startups | Running multiple agents in parallel with no coordination layer |
| Distributed engineering teams | Scaling "agent + human" workflows across time zones without losing context |
| Tech leads / founders | Need visibility and control over autonomous changes without being at a desk |

**Concrete failure mode:** An agent opens a PR that passes tests but violates team merge policy (e.g., touched a risky surface without review). The diff looks fine, but the **missing prompt history** and **missing culture rules** cause rework, slowed merges, and distrust. Nobody can answer "why did the agent do this?" after the fact.

**The missing category:** Today's tools optimize "agents write code." Nobody owns the layer between intent and execution: **Agentic Management** — the control plane and artifacts that make multi-agent work trustworthy for teams.

---

## Solution

**North Star:** Humans define cultural guardrails and high-level intent; autonomous agents execute; supervision is seamless and cross-platform. The intent layer becomes as durable and shareable as the code layer.

### Four pillars

| Pillar | What it does | Status |
|--------|-------------|--------|
| **Intent-as-Code** | Persist structured intent + constraints + plan as a repo-local JSON artifact so "why" is reviewable and resumable | Next 24h |
| **Executable Culture** | Load team standards from `~/.gstack/culture.json` and treat them as first-class runtime guardrails — not "best effort" guidance | Supported today |
| **Stateful Handoffs** | Write a standardized Markdown snapshot so humans and agents can resume work without re-deriving context | Next 24h |
| **Mobile Observability** | Real-time agent activity feed on your phone via SSE with reconnect and backfill | **Shipped in this repo** |

### What's novel (not a tutorial rehash)

Most tools stop at "agents write code." Intentra focuses on the missing layer: **managing collaboration between multiple agents and humans** through durable artifacts (intent, culture, outcomes), runtime culture constraints, resumable handoffs, and remote observability (mobile, not IDE-only).

Specific innovations:
- **Remote observability as a product primitive** — a real-time mobile feed using SSE with reconnect, backfill, and ring-buffer replay. Already shipped.
- **Executable culture** — team standards as machine-readable JSON that gates agent decisions at runtime. Already supported.
- **Intent-as-Code** — version intent, constraints, and outcomes as repo artifacts so "why" is durable. Next 24h.
- **Stateful Markdown handoffs** — standardized resume files that make agent-to-human and human-to-agent transitions lossless. Next 24h.

### Why we win (differentiation)

- **Workflow-centric, not IDE-centric.** Durable artifacts and HTTP-based contracts outlive any specific editor (unlike Cursor/Copilot Workspace).
- **Culture-aware by design.** "Team DNA" is a first-class input, not an afterthought.
- **Observability-first.** Focus on supervision and trust for multi-agent work, not just codegen speed.
- **Prompts are durable assets.** Versioned and portable, not lost in chat history.

### Competitive landscape

| Product | Focus | Gap Intentra fills |
|---------|-------|-------------------|
| GitHub Copilot Workspace | IDE-centric code generation | No intent persistence, no culture, no mobile |
| Devin | Autonomous agent execution | Opaque decision-making, no cultural guardrails |
| Grit.io | Automated code migrations | Narrow scope, no observability or handoff layer |

**Positioning:** Others optimize "agents write code." Intentra optimizes "humans and agents collaborate safely at scale."

### User impact (measurable)

- **Engineers:** reclaim ~30% of time spent monitoring agents at a desk — async oversight from phone replaces desk-bound babysitting.
- **Teams:** reduce merge friction ~50% by aligning agent actions with culture rules and risk gates before PRs land.
- **Junior devs:** learn architecture faster by reading intent history (prompt + decisions) rather than reverse-engineering diffs.

**Why these numbers are plausible:** the repo already emits durable run outcomes into `~/.gstack/analytics/skill-usage.jsonl`, giving a baseline for "time spent waiting and monitoring." The MVP measures: runs observed remotely, reconnect reliability, and time-to-awareness (phone push vs. checking an IDE).

---

## Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Agent runtime (local) | Claude Code + gStack skills |
| Middleware (local) | Bun HTTP server (progress server) |
| Mobile | React Native + Expo |
| Connectivity (demo-time) | ngrok secure tunnel / LAN |

### Data flow

```text
Claude Code runs gStack skills locally
        |
        +--> ~/.gstack/analytics/skill-usage.jsonl  (skill outcomes)
        +--> optional PostToolUse hook               (per tool call)
        +--> optional manual POST /progress          (during long steps)
        |
        v
Progress server (Bun, localhost:7891)
  - watches skill-usage.jsonl via fs watcher
  - accepts POST /progress (non-blocking, never errors)
  - streams SSE via GET /events/stream (replays ring buffer, then live)
  - exposes GET /events/history and GET /agents for backfill
        |
        v
ngrok or LAN IP
        |
        v
React Native app (Expo Go)
  - Setup screen: paste server URL
  - Dashboard: live feed + tracked agent cards
  - Detail view: per-session timeline
```

### APIs (implemented in `mobile-app/server/server.ts`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events/stream` | GET | SSE stream — replays ring buffer, then live events |
| `/events/history?limit=N` | GET | JSON array of recent events (max 200) for backfill |
| `/progress` | POST | Ingest a progress event (designed to never block agents) |
| `/health` | GET | Health check |
| `/agents` | GET | List tracked agents |
| `/agents` | POST | Register a new tracked agent |
| `/agents/:id` | PATCH | Update agent status |
| `/agents/:id` | DELETE | Remove a tracked agent |

**Auth (truthful):** current demo endpoints do not enforce auth. For real deployment, add bearer token + keep mobile read-only by default.

### Proof table (fast evaluator verification)

| Layer | Contract | File | Consumer |
|-------|----------|------|----------|
| Transport | SSE `GET /events/stream` | `mobile-app/server/server.ts` | mobile `useEventStream` |
| Resilience | Backfill `GET /events/history` + `GET /agents` | `mobile-app/server/server.ts` | mobile reconnect logic |
| Ingestion | `POST /progress` (never errors) | `mobile-app/server/server.ts` | skills, hooks, manual calls |
| Tracked agents | CRUD under `/agents` | `mobile-app/server/server.ts` | mobile dashboard cards |
| Client reconnect | Exponential backoff + event deduplication | `mobile-app/app/src/useEventStream.ts` | end user experience |

### Event model (implemented)

Event kinds: `skill_start`, `skill_end`, `progress`, `tool_use`

Types `ProgressEvent` and `TrackedAgent` are defined in `mobile-app/app/src/types.ts` (mirrored server-side).

### Data models (real types + planned artifacts)

**IntentSchema** (structured plan artifact, next 24h):

```json
{
  "intent_id": "intent_2026-03-28T14:33:12Z",
  "prompt": "Merge feature branch safely, prefer stability, run tests.",
  "repo": { "path": "/path/to/repo", "branch": "feature/x" },
  "constraints": {
    "risk_tolerance": "low",
    "requires_approval_for": ["force_push", "prod_config_change"]
  },
  "plan": [
    { "type": "git_fetch" },
    { "type": "git_merge", "strategy": "safe" },
    { "type": "run_tests", "command": "npm test" }
  ]
}
```

**CultureJSON** (team DNA runtime guardrails, supported today):

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

**Stateful Markdown Handoff** (portable save point, next 24h):

```md
## Handoff Snapshot
- Intent: intent_2026-03-28T14:33:12Z
- Repo/Branch: myrepo / feature/x
- What changed: merged feature branch, ran test suite
- Why: prompt requested safe merge with stability preference
- Constraints applied: low risk tolerance, force_push denied
- Risks & decisions: chose merge over rebase (stability constraint)
- Current status: tests passing, PR ready for human review
- Next actions: human approves PR, deploy to staging
```

### Storage & versioning

- **MVP:** persist to repo-local `.intentra/` directory — artifacts are versionable, diffable, and shareable via git.
- **Scaled:** move to a durable backend (Postgres/S3) with org-wide search, access control, and analytics — without changing artifact formats.

### Ecosystem thinking (interoperability + extensibility)

- **LLM-agnostic artifacts:** intent is JSON, handoff is Markdown — works with Claude, GPT, Llama, and future models.
- **Tool-agnostic transport (shipped):** HTTP + SSE integrates with CLIs, IDEs, CI runners, and mobile. No vendor SDK required.
- **Hook-based interoperability (shipped):** optional PostToolUse hook emits tool-use events without changing the agent runtime.
- **Adapter path:** extend ingestion beyond local JSONL to CI runners (GitHub Actions, Jenkins) by posting the same `POST /progress` events.

Future integration surface:
- **HTTP-first:** keep SSE for event fanout, add bearer token auth and coarse-grained scopes.
- **Optional JSON-RPC:** IDEs can call a tiny method surface:
  - `intentra.createIntent(prompt, cultureRef)`
  - `intentra.getRunStatus(runId)`
  - `intentra.getHandoffSnapshot(runId)`

### Scalability design (staged, realistic)

| Stage | Description | What changes |
|-------|------------|-------------|
| **0 (today)** | Local-first | JSONL watcher + SSE to mobile via ngrok/LAN |
| **1** | CI-aware | CI runners post events via `POST /progress`; artifacts attach to builds/PRs |
| **2** | Hosted | Hardened gateway replaces ngrok; per-org auth + analytics; same artifact formats |

**Key principle:** keep intent artifacts and culture rules as stable contracts; swap execution environments (local -> cloud runners) without changing the intent layer.

---

## Features

### Already shipped in this repo (proof points)

| Feature | Evidence |
|---------|----------|
| Mobile dashboard with SSE reconnect + backfill | `mobile-app/app/src/useEventStream.ts` |
| Bun progress server with SSE + ring buffer replay + JSONL watcher | `mobile-app/server/server.ts` |
| ngrok remote access flow with header bypass | `mobile-app/README.md` |
| Culture support contract (detection + application loop) | `SKILL.md` (Organizational Culture section) |

### Ships in the next 24 hours (truthful cutline)

- **Intent-as-Code artifacts** written under `.intentra/` for real runs
- **Markdown handoff snapshots** (portable save points for resumes and reviews)
- **Minimal bearer-token auth** for POST endpoints (keep `/health` public)

### MVP acceptance criteria (binary, evaluator-verifiable)

An evaluator can confirm the MVP is real if **all** of these are true:

1. **Live feed works:** start `mobile-app/server/server.ts`, connect the app, see events arriving over `GET /events/stream`.
2. **Reconnect works:** toggle network; app reconnects with history backfill via `GET /events/history` and `GET /agents`.
3. **Telemetry ingestion works:** append a line to `~/.gstack/analytics/skill-usage.jsonl`; a `skill_end` event appears in the feed.
4. **Manual progress works:** `POST /progress` with a JSON body creates a visible event in the app.
5. **Artifacts exist (24h add):** after a real run, `.intentra/` contains `intent.json` and `handoff.md`.

### Demo narrative (60 seconds)

1. Run any gStack skill locally. The run emits telemetry into `~/.gstack/analytics/skill-usage.jsonl`.
2. Start the progress server (`bun run mobile-app/server/server.ts`). It watches the JSONL, accepts manual progress updates, and streams events over SSE.
3. Expose the server via ngrok. Open the Expo app, paste the ngrok URL, and watch the live feed on your phone.
4. For the MVP extension, the same run also writes an Intent-as-Code JSON artifact and a Markdown handoff snapshot into the repo — "why" is now reviewable and resumable.

### Explicit non-claims (keeping this honest)

Intentra does **not** claim the following are already implemented:

- A remote "merge control plane" that executes destructive git actions from mobile.
- A production-grade auth model for the progress server (current server is demo-simple).
- A fully automatic intent parser that always maps NL to correct CLI commands without human review.

### Risk assessment

| Risk | Severity | Contingency (already built or planned) |
|------|----------|---------------------------------------|
| **Tunnel/SSE flakiness** | Medium | History backfill (`/events/history`, `/agents`) and mobile reconnect with exponential backoff are already implemented |
| **Demo server has no auth** | Medium | Add bearer token for POST endpoints in 24h; keep `/health` public; mobile is read-only by default |
| **Scope creep dilutes MVP** | High | Hard cutline: observability + artifacts only. No destructive remote controls. If time is tight, ship artifacts first, harden auth second |
| **Artifact format churn** | Low | Lock IntentSchema and Handoff format at T+0–3h before any implementation begins |

### Feasibility argument

The hardest engineering is **already done** in this repo: mobile SSE with reconnect/backfill, Bun server with ring buffer replay and JSONL watcher, ngrok flow. The 24-hour remaining work is adding durable artifacts on top of the existing event pipeline — a well-scoped extension, not a from-scratch build.

Additional leverage: gStack skills provide fast iteration, and work is fully parallelizable between two people (mobile vs. backend artifacts).

---

## Team Plan

### Division of work (parallel tracks)

| Person | Track | Deliverables |
|--------|-------|-------------|
| **Devesh** | Mobile + UX | Display intent artifacts + handoff snapshots alongside session timelines; UX polish; demo recording |
| **Gordon** | Backend + artifacts | Generate Intent-as-Code artifacts + handoff snapshots from real runs; wire culture into artifacts; add bearer-token auth to the server |

### 24-hour milestones

| Window | Milestone | Owner | Deliverable |
|--------|-----------|-------|-------------|
| **T+0–3h** | Lock contracts | Both | Finalize IntentSchema + Handoff format + `.intentra/` directory layout |
| **T+3–8h** | Core artifacts | Gordon | Intent-as-Code persistence + handoff snapshot generation from real skill runs |
| **T+3–8h** | Mobile scaffolding | Devesh | UI components for intent/handoff display (using mock data while Gordon builds backend) |
| **T+8–15h** | Integration | Both | Wire mobile UI to real artifact data; end-to-end: run skill -> artifacts written -> visible on phone |
| **T+15–20h** | Hardening | Gordon | Bearer-token auth for POST endpoints; keep `/health` public |
| **T+15–20h** | Polish | Devesh | UX refinement; edge cases (empty states, error display, loading) |
| **T+20–24h** | Ship | Both | End-to-end integration test; README/demo script; record 60-second demo |

### Why this is realistic

- **No cloud dependency:** ngrok handles demo-time networking.
- **Parallel tracks:** Devesh and Gordon work independently until T+8h integration point.
- **Existing plumbing:** the SSE pipeline, mobile app, and culture loading are already working — the 24h adds artifacts on top, not a rewrite.
