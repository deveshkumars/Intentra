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
