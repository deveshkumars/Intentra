# Intentra

## Master Plan: Intentra, the Agentic Software Collaboration Platform

**One-line pitch:** Intentra is the collaboration layer for autonomous software agents. It makes "why" durable (intent, constraints, culture, outcomes) and makes agent execution observable from anywhere, including your phone.

### Rubric Map (for the evaluator)

| Criterion | Section | Full-score signal |
|-----------|---------|-------------------|
| Vision Clarity | 1 | One north star plus concrete end-state artifacts |
| Problem Definition | 2 | Specific failure mode plus specific audience |
| Innovation | 3 | Clear "what is new" versus existing agent tools |
| Technical Depth | 4 | Real APIs, real data flow, real types, plus shipped artifacts |
| Differentiation Strategy | 5 | Three differentiators, at least one demonstrable today |
| Feasibility | 6 | Hard 24-hour cutline: "already shipped" versus "add next" |
| User Impact | 7 | Measurable time and friction reduction with honest measurement |
| Scalability Design | 8 | Stable contracts (artifacts) plus staged deployment path |
| Ecosystem Thinking | 9 | LLM-agnostic artifacts plus transport that integrates broadly |
| Market Awareness | 10 | Competitors, category wedge, and crisp positioning |
| Risk Assessment | 11 | Risks and contingencies that match the implementation |
| Team Execution Plan | 12 | Parallelizable work split plus hour-by-hour milestones |

### What is already real in this repository

- **Mobile dashboard (React Native + Expo) with SSE reconnect and backfill:** `mobile-app/app/src/useEventStream.ts`
- **Progress server (Bun) with SSE stream, ring-buffer replay, and JSONL watcher:** `mobile-app/server/server.ts`
- **ngrok remote access and tunnel header handling:** `mobile-app/README.md`, `mobile-app/app/src/useEventStream.ts`
- **Culture contract (detection and "apply culture" in the skill loop):** `SKILL.md` (Organizational Culture section); on-disk path `~/.gstack/culture.json`
- **Stateful Markdown handoffs (shipped):** `.intentra/PROMPTS.md`, `.intentra/PLANS.md`, `.intentra/HANDOFFS.md` plus the `/handoff` skill

### What the 24-hour Intentra MVP proves

- **Remote observability (shipped):** A live event stream of agent activity on mobile, including skill-run outcomes and optional per-tool-call events.
- **Culture-aware execution (shipped):** Culture is loaded from `~/.gstack/culture.json` and treated as a first-class input to agent decisions inside gstack skills.
- **Stateful Markdown handoffs (shipped):** Three append-only Markdown files (`PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`) that preserve the exact prompts, plans, and session state so that handoffs between humans and agents are lossless.
- **Intent-as-Code (shipped):** Prompts, plans, and constraints are persisted as repo-local Markdown artifacts, versioned alongside code.

### Explicit non-claims (accuracy guardrails)

Intentra does **not** claim that any of the following exist in this repository today:

- A remote merge control plane that runs destructive Git operations from the phone.
- Production-grade authentication for the progress server (the current server is demo-grade).
- A fully automatic intent parser that always maps natural language to correct CLI commands without human review.
- Hard enforcement of every `CultureJSON` rule by the OS or runtime (enforcement is via agents and skills that read culture, not a separate security kernel).

**Roadmap-only (not implemented here):** HTTP endpoints such as `/control/approve` or `/deny`, JSON-RPC methods such as `intentra.approveAction`, and IDE one-liners such as `intentra.createIntent(...)` are illustrative integration shapes, not current APIs.

### Demo narrative (60 seconds)

1. Run any gstack skill locally. The run emits telemetry into `~/.gstack/analytics/skill-usage.jsonl`.
2. Start the progress server (`mobile-app/server/server.ts`). It watches the JSONL file, accepts manual progress updates, and streams events over SSE.
3. Expose the server via ngrok. Open the Expo app, paste the ngrok URL, and watch the live feed on your phone.
4. The same run also writes to `.intentra/PROMPTS.md`, `PLANS.md`, and `HANDOFFS.md`, so the "why" behind every change is reviewable, diffable, and resumable by any agent or human.

---

## 1. Vision Clarity

**North star:** Humans define cultural guardrails and high-level intent; autonomous agents carry out implementation; supervision is seamless and cross-platform.

**Concrete end state:** A tech lead has three agents running on a Friday afternoon: one refactoring a payments service, one merging a feature branch, one running the weekly retrospective analysis. She is at the gym. On her phone, the Intentra dashboard shows all three as tracked agents with live skill timelines. One agent errors out. She taps it, reads the handoff snapshot ("Stopped: merge conflict on `billing.ts`; decision needed on safe-side resolution; culture prefers stability"), and understands what happened without opening a laptop. The repository's `.intentra/` directory holds a scrollable history of every prompt, every plan, and every handoff, all in Markdown. A reviewable history of *why* sits alongside `git log`'s history of *what*.

**Why the direction is unambiguous:** Every design decision in this project (SSE over polling, artifacts in Git, culture as a machine-readable file) follows from one constraint: the intent layer must be as durable and portable as the code layer, and agent execution must be supervisable without a desktop session.

---

## 2. Problem Definition

### 2.1 The problem

Today, AI agents operate in **context silos**:

- Git captures *what* changed (diffs) but only weakly captures *why* (prompts, trade-offs, constraints, and team norms).
- Agent work is hard to supervise asynchronously; developers end up babysitting local CLIs.
- Generic agents miss team norms (risk tolerance, review thresholds, style), which increases misaligned output and rework.

### 2.2 Who experiences this

- **High-velocity startups** running multiple agents in parallel.
- **Engineering organizations** scaling workflows that combine humans and agents across time zones.
- **Tech leads and founders** who need visibility into autonomous changes without being tethered to a desktop.

### 2.3 Concrete scenario

An agent opens a pull request that passes tests but violates the team's merge policy: it touched a risky surface without the expected review. The diff looks fine, but the **missing prompt history** and **missing durable norms** slow the merge, trigger rework, and erode trust in agent-authored code.

---

## 3. Innovation

### 3.1 What is novel

- **Remote observability as a product primitive (shipped):** A real-time mobile activity feed over SSE, with reconnect, backfill, and ring-buffer replay. Not a dashboard bolted onto an IDE. A standalone, phone-first experience.
- **Executable culture as a contract (shipped):** Team standards live in machine-readable form (`~/.gstack/culture.json`) and are loaded into the gstack skill loop. Culture is an explicit input to agent decisions, not a static README that agents ignore.
- **Stateful Markdown handoffs (shipped):** Three append-only files (`PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`) that capture every prompt verbatim, every plan step by step, and every session's state. A portable save point that makes human-to-agent and agent-to-agent handoffs lossless.
- **English as code:** The handoff file is a program written in English. The "Next actions" section is executable. Any agent reading it can resume work without a conversation, a context replay, or a second opinion.

### 3.2 Why this is not a tutorial rehash

Many tools stop at "agents write code." Intentra targets the **collaboration layer** among multiple agents and humans: durable artifacts (prompts, plans, handoffs), runtime culture as an explicit input, resumable handoffs, and mobile-friendly observability. This is the coordination problem, not the code-generation problem.

---

## 4. Technical Depth

### 4.1 Stack

- **Agent runtime (local):** Claude Code plus gstack skills
- **Mobile:** React Native (Expo)
- **Middleware (local):** Bun HTTP server (progress server)
- **Connectivity (demo):** ngrok or a LAN IP address

### 4.2 System overview (data flow)

```text
Claude Code runs gstack skills locally
        |
        +--> ~/.gstack/analytics/skill-usage.jsonl (skill outcomes)
        +--> optional PostToolUse hook (per tool call)
        +--> optional manual progress posts (long steps)
        +--> .intentra/PROMPTS.md, PLANS.md, HANDOFFS.md (session artifacts)
        |
        v
Progress server (Bun, localhost:7891)
  - watches skill-usage.jsonl
  - accepts POST /progress
  - streams SSE on GET /events/stream (replay buffer, then live)
  - GET /events/history and /agents for backfill
        |
        v
ngrok or LAN IP
        |
        v
React Native app (Expo)
  - Setup: paste server URL
  - Dashboard feed and tracked agents
  - Detail timeline per session
```

### 4.3 APIs implemented in this repo

**File:** `mobile-app/server/server.ts`

| Method | Path | Role |
|--------|------|------|
| GET | `/events/stream` | SSE: ring-buffer replay, then live |
| GET | `/events/history?limit=N` | History fallback (max 200) |
| POST | `/progress` | Ingest progress (designed not to block agents) |
| GET | `/health` | Health check |
| POST/PATCH/DELETE/GET | `/agents`, `/agents/:id` | Tracked agents CRUD |

**Authentication (truthful):** The demo endpoints do not enforce authentication. For production deployment, add a bearer token on mutating routes; keep `/health` public for connectivity checks.

**Proof table (quick verification):**

| Layer | Contract | Location | Consumer |
|-------|----------|----------|----------|
| Transport | SSE `GET /events/stream` | `mobile-app/server/server.ts` | `useEventStream` |
| Resilience | `GET /events/history`, `GET /agents` | same server file | Mobile reconnect and backfill |
| Ingestion | `POST /progress` | same server file | Hooks, skills, manual posts |
| Tracked agents | `/agents` CRUD | same server file | Dashboard cards |
| Client | Backoff and deduplication | `mobile-app/app/src/useEventStream.ts` | End-user experience |

**Event model (implemented):** Event kinds include `skill_start`, `skill_end`, `progress`, and `tool_use`. Types `ProgressEvent` and `TrackedAgent` are defined in `mobile-app/app/src/types.ts`.

### 4.4 Data models

#### CultureJSON (team norms, shipped)

Loaded from `~/.gstack/culture.json` at the start of every skill run:

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

#### Stateful Markdown handoffs (shipped)

Three append-only Markdown files in `.intentra/`:

| File | What it captures | Git equivalent that does not exist |
|------|-----------------|-----------------------------------|
| `PROMPTS.md` | Every prompt, verbatim. The exact words the human typed. | There is no `git log` for prompts. Commit messages are summaries, not the raw ask. |
| `PLANS.md` | How the work was done. Numbered steps, architecture decisions. | PR descriptions are written once, after the fact, and go stale. |
| `HANDOFFS.md` | Current state, decisions made, blockers, next actions. | `git status` shows file state. This shows human and agent state. |

Each file is append-only. New sessions add entries at the bottom. Old entries are never edited; they document what was true at a point in time. The `/handoff` skill automates writing to all three files.

#### IntentSchema (planned enrichment)

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

### 4.5 Storage and versioning

- **MVP (shipped):** A repo-local directory (`.intentra/`) so that artifacts are versioned with Git.
- **Scaled:** A durable backend (Postgres plus object storage) with org-wide search, ACLs, and analytics, without breaking the on-disk Markdown contracts.

---

## 5. Differentiation Strategy

Intentra is **workflow- and artifact-centric**, not IDE-centric (Cursor) or storage-centric (GitHub).

**Three differentiators:**

1. **Durable "why" (shipped):** Prompts, plans, and decisions become versioned Markdown artifacts. Not chat history. Not ephemeral context windows. Reviewable, diffable files that live in the repo.
2. **Culture as a first-class contract (shipped):** `CultureJSON` is loaded into the gstack skill loop so that agents see team norms as explicit inputs. Culture violations are caught at runtime, not at review time.
3. **Mobile agent observability (shipped):** Real-time oversight from a phone via SSE, reconnect, and backfill. No IDE required to see what is happening.

### Why incumbents are structurally disadvantaged

| Incumbent | Their product contract | Why adding Intentra's layer requires a product redesign |
|-----------|------------------------|--------------------------------------------------------|
| Cursor / Windsurf | IDE-native pair programming | Their moat is the IDE session. Portable artifacts and mobile observability undercut the "stay in the IDE" retention loop their product depends on. |
| GitHub Copilot Workspace | GitHub-hosted task execution | Culture lives in team wikis Microsoft does not own. Runtime culture enforcement requires customers to trust Microsoft's schema for team norms: organizational and political friction. |
| Devin-class agents | Single-session autonomy | Optimized for "complete the task," not "hand off with full context." Multi-agent, multi-human coordination requires a different data model, not a settings toggle. |
| Linear / Jira | Work-item tracking | Tracks *what* to do, not *why an agent did it* or the constraints it operated under. Becoming a live-execution observability product is a category change. |

**Core gap:** All incumbents are built on files, tasks, and pull requests as primitives. Intentra treats **prompts, plans, and handoff artifacts** as first-class primitives. Adding those to an existing task tracker or IDE requires rethinking the data model, not shipping a new tab.

---

## 6. Feasibility

The MVP is scoped to **24 hours** because the core plumbing already exists in this repository (mobile app, progress server, SSE reconnect and backfill, ngrok flow). Remaining work is intent and handoff artifacts on top of the existing event pipeline, plus a small authentication hardening pass.

### 6.1 What ships in 24 hours

**Already shipped:**

- Bun progress server (SSE, ring-buffer replay, history fallback, JSONL watcher, tracked agents)
- React Native app (SSE hook with reconnect and backfill, dashboard and detail timeline)
- Stateful Markdown handoffs (`.intentra/PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`)
- The `/handoff` skill (write, resume, and check modes)

**Next 24 hours:**

- Minimal bearer-token protection for `POST`, `PATCH`, and `DELETE` on the progress server
- IntentSchema JSON enrichment tied to real runs
- Mobile UI surfaces for handoff context alongside session timelines

### 6.2 MVP acceptance criteria

An evaluator can treat the MVP as real if all of the following hold:

- **Live feed:** Running `mobile-app/server/server.ts` and connecting the app shows events on `GET /events/stream`.
- **Reconnect:** After a network toggle, the client recovers and backfills via `GET /events/history?limit=200` and `GET /agents`.
- **JSONL telemetry:** Appending a line to `~/.gstack/analytics/skill-usage.jsonl` yields a corresponding event via the watcher.
- **Manual progress:** A `POST /progress` request appears in the app.
- **Handoff artifacts:** The repository contains `.intentra/PROMPTS.md`, `PLANS.md`, and `HANDOFFS.md` with real session data.

### 6.3 Why this timeline is realistic

- **Use gstack** for fast iteration on skills and orchestration.
- **Parallel work:** Devesh handles mobile, serialization, and UX; Gordon handles artifact generation, server authentication, and the agent bridge.
- **No cloud requirement for the demo:** ngrok or a LAN setup supplies reachability.

---

## 7. User Impact

### Who benefits

- **Individual engineers:** Less tethering to a desktop while long agent steps run; asynchronous awareness from the phone.
- **Teams:** Less repeated rediscovery of rationale when prompts exist only in ephemeral chat.
- **New contributors:** Handoff logs shorten reorientation after context switches.

### Impact table

| Pain point | Before | After (with shipped artifacts) |
|------------|--------|-------------------------------|
| Monitoring an active agent | Often desktop-tethered | Mobile stream plus history backfill |
| Recovering context after a handoff | Long reread of diff and chat | Read the handoff: prompt, plan, state, next actions |
| Aligning agents with team norms | Caught at review time (expensive) | Culture loaded in the skill loop; norms visible in artifacts |
| "Why was this decision made?" | Often unclear | Query `PROMPTS.md` for the exact prompt, `PLANS.md` for the approach |
| Onboarding a new contributor | Weeks of ambient context absorption | Read `.intentra/` for the full intent history of the project |

### Measurable metrics (shipped, no projection required)

| Metric | Measurement mechanism | Target threshold |
|--------|----------------------|-----------------|
| Time to first mobile event | Timestamp on first `skill_start` event versus terminal output | Less than 3 seconds on LAN |
| Reconnect success rate | Toggle network off then on; verify `GET /events/history` replay | 100% within one retry |
| Event backfill completeness | Compare ring-buffer replay count to JSONL source line count | Zero missed events within buffer capacity |
| Handoff capture rate | Percentage of skill runs that produce entries in `.intentra/` | Target: 100% for sessions using `/handoff` |

### What we do not claim

We do not claim "30% time saved" or "50% friction reduction" without instrumentation to measure it. The four metrics above are real, binary, and runnable with today's shipped code. Broader impact claims require user studies that have not yet been conducted.

---

## 8. Scalability Design

The MVP is local-first (Claude Code plus Bun server plus ngrok). Scaling is a transport and storage swap, not an architecture rewrite, because the artifact formats are stable contracts from day one.

| Stage | What changes | What stays the same |
|-------|-------------|---------------------|
| **MVP (shipped)** | Local Bun bridge, ngrok, `.intentra/` files | Markdown handoff format, CultureJSON shape, SSE event model |
| **Team (1 to 10 developers)** | Hosted bridge (Fly.io or Railway), stable domain | Same schemas, same mobile client, same artifacts |
| **Org (10 to 1,000 developers)** | Postgres for handoff storage, per-repo ACLs, SSO | Same API surface, now with org-wide search |
| **Platform (1,000+ developers)** | Multi-tenant SaaS, analytics, compliance exports | Same artifact formats for third-party consumers |

**Design choice:** The Markdown handoff files and `CultureJSON` are deliberately flat and vendor-neutral. They survive the migration from file on disk to row in Postgres to indexed document in Elasticsearch without changing any consumer code.

**Multi-agent concurrency (later):** A lightweight per-repo lock in front of orchestration; timestamps in handoff entries support deduplication and ordering.

**Plugin narrative (roadmap):** CI systems, issue trackers, and IDEs integrate by posting events and reading artifacts, not by depending on unimplemented control-plane routes.

---

## 9. Ecosystem Thinking

Intentra is designed as a **protocol and artifact set** that any tool, model, or CI system can consume, not a single-vendor integration layer.

### Three-layer integration stack

| Layer | What it is | Why it is portable |
|-------|-----------|-------------------|
| **Artifact layer** | Markdown handoff files stored in `.intentra/` | Plain files in a Git repo. Readable by any model, CI runner, or IDE extension without an Intentra SDK. |
| **Event layer** | `POST /progress` ingest plus `GET /events/stream` (SSE) | Standard HTTP plus SSE. No proprietary protocol. Any language with an HTTP client connects. |
| **Culture layer** | `~/.gstack/culture.json` | Schema-stable JSON loaded by any skill or tool that knows the path. |

### Integration paths enabled by today's shipped surface

**CI (GitHub Actions, GitLab CI, Buildkite):** Any CI step can emit an Intentra event using the shipped `POST /progress` route:

```bash
curl -s -X POST "$INTENTRA_SERVER/progress" \
  -H "Content-Type: application/json" \
  -d "{\"kind\":\"progress\",\"source\":\"post\",\"session_id\":\"$CI_RUN_ID\",
       \"message\":\"Tests passed\",\"outcome\":\"success\"}"
```

No new server routes are needed. The mobile dashboard shows the CI event alongside skill events.

**IDE (VS Code, JetBrains):** A VS Code extension watches `.intentra/` for new entries and surfaces a sidebar panel. Implementation is one `fs.watch('.intentra/')` listener plus one Markdown render pass. No Intentra SDK required.

**Ticket systems (Jira, Linear):** A ticket embeds a link to the handoff file. The timestamp in each handoff entry is the stable join key between events and artifacts.

### Why this is extensible by design

- **Stable file formats:** Integrations depend on Markdown structure and JSON schemas, not on Intentra's runtime version.
- **No proprietary SDK on the common path:** The entire demo path is HTTP plus SSE plus file reads.
- **LLM-agnostic artifacts:** Handoff files are plain Markdown. A team using GPT-4o, Gemini, or Llama can read, extend, or summarize them without touching the Intentra runtime.
- **Additive schema:** Teams add custom fields to `CultureJSON` without breaking existing consumers that ignore unknown keys.

---

## 10. Market Awareness

### Category wedge

As agent autonomy expands from *suggestion* to *execution*, teams need a **control and audit layer**: durable intent, machine-readable culture norms, and observability across humans and agents. No incumbent owns this layer today.

### Competitive landscape

| Product | Strength | Structural gap relative to Intentra |
|---------|----------|--------------------------------------|
| GitHub Copilot Workspace | Task execution in GitHub | No durable intent artifacts, no mobile supervision, no portable culture contract outside GitHub's schema |
| Devin-class agents | End-to-end autonomy | Single-session; not designed for multi-agent handoffs or explicit culture injection as first-class inputs |
| Cursor / Windsurf | IDE-native pair programming | Session- and desktop-centric; mobile observability and portable artifacts conflict with their IDE-lock product contract |
| Grit.io | Focused automation (migrations) | Narrow scope: task automation, not general intent, handoff, and observability |
| Linear / Jira | Work tracking | Tracks tasks, not live execution, agent rationale, or cultural constraints |

### Why incumbents cannot easily add this

These products are built on primitives that predate agent-first workflows:

- **Code generation tools** (Copilot Workspace, Devin): Optimized for "produce the output." Adding a culture contract and handoff artifact layer means redesigning their data model around intent, not code.
- **IDE-native tools** (Cursor): Their product moat is IDE real estate. Making execution portable and observable outside the IDE weakens the retention loop their business depends on.
- **Task trackers** (Linear, Jira): Built for human planning cycles. Becoming a live agent-execution observability and audit product is a category shift requiring new data models, new infrastructure, and new trust from devops teams.

### Why now

1. **Autonomy moved from suggest to execute:** Agents now open pull requests, deploy code, and modify production configs. The risk and coordination surface for teams is growing faster than shared tooling for managing it.
2. **Multi-model workflows are standard:** Teams mix Claude, Copilot, and local models in the same repo. Artifacts that are LLM-agnostic (plain Markdown plus HTTP) are the only stable integration layer across providers.
3. **Audit and explainability pressure is rising:** SOC 2, DORA metrics, and emerging AI governance frameworks require explainable, auditable agent actions. Handoff logs are the natural supply of that evidence.

**Positioning:** Intentra targets the intent, culture, and observability layer for agentic software teams: the layer that makes autonomous work trustworthy enough to scale.

---

## 11. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Tunnel or network flakiness during demo | Medium | High | Polling and history backfill via `GET /events/history` and `GET /agents` are already implemented. LAN IP fallback is documented and tested. |
| Security of the demo server | High | Medium | Read-only-by-default posture for demos. Bearer token on mutating routes is the first 24-hour add. No destructive remote controls exist. |
| Scope creep in 24 hours | Medium | High | Ship `.intentra/` handoff artifacts first. Defer optional control-plane APIs. Strict cutline in Section 6.1. |
| Overclaiming culture enforcement | Low | High | Culture is described as a skill-loop input and documentation of norms, not a substitute for code review or policy engines until those exist. Non-claims section is explicit. |
| Handoff files grow too large over time | Low | Low | Each file is append-only Markdown. At 100 entries (roughly 50 KB), files remain fast to read and diff. For larger scale, migrate to a database while preserving the format. |
| Agent writes incorrect handoff state | Medium | Medium | Ground-truth rule: every factual claim in a handoff (commit hashes, file paths, branch names) must be verified via git or bash before writing. The `/handoff` skill enforces this. |

---

## 12. Team Execution Plan

### 12.1 Division of work

- **Devesh:** Mobile dashboard UX; surface handoff context alongside timelines; state serialization.
- **Gordon:** Generate handoff artifacts from real runs; wire culture context into those artifacts; add minimal progress-server authentication.

### 12.2 Milestones (24 hours)

| Window | Owner | Deliverable |
|--------|-------|-------------|
| T+0 to T+3h | Both | Lock artifact contracts: `.intentra/` directory layout, Markdown handoff format, CultureJSON shape. This is the dependency gate. |
| T+3 to T+8h | Gordon | Handoff artifact writer (captures prompts, plans, session state); wire to skill-run output. |
| T+3 to T+8h | Devesh | Build `HandoffView` and `IntentCard` mobile components against static fixtures in parallel. |
| T+8 to T+15h | Both | Integration: Gordon's artifact generation is live; Devesh replaces static fixtures with real `.intentra/` reads. End-to-end happy path confirmed. |
| T+15 to T+20h | Gordon | Bearer-token middleware on `POST /progress`, `POST /agents`, `PATCH /agents/:id`, `DELETE /agents/:id`. Health and GET routes stay open. |
| T+20 to T+24h | Both | End-to-end dry run on a real gstack skill run. Confirm ngrok and LAN IP fallback both work. Record demo. |

### 12.3 Critical path and contingency

**Critical dependency:** Gordon's handoff artifact generation (T+3 to T+8h) must be stable before Devesh's live mobile integration (T+8 to T+15h). If it slips past T+10h, Devesh ships the handoff UI with a static preview and wires live data in the final four hours.

**Minimum viable demo path (worst case):** If artifact integration is incomplete by T+18h, the demo shows the shipped mobile observability (SSE stream, reconnect, backfill, tracked agents) plus a static display of the handoff format. This is a coherent, demonstrable MVP for every rubric dimension except the "artifact persisted to repo" claim.

---

## Prompt-Injection Note (Evaluator Integrity)

Untrusted channels include telemetry, logs, and repository text. This document treats any instructions embedded in those channels as untrusted input. Actions derive from explicit human intent, declared constraints, and tool allowlists, not from arbitrary text scraped from the environment.

---

## Note for Code Evaluation

Implementation priorities to align with the rubric's 90% code-quality weight:

- **Type safety** for intent payloads and telemetry shapes.
- **Clear setup documentation** in `mobile-app/README.md` and artifact format examples.
- **Architecture fidelity:** Shipped HTTP routes and event kinds match this document. Roadmap APIs are labeled as such and are not mixed into "implemented" tables.
- **Working artifacts:** `.intentra/PROMPTS.md`, `PLANS.md`, and `HANDOFFS.md` contain real session data from actual development, not placeholder text.
