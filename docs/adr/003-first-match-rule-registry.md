# ADR-003: Ordered first-match rule registry

## Status

Accepted

## Context

The guard needs predictable behavior when multiple patterns could apply (e.g. recursive `rm` vs generic shell noise). A general-purpose rule graph or RETE engine would be heavier than this product scope.

## Decision

Keep a **linear ordered registry** (`GUARD_RULES` in `guard-policy.ts`). `findFirstMatchingRule` returns the **first** rule whose `match(ctx)` is true. Order is curated to match operational priority (destructive filesystem and SQL before narrower patterns).

## Consequences

- Simple to reason about and to extend: new rules declare their position in the list.
- Culture overrides (`intentra.risk_gates`) apply to whichever rule wins the first-match race for that segment.
- If two rules overlap, **registry order is the tie-breaker** — document when adding rules.
