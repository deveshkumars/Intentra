# Handoffs

Session snapshots — prompt, plan, and state. Newest at the bottom. Each `---` separator marks a new handoff entry.

---

## Implement stateful Markdown handoffs for Intentra

**Author:** Gordon Beckler
**Date:** 2026-03-28
**Branch:** `Ai-as-markdown`
**Status:** done

### Prompt

> Make a new branch called /Ai-as-markdown. using the masterdoc.md file which outlines this entire project, implement the following element of the project: Stateful Markdown handoffs (next 24h): a standardized resume file that makes handoffs between humans and agents lossless. The general idea is english as code.

> we want to write all of this "metadata" type stuff to a markdown file of some sort. The following sentence is what we are trying to build: The idea being that along with code, you share the prompts + plans + handoff docs.

> sounds good. Now, organize the handoffs folder so it has one file that the handoffs keep adding onto, rather than this weird maze of files and folders. additionally, add another file, prompts.md, that contains JUST THE PROMPTS that the users put in and similarly appends onto itself

### Plan

1. Create `.intentra/` directory with README
2. Write `/handoff` skill with write, resume, list, check modes
3. Simplify to two append-only files: `HANDOFFS.md` and `PROMPTS.md`
4. Update skill template to append new entries instead of creating new files

### State

**Last commit:** `3521d0f` feat: exact prompts in handoff docs, not summaries
**Uncommitted changes:** restructured `.intentra/` to two flat files
**Tests:** not run (new skill, no pre-existing tests)

### Decisions

- **Two files, not a folder of files:** `HANDOFFS.md` and `PROMPTS.md` are append-only. Each new session adds an entry at the bottom. Simple, scrollable, diffable.
- **Exact prompts, not summaries:** The Prompt section is the literal words the human typed.
- **All Markdown, no JSON:** If it's not readable prose, it doesn't belong here.

### Next actions

> Status is `done`. Follow-ups for the next session.

1. Test `/handoff` end-to-end on a real task
2. Wire handoff context into the progress server for mobile dashboard
3. Update masterdoc.md to mark "Stateful Markdown handoffs" as shipped
