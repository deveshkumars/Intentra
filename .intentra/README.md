# .intentra/

The intent layer. Along with code, you share the **prompts + plans + handoff docs**.

## Files

```
.intentra/
├── README.md      ← you are here
├── PROMPTS.md     ← every prompt, verbatim, append-only
└── HANDOFFS.md    ← session snapshots (prompt + plan + state), append-only
```

**PROMPTS.md** — the raw prompts that drove this project. Exact words, copy-pasted. Each entry is dated and attributed. Newest at the bottom.

**HANDOFFS.md** — full session snapshots. Each entry captures the prompt, the plan, the current state, decisions made, and next actions. A new agent or teammate reads the latest entry and knows exactly what happened and what to do next.

Both files are **append-only**. New sessions add entries at the bottom. Never edit old entries — they document what was true at a point in time.

## English as code

The handoff entry is a **program written in English**. The "Next actions" section is the executable. Any agent reading it can resume work without a conversation replay. Every action item is specific enough to run.

## Why Markdown

- It diffs. You see what changed between sessions.
- It's portable. Any LLM, any IDE, any CI runner can read it.
- It's human-first. No schemas to learn. Just read it.
- It commits alongside code. The "why" lives next to the "what."
