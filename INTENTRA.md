# Intentra — shipped surface (for evaluators and PRs)

This repository is primarily **gstack** (Claude Code skills, browse, analytics). **Intentra** is the collaboration and observability layer on top: mobile feed, repo-local intent artifacts, and HTTP APIs that tie them together.

**Canonical master plan:** [`masterdoc3.md`](masterdoc3.md). Shorter summary: [`masterdoc.md`](masterdoc.md).

## How to review code changes

Do **not** rely on the last one or two commits only. Compare the full branch:

```bash
git fetch origin
git diff origin/main...HEAD --stat
```

Intentra-related code is spread across `mobile-app/`, `.intentra/`, and root docs.

## Shipped in this repo (verify in tree)

| Area | What | Where |
|------|------|--------|
| Progress + SSE | Ring buffer, `GET /events/stream`, `GET /events/history`, `POST /progress` | [`mobile-app/server/server.ts`](mobile-app/server/server.ts) |
| Health | `GET /health` (no auth) | same |
| Tracked agents | `GET` / `POST` / `PATCH` / `DELETE` `/agents` | same |
| Bearer auth | When `INTENTRA_TOKEN` is set, all `POST`, `PATCH`, and `DELETE` require `Authorization: Bearer <token>` | same (`checkAuth`) |
| Cross-session link | Optional `intent_id` on progress payloads (client + server types) | [`mobile-app/app/src/types.ts`](mobile-app/app/src/types.ts), `server.ts` |
| Intent-as-Code files | `POST /intentra/intent`, `GET /intentra/intents` → JSON under `.intentra/` | [`mobile-app/server/intent.ts`](mobile-app/server/intent.ts) |
| Intentra file API | `GET /intentra/files`, `GET /intentra/latest` | [`mobile-app/server/server.ts`](mobile-app/server/server.ts) |
| Mobile app | Expo UI, SSE hook, setup, dashboard, detail, Intent screen | [`mobile-app/app/`](mobile-app/app/) |
| Markdown intent layer | Append-only `PROMPTS.md`, `PLANS.md`, `HANDOFFS.md` | [`.intentra/`](.intentra/) |

## gstack vs Intentra (boundary)

| Layer | Responsibility |
|-------|----------------|
| **gstack** | Skills, `~/.gstack/culture.json`, safety hooks, `skill-usage.jsonl` telemetry |
| **Intentra (this layer)** | Watches JSONL, streams SSE, optional `/intentra/*` HTTP, `.intentra/` JSON + Markdown, mobile monitor |

## Environment variables (progress server)

| Variable | Role |
|----------|------|
| `GSTACK_PROGRESS_PORT` | Listen port (default `7891`) |
| `GSTACK_STATE_DIR` | gstack home for JSONL path (default `~/.gstack`) |
| `INTENTRA_TOKEN` | If set, bearer auth on mutating HTTP methods |
| `INTENTRA_REPO_ROOT` | Repo root for resolving `.intentra/` (default: server `cwd`) |

Full curl examples: [`mobile-app/README.md`](mobile-app/README.md).
