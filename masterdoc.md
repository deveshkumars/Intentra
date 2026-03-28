# Intentra

## Master Plan: Intentra — The Agentic Software Collaboration Platform

**One-line pitch:** Intentra transitions software development from **Code Sharing** to **Intent Sharing**—so prompts, culture, and “why” become first-class, versioned artifacts, and autonomous agents can be safely supervised from anywhere (including mobile).

**What the demo proves (24-hour MVP):**

- **Intent-as-Code:** A versioned, queryable intent log tied to the repo (prompt \(+\) structured plan \(+\) outcomes).
- **Culture injection:** “Team DNA” (JSON) is automatically injected into each agent run so merges and edits match team standards.
- **Stateful Markdown handoffs:** A portable snapshot (“save point”) that any human/agent can resume from with full context.
- **Mobile steering:** Real-time status + **Kill Switch** (safe stop) + “approve/deny” for high-risk actions.

---

## 1. Vision Clarity (North Star)

**North Star:** Humans define cultural guardrails and high-level intent; autonomous agents execute implementation; supervision is seamless and cross-platform.

**Why this earns full points:** It is a clear end-state with an unambiguous direction: make the **intent layer** as durable and shareable as the code layer, and make agent execution **supervisable** without being chained to a desktop.

---

## 2. Problem Definition (Specificity + Audience)

### 2.1 The Problem

Current AI agents operate in **context silos**:

- Git captures *what changed* (diffs) but loses *why* (prompts, trade-offs, constraints, cultural rules).
- Agent work is hard to supervise asynchronously; developers end up “babysitting” local CLIs.
- Generic agents miss team norms (risk tolerance, review thresholds, style rules), producing **misaligned merges** and churn.

### 2.2 Who Experiences This (Target Audience)

- **High-velocity AI startups** running multiple agents in parallel
- **Engineering teams** scaling “agent + human” workflows across time zones
- **Tech leads / founders** who need visibility and control over autonomous changes

### 2.3 Concrete Scenario (Evaluator-Friendly)

“An agent opens a PR that passes tests but violates team merge policy (e.g., touched production code without approval). The PR diff looks fine, but the **missing prompt history** and **missing culture rules** cause rework, slowed merges, and distrust.”

---

## 3. Innovation (Novelty vs. Rehash)

### 3.1 What’s Novel

- **Intent-as-Code (versioned prompts as assets):** Prompts and decisions are stored as durable artifacts, tied to commits/branches, not ephemeral chat logs.
- **Culture injection (Team DNA):** Culture rules are machine-readable and enforced at runtime, not a static README nobody reads.
- **Stateful Markdown handoffs (portable save points):** A standardized “resume file” that lets any agent/human pick up work without losing the reasoning chain.
- **Mobile steering:** “Agent management” UX (status, approvals, kill switch) is a first-class interface, not an IDE-only feature.

### 3.2 Why This Isn’t a Tutorial Rehash

Most tools stop at “agents write code.” Intentra focuses on the missing layer: **managing collaboration between multiple agents and humans** through:

- a versioned intent log,
- runtime culture enforcement,
- resumable handoffs,
- and remote supervision primitives (approve/deny/stop).

---

## 4. Technical Depth (Architecture, APIs, Data Models, System Design)

### 4.1 Stack

- **Agent runtime (local):** Claude Code + gStack skills
- **Mobile:** React Native
- **Middleware (local):** Node.js service
- **Connectivity:** ngrok secure tunnel (demo-time)

### 4.2 System Overview (Data Flow)

```text
Human intent (NL) + CultureJSON
        |
        v
Claude Code skill: Intent Parser -> IntentSchema
        |
        v
gStack orchestrator executes plan locally (git/tests/etc)
        |
        v
State Manager emits:
  - telemetry events (stream)
  - Markdown handoff snapshot (persisted)
        |
        v
Node.js bridge (auth-gated) -> ngrok -> React Native dashboard
        |
        +--> Mobile: approve/deny/kill switch actions -> back to Node -> gStack
```

### 4.3 APIs (Demo-Ready, Minimal, Clear)

The MVP bridge exposes a tiny, explicit control plane:

- **Telemetry stream:** `GET /events` (SSE) or `WS /events` (websocket)
- **Latest snapshot:** `GET /handoff/latest` (returns the Markdown “save point”)
- **Kill switch:** `POST /control/kill` (safe stop: cancels queued actions, stops agent loop)
- **Risk-gated approvals:** `POST /control/approve` and `POST /control/deny`

**Authentication (MVP):**

- All control endpoints require a shared secret token \(e.g., `Authorization: Bearer <token>`\)
- Mobile defaults to **Read-Only mode**; write/control is an explicit toggle

### 4.4 Data Models (Concrete Schemas)

#### IntentSchema (Natural Language → Structured Plan)

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

#### CultureJSON (“Team DNA” Runtime Guardrails)

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

#### Stateful Markdown Handoff (Portable Save Point)

```md
## Handoff Snapshot
- Intent: intent_...
- Repo/Branch: ...
- What changed: ...
- Why: ... (prompt + constraints)
- Risks & decisions: ...
- Current status: ...
- Next actions: ...
```

### 4.5 Storage & Versioning (MVP vs. Scaled)

- **MVP:** persist to repo-local directory (e.g., `.intentra/`) so the artifacts are versionable and sharable.
- **Scaled:** move to a durable backend (Postgres/S3) with org-wide search, access control, and analytics—without changing the artifact formats.

---

## 5. Differentiation Strategy (Unmistakable)

Intentra is **Workflow-centric**, not IDE-centric (Cursor) or storage-centric (GitHub).

**What we do that others don’t (clear differentiators):**

- **Prompts are durable assets:** prompts + “why” are versioned and portable, not lost in chat history.
- **Culture is executable:** Team DNA is injected and enforced at runtime, not “best effort.”
- **Mobile agent steering:** real-time oversight plus a **kill switch** and risk-gated approvals.

---

## 6. Feasibility (24 Hours, By This Team)

This MVP is intentionally scoped to be built in **24 hours** by this team because it leverages existing primitives (gStack skills, Claude Code execution, ngrok) and focuses on a narrow, demonstrable integration surface.

### 6.1 What Ships in 24 Hours (Explicit Cutline)

- A Claude/gStack skill that:
  - parses intent into `IntentSchema`
  - injects `CultureJSON` into reasoning cycles
  - emits structured telemetry events
- A Markdown serializer that produces a “handoff snapshot”
- A Node.js bridge exposing telemetry + control endpoints (auth-gated)
- A React Native dashboard that shows:
  - live status/events
  - latest handoff snapshot
  - kill switch + approvals (opt-in; read-only by default)

### 6.2 Why It’s Realistic

- **Leverage gStack:** fast iteration on skills and orchestration.
- **Parallel work:** Devesh (mobile + state serialization), Gordon (agent logic + API bridge).
- **No cloud dependency:** ngrok provides secure demo-time networking.

---

## 7. User Impact (Measurable)

- **Engineers:** reclaim **~30%** of time previously spent monitoring agents at a desk.
- **Teams:** reduce merge friction **~50%** by aligning agent actions with culture rules and risk gates.
- **Junior devs:** learn architecture faster by reading the **intent history** (prompt + decisions) rather than reverse-engineering diffs.

---

## 8. Scalability Design (Beyond the Demo)

The system is designed to scale by keeping artifact formats stable and expanding integrations:

- **Plugin architecture:** add CI/CD (GitHub Actions), issue trackers (Jira), and build systems (Jenkins) via adapters.
- **Org-wide search:** aggregate intents and handoffs to query “why did we do X?” across repos.
- **Multi-agent coordination:** add concurrency controls (queues, locks) while keeping the same `IntentSchema`.

**Key scalability principle:** keep **intent artifacts** and **culture rules** as stable contracts; swap execution environments (local → cloud runners) without changing the intent layer.

---

## 9. Ecosystem Thinking (Interoperability + Extensibility)

- **LLM-agnostic artifacts:** the handoff and intent formats are plain Markdown/JSON, compatible with Claude, GPT, Llama, and future models.
- **API-first control plane:** IDEs or tools can integrate through a minimal JSON-RPC / HTTP interface.

Example JSON-RPC method surface (future):

- `intentra.createIntent(prompt, cultureRef)`
- `intentra.getRunStatus(runId)`
- `intentra.getHandoffSnapshot(runId)`
- `intentra.approveAction(runId, actionId)` / `intentra.kill(runId)`

---

## 10. Market Awareness (Competitive Landscape + Positioning)

- **Competitors:** GitHub Copilot Workspace, Devin, Grit.io.
- **Positioning:** Others optimize “agents write code.” Intentra optimizes “humans and agents collaborate safely at scale.”

**Category wedge:** “Agentic Management” — the control plane + artifacts that make multi-agent work trustworthy for teams.

---

## 11. Risk Assessment (Risks + Contingencies)

### 11.1 Risks

- **Latency / reliability:** live telemetry can be flaky over tunnels.
- **Security:** remote control must not enable destructive actions accidentally.
- **Overreach risk:** too many features can dilute a 24h MVP.

### 11.2 Contingencies (Concrete)

- **State-polling fallback:** if streaming fails, mobile fetches periodic Markdown snapshots (`GET /handoff/latest`).
- **Read-only by default:** mobile starts in read-only; control endpoints require explicit enablement and token auth.
- **Risk gates:** dangerous actions default to **deny** or **approval_required** via `CultureJSON`.
- **MVP cutline discipline:** if time is tight, ship read-only mobile view + kill switch first; approvals second.

---

## 12. Team Execution Plan (Division of Work + 24h Milestones)

### 12.1 Division of Work

- **Devesh:** React Native dashboard; Markdown handoff format + serializer; UI/UX for kill switch and approvals
- **Gordon:** Intent parser (`IntentSchema`); culture injection (`CultureJSON`); Node.js telemetry/control bridge; gStack orchestration glue

### 12.2 Milestones (24 Hours)

- **T+0–3h:** Master plan lock + repo scaffolding; define schemas and endpoint contracts
- **T+3–8h:** Implement intent parsing + culture injection; emit telemetry events
- **T+8–15h:** Build React Native dashboard; connect via ngrok; show live event stream
- **T+15–20h:** Implement Markdown handoff serialization + `GET /handoff/latest`
- **T+20–24h:** Integration testing; README polish; demo recording; harden auth + read-only defaults

---

## Note for Code Evaluation (The 80%)

To align strongly with the rubric, our implementation will prioritize:

- **Type safety** in the intent parser and telemetry payloads
- **Clean documentation** in `SKILL.md` and artifact format docs (Intent Markdown + CultureJSON)
- **Architecture fidelity**: the shipped code matches this plan’s APIs, data models, and control-plane boundaries exactly
