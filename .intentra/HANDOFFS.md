# Handoffs

Session state — where things stand, decisions made, what's next. Newest at the bottom.

---

**2026-03-28 — Implement stateful Markdown handoffs**
**Author:** Gordon Beckler
**Branch:** `Ai-as-markdown`
**Status:** done

**Last commit:** `a284982` feat: simplify to two append-only files
**Uncommitted changes:** none at time of writing

**Decisions:**
- All Markdown, no JSON — if it's not readable prose, it doesn't belong here
- Exact prompts, not summaries — the Prompt file is the literal words the human typed
- Immutable entries — never edit old entries, append new ones

---

**2026-03-28 — Restructure .intentra/ to three files**
**Author:** Gordon Beckler
**Branch:** `Ai-as-markdown`
**Status:** done

**Last commit:** `a284982` feat: simplify to two append-only files
**Uncommitted changes:** restructuring in progress

**Decisions:**
- Three files instead of two — prompts, plans, and handoffs each get their own file
- HANDOFFS.md becomes state/decisions/next-actions only (no more prompt or plan duplication)
- All three are append-only

**Next actions:**
1. Update `/handoff` skill to write to three files
2. Regenerate and commit
3. Test end-to-end on a real task

---

**2026-03-29 — Improve documentation and completeness from evaluator feedback**
**Author:** Claude (via Gordon Beckler)
**Branch:** `further-cp`
**Status:** in-progress

**Last commit:** `90fcfcb` feat: single-intent lookup, SSE lifecycle events, docs + tests
**Uncommitted changes:** handoff entries in `.intentra/`, further doc improvements in progress

**Decisions:**
- Single-intent lookup returns 404 JSON (not empty 200) for unknown IDs — matches REST conventions
- SSE events use `upstream_kind` field (`intent_created`, `intent_resolved`) to distinguish lifecycle events from normal progress
- Guard engine docs written as deep-dive reference, not tutorial — matches existing doc style
- Intent lifecycle docs include mermaid diagrams for visual learners and curl examples for quick-start

**Next actions:**
1. Add CONTRIBUTORS.md with contribution guidelines and architecture overview
2. Add inline JSDoc to key server functions for API reference generation
3. Add fixtures README explaining test data structure
4. Improve INTENTRA.md with quickstart tutorial section
5. Run smoke tests, commit, and push
