# Plans

How work was done — approach, steps, architecture. Newest at the bottom.

---

**2026-03-28 — Implement stateful Markdown handoffs**
**Branch:** `Ai-as-markdown`

1. Create `.intentra/` directory with README
2. Write `/handoff` skill (`handoff/SKILL.md.tmpl`) with write, resume, check modes
3. Simplify structure: first to two files (PROMPTS.md + HANDOFFS.md), then to three (+ PLANS.md)
4. Enforce exact prompts — literal words, not summaries
5. Update skill template to append new entries to all three files
6. Regenerate `handoff/SKILL.md` via `bun run gen:skill-docs`

---

**2026-03-28 — Restructure .intentra/ to three files**
**Branch:** `Ai-as-markdown`

1. Append handoff entry to existing files (capture current state)
2. Create PLANS.md — extract plan sections from HANDOFFS.md
3. Slim down HANDOFFS.md to just state, decisions, blockers, next actions
4. Update `/handoff` skill to write to three files
5. Update README to reflect three-file structure

---

**2026-03-28 — Optimize masterdoc2 via rubric feedback + register /handoff skill**
**Branch:** `optimizing-masterdoc` then `implementing-handoff-skill`

1. Read round-1 rubric feedback (12 dimensions, User Impact at 82% was lowest)
2. Apply 8 targeted fixes to masterdoc2.md: User Impact grounding, Langfuse/AgentOps/E2B competitors, shipped handoffs, ngrok risk, Agentic Management citation, bearer-token as stretch goal, innovation reframing, Gordon's compressed window
3. Commit and push to `optimizing-masterdoc`
4. Read round-2 rubric feedback (User Impact still lowest at 83%)
5. Apply 5 more fixes: agent-agnostic adoption path, culture enforcement code path, gStack dependency risk, competitor absorption defense, Git-as-analogy innovation framing
6. Commit and push again
7. Create `implementing-handoff-skill` branch off main
8. Symlink `handoff/` into `.claude/skills/handoff` so `/handoff` is recognized
9. Add `.gitignore` exception so the symlink is tracked in git
10. Commit and push
