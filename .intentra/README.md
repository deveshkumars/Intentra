# .intentra/

The intent layer. Along with code, you share **prompts, plans, and handoff state**.

**Product narrative:** See the canonical plan in [`../masterdoc3.md`](../masterdoc3.md). Shipped HTTP surface: [`../INTENTRA.md`](../INTENTRA.md).

## What lives here

```
.intentra/
├── README.md           ← you are here
├── PROMPTS.md          ← prompts, append-only (human- or agent-maintained)
├── PLANS.md            ← approach and architecture notes, append-only
├── HANDOFFS.md         ← state, decisions, next actions, append-only
└── intent_*.json       ← optional: structured Intent-as-Code (from API)
```

## Markdown files (convention)

**PROMPTS.md** — Raw prompts: exact words, dated and attributed when possible.

**PLANS.md** — How the work was done: steps, decisions, build order.

**HANDOFFS.md** — Current state: branch, last commit, blockers, **next actions**. Entries are often separated by `---`; `GET /intentra/latest` returns the last block.

All three are **append-only** by convention: add at the bottom; avoid rewriting older entries.

## JSON intent artifacts (generated)

Structured intents are created by the progress server:

- **HTTP:** `POST /intentra/intent` (body shape in [`mobile-app/README.md`](../mobile-app/README.md)).
- **Types:** [`mobile-app/server/intent.ts`](../mobile-app/server/intent.ts) (`IntentArtifact`, `IntentPlanStep`, etc.).
- **On disk:** Files such as `intent_<timestamp>.json` (see `createIntent` in `intent.ts`).

JSON files are **API outputs**; the Markdown files are **team narrative** artifacts. Both can live in git.

## English as code

Markdown here is meant for humans and agents: HANDOFFS “next actions” should be executable context; PLANS is the living architecture note; PROMPTS preserves the original ask.
