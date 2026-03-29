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
