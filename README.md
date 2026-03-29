# gstack — AI Engineering Workflow Skills for Claude Code

**gstack** gives Claude Code a persistent browser, opinionated workflow skills, and a real-time mobile monitor. Run ten parallel sprints — each in its own workspace — with one AI agent each, coordinated by a clear process: think, plan, build, review, test, ship, reflect.

On top of the skills layer sits **Intentra** — an observability and collaboration layer: a progress server, SSE event pipeline, command guard engine, and React Native mobile app that lets you monitor all your agents from your phone in real time.

**Canonical master plan:** [`masterdoc3.md`](masterdoc3.md) · **Intentra shipped surface:** [`INTENTRA.md`](INTENTRA.md) · **Architecture & API:** [`docs/intentra-architecture.md`](docs/intentra-architecture.md) · **Deploy (Docker, Fly, GHCR):** [`DEPLOY.md`](DEPLOY.md) · **Contributors:** [`CONTRIBUTORS.md`](CONTRIBUTORS.md)

## Documentation

- **Intentra (mobile + server):** [`INTENTRA.md`](INTENTRA.md), [`docs/quickstart.md`](docs/quickstart.md), [`docs/api-reference.md`](docs/api-reference.md), [`mobile-app/README.md`](mobile-app/README.md), [`mobile-app/TESTING.md`](mobile-app/TESTING.md)
- **gstack skills:** [`docs/skills.md`](docs/skills.md), [`AGENTS.md`](AGENTS.md) (full slash-command inventory)
- **Contracts:** [`docs/openapi/intentra-progress.json`](docs/openapi/intentra-progress.json), `bun run scripts/check-intentra-contracts.ts`
- **Architecture & ops:** [`docs/intentra-architecture.md`](docs/intentra-architecture.md), [`DEPLOY.md`](DEPLOY.md)
- **ADRs:** [`docs/adr/`](docs/adr/)
- **Full docs index:** [`docs/README.md`](docs/README.md)

**Product vision** in `masterdoc3.md` is not a shipped API spec; for routes and behavior, use `INTENTRA.md` and `docs/intentra-architecture.md`.

### Repository layout (high level)

```
browse/            # headless browser CLI + daemon
mobile-app/        # progress server (Bun) + Expo monitor app
docs/              # Intentra + guard + ops docs, OpenAPI, ADRs, design drafts
<skill>/           # one directory per gstack skill (SKILL.md)
.github/workflows  # CI
```

---

## Getting started

1. Install gstack (30 seconds — see below)
2. Run `/office-hours` — describe what you're building
3. Run `/plan-ceo-review` on any feature idea
4. Run `/review` on any branch with changes
5. Run `/qa` on your staging URL
6. Stop there. You'll know if this is for you.

## Install — 30 seconds

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code) · [Git](https://git-scm.com/) · [Bun](https://bun.sh/) v1.0+ · [Node.js](https://nodejs.org/) (Windows only, if your setup needs it)

### Global install (your machine)

Open Claude Code and paste this prompt. Claude does the rest.

> Install gstack: run **`git clone --single-branch --depth 1 https://github.com/deveshkumars/Intentra.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`** then add a "gstack" section to CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, and lists the available skills (full table in [`AGENTS.md`](AGENTS.md)): /autoplan, /benchmark, /browse, /canary, /careful, /codex, /collab-agent, /connect-chrome, /cso, /design-consultation, /design-review, /document-release, /freeze, /gstack-upgrade, /guard, /handoff, /investigate, /land-and-deploy, /office-hours, /plan-ceo-review, /plan-design-review, /plan-eng-review, /qa, /qa-only, /retro, /review, /setup-browser-cookies, /setup-culture, /setup-deploy, /ship, /unfreeze. Then ask the user if they also want to add gstack to the current project so teammates get it.

### Per-repo install (teammates get it automatically)

> Add gstack to this project: run **`cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup`** then add a "gstack" section to this project's CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, lists the same skills as in [`AGENTS.md`](AGENTS.md): /autoplan, /benchmark, /browse, /canary, /careful, /codex, /collab-agent, /connect-chrome, /cso, /design-consultation, /design-review, /document-release, /freeze, /gstack-upgrade, /guard, /handoff, /investigate, /land-and-deploy, /office-hours, /plan-ceo-review, /plan-design-review, /plan-eng-review, /qa, /qa-only, /retro, /review, /setup-browser-cookies, /setup-culture, /setup-deploy, /ship, /unfreeze, and tells Claude that if gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

Real files get committed to your repo (not a submodule), so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

### Codex, Gemini CLI, or Cursor

gstack works on any agent that supports the [SKILL.md standard](https://github.com/anthropics/claude-code). Skills live in `.agents/skills/` and are discovered automatically.

Install per-repo:

```bash
git clone --single-branch --depth 1 https://github.com/deveshkumars/Intentra.git .agents/skills/gstack
cd .agents/skills/gstack && ./setup --host codex
```

When setup runs from `.agents/skills/gstack`, it installs the generated Codex skills next to it in the same repo and does not write to `~/.codex/skills`.

Install globally for your user account:

```bash
git clone --single-branch --depth 1 https://github.com/deveshkumars/Intentra.git ~/gstack
cd ~/gstack && ./setup --host codex
```

`setup --host codex` creates the runtime root at `~/.codex/skills/gstack` and links the generated Codex skills at the top level. This avoids duplicate skill discovery from the source repo checkout.

Or let setup auto-detect which agents you have installed:

```bash
cd ~/gstack && ./setup --host auto
```

For Codex-compatible hosts, setup supports both repo-local installs from `.agents/skills/gstack` and user-global installs from `~/.codex/skills/gstack`. The full skill set in [`AGENTS.md`](AGENTS.md) is generated for supported agents. Hook-based safety skills (`/careful`, `/freeze`, `/guard`) use inline safety advisory prose on non-Claude hosts.

---

## See it work

```
You:    I want to build a daily briefing app for my calendar.
You:    /office-hours
Claude: [asks about the pain — specific examples, not hypotheticals]

You:    Multiple Google calendars, events with stale info, wrong locations.
        Prep takes forever and the results aren't good enough...

Claude: I'm going to push back on the framing. You said "daily briefing
        app." But what you actually described is a personal chief of
        staff AI.
        [extracts 5 capabilities you didn't realize you were describing]
        [challenges 4 premises — you agree, disagree, or adjust]
        [generates 3 implementation approaches with effort estimates]
        RECOMMENDATION: Ship the narrowest wedge tomorrow, learn from
        real usage. The full vision is a 3-month project — start with
        the daily briefing that actually works.
        [writes design doc → feeds into downstream skills automatically]

You:    /plan-ceo-review
        [reads the design doc, challenges scope, runs 10-section review]

You:    /plan-eng-review
        [ASCII diagrams for data flow, state machines, error paths]
        [test matrix, failure modes, security concerns]

You:    Approve plan. Exit plan mode.
        [writes 2,400 lines across 11 files. ~8 minutes.]

You:    /review
        [AUTO-FIXED] 2 issues. [ASK] Race condition → you approve fix.

You:    /qa https://staging.myapp.com
        [opens real browser, clicks through flows, finds and fixes a bug]

You:    /ship
        Tests: 42 → 51 (+9 new). PR: github.com/you/app/pull/42
```

You said "daily briefing app." The agent said "you're building a chief of staff AI" — because it listened to your pain, not your feature request. Eight commands, end to end. That is not a copilot. That is a team.

---

## The sprint

gstack is a process, not a collection of tools. The skills run in the order a sprint runs:

**Think → Plan → Build → Review → Test → Ship → Reflect**

Each skill feeds into the next. `/office-hours` writes a design doc that `/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/qa` picks up. `/review` catches bugs that `/ship` verifies are fixed. Nothing falls through the cracks because every step knows what came before it.

| Skill | Your specialist | What they do |
|-------|----------------|--------------|
| `/office-hours` | **YC Office Hours** | Start here. Six forcing questions that reframe your product before you write code. Pushes back on your framing, challenges premises, generates implementation alternatives. Design doc feeds into every downstream skill. |
| `/plan-ceo-review` | **CEO / Founder** | Rethink the problem. Find the 10-star product hiding inside the request. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. |
| `/plan-eng-review` | **Eng Manager** | Lock in architecture, data flow, diagrams, edge cases, and tests. Forces hidden assumptions into the open. |
| `/plan-design-review` | **Senior Designer** | Rates each design dimension 0-10, explains what a 10 looks like, then edits the plan to get there. AI slop detection built in. Interactive — one decision per design choice. |
| `/design-consultation` | **Design Partner** | Build a complete design system from scratch. Researches the landscape, proposes creative risks, generates realistic product mockups. |
| `/review` | **Staff Engineer** | Find the bugs that pass CI but blow up in production. Auto-fixes the obvious ones. Flags completeness gaps. |
| `/investigate` | **Debugger** | Systematic root-cause debugging. Iron Law: no fixes without investigation. Traces data flow, tests hypotheses, stops after 3 failed fixes. |
| `/design-review` | **Designer Who Codes** | Same audit as `/plan-design-review`, then fixes what it finds. Atomic commits, before/after screenshots. |
| `/qa` | **QA Lead** | Test your app, find bugs, fix them with atomic commits, re-verify. Auto-generates regression tests for every fix. |
| `/qa-only` | **QA Reporter** | Same methodology as `/qa` but report only. Pure bug report without code changes. |
| `/cso` | **Chief Security Officer** | OWASP Top 10 + STRIDE threat model. Zero-noise: 17 false positive exclusions, 8/10+ confidence gate, independent finding verification. Each finding includes a concrete exploit scenario. |
| `/ship` | **Release Engineer** | Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if you don't have one. Invokes `/document-release` automatically (per the ship skill workflow). |
| `/land-and-deploy` | **Release Engineer** | Merge the PR, wait for CI and deploy, verify production health. One command from "approved" to "verified in production." |
| `/canary` | **SRE** | Post-deploy monitoring loop. Watches for console errors, performance regressions, and page failures. |
| `/benchmark` | **Performance Engineer** | Baseline page load times, Core Web Vitals, and resource sizes. Compare before/after on every PR. |
| `/document-release` | **Technical Writer** | Update all project docs to match what you just shipped. Catches stale READMEs automatically. |
| `/retro` | **Eng Manager** | Team-aware weekly retro. Per-person breakdowns, shipping streaks, test health trends, growth opportunities. `/retro global` runs across all your projects and AI tools. |
| `/setup-culture` | **Culture Lead** | Configure your organization's coding standards, values, risk tolerance, and review norms. Saved to `~/.gstack/culture.json` and read by every agent in every session. |
| `/browse` | **QA Engineer** | Give the agent eyes. Real Chromium browser, real clicks, real screenshots. ~100ms per command. `$B connect` launches your real Chrome as a headed window — watch every action live. |
| `/setup-browser-cookies` | **Session Manager** | Import cookies from your real browser (Chrome, Arc, Brave, Edge) into the headless session. Test authenticated pages. |
| `/autoplan` | **Review Pipeline** | One command, fully reviewed plan. Runs CEO → design → eng review automatically with encoded decision principles. Surfaces only taste decisions for your approval. |

### Power tools

| Skill | What it does |
|-------|-------------|
| `/codex` | **Second Opinion** — independent code review from OpenAI Codex CLI. Three modes: review (pass/fail gate), adversarial challenge, and open consultation. Cross-model analysis when both `/review` and `/codex` have run. |
| `/connect-chrome` | **Live Browser** — launch real Chrome controlled by gstack with the Side Panel extension auto-loaded. Watch every action happen in a real, visible window in real time. |
| `/careful` | **Safety Guardrails** — warns before destructive commands (`rm -rf`, `DROP TABLE`, force-push). Override any warning. |
| `/freeze` | **Edit Lock** — restrict file edits to one directory. Prevents accidental changes outside scope while debugging. |
| `/guard` | **Full Safety** — `/careful` + `/freeze` in one command. Maximum safety for prod work. |
| `/unfreeze` | **Unlock** — remove the `/freeze` boundary. |
| `/setup-deploy` | **Deploy Configurator** — one-time setup for `/land-and-deploy`. Detects your platform, production URL, and deploy commands. |
| `/gstack-upgrade` | **Self-Updater** — upgrade gstack to latest. Detects global vs vendored install, syncs both, shows what changed. |
| `/handoff` | **Session continuity** — append prompts, plans, and handoff state to Markdown files for the next agent or human. |
| `/collab-agent` | **Git collaboration** — merges, branch coordination, handoff docs for multi-person or multi-agent teams. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

---

## Parallel sprints

gstack works well with one sprint. It gets interesting with ten running at once. The bullets below describe behaviors that ship in this repository (skills, browse tooling, mobile progress server). Where a workflow depends on a **third-party product** or your own machine setup, that is called out explicitly — those are not guarantees from this repo alone.

**Design is at the heart.** `/design-consultation` doesn't just pick fonts. It researches what's out there in your space, proposes safe choices AND creative risks, generates realistic mockups of your actual product, and writes `DESIGN.md` — and then `/design-review` and `/plan-eng-review` read what you chose. Design decisions flow through the whole system.

**`/qa` was a massive unlock.** It let me go from 6 to 12 parallel workers. Claude Code saying *"I SEE THE ISSUE"* and then actually fixing it, generating a regression test, and verifying the fix — that changed how I work. The agent has eyes now.

**Review readiness.** The `/ship` skill includes a Review Readiness Dashboard so you can see what checks apply before you open a PR. Which reviews you run still depends on the skills you invoke and your team’s process — gstack does not auto-route work across sessions without you choosing the skills.

**Test everything.** `/ship` bootstraps test frameworks from scratch if your project doesn't have one. Every `/ship` run produces a coverage audit. Every `/qa` bug fix generates a regression test. 100% test coverage is the goal — tests make vibe coding safe instead of yolo coding.

**`/document-release` is the engineer you never had.** It reads project docs, cross-references the diff, and updates what drifted (README, architecture notes, CLAUDE.md, etc., per the skill). **`/ship` auto-invokes `/document-release`** when you follow the ship skill steps — so docs can stay current without a separate command if you use that workflow.

**Real browser mode.** `$B connect` launches your actual Chrome as a headed window controlled by Playwright. You watch Claude click, fill, and navigate in real time — same window, same screen. A subtle green shimmer at the top edge tells you which Chrome window gstack controls. All existing browse commands work unchanged. `$B disconnect` returns to headless. A Chrome extension Side Panel shows a live activity feed of every command and a chat sidebar where you can direct Claude. This is co-presence — Claude isn't remote-controlling a hidden browser, it's sitting next to you in the same cockpit.

**Sidebar agent — your AI browser assistant.** Type natural language instructions in the Chrome side panel and a child Claude instance executes them. Each task gets up to 5 minutes. The sidebar agent runs in an isolated session, so it won't interfere with your main Claude Code window.

**Personal automation (illustrative).** The same headed-browser tooling can support ad hoc automation outside classic dev QA (e.g. repeating navigation on a site you control). Treat this as **your** responsibility for terms of service, consent, and safety — not a product guarantee from this repo.

**Browser handoff when the AI gets stuck.** Hit a CAPTCHA, auth wall, or MFA prompt? `$B handoff` opens a visible Chrome at the exact same page with all your cookies and tabs intact. Solve the problem, tell Claude you're done, `$B resume` picks up right where it left off. Browse tooling and skills may suggest this flow after repeated failures when that logic is present in the active skill or CLI.

**Multi-AI second opinion.** `/codex` gets an independent review from OpenAI's Codex CLI — a completely different AI looking at the same diff. When both `/review` (Claude) and `/codex` (OpenAI) have reviewed the same branch, you get a cross-model analysis showing which findings overlap and which are unique to each.

**Safety guardrails on demand.** Say "be careful" and `/careful` warns before any destructive command. `/freeze` locks edits to one directory while debugging so Claude can't accidentally "fix" unrelated code. `/guard` activates both. `/investigate` auto-freezes to the module being investigated.

**Proactive skill suggestions.** Some skills and install docs describe suggesting the next skill (e.g. based on session context). Exact behavior depends on your **Claude Code / agent host** configuration and whether hooks or preambles are enabled — it is not a single global switch in this repository.

### Optional ecosystem (external tools)

**Parallel sessions beyond one repo.** Products such as [Conductor](https://conductor.build) run multiple Claude Code (or other agent) sessions in parallel, each in its own workspace. That pattern is **external orchestration**: useful with gstack skills, but not shipped or required by this repository.

**High parallelism.** Running many concurrent sprints is a **personal or team operating model**, not a capability this repo enforces. Your practical limit depends on machines, API limits, and the orchestration product you use.

---

## Intentra — mobile monitor + observability layer

Intentra is the observability and collaboration layer that runs alongside gstack. It watches your agents in real time and surfaces activity on your phone.

### What it is

A Bun server (`mobile-app/server/`) on port 7891 that:

- **Watches `skill-usage.jsonl`** — ingests skill start/end events from gstack's JSONL telemetry
- **Accepts `POST /progress`** — receives agent status updates from scripts and hooks
- **Streams SSE** — pushes all events to connected clients in real time via `GET /events/stream`
- **Tracks agents** — CRUD API for named agents with `running` / `done` / `error` status
- **Guards commands** — policy engine (NFKC normalize → tokenize → rule scan → culture gates) at `POST /intentra/guard`
- **Stores intent artifacts** — `POST /intentra/intent` creates `.intentra/*.json` files; mobile reads them back
- **Serves handoff summaries** — parses `HANDOFFS.md` and returns structured entries for the mobile Handoffs tab

A React Native Expo app (`mobile-app/app/`) connects to this server and shows:

- **Dashboard** — live feed of agent cards with status indicators
- **Detail** — per-session event timeline with progress and duration
- **Handoffs** — structured summaries from `.intentra/HANDOFFS.md`
- **Intents** — culture audit and intent artifact viewer

### Quick start

See **[`docs/quickstart.md`](docs/quickstart.md)** for the full 5-minute setup (server → ngrok → Expo Go on your phone).

```bash
cd mobile-app/server
bun install
bun run server.ts
# → gstack progress server running on http://localhost:7891
```

### Agent API

```bash
# Create a tracked agent
curl -s -X POST http://localhost:7891/agents \
  -H "Content-Type: application/json" \
  -d '{"name": "my-agent", "description": "optional"}'

# Mark done (use id from create response)
curl -s -X PATCH http://localhost:7891/agents/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Mark errored
curl -s -X PATCH http://localhost:7891/agents/<id> \
  -H "Content-Type: application/json" \
  -d '{"status": "error", "message": "something went wrong"}'

# List all agents
curl -s http://localhost:7891/agents

# Health check
curl -s http://localhost:7891/health
```

### Environment variables

| Variable | Default | Role |
|----------|---------|------|
| `GSTACK_PROGRESS_PORT` | `7891` | Listen port |
| `GSTACK_STATE_DIR` | `~/.gstack` | gstack home; JSONL watcher reads from here |
| `INTENTRA_TOKEN` | unset | If set, bearer auth required on POST / PATCH / DELETE |
| `INTENTRA_REPO_ROOT` | server `cwd` | Repo root for resolving `.intentra/` artifacts |

When `INTENTRA_TOKEN` is unset, the server is open. GET routes are always unauthenticated. Full route matrix: [`docs/intentra-architecture.md`](docs/intentra-architecture.md).

### Deploy

See **[`DEPLOY.md`](DEPLOY.md)** for Docker, `docker compose`, Fly.io, and GHCR image tags.

```bash
# Build and run locally with Docker
docker build -f mobile-app/server/Dockerfile -t intentra-progress .
docker run -p 7891:7891 \
  -v ~/.gstack:/data/gstack \
  -v $(pwd):/repo \
  intentra-progress
```

A pre-built image is published to GHCR on every push to `main` that touches server files (see [`.github/workflows/intentra-docker.yml`](.github/workflows/intentra-docker.yml)).

### Documentation index

| Doc | What it covers |
|-----|---------------|
| [Documentation hub](docs/README.md) | Grouped index + maintenance rule for route/OpenAPI changes |
| [AGENTS.md](AGENTS.md) | Full gstack slash-command inventory |
| [Quickstart](docs/quickstart.md) | 5-minute local setup: install → server → ngrok → mobile app |
| [API Reference](docs/api-reference.md) | Every endpoint with request/response schemas and JSON examples |
| [Architecture](docs/intentra-architecture.md) | Route/auth matrix, event pipeline diagram, evaluator playbook |
| [Intent Lifecycle](docs/intent-lifecycle.md) | Create → track → resolve workflow with mermaid diagrams |
| [Guard Engine](docs/guard-engine.md) | Pipeline deep-dive: normalization, tokenization, rule matching |
| [Guard Rules Reference](docs/guard-rules-reference.md) | All 8 rules with trigger examples and safe targets |
| [Culture Config](docs/culture-config.md) | Customize guard verdicts via `culture.json` risk_gates |
| [Error Handling](docs/error-handling.md) | HTTP error codes, retry strategies, SSE reconnection patterns |
| [Troubleshooting](docs/troubleshooting.md) | Common issues with step-by-step fixes and diagnostic commands |
| [Env Reference](docs/env-reference.md) | All environment variables with defaults and validation rules |
| [Scaling](docs/scaling.md) | Ring buffer limits, subscriber capacity, resource usage |
| [Security](docs/security.md) | Auth model, CORS policy, data protection, threat model |
| [Testing Guide](mobile-app/TESTING.md) | Running and extending smoke tests |
| [Handoffs (mobile)](docs/handoffs-mobile.md) | Handoffs tab, shared `handoff-parse`, `GET /intentra/handoffs/summary` |
| [OpenAPI subset](docs/openapi/intentra-progress.json) | Machine-readable contract for core routes |
| [ADRs](docs/adr/) | Shared handoff module, guard segmentation limits, first-match registry |
| [Deploy](DEPLOY.md) | Docker, docker-compose, Fly.io, GHCR image tags |

---

## For contributors

```bash
git clone <repo> && cd gstack
bun install
bin/dev-setup      # symlink repo into .claude/skills/ — edits go live immediately
bun test           # free, <2s — run before every commit
bun run test:evals # paid, diff-based (~$4/run max) — run before shipping
```

See **[`CONTRIBUTING.md`](CONTRIBUTING.md)** for the full contributor workflow, dev setup, and how to enable contributor mode (which auto-files improvement reports to `~/.gstack/contributor-logs/`).
