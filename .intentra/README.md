# .intentra/

The intent layer. Alongside code you share the **prompts + plans + handoff docs**.

Every file in this directory is Markdown. Agents read it. Humans read it. Git diffs it.

## Structure

```
.intentra/
├── README.md       ← you are here
└── handoffs/       ← one Markdown file per work session
    └── YYYY-MM-DD-description.md
```

## What goes in a handoff file

Each handoff is a single Markdown document with three parts:

1. **Prompt** — the raw ask. What was the human intent, verbatim.
2. **Plan** — how the work was (or will be) done. Steps, architecture, trade-offs.
3. **Handoff state** — where things stand right now. Branch, commits, what's done, what's next.

That's it. One file captures the full context of a work session. A new agent or teammate reads it and knows exactly what happened, why, and what to do next.

## English as code

The handoff file is a **program written in English**. The "Next Actions" section is the executable. Any agent reading it can resume work without a conversation replay or a second opinion. Every action item is specific enough to run.

## Why Markdown

- It diffs. You see what changed in the plan between sessions.
- It's portable. Any LLM, any IDE, any CI runner can read it.
- It's human-first. No schemas to learn. No SDKs to install. Just read it.
- It commits alongside code. The "why" lives next to the "what."

## Usage

```bash
# Write a handoff for the current session
/handoff

# Resume from the latest handoff
/handoff resume

# List all handoffs
/handoff list
```
