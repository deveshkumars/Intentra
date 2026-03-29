# ADR-001: Shared handoff parse module

## Status

Accepted

## Context

The mobile Handoffs tab and the progress server both need to parse `HANDOFFS.md` (and related markdown) using the same `---`-delimited block rules. An earlier layout put the parser under `mobile-app/app/` while server smoke tests imported it, which blurred the boundary between Expo UI code and the Bun server.

## Decision

Move the pure TypeScript parser to `mobile-app/shared/handoff-parse.ts`. The Expo app, Bun server (`GET /intentra/handoffs/summary`), and unit tests import from that single module.

## Consequences

- Clear layering: no server test reaches into `app/`.
- One implementation backs HTTP summaries and the Handoffs UI; drift is caught by shared tests.
- Docker and CI must copy or mount `mobile-app/shared` next to the server bundle (see `mobile-app/server/Dockerfile`).
