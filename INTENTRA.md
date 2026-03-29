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
| Culture audit API | `GET /intentra/culture` — reads `culture.json` from `GSTACK_STATE_DIR` (same file gstack skills load) | [`mobile-app/server/culture.ts`](mobile-app/server/culture.ts) |
| Telemetry provenance | `ingest_lane` + `upstream_kind` on `ProgressEvent`; `hook_fire` kind from JSONL `event: hook_fire` | [`mobile-app/server/server.ts`](mobile-app/server/server.ts), app [`types.ts`](mobile-app/app/src/types.ts) |
| **Intentra guard runtime** | Policy engine: NFKC normalize → quote-aware tokenizer → ordered rule registry (categories, `baseRisk`, CWE hints) → culture gates → optional debug trace | [`guard-policy.ts`](mobile-app/server/guard-policy.ts), [`guard-command.ts`](mobile-app/server/guard-command.ts), [`guard.ts`](mobile-app/server/guard.ts) |
| **Guard introspection** | `GET /intentra/guard/rules` — JSON registry + engine version | [`mobile-app/server/server.ts`](mobile-app/server/server.ts) |
| **Intentra guard telemetry** | Append-only `.intentra/telemetry/intentra-guard.jsonl` (gitignored at runtime) + SSE `hook_fire` with `upstream_kind: intentra_guard` | same |
| **Committed hook fixture** | Synthetic `skill-usage` sample (20+ `hook_fire` lines) for evaluators / tests | [`mobile-app/fixtures/skill-usage-evaluator-sample.jsonl`](mobile-app/fixtures/skill-usage-evaluator-sample.jsonl) |
| Mobile app | Expo UI, SSE hook, setup, dashboard, detail, Intent screen (culture + artifacts) | [`mobile-app/app/`](mobile-app/app/) |
| Markdown intent layer | Append-only `PROMPTS.md`, `PLANS.md`, `HANDOFFS.md` | [`.intentra/`](.intentra/) |
| Container | `Dockerfile` in `mobile-app/server/` | [`mobile-app/server/Dockerfile`](mobile-app/server/Dockerfile) |
| CI | Smoke tests on `mobile-app/server/**` changes | [`.github/workflows/intentra-progress-server.yml`](.github/workflows/intentra-progress-server.yml) |

## gstack vs Intentra (boundary)

| Layer | Responsibility |
|-------|----------------|
| **gstack** | Skills, `~/.gstack/culture.json`, safety hooks, `skill-usage.jsonl` telemetry |
| **Intentra (this layer)** | Watches JSONL, **normalizes** lines into a single event model (`ingest_lane`, `upstream_kind`), streams SSE, `/intentra/*` HTTP, `.intentra/` JSON + Markdown, mobile monitor |

## Deployment (progress server)

- **Docker:** from repo root, `docker build -f mobile-app/server/Dockerfile -t intentra-progress mobile-app/server` then run with `-p 7891:7891` and volumes for `GSTACK_STATE_DIR` (e.g. host `~/.gstack` → `/data/gstack`) and `INTENTRA_REPO_ROOT` (host repo → `/repo`). See comments in the Dockerfile.
- **CI:** GitHub Actions runs `bun test mobile-app/server/smoke.test.ts` when server files change.
- **Hosted SaaS:** not in-repo; use any container host (Fly.io, Railway, etc.) with the same env vars as local.

## Environment variables (progress server)

| Variable | Role |
|----------|------|
| `GSTACK_PROGRESS_PORT` | Listen port (default `7891`) |
| `GSTACK_STATE_DIR` | gstack home for JSONL path (default `~/.gstack`) |
| `INTENTRA_TOKEN` | If set, bearer auth on mutating HTTP methods |
| `INTENTRA_REPO_ROOT` | Repo root for resolving `.intentra/` (default: server `cwd`) |

Full curl examples: [`mobile-app/README.md`](mobile-app/README.md).
