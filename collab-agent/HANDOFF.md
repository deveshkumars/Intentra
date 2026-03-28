# Handoff: collab-agent/skill-engineering → Devesh

**Author:** Gordon Beckler (Gbeckler8)
**Date:** 2026-03-28
**Branch:** `collab-agent/skill-engineering`
**Status:** Ready to merge to `main` — 1 commit ahead, 0 behind, no conflicts

---

## What was built

The `/collab-agent` skill — a git collaboration specialist for human teams. It has
5 core modes: merge conflict resolution, branch coordination, PR facilitation,
handoff documentation, and history untangling.

Key features:
- **Intent as Code Parser** — 5-stage NLP pipeline that turns plain English git
  requests into structured action plans (parse entities → resolve refs → apply
  culture → build plan → confirm + execute)
- **Mode Orchestration** — synchronous mode chaining with shared session state,
  culture injection per mode, and an autonomy gate for dangerous operations
  (force push, rebase of shared branches, branch deletion, merge to main)
- **Culture integration** — reads `~/.gstack/culture.json` from your `/setup-culture`
  skill and maps fields to collab-agent behavior (see mapping below)

## How it integrates with your work

Your `/setup-culture` skill writes `~/.gstack/culture.json`. The collab-agent
reads it and maps fields like this:

| Your culture field | Collab-agent uses it for |
|---|---|
| `priorities.stability` (1-10) | Merge conflict weight — higher = prefer the safer side |
| `risk.frontend/backend/infra` | Risk tolerance per area — "conservative" = more warnings |
| `review.required_approvals` | PR facilitation — approvals needed before merge |
| `review.pr_size_max_lines` | PR size check — warn if PR exceeds this |
| `coding.forbidden_patterns` | PR review scan — flag these in diffs |
| `team.ownership` | Branch coordination — "you-build-it-you-own-it" = assign by committer |
| `team.communication` | Handoff style — "async-first" = more detailed written docs |

If `CULTURE_LOADED` is `no` (user hasn't run `/setup-culture`), collab-agent
operates with sensible defaults and nudges the user to configure culture.

## Decisions made

1. **Replaced hardcoded preamble with `{{PREAMBLE}}`** — the v0.1 had 120+ lines of
   manually written bash. Now uses your preamble resolver (tier 3), which gives us
   upgrade check, session tracking, telemetry, culture loading, and all standard
   sections for free.

2. **Removed `.intentra/culture.json`** — the original per-repo culture schema was
   incompatible with your global `~/.gstack/culture.json`. Deleted the file and
   remapped all field references to your schema. No per-repo config needed.

3. **Kept custom Voice section** — the Intentra-specific voice overrides the default
   gstack voice. This is intentional for the hackathon demo personality.

4. **Hardcoded autonomy gates** — force push, rebase of shared branches, branch
   deletion, and merge to main always require human confirmation. Not configurable
   via culture.json — these are safety rails.

## Current architecture

```
collab-agent/
├── SKILL.md.tmpl    ← source of truth (edit this)
├── SKILL.md         ← auto-generated (bun run gen:skill-docs)
└── HANDOFF.md       ← this file
```

The .tmpl uses `{{PREAMBLE}}` (resolved at gen time) plus custom sections:
- Voice, What makes this skill different, Step 0 (platform detect), Step 1 (culture load)
- Intent as Code Parser (5-stage pipeline)
- Core Modes with Mode Orchestration (chaining, state, culture injection, autonomy gate)
- Entry Point (AskUserQuestion with 5 mode options)

## What's in-flight

- All 5 modes are fully implemented with detailed prompt engineering, culture
  injection, and orchestration. They need real-world testing on repos with actual
  merge conflicts, multi-branch landscapes, and messy histories to tune the output.

## What's blocked

- Nothing is blocked. Branch is clean and ready to merge.

## Next steps for the next contributor

1. **Merge this branch** — open PR, merge to main. Clean diff, no conflicts.
2. **Delete `origin/culture`** — already merged via PR #2, remote branch is stale.
3. **Test modes end-to-end** — invoke `/collab-agent` on a repo with real merge
   conflicts, multiple branches, or messy history. The mode prompts will likely
   need tuning based on real output.
4. **Add E2E evals** — create `test/skill-e2e-collab-agent.test.ts` with fixtures
   for each mode (planted merge conflict, multi-branch repo, etc.).
5. **Consider `/collab-agent` + `/review` integration** — the `benefits-from: [review, retro]`
   metadata is set but the cross-skill handoff isn't implemented yet.

## Gotchas

- **Never edit SKILL.md directly** — always edit `.tmpl` and run `bun run gen:skill-docs`.
- **`bun test` has pre-existing failures** in `browse/` (missing `diff` package,
  BrowserManager defaults). Not related to collab-agent. Skill validation passes.
- **Co-authorship convention** — all commits on this branch include both
  `Gordon Beckler <gordon_beckler@brown.edu>` and `Claude Sonnet 4.6 <noreply@anthropic.com>`
  as co-authors.
