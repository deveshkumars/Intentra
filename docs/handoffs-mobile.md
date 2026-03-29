# Handoffs tab (mobile)

The Expo app’s **Handoffs** tab reads the same append-only Markdown that [`masterdoc3.md`](../masterdoc3.md) describes for stateful handoffs: `HANDOFFS.md`, `PROMPTS.md`, and `PLANS.md` under `.intentra/` in the repo wired by **`INTENTRA_REPO_ROOT`**.

## Data path

1. Progress server: **`GET /intentra/files`** returns each file’s `name` and `content`.
2. **HandoffScreen** keeps `HANDOFFS.md` / `PROMPTS.md` / `PLANS.md` and splits entries on `\n---\n` (same convention as `GET /intentra/latest`). All three files are optional — the server returns an empty `files` array if `.intentra/` doesn't exist yet.
3. Parsing logic lives in **[`mobile-app/shared/handoff-parse.ts`](../mobile-app/shared/handoff-parse.ts)** (pure TypeScript, covered by [`handoff-parse.test.ts`](../mobile-app/shared/handoff-parse.test.ts)). The server exposes **`GET /intentra/handoffs/summary`** using the same module.

## UX

- Three chips switch between Handoffs, Prompts, and Plans.
- Newest `---`-separated block is listed first; **LATEST** marks the top card.
- Pull to refresh re-fetches from the server.

## Verify locally

1. Run the server with the repo root so `.intentra/` resolves:

   ```bash
   cd mobile-app/server
   INTENTRA_REPO_ROOT=/path/to/Intentra bun run server.ts
   ```

2. Ensure `.intentra/HANDOFFS.md` (and optionally `PROMPTS.md`, `PLANS.md`) exist — e.g. via the `/handoff` skill.

3. Open the mobile app → **Handoffs** tab → confirm entries render.

4. Run tests:

   ```bash
   bun test mobile-app/shared/handoff-parse.test.ts
   bun run test:progress-server   # includes smoke: GET /intentra/files + parseEntries(HANDOFFS)
   ```

## Related docs

- **[Intent lifecycle](intent-lifecycle.md)** — how intents relate to prompts/plans.
- **[INTENTRA.md](../INTENTRA.md)** — full shipped-surface table.
