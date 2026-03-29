# ADR-002: Guard compound-command segmentation (limits)

## Status

Accepted

## Context

Agents often send compound commands (`git status && git push --force`, `ls; rm -rf ./src`). Evaluating only the concatenated string misses destructive clauses after benign ones.

## Decision

Before matching, split the raw string on `&&` and `;` **outside** single and double quotes (`splitGuardSegments` in `guard-segment.ts`). Each non-empty segment runs the existing normalize → tokenize → first-match rule pipeline. Verdict aggregation: **deny** beats **warn** beats **allow**. `risk_score` is the **maximum** across segments. The first segment (in scan order) that yields **warn** or **deny** sets `pattern` / `message` / `rule` for the response; `compound.decisive_segment_index` is 1-based.

## Non-goals (explicit)

- Full POSIX shell grammar, pipes (`|`), subshells, heredocs, or command substitution.
- Newlines as separators inside unquoted segments (future phase if needed).

## Consequences

- Documented, bounded behavior that handles common agent snippets without claiming a shell interpreter.
- Debug traces prefix per-segment steps with `s1:`, `s2:`, … plus a leading `compound` phase.
