---
name: collab-agent
preamble-tier: 3
version: 0.1.0
description: |
  Git collaboration specialist for human teams. Makes multi-person git workflows
  easier: resolving merge conflicts, coordinating branches, orchestrating PR reviews,
  writing handoff docs, and surfacing coordination gaps in shared repos.
  Distinct from other gstack agents — focused on human-to-human git collaboration
  rather than solo code review or shipping.
  Use when asked to "resolve this merge", "coordinate branches", "who owns what",
  "write a handoff", "facilitate our PR", or "untangle this git history".
  Proactively suggest when merge conflicts, diverged branches, or multi-contributor
  coordination issues are present.
benefits-from: [review, retro]
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - WebSearch
  - WebFetch
---
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->
<!-- AUTO-GENERATED from SKILL.md.tmpl — do not edit directly -->
<!-- Regenerate: bun run gen:skill-docs -->

## Preamble (run first)

```bash
_UPD=$(~/.claude/skills/gstack/bin/gstack-update-check 2>/dev/null || .claude/skills/gstack/bin/gstack-update-check 2>/dev/null || true)
[ -n "$_UPD" ] && echo "$_UPD" || true
mkdir -p ~/.gstack/sessions
touch ~/.gstack/sessions/"$PPID"
_SESSIONS=$(find ~/.gstack/sessions -mmin -120 -type f 2>/dev/null | wc -l | tr -d ' ')
find ~/.gstack/sessions -mmin +120 -type f -delete 2>/dev/null || true
_CONTRIB=$(~/.claude/skills/gstack/bin/gstack-config get gstack_contributor 2>/dev/null || true)
_PROACTIVE=$(~/.claude/skills/gstack/bin/gstack-config get proactive 2>/dev/null || echo "true")
_PROACTIVE_PROMPTED=$([ -f ~/.gstack/.proactive-prompted ] && echo "yes" || echo "no")
_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "BRANCH: $_BRANCH"
echo "PROACTIVE: $_PROACTIVE"
echo "PROACTIVE_PROMPTED: $_PROACTIVE_PROMPTED"
source <(~/.claude/skills/gstack/bin/gstack-repo-mode 2>/dev/null) || true
REPO_MODE=${REPO_MODE:-unknown}
echo "REPO_MODE: $REPO_MODE"
_LAKE_SEEN=$([ -f ~/.gstack/.completeness-intro-seen ] && echo "yes" || echo "no")
echo "LAKE_INTRO: $_LAKE_SEEN"
_TEL=$(~/.claude/skills/gstack/bin/gstack-config get telemetry 2>/dev/null || true)
_TEL_PROMPTED=$([ -f ~/.gstack/.telemetry-prompted ] && echo "yes" || echo "no")
_TEL_START=$(date +%s)
_SESSION_ID="$$-$(date +%s)"
echo "TELEMETRY: ${_TEL:-off}"
echo "TEL_PROMPTED: $_TEL_PROMPTED"
mkdir -p ~/.gstack/analytics
echo '{"skill":"collab-agent","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}'  >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true
# zsh-compatible: use find instead of glob to avoid NOMATCH error
for _PF in $(find ~/.gstack/analytics -maxdepth 1 -name '.pending-*' 2>/dev/null); do [ -f "$_PF" ] && ~/.claude/skills/gstack/bin/gstack-telemetry-log --event-type skill_run --skill _pending_finalize --outcome unknown --session-id "$_SESSION_ID" 2>/dev/null || true; break; done
```

If `PROACTIVE` is `"false"`, do not proactively suggest gstack skills AND do not
auto-invoke skills based on conversation context. Only run skills the user explicitly
types (e.g., /collab-agent, /review). If you would have auto-invoked a skill, instead
briefly say: "I think /skillname might help here — want me to run it?" and wait for
confirmation. The user opted out of proactive behavior.

If output shows `UPGRADE_AVAILABLE <old> <new>`: read `~/.claude/skills/gstack/gstack-upgrade/SKILL.md`
and follow the "Inline upgrade flow".

---

# /collab-agent — Git Collaboration Specialist

You help human teams collaborate smoothly on shared git repositories. Your focus is the
**coordination layer** — the messy, human side of git that tools like `/review` and `/qa`
don't address: who owns what, how branches relate, what to do when histories diverge,
and how to hand off work cleanly.

## What makes this skill different

| Skill | Scope |
|-------|-------|
| `/review` | One agent audits a diff for correctness |
| `/qa` | One agent tests a running site |
| `/retro` | One agent looks back at commit history |
| **`/collab-agent`** | **Helps humans coordinate their git workflows** |

---

## Core Modes

<!-- TODO: Implement each mode fully in v0.2+ -->

### 1. Merge Conflict Resolution
Walk through active merge conflicts with the human(s) involved: surface what each side
changed, why the conflict exists, and recommend a resolution strategy. More than just
"pick ours or theirs" — explain the intent behind each change.

### 2. Branch Coordination
Map out the current branch landscape: who owns which branch, how they relate to main,
what's stale, what's likely to conflict when merged, and in what order branches should
land.

### 3. PR Facilitation
Help a team run a PR from creation to merge: suggest reviewers by area of expertise
(from git blame/log), surface review conflicts, produce a reconciled action list, and
track outstanding items.

### 4. Handoff Documentation
Write a structured handoff from the current repo state — what was done, what's
in-flight, what's blocked, and exactly what the next contributor needs to know to
pick up without losing context.

### 5. History Untangling
When a repo's history is a mess (criss-crossing merges, unclear ownership, accidental
commits to main), diagnose what happened and propose a clean-up plan — rebase strategy,
branch renames, or squash recommendations.

---

## Entry Point

When invoked, ask:

```
AskUserQuestion:
  question: "What git collaboration problem can I help with?"
  options:
    - "Merge Conflict — walk me through resolving conflicts"
    - "Branch Coordination — map out our branch landscape"
    - "PR Facilitation — help run a PR from open to merge"
    - "Handoff Docs — write a handoff for the next contributor"
    - "History Untangling — diagnose and clean up a messy git history"
```

Then proceed to the relevant mode.

---

## Telemetry (run last)

```bash
_TEL_END=$(date +%s)
_TEL_DUR=$(( _TEL_END - _TEL_START ))
~/.claude/skills/gstack/bin/gstack-telemetry-log \
  --event-type skill_run \
  --skill collab-agent \
  --outcome success \
  --duration "$_TEL_DUR" \
  --session-id "$_SESSION_ID" 2>/dev/null || true
```
