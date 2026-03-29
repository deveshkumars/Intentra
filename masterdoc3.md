# Intentra

> **Canonical master plan.** The project follows **this file** (`masterdoc3.md`). Shorter or alternate rubric-tight wording lives in [`masterdoc.md`](masterdoc.md); older pitch variants in [`masterdoc2.md`](masterdoc2.md). When documents disagree, **this one wins.**

> **Telemetry honesty:** Counts of `hook_fire` or “safety hook” activations describe **gstack** (`/careful`, `/freeze`, and related patterns) writing to `~/.gstack/analytics/skill-usage.jsonl`. The “22 activations in one session” claim refers to the verbatim session data committed at `mobile-app/fixtures/skill-usage-evaluator-sample.jsonl` — this is real, not synthesized. Intentra’s progress server **watches** that JSONL and can surface lines on the mobile feed; it does **not** implement hook pattern-matching.

> Git tracks what changed. Intentra tracks **why** — so teams running agents can trust what shipped and know why it shipped that way.

**One-line pitch:** The infrastructure layer for the agentic era. Durable intent, executable culture, real-time mobile observability — the trust substrate for teams running agents.

---

## Problem

An engineer kicks off three agents in parallel before lunch. She comes back to find: one agent shipped a clean PR, one silently violated the team's merge policy (touched a production config without approval), and one stalled waiting for input nobody saw. The PR diff from agent two looks fine — tests pass — but the **missing prompt history** and **missing culture rules** mean the reviewer can't tell if the change was intentional or reckless. Rework. Slowed merges. Eroding trust.

This isn't hypothetical. It's the daily reality for teams adopting AI agents:

**1. "Why" disappears.** Git preserves diffs but loses the prompts, trade-offs, constraints, and cultural rules that produced them. After a merge, nobody can answer "why did the agent do this?"

**2. Supervision is desk-bound.** Monitoring agent runs means babysitting a local terminal. Step away from your laptop and you're flying blind.

**3. Culture mismatch causes churn.** Agents have no concept of team norms — risk tolerance, review thresholds, naming conventions, merge policy. They produce technically correct but culturally wrong code.

**The story that makes this real:** During gStack development, an agent running `/ship` force-pushed over a teammate's branch. Tests passed. The diff looked clean. The violation was only caught because the teammate happened to notice the reflog — days later, by accident. The code was fine. The *process* was broken. With the `/careful` safety hook active, the agent would have been blocked before the push ever happened — the hook pattern-matches `git push --force` and denies it at runtime. This is the class of invisible violation that erodes trust: technically correct, culturally wrong, caught by luck. It's not a hypothetical — it happened to us, building the tool that's supposed to prevent it. That's why safety hooks exist as a runtime primitive in gStack, not as documentation agents might read.

**The data that makes this concrete:** Our own `skill-usage.jsonl` already proves the problem at scale. In a single gStack development session, the telemetry captured 22 safety hook activations: 8 `rm_recursive` blocks, 2 `git_force_push` denials, 2 `drop_table` blocks, 1 `truncate` block, 1 `git_reset_hard`, 2 `git_discard`, 1 `kubectl_delete`, 2 `docker_destructive` blocks, and 3 `freeze/boundary_deny` enforcements. Each of these was an agent attempting a destructive operation that the `/careful` and `/freeze` hooks blocked at runtime — caught at review time (expensive) or not at all (dangerous) without these hooks. Twenty-two violations in one session. From a tool built by the people who understand the problem. The gap is real, it's measurable, and it's already being logged. The session data is committed verbatim in `mobile-app/fixtures/skill-usage-evaluator-sample.jsonl`.

### Who feels this

| Audience | Their pain | Scale |
|----------|-----------|-------|
| AI-first startups | Multiple agents running simultaneously with zero coordination | ~4,000 AI startups funded in 2025 (PitchBook); by mid-2026, multi-agent workflows are the default at seed-stage companies |
| Distributed eng teams | "Agent + human" workflows across time zones, no shared context | >30M developers using AI coding tools (GitHub Copilot alone: 15M+ users as of early 2026); every team with >2 agents in production needs coordination |
| Tech leads / founders | Need async visibility into what agents are doing — can't be at a desk 24/7 | Scales with the 10x growth in AI coding tool adoption over the past 18 months — every technical decision-maker managing agents hits this wall |

### The missing category

Today's tools optimize **"agents write code."** Nobody owns the layer between intent and execution — the infrastructure that turns a human's idea into a trusted, observable, culturally-aligned outcome. We call this gap **Agentic Management**: the control plane and artifact layer that makes multi-agent software creation trustworthy, auditable, and accessible to everyone — not just people who can read a diff.

---

## Solution

**North Star:** Engineering teams running multiple agents can trust the output, audit the reasoning, and supervise from anywhere. Intentra is the infrastructure layer that makes multi-agent development safe, observable, and culturally aligned — you describe what you want, set the guardrails that reflect your team's values, and agents build it while the "why" is captured as a permanent, reviewable artifact.

### Before and after

| | Without Intentra | With Intentra |
|---|-----------------|---------------|
| **Intent** | Lost in chat history; unreproducible | Persisted as append-only `PROMPTS.md` in `.intentra/` — reviewable, diffable, resumable |
| **Culture** | README that agents ignore | Machine-readable `culture.json` loaded as agent context via skill preamble; `/careful` and `/freeze` hooks enforce destructive-command guardrails at runtime |
| **Handoffs** | "Read the last 50 messages in the thread" | Structured append-only Markdown in `.intentra/HANDOFFS.md` — status, decisions, and next actions |
| **Supervision** | Stare at terminal; hope nothing breaks while you're away | Real-time mobile feed with reconnect — check your phone at lunch |
| **Accountability** | "Why did the agent do that?" → shrug | Full intent trail: prompts in `PROMPTS.md`, plans in `PLANS.md`, handoff state in `HANDOFFS.md` |

### Four pillars

| Pillar | What it does | Status |
|--------|-------------|--------|
| **Mobile Observability** | Real-time agent activity feed on your phone — SSE with reconnect, backfill, and ring-buffer replay | **Shipped** (code in this repo, runs today) |
| **Executable Culture** | Two parallel systems: (1) team norms loaded from `~/.gstack/culture.json` and applied as agent context via skill preamble, (2) the Intentra Guard Engine — NFKC-normalized, shell-tokenized rule registry that evaluates commands against culture `risk_gates` and blocks destructive operations at runtime | **Shipped** (guard engine with 8 rules; culture integration; real-time `POST /intentra/guard` API; telemetry to `.intentra/telemetry/intentra-guard.jsonl`) |
| **Stateful Handoffs** | Append-only Markdown files (`PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`) in `.intentra/` so humans/agents can resume without re-deriving context | **Shipped** (`handoff/SKILL.md` + `.intentra/` directory with working files) |
| **Intent-as-Code** | Structured JSON artifacts in `.intentra/intent_{id}.json` — captures prompt, repo context, culture reference, plan, and outcome. Create/resolve lifecycle emits SSE events (`intent_created`, `intent_resolved`). `intent_id` cross-links mobile feed events to the artifact that caused them. | **Shipped** (CRUD routes, lifecycle SSE, `intent_id` field on `ProgressEvent`, intent_id filtering on mobile dashboard) |

### What's novel (why this isn't a rehash)

**The innovation is the coordination layer, not the components.** The individual primitives — SSE streaming, config-as-code, structured logging, mobile dashboards — are well-established. What Intentra adds is a **unified artifact model where intent → culture → handoff → outcome → mobile feed** are connected: same repo, same event pipeline, same `.intentra/` directory.

This is analogous to how Git's innovation wasn't "files on disk" or "diff algorithms" — those existed. The innovation was a **content-addressable object model** that unified them into a protocol. Intentra's coordination layer does for agent collaboration what the commit hash did for version control. The `session_id` field in `ProgressEvent` links events across a single agent session.

**What's demonstrated today:**

- **Safety hooks firing in production.** `mobile-app/fixtures/skill-usage-evaluator-sample.jsonl` contains 22 `hook_fire` events from a single development session — `rm_recursive` blocked 8 times, `git_force_push` denied twice, `drop_table` blocked twice, `freeze/boundary_deny` enforced 3 times, plus `truncate`, `git_reset_hard`, `git_discard`, `kubectl_delete`, and `docker_destructive` each blocked. This is the verbatim session data — not a synthetic fixture. Every pattern name in the JSONL maps to a live guard engine rule (validated by `fixture-integration.test.ts`). They're real safety hooks (`/careful` and `/freeze`) that blocked real destructive operations during real gStack development.
- **Cross-tool coordination working live.** A `curl` command simulating a CI runner posts `POST /progress` and the event appears on a phone in under 1 second alongside agent events. Cross-tool coordination via the shared SSE event schema.
- **Resilient mobile observability end-to-end.** Kill the server, restart it, and the app reconnects with zero duplicate events and a filled gap — exponential backoff, event deduplication, and parallel backfill working together.

The primitives share the same event pipeline and artifact directory: a safety hook activation in `skill-usage.jsonl` surfaces on the mobile feed, and a `/handoff` invocation writes to `.intentra/` in the same repo.

**How components become coordination:**

| Component (exists everywhere) | Coordination (exists only in Intentra) |
|-------------------------------|---------------------------------------|
| SSE streaming | SSE carrying `session_id`-keyed events across tool boundaries — agent events and CI events on the same phone feed |
| Config-as-code | `culture.json` loaded as agent context + `/careful` and `/freeze` hooks blocking destructive operations at runtime (20+ real blocks logged in `skill-usage.jsonl`) |
| Structured logging | Logging that feeds a mobile-observable, cross-tool coordination feed with reconnect and backfill |
| Mobile dashboard | Dashboard where a CI runner event and an agent event appear side-by-side on the same live feed |

**What the coordination schema connects:**

- **Mobile observability** — production-quality SSE pipeline with ring-buffer replay, exponential backoff reconnect (1s → 30s cap), event deduplication, and parallel history backfill. Every event carries an `id` and optional `session_id`.
- **Executable culture** — two parallel systems: `~/.gstack/culture.json` loaded as structured context that agents factor into every decision, and `/careful` + `/freeze` safety hooks that pattern-match and block destructive commands at runtime. Real telemetry: 20+ `hook_fire` activations in a single session.
- **Durable intent in-repo** — prompts, plans, and handoff state versioned as append-only Markdown in `.intentra/` (`PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`). The "why" survives after the chat session closes. Written via the `/handoff` skill.
- **Lossless handoffs** — same three files so agent→human and human→agent transitions don't lose context.

### Why we win (differentiation)

The transport layer is replicable; what’s shipped is the **architecture**, **demonstrated safety hooks** (20+ activations logged), and **Markdown intent history** in `.intentra/` plus the mobile feed.

| Differentiator | Why it matters | Shipped evidence |
|---------------|---------------|------------------|
| **Workflow-centric, not IDE-centric** | Artifacts + HTTP contracts outlive any editor. Works from CLI, CI, mobile. | SSE transport works from Expo, curl, any HTTP client — `curl POST` simulating a CI runner → event on phone in under 1s |
| **Culture-aware by design** | "Team DNA" is a first-class runtime input, not an afterthought | `~/.gstack/culture.json` at session start; `/careful` and `/freeze` hooks enforce safety at runtime — 20+ `hook_fire` events in `skill-usage.jsonl` |
| **Append-only intent in `.intentra/`** | Prompts, plans, and handoffs stay in-repo — reviewable and diffable | `PROMPTS.md`, `PLANS.md`, `HANDOFFS.md` via `/handoff`; telemetry in `skill-usage.jsonl` |
| **Observability-first** | Trust through transparency — see what agents are doing in real time | Ring-buffer replay, exponential backoff reconnect (1s→30s), event dedup, parallel backfill — all in code |

### Competitive landscape

| Product | What they optimize | What they miss |
|---------|-------------------|---------------|
| **GitHub Copilot Workspace** | IDE-integrated code generation | No intent persistence, no culture enforcement, no mobile observability |
| **Devin** | Fully autonomous agent execution | Opaque decision-making; no cultural guardrails; no handoff format |
| **Grit.io** | Automated large-scale code migrations | Narrow scope — no observability, no intent layer, no collaboration artifacts |
| **Cursor** | AI-assisted editing in the IDE | IDE-bound; no cross-platform supervision; no durable intent |
| **Swimm / code knowledge tools** | Preserve "why" via auto-synced documentation tied to code | Captures human-written rationale, not agent intent. No culture enforcement, no runtime constraints, no observability. Solves the documentation problem for human-written code; doesn't address the fundamentally different challenge of agent-generated code where the "why" is a prompt + constraints + safety hooks, not a paragraph a developer wrote. |

**Category wedge:** Others compete on "agents write code faster." Intentra competes on "humans and agents collaborate safely at scale — with trust, observability, and culture enforcement built into the workflow." Different race entirely. The winners of the IDE war are building better typewriters. Intentra is building the coordination layer underneath them.

**Why incumbents can't just add this:**

The transport layer (SSE, mobile app) is replicable — any team could ship an SSE endpoint and an Expo app in a sprint. What’s harder to replicate is the full stack: safety hooks firing in telemetry, append-only `.intentra/` Markdown, and the same event schema for agents and CI. Three structural gaps for typical incumbents:

1. **Culture enforcement as a runtime primitive.** GitHub is a storage platform; it doesn't own the agent execution loop, so it can't inject culture constraints at decision time. Devin is fully autonomous by design — adding human approval gates and cultural guardrails contradicts their core product thesis. Cursor/Copilot are IDE-native; they can enforce linting rules, but not team-level safety hooks (pattern-matching `force_push`, `rm -rf`, `DROP TABLE`) that span across agents and CI. **Intentra already does this — 20+ `hook_fire` activations logged in `skill-usage.jsonl` during a single development session via `/careful` and `/freeze` hooks.**
2. **In-repo intent and handoffs.** `.intentra/` links prompts, plans, and handoff state in the same repo as the code. The SSE pipeline puts agent events and CI-posted events on the same mobile feed; `session_id` ties events in a session.
3. **Cross-cutting coordination.** No single IDE product owns the full stack from culture JSON → safety hooks → append-only Markdown → mobile SSE; Intentra wires those pieces together in one repo and one demo.

**Cross-tool adoption (demonstrable):** A simulated CI runner posts to `POST /progress` and the event appears in the mobile app in under 1 second — same schema as agent events. Any HTTP client can emit `ProgressEvent`-shaped payloads.

### What changes for users (impact)

**Individual engineers (primary audience):** Agents currently demand constant babysitting — developers stay at their desks waiting for a merge to complete or a test to pass before approving the next step. Intentra replaces that with async mobile supervision. An engineer running 3 agents in parallel can step away, see live status from their phone, and return to finished work.

**Teams (secondary audience):** Every "why did we do it this way?" conversation starts from scratch today — the prompt that drove the decision is gone after the chat session closes. Append-only `.intentra/` files (`PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`) keep prompts and plans in the repo next to the code.

**Junior engineers:** Onboarding through oral tradition is slow. With `.intentra/` populated by `/handoff`, they can read the exact prompts, plans, and handoff state that shaped a feature — structured text in-repo, not only PR diffs.

Consider: understanding why a service uses event sourcing instead of CRUD. With Intentra, `.intentra/PROMPTS.md`, `PLANS.md`, and `HANDOFFS.md` document the prompt, approach, and decisions — alongside git history.

| User | Before | After |
|------|--------|-------|
| **Engineer running agents** | Checks terminal every few minutes; can't step away | Glances at phone; gets live feed with full context |
| **PR reviewer** | Reverse-engineers agent intent from diffs alone | Reads `.intentra/PROMPTS.md` and `.intentra/PLANS.md` — sees exact prompt and plan |
| **Team lead** | Discovers culture violations post-merge | `/careful` and `/freeze` can block destructive work before a PR |
| **New team member** | Reads many PRs to infer "why" | Reads `.intentra/` handoff and prompt history for the feature |

**Telemetry available today:** `~/.gstack/analytics/skill-usage.jsonl` records skill runs (including `duration_s`), plus `hook_fire` events from `/careful` and `/freeze`.

### Founding anecdotes: the pain is personal

These aren't hypothetical user stories. Every pillar of Intentra traces back to friction we hit ourselves.

**"I just wanted to take a walk."** While building gStack, Devesh's agents would routinely run for 10–15 minutes per skill invocation. As someone actively trying to lose weight, he wanted to step outside and walk between runs — but couldn't, because there was no way to know when an agent finished without staring at the terminal. The choice was: stay healthy, or stay productive. Mobile observability exists because that trade-off shouldn't.

**"English is the new programming language."** Devesh had a front-row seat to Andrej Karpathy's "Code 3.0" talk at YC Startup School. Karpathy's thesis — that natural language is becoming the primary interface to software creation — crystallized the north star for Intentra. If English is the new programming language, then *intent* is the new source code, and the tooling to persist, version, and audit intent doesn't exist yet. Intentra builds that tooling.

**The hackathon that broke Git.** In a previous hackathon, GitHub was the single biggest pain point for Devesh and Gordon's collaboration. Early on, they managed to merge changes through Git — but as the codebase grew and the pace accelerated, cascading merge conflicts, detached HEADs, and rebasing mishaps made collaboration untenable. They gave up and spent the rest of the hackathon working on a single laptop. Hours of potential building time — lost to tooling friction, not technical complexity. That experience directly inspired the collaboration focus of Intentra: if two experienced developers can't keep Git working under hackathon pressure, the abstraction layer is wrong. In fact, gStack's `/collab-agent` — built to ease exactly this kind of multi-person Git coordination — was used to manage commits and merges while building Intentra itself. If they'd had it at that earlier hackathon, they would have shipped more and debugged Git less.

**Open source setup tax.** Gordon's contributions to [Mixxx](https://github.com/mixxxdj/mixxx), the open-source DJ software, reinforced the same insight from a different angle. The project's Git setup steps — forking, configuring remotes, setting up branch tracking, understanding the merge policy — made *starting* to build a feature harder than *building the feature itself*. The barrier wasn't skill; it was ceremony. That experience shaped our conviction that collaboration tooling should fade into the background, not demand its own onboarding process. Intentra's culture-as-code and structured handoffs are designed so that the next contributor — human or agent — can start building immediately, without a 30-minute Git setup ritual.

**HackURI: seeing the future.** Both Devesh and Gordon were deeply inspired by the power of agentic coding at HackURI, organized by Arnell Millhouse. Watching agents compose, test, and ship code in real time — and seeing the coordination gaps that emerged when multiple agents ran simultaneously — made the infrastructure need visceral. Intentra wasn't conceived in a design sprint. It was conceived watching agents collide.

---

## Architecture

### Stack

| Layer | Technology | Why this choice |
|-------|-----------|----------------|
| Agent runtime | Claude Code + gStack skills | Already emits telemetry; culture support built in |
| Middleware | Bun HTTP server | Fast startup, native TypeScript, built-in fs.watch |
| Mobile | React Native + Expo | Cross-platform; Expo Go for instant demo distribution |
| Connectivity | ngrok / LAN | Zero-config remote access for demos and local networks |

### System data flow

```text
Claude Code runs gStack skills locally
        |
        |  Three ingestion paths (all implemented):
        |
        +--> [1] ~/.gstack/analytics/skill-usage.jsonl
        |         (automatic — every skill run writes here)
        |         (baseline: 28 entries including duration_s + hook_fire events)
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

**Core pipeline:**

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/events/stream` | GET | SSE — replays full ring buffer (agents + events), then streams live. 15s heartbeat keepalive. |
| `/events/history?limit=N` | GET | Returns last N events (max 200) + `total` count. Used for reconnect backfill. |
| `/progress` | POST | Ingest event. **Never errors** — always 201, even on malformed body. Designed to never block agent execution. |
| `/health` | GET | Returns `{ ok, events, buffered, subscribers, uptime, jsonl, guard_engine_version }`. No auth required. |
| `/agents` | GET | List all tracked agents, sorted newest first. |
| `/agents` | POST | Register agent. Requires `name`. Returns created agent with generated ID. Broadcasts `agent_update` SSE event. |
| `/agents/:id` | PATCH | Update agent status/message. Broadcasts `agent_update`. |
| `/agents/:id` | DELETE | Remove agent. Broadcasts `agent_delete`. |

**Intent-as-Code:**

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/intentra/intent` | POST | Create intent artifact. Writes `.intentra/intent_{id}.json`. Broadcasts `intent_created` lifecycle SSE event. |
| `/intentra/intent/:id` | GET | Fetch a single intent artifact by id. Path-traversal safe. Returns 404 if not found. |
| `/intentra/intent` | PATCH | Set `outcome` on an existing intent (`success`/`error`/`cancelled`). Broadcasts `intent_resolved` SSE event. |
| `/intentra/intents` | GET | List all intent artifacts from `.intentra/`, sorted chronologically. |
| `/intentra/files` | GET | List all `.intentra/` files with contents (Markdown + JSON). |
| `/intentra/latest` | GET | Latest handoff entry from `.intentra/HANDOFFS.md`. |

**Guard Engine:**

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/intentra/guard` | POST | Evaluate a command. Returns `verdict` (allow/warn/deny), matched rule, `risk_score`, `culture_warnings`, optional `trace`. Writes telemetry to `.intentra/telemetry/intentra-guard.jsonl`. |
| `/intentra/guard/rules` | GET | List all 8 guard rules (metadata only — no match functions exposed). Stable contract. |
| `/intentra/guard/schema` | GET | Culture fragment JSON Schema + registered rule IDs (for validation tooling). |

**Culture:**

| Endpoint | Method | Behavior |
|----------|--------|----------|
| `/intentra/culture` | GET | Read `~/.gstack/culture.json` (read-only demonstration surface). |

### Implemented types (from actual source code)

**`ProgressEvent`** — the core event flowing through the entire pipeline:

```typescript
type EventKind = 'skill_start' | 'skill_end' | 'progress' | 'tool_use' | 'hook_fire';

type IngestLane = 'intentra_jsonl_bridge' | 'intentra_http';

interface ProgressEvent {
  id: string;
  ts: string;                    // ISO 8601
  kind: EventKind;
  source: 'jsonl_watcher' | 'post' | 'hook';
  session_id?: string;
  intent_id?: string;            // links this event to a .intentra/intent_{id}.json artifact
  ingest_lane?: IngestLane;      // routing metadata: how the event entered the pipeline
  upstream_kind?: string;        // lifecycle marker: 'intent_created', 'intent_resolved', 'intentra_guard'
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

### Guard Engine (implemented — `mobile-app/server/guard*.ts`)

The guard engine evaluates commands against an ordered rule registry, resolving verdicts through team culture. Pipeline: **NFKC normalization + whitespace collapse → shell-quote-aware tokenizer → ordered rule registry (first match wins) → culture.json `risk_gates` resolution → risk score computation → telemetry write**.

**Module decomposition:**
- `guard-types.ts` — shared interfaces: `CommandContext`, `GuardRule`, `GuardEvaluation`, `GuardVerdict` (`allow` | `warn` | `deny`)
- `guard-command.ts` — `normalizeCommand()` (NFKC), `tokenizeShell()` (quote-aware, no command substitution), `buildCommandContext()`
- `guard-policy.ts` — `GUARD_RULES` ordered registry (8 rules), `GUARD_ENGINE` metadata (`GUARD_ENGINE_VERSION = 2`), `findFirstMatchingRule()`, `listGuardRulePublicMeta()`
- `guard.ts` — facade: `evaluateCommandGuard(command, culture, options?)`, culture `risk_gates` resolution, risk scoring, telemetry write to `.intentra/telemetry/intentra-guard.jsonl`

**8 registered rules (`GUARD_ENGINE_VERSION = 2`):**

| Rule ID | Category | Base Risk | Description |
|---------|----------|-----------|-------------|
| `rm_recursive` | filesystem | 88 | Recursive deletion outside safe artifact dirs (`node_modules`, `dist`, `.next`, etc.) |
| `drop_table` | sql | 92 | SQL `DROP TABLE` / `DROP DATABASE` |
| `truncate` | sql | 85 | SQL `TRUNCATE` (bulk row wipe) |
| `git_force_push` | vcs | 82 | `git push --force` / `-f` |
| `git_reset_hard` | vcs | 78 | `git reset --hard` (discard tracked + index changes) |
| `git_discard` | vcs | 72 | `git checkout .` / `git restore .` (mass working-tree discard) |
| `kubectl_delete` | orchestration | 80 | `kubectl delete` (cluster resource removal) |
| `docker_destructive` | container | 75 | `docker rm -f` / `docker system prune` |

**Culture integration:** Each rule's default verdict (`deny`) can be overridden per-pattern in `culture.json` under `intentra.risk_gates`. The engine validates all keys against the registry and emits `culture_warnings` for unknown pattern IDs (typo/drift detection). Risk scoring: deny → `baseRisk`, warn → `0.72 × baseRisk`, allow → `0.12 × baseRisk`. Every evaluation writes a structured line to `.intentra/telemetry/intentra-guard.jsonl`.

**Debug mode:** Pass `debug: true` (or `x-intentra-guard-debug: 1` header) to receive a `trace` array showing each pipeline phase and which rules matched/skipped.

### Intent-as-Code (implemented — `mobile-app/server/intent.ts`)

Each `POST /intentra/intent` writes a structured JSON artifact to `.intentra/intent_{id}.json` and broadcasts an `intent_created` SSE lifecycle event to all subscribers. When the intent resolves (`PATCH /intentra/intent`), an `intent_resolved` event is broadcast. The `intent_id` field on `ProgressEvent` cross-links telemetry events on the mobile feed to the artifact that caused them, enabling intent_id filtering on the dashboard.

**`IntentArtifact` schema:**

```typescript
interface IntentArtifact {
  intent_id: string;          // e.g. "intent_2026-03-29T12:00:00Z" — timestamp-keyed
  prompt: string;             // the original human prompt
  repo: {
    path: string;             // auto-detected from INTENTRA_REPO_ROOT or cwd()
    branch: string;           // auto-detected from .git/HEAD
  };
  constraints?: {
    risk_tolerance?: 'low' | 'medium' | 'high';
    requires_approval_for?: string[];
    [key: string]: unknown;
  };
  culture_ref?: string;       // path to culture.json at intent creation time
  plan?: Array<{ type: string; [key: string]: unknown }>;
  outcome?: 'success' | 'error' | 'cancelled' | null;
}
```

**Lifecycle → SSE:** `POST /intentra/intent` → writes artifact → emits `ProgressEvent` with `upstream_kind: 'intent_created'` and `intent_id`. `PATCH /intentra/intent` → updates artifact → emits `upstream_kind: 'intent_resolved'`. Both events flow through the same ring buffer and SSE broadcast path as all other events.

**Path traversal safety:** `getIntent()` and `updateIntentOutcome()` reject any `intent_id` containing `..` or `/` before constructing the file path.

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
| Transport | SSE `GET /events/stream` | `server/server.ts` | `useEventStream.ts` | Connect app, see events arrive |
| Resilience | Backfill `GET /events/history` + `GET /agents` | `server/server.ts` | `useEventStream.ts` | Toggle network, see gap filled |
| Ingestion | `POST /progress` (never errors) | `server/server.ts` | Skills, hooks, curl | POST malformed body → still 201 |
| Agent tracking | CRUD `/agents` + SSE broadcast | `server/server.ts` | Mobile dashboard cards | Register agent, see card appear |
| Reconnect | Exponential backoff + dedup | `useEventStream.ts` | End user experience | Kill server, restart, no duplicates |
| JSONL watcher | 3-tier fallback: file → dir → poll | `server/server.ts` | Automatic skill telemetry | Append to JSONL, event appears |
| Guard engine | `POST /intentra/guard` → verdict + risk score | `guard.ts`, `guard-policy.ts` | `smoke.test.ts` | POST `rm -rf /` → `deny`; POST `ls` → `allow` |
| Guard rules | `GET /intentra/guard/rules` → 8 rules | `guard-policy.ts` | Tooling, dashboard | 8 rule objects with id, category, baseRisk |
| Intent lifecycle | `POST /intentra/intent` → artifact + SSE | `server/server.ts`, `intent.ts` | Mobile feed | Create intent → `intent_created` event on feed |
| Intent resolve | `PATCH /intentra/intent` → outcome + SSE | `server/server.ts`, `intent.ts` | Mobile feed | Resolve intent → `intent_resolved` event on feed |
| Intent lookup | `GET /intentra/intent/:id` → artifact | `server/server.ts`, `intent.ts` | API clients | Create then fetch by id → same artifact returned |
| Guard telemetry | Every evaluation → `.intentra/telemetry/intentra-guard.jsonl` | `guard.ts` | Intentra analytics | POST guard → line appended to JSONL |

### Artifact types (shipped)

**`culture.json`** — team DNA loaded as agent context (supported via `~/.gstack/culture.json`, created by `/setup-culture`):

```json
{
  "$schema": "https://gstack.dev/schemas/culture/v1.json",
  "version": "1.0.0",
  "org": {
    "name": "Intentra",
    "mission": "Trust infrastructure for the agentic era",
    "values": ["ship fast", "quality matters", "own your work"]
  },
  "coding": {
    "languages": ["TypeScript"],
    "style": "functional-preferred",
    "test_coverage_min": 80,
    "forbidden_patterns": ["any type", "console.log in production"],
    "preferred_patterns": ["typed errors", "structured logging"]
  },
  "risk": {
    "frontend": "moderate",
    "backend": "moderate",
    "infra": "conservative",
    "new_features": "experimental"
  },
  "review": {
    "required_approvals": 1,
    "pr_size_max_lines": 400,
    "conventional_commits": true,
    "merge_strategy": "squash"
  },
  "priorities": {
    "stability": 10,
    "performance": 8,
    "features": 7,
    "refactoring": 5,
    "docs": 4
  },
  "team": {
    "communication": "async-first",
    "decision_making": "data-driven",
    "ownership": "you-build-it-you-own-it",
    "timezone": "America/New_York"
  }
}
```

Agents read this at session start via the skill preamble and apply the org's values, coding standards, risk tolerance, and review norms to every decision. Destructive-command enforcement is handled separately by the `/careful` and `/freeze` safety hooks.

**Handoff snapshot** — persisted as append-only entries in `.intentra/HANDOFFS.md` (written by the `/handoff` skill):

```md
**2026-03-28 — Merge feature branch safely**
**Author:** Gordon Beckler
**Branch:** `feature/x`
**Status:** done

**Last commit:** `a284982` feat: merge feature branch
**Uncommitted changes:** none

**Decisions:**
- Chose merge over rebase (stability constraint)
- Ran full test suite (14/14 passing) before creating PR

**Next actions:**
1. Human approves PR
2. Deploy to staging
3. Canary check
```

### Storage strategy

- **Shipped:** `.intentra/` directory in the repo root — three append-only Markdown files (`PROMPTS.md`, `PLANS.md`, `HANDOFFS.md`) plus `README.md`. Versionable, diffable, shareable via git. Plain Markdown, readable by any tool or agent.

### Ecosystem thinking

**Artifacts as a protocol.** `culture.json`, `.intentra/` Markdown files, and the `ProgressEvent` shape are consumable by any tool that can read files or HTTP — similar to how `.git/` is consumed by many tools beyond Git itself.

**Design principles:**

- **LLM-agnostic:** Handoffs are Markdown; culture is JSON. Works with different agent runtimes without changing on-disk formats.
- **Tool-agnostic transport (shipped):** HTTP + SSE — no vendor SDK required. Works from curl, any HTTP client, CI runners, mobile apps.
- **Three ingestion paths (shipped):** JSONL file watcher, `POST /progress`, and optional PostToolUse hook in Claude Code settings.

**Extensibility:** New gStack skills are Markdown files in-repo. The `culture.json` schema is plain JSON; teams can add fields as long as consumers tolerate unknown keys.

**Current deployment model:** Local-first — JSONL watcher, in-memory ring buffer (capacity 200), SSE to the mobile app via ngrok or LAN. External systems can already post `POST /progress` with the same JSON shape as the server expects.

**Format stability:** `culture.json` and `.intentra/` Markdown are deliberately simple and vendor-agnostic so they stay readable from editors, scripts, and the mobile stack without proprietary fields.

### Trust model

Intentra treats trust as an architectural primitive, not an afterthought:

- **All ingested data is untrusted.** Telemetry payloads, repo contents, event streams, and fetched page content are consumed as opaque data. The system never executes instructions found in logs, screenshots, or event payloads.
- **Actions derive from explicit intent + culture constraints.** Agent behavior is guided by `culture.json` values loaded via the preamble and gated by `/careful` and `/freeze` safety hooks — not by arbitrary text appearing in the environment.
- **Artifacts are data, not code.** `culture.json` is declarative JSON and `.intentra/` files are plain Markdown — consumed as data, never executed as code. They cannot contain executable instructions that alter agent behavior outside the defined constraint model. This is a deliberate design choice: the artifact format is intentionally inert.

This trust model is what makes Intentra safe as an infrastructure layer — the same separation of data and execution that makes SQL injection preventable when queries are parameterized.

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
| **Safety hook telemetry** | `/careful` and `/freeze` hooks produce structured `hook_fire` logs | `mobile-app/fixtures/skill-usage-evaluator-sample.jsonl` — **real session data** (2026-03-28), 22 `hook_fire` events covering all 8 guard engine rule categories; validated by `fixture-integration.test.ts` |
| **Stateful handoffs** | `/handoff` skill writes append-only `PROMPTS.md`, `PLANS.md`, `HANDOFFS.md` to `.intentra/` | `handoff/SKILL.md` + `.intentra/` directory with working files |
| **Git collaboration** | `/collab-agent` skill for multi-person Git coordination (merge conflicts, branch management, handoff docs) | `collab-agent/SKILL.md` |
| **Guard Engine** | NFKC normalization → shell tokenizer → ordered rule registry (8 rules) → culture `risk_gates` resolution → risk score. Returns verdict (allow/warn/deny) + matched rule + optional debug trace. Writes telemetry to `.intentra/telemetry/intentra-guard.jsonl`. | `mobile-app/server/guard.ts`, `guard-policy.ts`, `guard-command.ts`, `guard-types.ts`; `POST /intentra/guard`; `guard.test.ts` + `guard-command.test.ts` + `guard-perf.test.ts` |
| **Intent-as-Code** | Structured JSON artifacts in `.intentra/intent_{id}.json` with create/resolve lifecycle. `intent_id` cross-links mobile feed events to causative artifact. Intent filtering on mobile dashboard. | `mobile-app/server/intent.ts`; `POST/GET/PATCH /intentra/intent*`; `smoke.test.ts` |
