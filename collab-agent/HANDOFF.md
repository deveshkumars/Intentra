# Handoff: collab-agent/skill-engineering → Devesh

**Author:** Gordon Beckler (Gbeckler8)
**Date:** 2026-03-28
**Branch:** `collab-agent/skill-engineering`
**Status:** 4 commits ahead of `main`, 0 behind, no conflicts

---

## What was built

The `/collab-agent` skill (v0.2.0) — a git collaboration specialist with 5 fully
implemented modes:

1. **Merge Conflict Resolution** (SKILL.md.tmpl lines 393-458) — walks through
   conflicts with culture-backed reasoning, weighs `priorities.stability` for safe-side
   preference
2. **Branch Coordination** (lines 460-535) — maps branch landscape, ownership,
   merge order, staleness detection
3. **PR Facilitation** (lines 537-620) — reviewer suggestion via git blame, review
   checklist generation, `coding.forbidden_patterns` scanning
4. **Handoff Documentation** (lines 622-727) — structured handoff with ground-truth
   verification rule (every claim must be grep'd/read before writing)
5. **History Untangling** (lines 729-813) — diagnoses messy histories, proposes
   rebase/squash cleanup plans

Cross-cutting features:
- **Intent as Code Parser** (lines 162-325) — 5-stage NLP pipeline: parse entities,
  resolve refs, apply culture, build plan, confirm + execute
- **Mode Orchestration** (lines 337-391) — synchronous chaining, shared session state,
  culture injection per mode, autonomy gate for dangerous ops
- **Ground-truth principle** (lines 329-335) — all factual claims about the codebase
  must be verified via grep/read/git-log before stating them

## How it integrates with your `/setup-culture` work

The preamble (via `{{PREAMBLE}}` on line 28) checks `CULTURE_LOADED`. If `yes`,
Step 1 (lines 116-160) reads `~/.gstack/culture.json` and maps fields:

| Your culture field | Collab-agent uses it for |
|---|---|
| `priorities.stability` (1-10) | Merge conflict weight — higher = prefer the safer side |
| `risk.frontend/backend/infra` | Risk tolerance per area — "conservative" = more warnings |
| `review.required_approvals` | PR facilitation — approvals needed before merge |
| `review.pr_size_max_lines` | PR size check — warn if PR exceeds this |
| `coding.forbidden_patterns` | PR review scan — flag these in diffs |
| `team.ownership` | Branch coordination — "you-build-it-you-own-it" = assign by committer |
| `team.communication` | Handoff style — "async-first" = more detailed written docs |

If `CULTURE_LOADED` is `no`, defaults are used and the user is nudged to run
`/setup-culture`.

## Decisions made

1. **Replaced hardcoded preamble with `{{PREAMBLE}}`** — v0.1 had 120+ lines of
   manually written bash (verified: `{{PREAMBLE}}` is on line 28 of .tmpl, preamble-tier
   is 3 in frontmatter). This gives us upgrade check, session tracking, telemetry, and
   culture loading from the resolver.

2. **Removed `.intentra/culture.json` from the repo** — the per-repo schema was
   incompatible with your global `~/.gstack/culture.json`. Deleted via `git rm -r .intentra/`.
   No `.intentra/culture.json` exists in the repo (verified: `git ls-files .intentra`
   returns nothing).

3. **Kept custom Voice section** (lines 39-68) — Intentra-specific voice overrides the
   default gstack voice. Intentional for the hackathon demo personality.

4. **Hardcoded autonomy gates** — force push, rebase of shared branches, branch deletion,
   and merge to main always require human confirmation (verified: autonomy gate section
   exists in Mode Orchestration, lines 383-391 of .tmpl).

## Current architecture

```
collab-agent/
├── SKILL.md.tmpl    ← source of truth, 815+ lines
├── SKILL.md         ← auto-generated (1186 lines, ~14.7k tokens)
└── HANDOFF.md       ← this file
```

The .tmpl sections (verified via `grep -n "^## \|^### "` on .tmpl):
- `## Voice` (line 39) — Intentra personality
- `## Step 0` (line 81) — platform + base branch detection
- `## Step 1` (line 116) — culture loading from `~/.gstack/culture.json`
- `## Intent as Code Parser` (line 162) — NLP pipeline
- `## Core Modes` (line 327) — ground-truth principle + orchestration + all 5 modes
- `## Entry Point` (line 815) — AskUserQuestion with 5 mode options

## Commits on this branch

| Hash | Description |
|------|-------------|
| `6392e55` | Align collab-agent with gstack preamble system and ~/.gstack/culture.json |
| `d627b58` | Add handoff doc for collab-agent skill engineering |
| `b4b2445` | Fix handoff doc: modes are fully implemented, not TODO |
| `7c1e434` | Add ground-truth principle: verify all claims before stating them |

## What's in-flight

- All 5 modes are fully implemented in the .tmpl with detailed prompt engineering,
  culture injection, and orchestration. They need real-world testing on repos with
  actual merge conflicts, multi-branch landscapes, and messy histories to tune output.

## What's blocked

- Nothing. Branch is clean, pushed, and ready to merge.

## Known minor issues

- **Handoff output path still references `.intentra/`** — lines 634, 686, 687 of .tmpl
  use `.intentra/handoff-{date}.md` as the default output directory. This is fine as a
  per-repo output path (it's where handoff files get written, not a config file), but
  could be changed to something else if `.intentra/` isn't the convention you want.
- **`bun test` has pre-existing failures** in `browse/` — missing `diff` package and
  BrowserManager defaults. Unrelated to collab-agent. Skill validation and gen:skill-docs
  both pass.
- **No E2E evals exist yet** for collab-agent — `test/skill-e2e-collab-agent.test.ts`
  does not exist (verified: no such file in `test/`).

## Next steps for the next contributor

1. **Merge this branch** — open PR to `main`. 4 commits ahead, 0 behind, no conflicts.
2. **Delete `origin/culture`** — already merged via PR #2, remote branch is stale
   (verified: `origin/culture` still exists at `eb67f8e`).
3. **Test modes end-to-end** — invoke `/collab-agent` on a repo with real merge conflicts
   or multiple active branches. Tune the mode prompts based on actual output quality.
4. **Add E2E evals** — create `test/skill-e2e-collab-agent.test.ts` with fixtures for
   each mode (planted merge conflict, multi-branch repo, etc.).
5. **Decide on handoff output path** — keep `.intentra/` or change to something else
   (lines 634, 686, 687 of .tmpl).
6. **Cross-skill integration** — `benefits-from: [review, retro]` is declared in
   frontmatter but no cross-skill handoff logic is implemented yet.

## Gotchas

- **Never edit SKILL.md directly** — always edit `.tmpl` then run `bun run gen:skill-docs`.
- **Co-authorship convention** — all commits on this branch include both
  `Gordon Beckler <gordon_beckler@brown.edu>` and `Claude <noreply@anthropic.com>`.
- **`gh` CLI** — was not installed/authenticated on Gordon's machine during this session.
  PR was not created via CLI. You'll need to create it manually or auth `gh` first.
