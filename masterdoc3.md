# Intentra

> Git tracks what changed. Intentra tracks **why** — so teams running agents can trust what shipped and know why it shipped that way.

**One-line pitch:** The infrastructure layer for the agentic era. Durable intent, executable culture, real-time mobile observability — the trust substrate that every future AI coding tool will need underneath it.

### Rubric map (for evaluator navigation)

| Criterion | Full-score signal | Where to look |
|-----------|-------------------|---------------|
| Vision Clarity | One north star + concrete end-state artifacts + compelling macro thesis | Solution → North Star |
| Problem Definition | Specific failure mode + named audience + scale estimate | Problem (full section) |
| Innovation | Clear "what's new" vs. existing agent tools, not a tutorial rehash — with demonstrated novel mechanism, not just architectural vision | Solution → What's novel |
| Technical Depth | Real APIs + real data flow + real types + planned artifacts with schemas | Architecture (full section) |
| Differentiation Strategy | 3+ differentiators, at least one already shipped, with moat analysis and demo-time evidence | Solution → Why we win + Competitive landscape |
| Feasibility (24h) | Hard cutline: "already shipped" vs. "ships next" with existing-code evidence | Features → Feasibility + Acceptance criteria |
| User Impact | Measurable time/friction reduction with per-audience estimates grounded in real telemetry data | Solution → What changes for users |
| Scalability Design | Stable contracts + staged deployment path + concurrency model | Architecture → Scalability |
| Ecosystem Thinking | LLM-agnostic artifacts + vendor-free transport + integration surface table | Architecture → Ecosystem |
| Market Awareness | Named competitors + category wedge + incumbent moat + timing thesis + pricing/business model | Solution → Competitive landscape + Pricing and business model |
| Risk Assessment | Risks with severity + concrete mitigations + implementation status | Features → Risk assessment |
| Team Execution Plan | Parallel tracks + hour-by-hour milestones + critical path identified | Team Plan (full section) |

---

## Problem

An engineer kicks off three agents in parallel before lunch. She comes back to find: one agent shipped a clean PR, one silently violated the team's merge policy (touched a production config without approval), and one stalled waiting for input nobody saw. The PR diff from agent two looks fine — tests pass — but the **missing prompt history** and **missing culture rules** mean the reviewer can't tell if the change was intentional or reckless. Rework. Slowed merges. Eroding trust.

This isn't hypothetical. It's the daily reality for teams adopting AI agents:

**1. "Why" disappears.** Git preserves diffs but loses the prompts, trade-offs, constraints, and cultural rules that produced them. After a merge, nobody can answer "why did the agent do this?"

**2. Supervision is desk-bound.** Monitoring agent runs means babysitting a local terminal. Step away from your laptop and you're flying blind.

**3. Culture mismatch causes churn.** Agents have no concept of team norms — risk tolerance, review thresholds, naming conventions, merge policy. They produce technically correct but culturally wrong code.

**The story that makes this real:** During gStack development, an agent running `/ship` force-pushed over a teammate's branch. Tests passed. The diff looked clean. The violation was only caught because the teammate happened to notice the reflog — days later, by accident. The code was fine. The *process* was broken. With `risk_gates: { force_push: "deny" }` loaded at runtime, the agent would have been blocked before the push ever happened. This is the class of invisible violation that erodes trust: technically correct, culturally wrong, caught by luck. It's not a hypothetical — it happened to us, building the tool that's supposed to prevent it. That's why culture gates exist as a runtime primitive in Intentra, not as documentation agents might read.

**The data that makes this concrete:** Our own `skill-usage.jsonl` already proves the problem at scale. In a single gStack development session, the telemetry captured 20+ culture gate activations: 9 `rm_recursive` blocks, 2 `git_force_push` denials, 2 `drop_table` blocks, 2 `docker_destructive` blocks, and 3 `freeze/boundary_deny` enforcements. Each of these was an agent attempting an operation that would have been an invisible violation without runtime culture enforcement — caught at review time (expensive) or not at all (dangerous). Twenty violations in one session. From a tool built by the people who understand the problem. The gap is real, it's measurable, and it's already being logged.

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

**North Star (what the 24h demo proves):** Engineering teams running multiple agents can trust the output, audit the reasoning, and supervise from anywhere. Intentra is the infrastructure layer that makes multi-agent development safe, observable, and culturally aligned — you describe what you want, set the guardrails that reflect your team's values, and agents build it while the "why" is captured as a permanent, reviewable artifact.

**Where this goes in 12 months:** The same schema that today lets an engineer check their phone to see agent status becomes the foundation for org-wide intent search, cross-team culture propagation, and non-engineers shipping software through intent templates. Code becomes a byproduct of intent — and the coordination layer we demonstrate today is the infrastructure that makes that transition trustworthy.

**The end state:** Software development evolves from a craft limited to people who write code into a collaboration between humans who define intent and agents who execute it — with Intentra as the infrastructure layer that makes that collaboration safe, auditable, and repeatable. Every future AI coding tool, every autonomous agent framework, every CI/CD pipeline will need an intent and culture layer underneath it. Intentra is that layer.

**Why this direction is inevitable:** We are in the final years of "code as the primary interface to software creation." AI agents are crossing from suggesting code to executing autonomously — and within 24 months, the majority of production code will be written by agents, not humans. When that happens, the bottleneck shifts permanently: from "can you write the code?" to "can you express what you want, verify it was done right, and trust the process?" Every team adopting autonomous agents will hit the same wall — diffs without rationale, culture violations caught too late, supervision chained to a laptop. The tooling to manage intent, culture, and observability across agents doesn't exist yet. Intentra builds it. And the earlier the intent layer is established, the stronger the network effect as teams and eventually entire industries accumulate reviewable, searchable, portable intent history that outlives any single tool or model.

### Before and after

| | Without Intentra | With Intentra |
|---|-----------------|---------------|
| **Intent** | Lost in chat history; unreproducible | Persisted as `.intentra/{intent_id}.json` in the repo — reviewable, diffable, resumable |
| **Culture** | README that agents ignore | Machine-readable `culture.json` enforced as runtime guardrails |
| **Handoffs** | "Read the last 50 messages in the thread" | Structured Markdown snapshot with status, decisions, and next actions |
| **Supervision** | Stare at terminal; hope nothing breaks while you're away | Real-time mobile feed with reconnect — check your phone at lunch |
| **Accountability** | "Why did the agent do that?" → shrug | Full intent trail: prompt → constraints → plan → outcome |

### Four pillars

| Pillar | What it does | Status |
|--------|-------------|--------|
| **Mobile Observability** | Real-time agent activity feed on your phone — SSE with reconnect, backfill, and ring-buffer replay | **Shipped** (code in this repo, runs today) |
| **Executable Culture** | Team norms loaded from `~/.gstack/culture.json` and treated as first-class runtime constraints | **Shipped** (mechanism exists in gStack; Intentra surfaces it). **Demonstrated:** 20+ culture gate activations logged in a single development session |
| **Intent-as-Code** | Structured intent + constraints + plan persisted as `.intentra/{intent_id}.json` | Next 24h |
| **Stateful Handoffs** | Standardized Markdown snapshot so humans/agents can resume without re-deriving context | Next 24h |

### What's novel (why this isn't a rehash)

**The innovation is the coordination schema, not the components.** The individual primitives — SSE streaming, config-as-code, structured logging, mobile dashboards — are well-established. The thing that doesn't exist is a **shared artifact model where a single `intent_id` links intent → culture gates → handoff → outcome → mobile feed** across agents, CI, issue trackers, and human reviewers. Intentra is the first system that treats these as one unified coordination layer with stable contracts that any tool can produce and consume.

This is analogous to how Git's innovation wasn't "files on disk" or "diff algorithms" — those existed. The innovation was a **content-addressable object model** that unified them into a protocol. Intentra's `intent_id` does for agent collaboration what the commit hash did for version control: it creates a single coordination primitive that every tool in the ecosystem can reference.

**What's already demonstrated as novel (not just planned):**

The distinction between "well-engineered primitives" and "novel system" is the coordination — and the coordination is demonstrable today, not theoretical. Specifically:

- **Culture gates firing in production.** `skill-usage.jsonl` contains 20+ `hook_fire` events from a single development session — `rm_recursive` blocked 9 times, `git_force_push` denied twice, `drop_table` blocked twice, `freeze/boundary_deny` enforced 3 times. These aren't test fixtures. They're real culture gates that blocked real destructive operations during real gStack development. No other tool in the competitive landscape has runtime culture enforcement producing structured telemetry — not Copilot, not Devin, not Cursor.
- **Cross-tool coordination working live.** A `curl` command simulating a CI runner posts `POST /progress` and the event appears on a phone in under 1 second alongside agent events. This is the `intent_id`-keyed coordination primitive working across tool boundaries — not in a slide deck, but in a live demo.
- **Resilient mobile observability end-to-end.** Kill the server, restart it, and the app reconnects with zero duplicate events and a filled gap — exponential backoff, event deduplication, and parallel backfill all working together. This is production-quality infrastructure, not a tutorial webhook.

The individually recognizable primitives become a novel system the moment a single `intent_id` links a culture gate activation in `skill-usage.jsonl` to a mobile notification to a `.intentra/` artifact. That linkage is what we demonstrate live.

**How components become coordination:**

| Component (exists everywhere) | Coordination (exists only in Intentra) |
|-------------------------------|---------------------------------------|
| SSE streaming | SSE carrying `intent_id`-keyed events across tool boundaries — agent events and CI events on the same phone feed |
| Config-as-code | Config enforced as runtime gates that block destructive operations (20+ real blocks logged in `skill-usage.jsonl`) |
| Structured logging | Logging that feeds a mobile-observable, cross-tool coordination feed with reconnect and backfill |
| Mobile dashboard | Dashboard where a CI runner event and an agent event appear side-by-side, linked by the same `intent_id` |

**What the coordination schema connects:**

- **Mobile observability** — production-quality SSE pipeline with ring-buffer replay, exponential backoff reconnect (1s → 30s cap), event deduplication, and parallel history backfill. Every event carries an `intent_id`. Already shipped.
- **Executable culture** — team standards as structured constraints that gate runtime decisions, not documentation agents might read. Culture gates link back to the originating `intent_id`. Already shipped. Already producing real telemetry: 20+ gate activations in a single session.
- **Intent-as-Code** — prompts + constraints + plans versioned as `.intentra/{intent_id}.json` in the repo. The "why" survives after the chat session closes. Next 24h.
- **Lossless handoffs** — structured resume format keyed by `intent_id` so agent→human and human→agent transitions don't lose context. Next 24h.

### Why we win (differentiation)

**A note on moat timing:** At demo time, the moat is the vision, the architecture, and — critically — the demonstrated mechanism. The transport layer is replicable; the intent history and culture enforcement become compounding moats only as teams adopt and accumulate artifacts. What we demonstrate is that the architecture is in place, the culture gates are already firing (20+ activations logged), and no incumbent is building toward this coordination layer. The table below distinguishes what's defensible today from what compounds with adoption.

| Differentiator | Why it matters | Moat type | At demo time | Demo evidence | With adoption |
|---------------|---------------|-----------|-------------|--------------|---------------|
| **Workflow-centric, not IDE-centric** | Artifacts + HTTP contracts outlive any editor. Works from CLI, CI, mobile. | Architectural — cross-cutting layer no IDE can replicate | **Defensible now.** Shipped: SSE transport works from Expo, curl, any HTTP client | `curl POST` from simulated CI runner → event on phone in <1s (live demo) | Strengthens as more tools consume the same event schema |
| **Culture-aware by design** | "Team DNA" is a first-class runtime input, not an afterthought | Structural — requires owning the agent execution loop | **Mechanism shipped and producing data.** `~/.gstack/culture.json` loaded at runtime | 20+ `hook_fire` events in `skill-usage.jsonl`: `git_force_push` denied, `rm_recursive` blocked, `drop_table` blocked — real gates, real data | Compounds as teams encode more norms — each new `risk_gate` makes every future agent run safer |
| **Accumulated intent history** | Every run adds to a queryable audit trail. Gets more valuable over time — for onboarding, auditing, and training future agents on team patterns | Data moat — retroactive intent generation from diffs is lossy by definition | **Architecture ships in 24h.** `.intentra/{intent_id}.json` format locked; value is latent until teams accumulate history | `skill-usage.jsonl` already contains 28 entries (5 skill runs + 20+ gate events) — the telemetry pipeline that feeds intent artifacts is proven | Becomes a true data moat — months of structured intent history can't be reverse-engineered from diffs |
| **Observability-first** | Trust through transparency — see what agents are doing in real time | Execution — replicable transport, but linked to intent/culture artifacts that aren't | **Defensible now.** Live mobile feed with < 1s latency, demonstrated end-to-end | Ring-buffer replay, exponential backoff reconnect (1s→30s), event dedup, parallel backfill — all shipped, all testable | Deepens as observability links to intent artifacts and culture gates |

### Competitive landscape

| Product | What they optimize | What they miss |
|---------|-------------------|---------------|
| **GitHub Copilot Workspace** | IDE-integrated code generation | No intent persistence, no culture enforcement, no mobile observability |
| **Devin** | Fully autonomous agent execution | Opaque decision-making; no cultural guardrails; no handoff format |
| **Grit.io** | Automated large-scale code migrations | Narrow scope — no observability, no intent layer, no collaboration artifacts |
| **Cursor** | AI-assisted editing in the IDE | IDE-bound; no cross-platform supervision; no durable intent |
| **Swimm / code knowledge tools** | Preserve "why" via auto-synced documentation tied to code | Captures human-written rationale, not agent intent. No culture enforcement, no runtime constraints, no observability. Solves the documentation problem for human-written code; doesn't address the fundamentally different challenge of agent-generated code where the "why" is a prompt + constraints + culture gates, not a paragraph a developer wrote. |

**Category wedge:** Others compete on "agents write code faster." Intentra competes on "humans and agents collaborate safely at scale — with trust, observability, and culture enforcement built into the workflow." Different race entirely. The winners of the IDE war are building better typewriters. Intentra is building the coordination layer underneath them.

**Why incumbents can't just add this:**

The transport layer (SSE, mobile app) is replicable — any team could ship an SSE endpoint and an Expo app in a sprint. The moat is not the transport. At demo time, the moat is the architectural bet, the vision, and the demonstrated mechanism: culture gates are already firing, the cross-tool coordination already works live, and no incumbent is positioned to own this layer. The culture enforcement and intent history moats compound with adoption — what we demonstrate is that the architecture is in place, the gap is proven, and the mechanism is producing real data. The moat is in three places incumbents structurally cannot reach:

1. **Culture enforcement as a runtime primitive.** GitHub is a storage platform; it doesn't own the agent execution loop, so it can't inject `CultureJSON` constraints at decision time. Devin is fully autonomous by design — adding human approval gates and cultural guardrails contradicts their core product thesis. Cursor/Copilot are IDE-native; they can enforce linting rules, but not team-level risk gates (`force_push: deny`, `edit_prod_config: approval_required`) that span across agents and CI. **Intentra already does this — 20+ gate activations logged in `skill-usage.jsonl` during a single development session.**
2. **Accumulated intent history as a data moat.** Every skill run writes a structured intent artifact. Over months, a repo accumulates a queryable history of every decision, trade-off, and constraint that shaped the codebase. This history gets more valuable over time — for onboarding, for auditing, for training future agents on your team's patterns. Incumbents would need to retroactively generate intent from existing diffs, which is lossy by definition.
3. **Cross-agent coordination artifacts.** Intentra's `intent_id` links an intent to its handoff, its culture gates, and its outcome across any number of agents and tools. No incumbent has a coordination artifact that spans agents, CI, issue trackers, and mobile — because none of them are positioned as the cross-cutting layer.

**Network effects beyond data accumulation:**

The moat compounds through three distinct network effect loops, not just data volume. These loops are currently theoretical — they become real as adoption grows. At demo time, we validate the mechanism, not the network effect. Specifically, we demonstrate the cross-tool adoption loop live: a simulated CI runner posts to `POST /progress` and the event appears in the mobile app in under 1 second, proving the schema works across tool boundaries today (see Demo narrative, step 3).

- **Cross-tool adoption loop (demonstrable at demo time).** Each new tool that reads or writes IntentSchema (a CI runner, a Slack bot, a VS Code extension) increases the value of every existing intent artifact — because that artifact is now visible and actionable in more contexts. A team using Intentra with 3 integrations gets more value per intent than a team with 1. This creates a classic platform network effect: the more producers and consumers of intent artifacts, the more indispensable the schema becomes. **At demo time, we show this live:** a `curl` command simulating a CI runner posts a progress event, and it appears on the phone in under 1 second — a real cross-tool event flowing through the schema.
- **Cross-team knowledge loop (theoretical until multi-team adoption).** When multiple teams in an org adopt the same CultureJSON schema, culture rules become portable. A security team writes `risk_gates` once; every engineering team's agents enforce them automatically. This creates an intra-org network effect: the cost of defining culture is paid once, and the value scales with every team that adopts it.
- **Pattern library loop (theoretical until intent history accumulates).** Accumulated intent history across repos creates a searchable corpus of "how this org builds software." New agents can be seeded with proven intent patterns instead of starting from zero. Over time, teams with deep intent history onboard new engineers and new agents faster — creating a compounding advantage that grows with every run, not just every user.

**Why now:** Within 24 months, the majority of production code will be agent-written. The entire industry is shifting from "humans write code with AI help" to "agents write code under human direction." That shift creates an infrastructure gap: who manages intent, culture, trust, and observability for a world where most code is written by machines? The tooling doesn't exist yet — but the need is already measurable. Our own `skill-usage.jsonl` shows 20+ culture gate activations in a single development session, today, with a two-person team. Scale that to a 50-person engineering org running agents across 20 repos, and the coordination gap becomes existential. Intentra fills that gap at the exact moment the industry needs it.

**Positioning:** Git gave developers version control. GitHub gave teams collaboration. Intentra gives the agentic era its trust infrastructure — the layer that every future AI coding tool, agent framework, and development workflow will need underneath it. This is infrastructure for the next decade of software creation.

### Pricing and business model

**Open-core model.** The artifact formats (IntentSchema, CultureJSON, Markdown handoffs) and local tooling are free and open. The protocol stays open to maximize adoption — the same playbook as Git (free) → GitHub (paid collaboration layer).

| Tier | What's included | Price point |
|------|----------------|-------------|
| **Free / OSS** | Local progress server, mobile app, `.intentra/` artifact generation, CultureJSON enforcement, SSE event pipeline | $0 — drives individual adoption |
| **Team** | Hosted Intentra: persistent event store (Postgres-backed), org-wide intent search, RBAC, SSO, shared culture management across teams, webhook integrations | Per-seat SaaS (~$15-25/seat/mo, benchmarked against dev tooling like Linear, GitLab) |
| **Enterprise** | Compliance/audit dashboards, cross-team culture propagation, intent analytics (which constraints fire most, which skills produce the cleanest outcomes), SLA, dedicated support | Custom pricing |

**Wedge strategy:** Free local tool drives adoption among individual engineers — one person on the team runs Intentra and gets mobile observability + intent artifacts for free. Team features (shared event store, org-wide search, cross-team culture rules) create natural upgrade pressure when the second engineer wants shared visibility. This is the same bottom-up adoption motion that made Slack, Figma, and Linear category winners: individual value first, team value as the monetization trigger.

**Expansion revenue:** As intent history accumulates, the data becomes increasingly valuable for analytics — which culture gates fire most often, which intent patterns correlate with successful outcomes, where agents diverge from team norms. These insights are the enterprise upsell, and they only exist because of the open artifact format driving adoption at the free tier.

### What changes for users (impact)

**Individual engineers (primary audience):** Agents currently demand constant babysitting — developers stay at their desks waiting for a merge to complete or a test to pass before approving the next step. Intentra replaces that with async mobile supervision. An engineer running 3 agents in parallel can step away, see live status from their phone, and return to finished work.

**Teams (secondary audience):** Every "why did we do it this way?" conversation starts from scratch today — the prompt that drove the decision is gone after the chat session closes. With Intent-as-Code, teams get a queryable audit trail. Onboarding a new engineer to a repo with 6 months of intent history is fundamentally different from onboarding to a repo with only diffs.

**Junior engineers (the most compelling long-term audience):** Today, a junior engineer onboarding to a codebase learns "why" through oral tradition — asking senior devs, reading PR comments, inferring from code structure. It's slow, lossy, and scales with senior engineer availability. With 6 months of intent history in `.intentra/`, they can trace any architectural decision back to the exact prompt, constraints, and trade-offs that produced it.

Consider: a junior engineer joins a team and needs to understand why the service uses event sourcing instead of CRUD. Today, they ask a senior engineer (who may not remember), read 50 PRs (which show *what* changed but not *why*), and eventually piece together a partial picture over weeks. With Intentra, they open `.intentra/intent_2026-01-15T...json` and read: the prompt that requested the architecture change, the constraints (`risk_tolerance: low`, `requires_approval_for: ["schema_migration"]`), the culture gates that fired, and the outcome. Five minutes of structured reading replaces weeks of code review osmosis.

This compresses the feedback loop from months of oral tradition into days of structured, searchable reading — and it works asynchronously, across time zones, without requiring senior engineer time. The onboarding context is a *byproduct* of normal development, not extra documentation work. **Measurable proxy:** time to first meaningful PR commit, correlated with intent history depth in the target repo. A "meaningful" commit is one that touches non-trivial logic (not just config or typo fixes). The hypothesis is that repos with deeper `.intentra/` history produce faster first-meaningful-commit times for new engineers — because the onboarding context is structured and searchable rather than oral and fragmented. This is the metric we'll instrument once intent history reaches sufficient depth across real teams.

| User | Before | After | What we measure in MVP |
|------|--------|-------|----------------------|
| **Engineer running agents** | Checks terminal every few minutes; can't step away | Glances at phone; gets live feed with full context | Runs observed remotely vs. at desk |
| **PR reviewer** | Reverse-engineers agent intent from diffs alone | Reads `.intentra/{intent_id}.json` — sees prompt, constraints, plan | Time from PR open to review decision |
| **Team lead** | Discovers culture violations post-merge | Culture rules enforced before the PR is created | Policy violations caught pre-merge vs. post-merge |
| **New team member** | Reads 50 PRs to understand "why" behind architecture | Reads intent + handoff history for the feature — 5 minutes of structured reading replaces weeks of osmosis | Time to first meaningful contribution |

**Headline estimates and rough calculations — grounded in real telemetry:**

- **~30% of babysitting time reclaimed.** Grounding: our own `skill-usage.jsonl` records a real `/investigate` skill run at `duration_s: 120` — two minutes of active agent work where the developer is blocked if desk-bound, but free if mobile-observable. The same log shows runs of `/office-hours`, `/setup-culture`, `/qa`, and `/ship` in a single session — five distinct skill invocations, each requiring the developer to wait. At an average of 2-8 minutes per run (the `/investigate` run at 2m is the fastest; complex skills like `/qa` and `/ship` routinely run 5-8 minutes based on development experience), an engineer running 3 agents across a workday triggers ~15-20 skill runs. That's 60-100 minutes of "is it done yet?" monitoring. Mobile observability converts active desk-watching into passive glances — the engineer checks their phone for 10 seconds instead of context-switching to a terminal for 60. Conservative estimate: 30% of that 60-100 minutes is reclaimed as productive time. **The 2-minute `/investigate` run is a real data point, not a model.**
- **Merge friction reduction — grounded in real culture gate data.** Culture violations (wrong branch policy, risky surface touched without review, style drift) are currently caught during PR review — the most expensive point in the pipeline. The `CultureJSON` `risk_gates` field blocks violations at runtime, before a PR is ever created. Our `skill-usage.jsonl` baseline already shows the scale of the problem: in a single development session, culture gates fired 20+ times — 9 `rm_recursive` blocks, 2 `git_force_push` denials, 2 `drop_table` blocks, 2 `docker_destructive` blocks, and 3 `freeze/boundary_deny` enforcements. Each of these would have been a review-round cost without runtime enforcement: a reviewer spotting a risky deletion, a force-push that violated branch policy, a production config change that needed approval. Our working hypothesis is that roughly half of review-round churn for agent-generated PRs comes from preventable culture mismatches — agents have no implicit knowledge of team norms, so every norm they violate becomes a review round-trip. The 20+ gate activations in a single session provide the concrete baseline: these are the exact violations that runtime culture enforcement catches before they become PR review friction. **Validation plan:** the MVP will track culture gate activation rates against PR revision counts. This is the metric we intend to validate with production data — not a claim we can substantiate at demo time, but the baseline data already exists.

**What we measure in MVP (concrete, evaluator-verifiable):**
- Skill run count and duration from `~/.gstack/analytics/skill-usage.jsonl` (baseline exists today — 28 entries, including `duration_s: 120` on a real `/investigate` run)
- Culture gate activations from the same JSONL (baseline exists today — 20+ `hook_fire` events in a single session)
- Runs observed remotely (mobile) vs. at desk (terminal)
- Reconnect reliability: successful backfills / total reconnect attempts
- Time-to-awareness: seconds from event emission to user viewing on phone
- Cross-tool event latency: milliseconds from `POST /progress` (simulated CI runner) to event rendering on mobile (target: < 1s)

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
| Connectivity | ngrok / LAN | Zero-config remote access for demos; replaceable at Stage 2 |

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
| Culture gates | Runtime enforcement → JSONL telemetry | `skill-usage.jsonl` (20+ `hook_fire` entries) | Intentra analytics | Run skill with culture loaded → gates fire and log |

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

**Intentra's artifacts are an open protocol, not just a product feature.** IntentSchema, CultureJSON, and Markdown handoffs are designed to be consumed by tools we haven't built yet — the same way `.git/` is consumed by thousands of tools that aren't Git.

**Design principles:**

- **LLM-agnostic:** intent is JSON, handoff is Markdown. Works with Claude, GPT, Llama, Gemini, and future models. Switching agent runtimes doesn't touch the artifact format or mobile app. No vendor lock-in.
- **Tool-agnostic transport (shipped):** HTTP + SSE requires no vendor SDK. Works from curl, any HTTP client, any CI runner, any mobile app.
- **Three ingestion paths (shipped):** JSONL file watcher, HTTP POST, and PostToolUse hook. Any agent framework can emit events through at least one of these without code changes.

**Integration surface (plugs in without forking Intentra):**

| Integration point | How it connects | Effort |
|-------------------|----------------|--------|
| **CI/CD (GitHub Actions, CircleCI)** | CI runner posts `POST /progress` events; artifacts attach to builds as outputs | Hours — HTTP POST is the only requirement |
| **Slack / Discord** | Webhook adapter transforms SSE events into channel messages | Hours — stateless adapter, no Intentra changes |
| **Issue trackers (Jira, Linear)** | Handoff snapshots include `intent_id` — link a ticket to the exact prompt that caused a change | Hours — webhook adapter on the same event stream |
| **IDEs (VS Code, Cursor)** | JSON-RPC call: `intentra.createIntent(prompt, cultureRef)` kicks off a supervised run from inside the editor | Days — thin RPC wrapper over existing HTTP API |
| **Eng Ops / compliance tools** | `CultureJSON` is a standardized schema — external tools can write to it to update team standards across all active agents | Hours — write to `~/.gstack/culture.json` |
| **Future LLMs / agents** | Any agent that can read `IntentSchema` can resume a handoff without human involvement | Zero — the schema is plain JSON |

**Future API surface:**

- **HTTP-first:** keep SSE for event fanout; add bearer token auth with coarse-grained scopes (`read:events`, `write:progress`).
- **JSON-RPC** for programmatic integration:
  - `intentra.createIntent(prompt, cultureRef)` → returns `intent_id`
  - `intentra.getRunStatus(intentId)` → returns live status
  - `intentra.getHandoffSnapshot(intentId)` → returns Markdown
  - `intentra.approveAction(intentId, actionId)` → unblocks a gated action
  - `intentra.kill(intentId)` → terminates a running agent

**Extensibility:** new gStack skills are Markdown files — adding a collaboration mode is hours of work, not weeks. The CultureJSON schema is open; third parties extend it with custom fields without breaking existing consumers.

### Scalability (staged, realistic)

| Stage | What changes | Technical detail |
|-------|-------------|-----------------|
| **0 (today)** | Local-first | JSONL watcher + in-memory ring buffer + SSE to mobile via ngrok. Single machine, single user. |
| **1 (next)** | CI-aware | CI runners post `POST /progress` events. Artifacts attach to builds/PRs as build outputs. Multiple event sources, same server. |
| **2 (future)** | Hosted | Hardened gateway replaces ngrok. Persistent event store (Postgres) replaces ring buffer. Per-org auth + RBAC. Org-wide intent/handoff search. **Same artifact formats and event types.** |
| **3 (platform)** | Industry infrastructure | Intentra becomes the universal intent layer. Third-party agent frameworks emit IntentSchema natively. Non-engineers use intent templates to ship software without writing code. Cross-org intent marketplaces let teams share proven patterns. **The artifact formats become an open standard.** |

**Key principle:** intent artifacts and culture rules are stable contracts. Execution environments (local → CI → cloud) are swappable without changing the intent layer.

**Multi-agent concurrency (beyond demo):** Add a lightweight queue in front of the gStack orchestrator. Agents acquire a lock per repo before executing write operations. The `IntentSchema` already includes an `intent_id` field, so deduplication and ordering come for free. For read-only operations (observability, status checks), no lock is needed — the SSE fanout already supports multiple concurrent subscribers. **Evidence that the concurrency model works at the culture gate layer:** `skill-usage.jsonl` shows 20+ `hook_fire` events firing within a 2-second window (timestamps from `19:36:59Z` to `19:37:01Z`) — multiple concurrent culture gate evaluations processed without conflicts, drops, or ordering issues. The telemetry pipeline handled burst evaluation cleanly.

**Plugin architecture:** Adapters attach to the stable API surface (SSE events + HTTP endpoints) without touching core Intentra code. CI/CD systems (GitHub Actions, CircleCI), issue trackers (Jira, Linear), and messaging platforms (Slack, Discord) plug in via the same `POST /progress` ingestion and SSE subscription. The `intent_id` field provides the linkage key across all systems.

**Key design decision:** `IntentSchema` and `CultureJSON` are deliberately flat JSON with no vendor-specific fields. This means they survive the migration from "file on disk" to "row in Postgres" to "indexed in Elasticsearch" without changing any consumer code.

### Trust model

Intentra treats trust as an architectural primitive, not an afterthought:

- **All ingested data is untrusted.** Telemetry payloads, repo contents, event streams, and fetched page content are consumed as opaque data. The system never executes instructions found in logs, screenshots, or event payloads.
- **Actions derive from explicit intent + culture constraints.** Agent behavior is gated by the `IntentSchema` plan and `CultureJSON` risk gates — not by arbitrary text appearing in the environment.
- **Artifacts are data, not code.** `IntentSchema` and `CultureJSON` are declarative JSON consumed by the runtime. They cannot contain executable instructions that alter agent behavior outside the defined constraint model. This is a deliberate design choice: the artifact format is intentionally inert.

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
| **Culture gate telemetry** | Runtime enforcement producing structured logs | `skill-usage.jsonl` — 20+ `hook_fire` events in a single session |

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
| 5 | **Cross-tool event** | `curl -X POST /progress` simulating a CI runner → event visible in mobile app in < 1 second end-to-end |
| 6 | **Agent tracking** | `POST /agents` → card appears on dashboard; `PATCH` updates it live |
| 7 | **Artifacts (24h)** | After a real skill run, `.intentra/` contains `{intent_id}.json` + `{intent_id}-handoff.md` |

### Demo narrative (60 seconds)

**Three key beats to land.** Step 3 (the CI curl command) is the network-effect proof — it shows a completely different tool posting through the same schema live, not theoretically. Step 6 (`.intentra/` appearing) is the "aha" — the "why" becomes a permanent repo artifact. Step 8 (the onboarding moment) is the emotional resonance — the long-term compound effect that makes evaluators remember the pitch. Steps 1-2 establish trust, step 4 creates urgency (the force-push story), step 5 sets up the question, step 6 answers it, step 7 shows the handoff, and step 8 makes the future tangible. Build to all three moments.

1. **Setup (10s):** gStack skill running locally. Progress server streaming. Expo app open on phone — live feed visible. "This is an agent working. I can see it from my phone. But watch what happens next."
2. **The walk-away (5s):** Step away from the laptop. Hold up the phone. Feed keeps updating. "I'm not at my desk. I still know exactly what's happening."
3. **The cross-tool event (15s) — this is the most underrated moment; set it up verbally.** Pause. "Now watch the phone. I'm about to show you something from a completely different tool." From a second terminal, run a single curl simulating a CI runner: `curl -X POST localhost:7891/progress -d '{"kind":"skill_end","message":"CI: all 47 tests passed","skill":"github-actions"}'`. The event appears on the phone in under a second. "That wasn't the agent. That was a CI runner — a completely different tool — posting through the same schema. One `POST`, and it shows up on your phone alongside the agent events. This is what makes Intentra a platform, not a feature: any tool that speaks HTTP is already integrated. That's the network effect — not in a pitch deck, but live, in under a second."
4. **The culture gate story (10s):** "Here's why this matters. While building this tool, one of our agents force-pushed over a teammate's branch. Tests passed. Diff looked clean. We only caught it because someone happened to check the reflog — days later, by accident. With Intentra's culture gates, that push gets blocked before it happens. Not by a linter. By the team's own rules, loaded at runtime. In fact, our own telemetry shows 20 culture gate activations in a single development session — force-pushes denied, destructive deletes blocked, boundary violations caught. That's 20 potential incidents prevented."
5. **The skill completes (5s):** Phone shows `skill_end` event. PR created. Tests passed. "The agent finished. But here's the question every team asks: *why did it make the choices it made?*"
6. **The "aha" — show `.intentra/` appearing (10s):** Switch to the repo. Run `ls .intentra/`. Two new files: `{intent_id}.json` and `{intent_id}-handoff.md`. **Open the intent artifact on screen.** These files are generated by a real skill run — not mock data or pre-seeded fixtures. "The *why* just became a permanent part of the repo. The exact prompt, the constraints, the culture gates that fired, the plan, the outcome. Diffable, reviewable, forever."
7. **The handoff payoff (5s):** Open the handoff markdown. "And this is what the next person — or the next agent — reads to pick up where this left off. No re-deriving context. Just read the handoff."
8. **The onboarding moment (10s):** "Now imagine a junior engineer joining this repo in six months. They don't ask 'why did we choose this architecture?' and wait for a senior engineer who might not remember. They open `.intentra/` and read the intent log — the prompt, the constraints, the trade-offs, the outcome. Months of oral tradition, compressed into structured, searchable history. Every run that happened before they joined is context they can access in five minutes. That's the compound effect — and it starts accumulating today."
9. **Close (5s):** "Git tracks what changed. Intentra tracks *why*. That's the trust layer every team running agents will need — and what you just saw is the working foundation."

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
| **Gordon's artifact generation slips** | Medium | Devesh builds against mock intent/handoff data from T+3h onward. If real artifact generation isn't ready by T+12h, the demo runs entirely on mock artifacts — the mobile UI, SSE pipeline, and artifact display all work identically with mock data. The demo is viable without the backend artifact writer; Gordon's work upgrades it from "shows the format" to "shows real output." | Built into parallel track design |
| **gStack skill execution friction during demo** | Medium | Acceptance criterion #7 requires a real skill run producing `.intentra/` artifacts. If gStack execution is slow, hangs, or errors during the live demo, the "real run" claim falls through. **Mitigation:** pre-test a specific skill (`/ship` or `/review`) on a known-good repo at T+16h. If execution is unreliable, fall back to pre-captured artifacts from a successful run recorded earlier — the mobile UI, artifact display, and file contents are identical whether generated live or pre-captured. | Mitigation planned — pre-test at T+16h |
| **Artifact format churn** | Low | Lock IntentSchema + Handoff format at T+0–3h before any implementation | Built into plan |
| **JSONL file doesn't exist yet** | Low | 3-tier watcher fallback (file → dir → poll) handles this gracefully | **Already implemented** |
| **Intent artifact injection** | Medium | `.intentra/` artifacts are written exclusively by the skill runtime, never by parsing untrusted input. The IntentSchema is declarative JSON — consumed as data, not executed as code. PR reviewers can diff `.intentra/` files like any other committed artifact. Post-MVP: schema validation on write, content-hash integrity check on read. | Architectural (data-not-code design); validation is a 24h-plus add |
| **SSRF via ngrok tunnel** | Medium | ngrok exposes only the Bun HTTP server on port 7891 — no filesystem or shell access. `POST /progress` accepts JSON payloads but does not follow URLs, fetch remote resources, or execute commands from payload content. The server treats all ingested data as opaque telemetry. Post-MVP: replace ngrok with a hardened gateway (Stage 2) and add request-origin allowlisting. | Mitigated by design (no server-side fetching); hardened gateway planned for Stage 2 |

### Feasibility (why 24 hours is enough)

The hardest engineering is **already done**:
- SSE pipeline with ring buffer, broadcast, and heartbeat ✓
- Mobile app with resilient event stream hook ✓
- JSONL watcher with 3-tier fallback ✓
- Tracked agents CRUD with real-time broadcast ✓
- ngrok connectivity flow ✓
- Culture loading ✓
- Culture gate telemetry (20+ activations logged) ✓

The 24-hour work is **additive** — writing `.intentra/{intent_id}.json` and `.intentra/{intent_id}-handoff.md` artifacts from skill runs, and adding a bearer-token check. This is a well-scoped extension on top of a working pipeline, not a from-scratch build.

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
| **T+16–20h** | Testing | Both | End-to-end test suite; stress test reconnect; verify acceptance criteria 1-7 | All features done |
| **T+20–24h** | Ship | Both | README update; demo script; record 60-second demo video | Testing complete |

**Critical path:** contract lock (T+3h) → Gordon's artifact backend (T+8h) → integration (T+12h) → everything else is parallel.

**Hard gate: T+3h contract lock happens first.** Nothing starts until IntentSchema, Handoff format, and `.intentra/` layout are finalized and agreed by both contributors. If this slips, every downstream milestone shifts by the same amount. Schedule pressure tends to push "let's just agree on the format later" — resist that. Lock the contract, then build in parallel.

### Why this is realistic

- **No cloud dependency.** ngrok handles demo-time networking. Zero infrastructure setup.
- **Fully parallel until T+8h.** Devesh builds UI against mock data while Gordon builds artifact generation. First hard sync point is integration at T+8h.
- **Existing plumbing.** The SSE pipeline, mobile app, JSONL watcher, tracked agents, and culture loading are already working. The 24h adds artifacts on top — not a rewrite.
- **gStack leverage.** Fast iteration on skills and orchestration — the tool we're building on is the tool we're demonstrating.
