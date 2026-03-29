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

**2026-03-29 — Improve documentation and completeness scores**
**Branch:** `further-cp`

1. Audit existing docs and endpoints against evaluator feedback (Documentation 68%, Completeness 64%)
2. Add `getIntent()` to `intent.ts` and `GET /intentra/intent/:id` route to `server.ts`
3. Add SSE emission on intent lifecycle: `intent_created` on POST, `intent_resolved` on PATCH
4. Write `docs/intent-lifecycle.md` — full create→track→resolve lifecycle with mermaid diagrams
5. Write `docs/guard-engine.md` — pipeline deep-dive with rule registry, culture integration
6. Expand `smoke.test.ts` with 5 new tests (single intent GET, 404, intent_id linking, guard debug trace, SSE emission)
7. Update route tables across INTENTRA.md, intentra-architecture.md, mobile-app/README.md
8. Write /handoff entries to `.intentra/` files documenting all changes
9. Further documentation improvements: CONTRIBUTORS.md, API reference, fixtures README, inline JSDoc
