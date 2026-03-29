# gstack — AI Engineering Workflow

gstack is a collection of SKILL.md files that give AI agents structured roles for
software development. Each skill is a specialist: CEO reviewer, eng manager,
designer, QA lead, release engineer, debugger, and more.

## Available skills

Skills live in `.agents/skills/` (or `.claude/skills/gstack` after install). Invoke them by slash name (e.g. `/office-hours`). **Slash names match the `name:` field** in each directory’s `SKILL.md` (e.g. **`/investigate`** for debugging — there is no separate `/debug` skill in this repo).

The table below is the **full inventory** of top-level skills shipped in this repository (alphabetical).

| Skill | What it does |
|-------|-------------|
| `/autoplan` | Auto-run CEO → design → eng plan reviews with encoded decision rules. |
| `/benchmark` | Performance baselines: load times, Web Vitals, compare before/after. |
| `/browse` | Headless Chromium: navigate, snapshot, assert — fast CLI (`$B`). |
| `/canary` | Post-deploy monitoring: console errors, screenshots, anomalies. |
| `/careful` | Warn before destructive shell/DB/git operations. |
| `/codex` | Second opinion via OpenAI Codex CLI (review / challenge / consult). |
| `/collab-agent` | Git collaboration: merges, handoffs, multi-contributor coordination. |
| `/connect-chrome` | Launch real Chrome with gstack extension / side panel. |
| `/cso` | Security audit: supply chain, STRIDE, OWASP-oriented review. |
| `/design-consultation` | Design system from scratch → `DESIGN.md` and previews. |
| `/design-review` | Live site visual audit + iterative fixes with screenshots. |
| `/document-release` | Post-ship doc sync: README, CLAUDE.md, CHANGELOG voice. |
| `/freeze` | Restrict edits to one directory (hard block). |
| `/gstack-upgrade` | Update vendored or global gstack install. |
| `/guard` | `/careful` + `/freeze` together. |
| `/handoff` | Stateful Markdown handoffs: PROMPTS.md, PLANS.md, HANDOFFS.md. |
| `/investigate` | Systematic root-cause debugging; no fixes without investigation. |
| `/land-and-deploy` | Merge PR, wait for deploy, verify production health. |
| `/office-hours` | YC-style product framing before you build. |
| `/plan-ceo-review` | CEO-level scope and ambition review on a plan. |
| `/plan-design-review` | Plan-mode design dimensions 0–10 with fixes. |
| `/plan-eng-review` | Architecture, edge cases, test plan on a plan. |
| `/qa` | Browser QA: find bugs, fix, re-verify. |
| `/qa-only` | QA report only — no code changes. |
| `/retro` | Weekly engineering retro with trends. |
| `/review` | Pre-merge PR review for structural / safety issues. |
| `/setup-browser-cookies` | Import real-browser cookies into headless sessions. |
| `/setup-culture` | Org culture for agents → `~/.gstack/culture.json`. |
| `/setup-deploy` | One-time deploy config for `/land-and-deploy`. |
| `/ship` | Tests, diff review, VERSION/CHANGELOG, push, open PR. |
| `/unfreeze` | Clear `/freeze` directory boundary. |

## Build commands

```bash
bun install              # install dependencies
bun test                 # run tests (free, <5s)
bun run build            # generate docs + compile binaries
bun run gen:skill-docs   # regenerate SKILL.md files from templates
bun run skill:check      # health dashboard for all skills
```

## Key conventions

- SKILL.md files are **generated** from `.tmpl` templates. Edit the template, not the output.
- Run `bun run gen:skill-docs --host codex` to regenerate Codex-specific output.
- The browse binary provides headless browser access. Use `$B <command>` in skills.
- Safety skills (careful, freeze, guard) use inline advisory prose — always confirm before destructive operations.
