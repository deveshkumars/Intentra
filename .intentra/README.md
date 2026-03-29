# .intentra/

The intent layer. Along with code, you share the **prompts + plans + handoff docs**.

## Files

```
.intentra/
├── README.md      ← you are here
├── PROMPTS.md     ← every prompt, verbatim, append-only
├── PLANS.md       ← how the work was done, append-only
└── HANDOFFS.md    ← state, decisions, next actions, append-only
```

**PROMPTS.md** — the raw prompts. Exact words, copy-pasted. Each entry is dated and attributed.

**PLANS.md** — the approach. Numbered steps, architecture decisions, how things were built.

**HANDOFFS.md** — the current state. Branch, last commit, decisions made, blockers, next actions.

All three are **append-only**. New sessions add entries at the bottom. Never edit old entries.

## English as code

These files are programs written in English. The "Next actions" in HANDOFFS.md is executable. The plan in PLANS.md is the architecture doc. The prompt in PROMPTS.md is the raw intent. Any agent or human reads them and knows what to do.
