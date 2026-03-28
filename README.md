# Intentra: Agentic Software Collaboration Platform
Reinventing Agentic Software Development Collaboration: We provide an agentic coding platform that makes collaboration between humans smooth, brings human culture to agents, and helps developers monitor their agents on the go.

Installation information is below

## 1. Vision
We are reinventing how developers collaborate in an era of AI agents.
**North Star:**  
Enable seamless collaboration between humans and AI agents where:
- English is the new programming language, and developers can share their prompts along with their code
- Agents understand and preserve human organizational culture
- Collaboration is intent-driven, not command-driven
- Developers can supervise and steer autonomous systems in real time
This platform changes the game when it comes to agentic coding. It’s no longer “share your code,” but “share your prompts.” Developers should be able to embody their human culture into the agents, and then leave the computer, tracking progress on their mobile devices.
---
## 2. Problem Definition
### Current Pain Points
- Git workflows are rigid and unintuitive for complex collaboration
- AI agents operate in isolation without shared context or "team culture"
- Developers lack visibility and control over autonomous agent behavior away from their computer
- Collaboration is fragmented since code is shared, but not the prompts
### Who Experiences This?
- Software engineers working in teams
- AI-first startups using coding agents
- Open-source contributors
- Technical founders managing multi-agent workflows
---
## 3. Innovation
### 3.1 Intent as Code
Instead of imperative commands, users specify **intent**:
Example:
> "Pull Devesh's UI changes but ignore Eashan's ML model, and merge safely."
Agents interpret:
- Context
- Dependencies
- Organizational priorities
This introduces a **semantic layer on top of Git**.
---
### 3.2 Intelligent Merge Engine
Agents perform merges with:
- Dependency awareness
- Test validation
- Priority-based conflict resolution
Example:
> Prefer stability of frontend over experimental ML branch
---
### 3.3 Cultural Embedding in Agents
Agents inherit:
- Team coding style
- Risk tolerance
- Merge priorities
- Review standards
This creates **organization-aware agents**, not generic copilots.
---
### 3.4 Portable Work via Markdown
Agents generate a **stateful markdown summary**:
- What was built
- Decisions made
- Current architecture
- Next steps
Other users can import this and continue development seamlessly.
---
### 3.5 Mobile Agent Monitoring
A mobile interface allows:
- Real-time agent monitoring
- Intervention (approve/deny actions)
- High-level steering
---
## 4. Technical Architecture
### 4.1 System Overview
- Mobile App: React Native
- Agent Layer: Using Claude Code and open-source gStack
- Communication between coding platform and mobile app: ngrok
- New Capabilities: Delivered via Claude Code Skills and open source gstack
---
### 4.2 Core Components
#### 1. Intent Parser
- Converts natural language → structured commands
- Uses LLM + schema validation
#### 2. Agent Orchestrator: gstack
- Manages task execution
- Coordinates multiple agents
#### 3. Culture Expert: Intent as Code
- Stores organizational culture in a json format 
#### 4. Markdown Serializer
- Exports/imports project state
- Enables portability
#### 5. Mobile Interface
- Lightweight API-driven dashboard
---
##5. Scalability
Intentra is architected not just as a tool, but as an ecosystem. While the current iteration focuses on immediate developer needs, the framework is designed for massive horizontal and vertical expansion.
### 5.1 Extensibility beyond the Hackathon
High potential for scalability allowing for Intentra to revolutionize software development 
As the user base grows, Intentra facilitates seamless cross-user contribution, turning individual development into a collective, AI-augmented intelligence.
Intentra is currently optimized for Claude’s sophisticated reasoning capabilities, tapping into an established and rapidly growing developer base
## 6. Team Execution Plan:
Division of work
Both of us work on the masterplan, README
Gordon will work on implementing the collab-agent and code architecture
Devesh will work on the mobile application and markdown as code sharing
Milestones for the 24 hours

Timeline
2:00 PM master doc completed
5:00 PM we should have a stencil up for gstack
10:00 PM we should the functioning claude skill up and running, fully done with the Skill.md file
5:00 AM: Mobile app should be up and running
10:00 AM: The markdown as code functionality should be implemented
2:00 PM: Code is finished and fully polished 

## 7: Feasibility: Can it be built in 24 hours by this team?
Given the team’s specialized expertise in AI-augmented development and a highly defined product scope, we have structured our workflow to ensure a production-ready MVP within the 24-hour window. This project is entirely feasible during this 24 hours and is a well-formed idea for a short-term hackathon. 

## 8 Market Awareness: Competitive landscape, positioning
The current industry leaders in AI coding Cursor and Claude Code and in collaboration is Github. Our product would be revolutionary since it transcends current industries and allows for effective communication between humans using markdown as code, a more intentional collaboration platform, and a mobile application.

## 9 Risk Assessment: Risks identified, contingency plans
It’s possible that it is too difficult to get Claude to communicate with a backend that the mobile application can access in a secure way. If this were to occur, then it is paramount to use security principles to determine a safe way to communicate the status of the coding to the mobile application. One such contingency would be to have read-only information moving from Claude.


## 10 User Impact: How many people benefit? How much improvement?
Intentra isn’t just for elite engineers; it’s designed to lower the barrier to entry for complex software architecture while raising the ceiling for professional teams. 
For Software Engineers: Intentra eliminates problems that developers may have with asynchronous work together. It allows for intuitive collaboration while also allowing teams or developers to pass off their coding agents and prompts to allow everybody to be on the same page.
For Students & Beginners: Intentra can act as a mentor. By translating complex Git operations into Intent as Code, it allows new learners to focus on logic and architecture rather than struggling with CLI syntax.
Intentra is designed to bring organizational culture and human reasoning to integrate coding agents directly into organizations’ workflows. It will revolutionize software development.

## 11 Differentiation Strategy: What makes this different from existing solutions
No existing solution for agentic coding provides a platform to share prompts in a portable, vendor-agnostic format. No existing solution allows for organizational culture to be embedded in the agent’s every action. No existing solution allows for developers to get up from their desks and take a walk, continuing to monitor progress from their devices. And certainly, no existing solution seamlessly does all of the above at once.

## 12 Ecosystem Thinking: Interoperability, API design, extensibility
### 12.1 Interoperability as a Cornerstone
One of Intentra’s key features is the saving of prompts to allow for thorough collaboration in agentic software development. The prompts are LLM-agnostic, allowing for Intentra to execute these features in a variety of environments.
### 12.2 API-First Design
Because Intentra is applicable for any and all software engineers, its API is designed to be versatile across platforms. It allows IDEs (VS Code, JetBrains) to send natural language "Intents" directly to the orchestrator.
Additionally, the API for agents to follow organizational culture is a standardized JSON schema that allows HR or Engineering Ops tools to programmatically update "Team Coding Standards" across all active agents. 
### 12.3 Extensibility
	Given the incredibly structured nature of the codebase, it is very easy to add new skills to Claude in a markdown format. The system for the mobile application can be easily adapted for a future web application as well, and the culture platform is a JSON format that other vendors could use in the future. We created extensible formats that will one day become commonplace in the world, just as MCP once did.

# Installation
## Quick start

1. Install gstack (30 seconds — see below)
2. Run `/office-hours` — describe what you're building
3. Run `/plan-ceo-review` on any feature idea
4. Run `/review` on any branch with changes
5. Run `/qa` on your staging URL
6. Stop there. You'll know if this is for you.

## Install — 30 seconds

**Requirements:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code), [Git](https://git-scm.com/), [Bun](https://bun.sh/) v1.0+, [Node.js](https://nodejs.org/) (Windows only)

### Step 1: Install on your machine

Open Claude Code and paste this. Claude does the rest.

> Install gstack: run **`git clone --single-branch --depth 1 https://github.com/deveshkumars/Intentra.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup`** then add a "gstack" section to CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, and lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade. Then ask the user if they also want to add gstack to the current project so teammates get it.

### Step 2: Add to your repo so teammates get it (optional)

> Add gstack to this project: run **`cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup`** then add a "gstack" section to this project's CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp\_\_claude-in-chrome\_\_\* tools, lists the available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse, /qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro, /investigate, /document-release, /codex, /cso, /careful, /freeze, /guard, /unfreeze, /gstack-upgrade, and tells Claude that if gstack skills aren't working, run `cd .claude/skills/gstack && ./setup` to build the binary and register skills.

Real files get committed to your repo (not a submodule), so `git clone` just works. Everything lives inside `.claude/`. Nothing touches your PATH or runs in the background.

> **Contributing or need full history?** The commands above use `--depth 1` for a fast install. If you plan to contribute or need full git history, do a full clone instead:
> ```bash
> git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> ```

### Codex, Gemini CLI, or Cursor

gstack works on any agent that supports the [SKILL.md standard](https://github.com/anthropics/claude-code). Skills live in `.agents/skills/` and are discovered automatically.

Install to one repo:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git .agents/skills/gstack
cd .agents/skills/gstack && ./setup --host codex
```

When setup runs from `.agents/skills/gstack`, it installs the generated Codex skills next to it in the same repo and does not write to `~/.codex/skills`.

Install once for your user account:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/gstack
cd ~/gstack && ./setup --host codex
```

`setup --host codex` creates the runtime root at `~/.codex/skills/gstack` and
links the generated Codex skills at the top level. This avoids duplicate skill
discovery from the source repo checkout.

Or let setup auto-detect which agents you have installed:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/gstack
cd ~/gstack && ./setup --host auto
```

For Codex-compatible hosts, setup now supports both repo-local installs from `.agents/skills/gstack` and user-global installs from `~/.codex/skills/gstack`. All 28 skills work across all supported agents. Hook-based safety skills (careful, freeze, guard) use inline safety advisory prose on non-Claude hosts.

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

## The sprint

gstack is a process, not a collection of tools. The skills run in the order a sprint runs:

**Think → Plan → Build → Review → Test → Ship → Reflect**

Each skill feeds into the next. `/office-hours` writes a design doc that `/plan-ceo-review` reads. `/plan-eng-review` writes a test plan that `/qa` picks up. `/review` catches bugs that `/ship` verifies are fixed. Nothing falls through the cracks because every step knows what came before it.

| Skill | Your specialist | What they do |
|-------|----------------|--------------|
| `/office-hours` | **YC Office Hours** | Start here. Six forcing questions that reframe your product before you write code. Pushes back on your framing, challenges premises, generates implementation alternatives. Design doc feeds into every downstream skill. |
| `/plan-ceo-review` | **CEO / Founder** | Rethink the problem. Find the 10-star product hiding inside the request. Four modes: Expansion, Selective Expansion, Hold Scope, Reduction. |
| `/plan-eng-review` | **Eng Manager** | Lock in architecture, data flow, diagrams, edge cases, and tests. Forces hidden assumptions into the open. |
| `/plan-design-review` | **Senior Designer** | Rates each design dimension 0-10, explains what a 10 looks like, then edits the plan to get there. AI Slop detection. Interactive — one AskUserQuestion per design choice. |
| `/design-consultation` | **Design Partner** | Build a complete design system from scratch. Researches the landscape, proposes creative risks, generates realistic product mockups. |
| `/review` | **Staff Engineer** | Find the bugs that pass CI but blow up in production. Auto-fixes the obvious ones. Flags completeness gaps. |
| `/investigate` | **Debugger** | Systematic root-cause debugging. Iron Law: no fixes without investigation. Traces data flow, tests hypotheses, stops after 3 failed fixes. |
| `/design-review` | **Designer Who Codes** | Same audit as /plan-design-review, then fixes what it finds. Atomic commits, before/after screenshots. |
| `/qa` | **QA Lead** | Test your app, find bugs, fix them with atomic commits, re-verify. Auto-generates regression tests for every fix. |
| `/qa-only` | **QA Reporter** | Same methodology as /qa but report only. Pure bug report without code changes. |
| `/cso` | **Chief Security Officer** | OWASP Top 10 + STRIDE threat model. Zero-noise: 17 false positive exclusions, 8/10+ confidence gate, independent finding verification. Each finding includes a concrete exploit scenario. |
| `/ship` | **Release Engineer** | Sync main, run tests, audit coverage, push, open PR. Bootstraps test frameworks if you don't have one. |
| `/land-and-deploy` | **Release Engineer** | Merge the PR, wait for CI and deploy, verify production health. One command from "approved" to "verified in production." |
| `/canary` | **SRE** | Post-deploy monitoring loop. Watches for console errors, performance regressions, and page failures. |
| `/benchmark` | **Performance Engineer** | Baseline page load times, Core Web Vitals, and resource sizes. Compare before/after on every PR. |
| `/document-release` | **Technical Writer** | Update all project docs to match what you just shipped. Catches stale READMEs automatically. |
| `/retro` | **Eng Manager** | Team-aware weekly retro. Per-person breakdowns, shipping streaks, test health trends, growth opportunities. `/retro global` runs across all your projects and AI tools (Claude Code, Codex, Gemini). |
| `/browse` | **QA Engineer** | Give the agent eyes. Real Chromium browser, real clicks, real screenshots. ~100ms per command. `$B connect` launches your real Chrome as a headed window — watch every action live. |
| `/setup-browser-cookies` | **Session Manager** | Import cookies from your real browser (Chrome, Arc, Brave, Edge) into the headless session. Test authenticated pages. |
| `/autoplan` | **Review Pipeline** | One command, fully reviewed plan. Runs CEO → design → eng review automatically with encoded decision principles. Surfaces only taste decisions for your approval. |

### Power tools

| Skill | What it does |
|-------|-------------|
| `/codex` | **Second Opinion** — independent code review from OpenAI Codex CLI. Three modes: review (pass/fail gate), adversarial challenge, and open consultation. Cross-model analysis when both `/review` and `/codex` have run. |
| `/careful` | **Safety Guardrails** — warns before destructive commands (rm -rf, DROP TABLE, force-push). Say "be careful" to activate. Override any warning. |
| `/freeze` | **Edit Lock** — restrict file edits to one directory. Prevents accidental changes outside scope while debugging. |
| `/guard` | **Full Safety** — `/careful` + `/freeze` in one command. Maximum safety for prod work. |
| `/unfreeze` | **Unlock** — remove the `/freeze` boundary. |
| `/setup-deploy` | **Deploy Configurator** — one-time setup for `/land-and-deploy`. Detects your platform, production URL, and deploy commands. |
| `/gstack-upgrade` | **Self-Updater** — upgrade gstack to latest. Detects global vs vendored install, syncs both, shows what changed. |

**[Deep dives with examples and philosophy for every skill →](docs/skills.md)**

## Parallel sprints

gstack works well with one sprint. It gets interesting with ten running at once.

**Design is at the heart.** `/design-consultation` doesn't just pick fonts. It researches what's out there in your space, proposes safe choices AND creative risks, generates realistic mockups of your actual product, and writes `DESIGN.md` — and then `/design-review` and `/plan-eng-review` read what you chose. Design decisions flow through the whole system.

**`/qa` was a massive unlock.** It let me go from 6 to 12 parallel workers. Claude Code saying *"I SEE THE ISSUE"* and then actually fixing it, generating a regression test, and verifying the fix — that changed how I work. The agent has eyes now.

**Smart review routing.** Just like at a well-run startup: CEO doesn't have to look at infra bug fixes, design review isn't needed for backend changes. gstack tracks what reviews are run, figures out what's appropriate, and just does the smart thing. The Review Readiness Dashboard tells you where you stand before you ship.

**Test everything.** `/ship` bootstraps test frameworks from scratch if your project doesn't have one. Every `/ship` run produces a coverage audit. Every `/qa` bug fix generates a regression test. 100% test coverage is the goal — tests make vibe coding safe instead of yolo coding.

**`/document-release` is the engineer you never had.** It reads every doc file in your project, cross-references the diff, and updates everything that drifted. README, ARCHITECTURE, CONTRIBUTING, CLAUDE.md, TODOS — all kept current automatically. And now `/ship` auto-invokes it — docs stay current without an extra command.

**Real browser mode.** `$B connect` launches your actual Chrome as a headed window controlled by Playwright. You watch Claude click, fill, and navigate in real time — same window, same screen. A subtle green shimmer at the top edge tells you which Chrome window gstack controls. All existing browse commands work unchanged. `$B disconnect` returns to headless. A Chrome extension Side Panel shows a live activity feed of every command and a chat sidebar where you can direct Claude. This is co-presence — Claude isn't remote-controlling a hidden browser, it's sitting next to you in the same cockpit.

**Sidebar agent — your AI browser assistant.** Type natural language instructions in the Chrome side panel and a child Claude instance executes them. "Navigate to the settings page and screenshot it." "Fill out this form with test data." "Go through every item in this list and extract the prices." Each task gets up to 5 minutes. The sidebar agent runs in an isolated session, so it won't interfere with your main Claude Code window. It's like having a second pair of hands in the browser.

**Personal automation.** The sidebar agent isn't just for dev workflows. Example: "Browse my kid's school parent portal and add all the other parents' names, phone numbers, and photos to my Google Contacts." Two ways to get authenticated: (1) log in once in the headed browser — your session persists, or (2) run `/setup-browser-cookies` to import cookies from your real Chrome. Once authenticated, Claude navigates the directory, extracts the data, and creates the contacts.

**Browser handoff when the AI gets stuck.** Hit a CAPTCHA, auth wall, or MFA prompt? `$B handoff` opens a visible Chrome at the exact same page with all your cookies and tabs intact. Solve the problem, tell Claude you're done, `$B resume` picks up right where it left off. The agent even suggests it automatically after 3 consecutive failures.

**Multi-AI second opinion.** `/codex` gets an independent review from OpenAI's Codex CLI — a completely different AI looking at the same diff. Three modes: code review with a pass/fail gate, adversarial challenge that actively tries to break your code, and open consultation with session continuity. When both `/review` (Claude) and `/codex` (OpenAI) have reviewed the same branch, you get a cross-model analysis showing which findings overlap and which are unique to each.

**Safety guardrails on demand.** Say "be careful" and `/careful` warns before any destructive command — rm -rf, DROP TABLE, force-push, git reset --hard. `/freeze` locks edits to one directory while debugging so Claude can't accidentally "fix" unrelated code. `/guard` activates both. `/investigate` auto-freezes to the module being investigated.

**Proactive skill suggestions.** gstack notices what stage you're in — brainstorming, reviewing, debugging, testing — and suggests the right skill. Don't like it? Say "stop suggesting" and it remembers across sessions.

## 10-15 parallel sprints

gstack is powerful with one sprint. It is transformative with ten running at once.

[Conductor](https://conductor.build) runs multiple Claude Code sessions in parallel — each in its own isolated workspace. One session running `/office-hours` on a new idea, another doing `/review` on a PR, a third implementing a feature, a fourth running `/qa` on staging, and six more on other branches. All at the same time. I regularly run 10-15 parallel sprints — that's the practical max right now.


---

Free, MIT licensed, open source. Thanks to gstack from Garry Tan. 