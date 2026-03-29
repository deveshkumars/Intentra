# Intentra — shipped surface (for evaluators and PRs)

This repository is primarily **gstack** (Claude Code skills, browse, analytics). **Intentra** is the collaboration and observability layer on top: mobile feed, repo-local intent artifacts, and HTTP APIs that tie them together.

**Canonical master plan:** [`masterdoc3.md`](masterdoc3.md). Shorter summary: [`masterdoc.md`](masterdoc.md).

### Documentation index

| Doc | What it covers |
|-----|---------------|
| **[Documentation hub](docs/README.md)** | Grouped index + maintenance rule for route/OpenAPI changes |
| **[AGENTS.md](AGENTS.md)** | Full gstack slash-command inventory (repo root) |
| **[Quickstart](docs/quickstart.md)** | 5-minute local setup: install → server → ngrok → mobile app |
| **[API Reference](docs/api-reference.md)** | Every endpoint with request/response schemas and JSON examples |
| **[Architecture](docs/intentra-architecture.md)** | Route/auth matrix, event pipeline diagram, evaluator playbook |
| **[Intent Lifecycle](docs/intent-lifecycle.md)** | Create → track → resolve workflow with mermaid diagrams |
| **[Guard Engine](docs/guard-engine.md)** | Pipeline deep-dive: normalization, tokenization, rule matching |
| **[Guard Rules Reference](docs/guard-rules-reference.md)** | All 8 rules with trigger examples and safe targets |
| **[Culture Config](docs/culture-config.md)** | Customize guard verdicts via `culture.json` risk_gates |
| **[Error Handling](docs/error-handling.md)** | HTTP error codes, retry strategies, SSE reconnection patterns |
| **[Troubleshooting](docs/troubleshooting.md)** | Common issues with step-by-step fixes and diagnostic commands |
| **[Env Reference](docs/env-reference.md)** | All environment variables with defaults and validation rules |
| **[Scaling](docs/scaling.md)** | Ring buffer limits, subscriber capacity, resource usage |
| **[Security](docs/security.md)** | Auth model, CORS policy, data protection, threat model |
| **[Testing Guide](mobile-app/TESTING.md)** | Running and extending smoke tests |
| **[Handoffs (mobile)](docs/handoffs-mobile.md)** | Handoffs tab, shared `handoff-parse`, `GET /intentra/files` + `GET /intentra/handoffs/summary` |
| **[OpenAPI subset](docs/openapi/intentra-progress.json)** | Machine-readable contract for core routes (`bun run scripts/check-intentra-contracts.ts`) |
| **[ADRs](docs/adr/)** | Shared handoff module, guard segmentation limits, first-match registry |
| **[Mobile App Architecture](docs/mobile-app.md)** | Screen layout, data model, SSE hook, event-to-agent linking |
| **[Claude Code Hooks](docs/claude-code-hooks.md)** | Wire `gstack-progress` + `intentra-guard-http` into Claude Code hooks |
| **[Deploy](DEPLOY.md)** | Docker, docker-compose, Fly.io, GHCR image tags |

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
| Health | `GET /health` (no auth; includes `guard_engine_version`, `rule_count`, `metrics` counters) | same |
| Tracked agents | `GET` / `POST` / `PATCH` / `DELETE` `/agents` | same |
| Bearer auth | When `INTENTRA_TOKEN` is set, all `POST`, `PATCH`, and `DELETE` require `Authorization: Bearer <token>` | same (`checkAuth`) |
| Cross-session link | Optional `intent_id` on progress payloads (client + server types) | [`mobile-app/app/src/types.ts`](mobile-app/app/src/types.ts), `server.ts` |
| Intent-as-Code files | `POST /intentra/intent`, `PATCH /intentra/intent` (set `outcome`), `GET /intentra/intents`, `GET /intentra/intent/:id` → JSON under `.intentra/` | [`mobile-app/server/intent.ts`](mobile-app/server/intent.ts) |
| Intent SSE events | `POST` and `PATCH /intentra/intent` emit SSE events (`upstream_kind: intent_created` / `intent_resolved`) so mobile gets notified without polling | [`mobile-app/server/server.ts`](mobile-app/server/server.ts) |
| Intentra file API | `GET /intentra/files`, `GET /intentra/handoffs/summary`, `GET /intentra/latest` | [`mobile-app/server/server.ts`](mobile-app/server/server.ts) |
| Culture audit API | `GET /intentra/culture` — reads `culture.json` from `GSTACK_STATE_DIR` (same file gstack skills load) | [`mobile-app/server/culture.ts`](mobile-app/server/culture.ts) |
| Telemetry provenance | `ingest_lane` + `upstream_kind` on `ProgressEvent`; `hook_fire` kind from JSONL `event: hook_fire` | [`mobile-app/server/server.ts`](mobile-app/server/server.ts), app [`types.ts`](mobile-app/app/src/types.ts) |
| **Intentra guard runtime** | Policy engine: NFKC normalize → quote-aware tokenizer → ordered rule registry (categories, `baseRisk`, CWE hints) → culture gates → optional debug trace | [`guard-policy.ts`](mobile-app/server/guard-policy.ts), [`guard-command.ts`](mobile-app/server/guard-command.ts), [`guard.ts`](mobile-app/server/guard.ts) |
| **Guard introspection** | `GET /intentra/guard/rules` — JSON registry + engine metadata | [`mobile-app/server/server.ts`](mobile-app/server/server.ts) |
| **Culture schema** | `GET /intentra/guard/schema` + [`schemas/culture-intentra.fragment.json`](mobile-app/server/schemas/culture-intentra.fragment.json) | same |
| **Intentra guard telemetry** | Append-only `.intentra/telemetry/intentra-guard.jsonl` (gitignored at runtime) + SSE `hook_fire` with `upstream_kind: intentra_guard` | same |
| **Committed hook fixture** | Synthetic `skill-usage` sample (20+ `hook_fire` lines) for evaluators / tests | [`mobile-app/fixtures/skill-usage-evaluator-sample.jsonl`](mobile-app/fixtures/skill-usage-evaluator-sample.jsonl) |
| Mobile app | Expo UI, SSE hook, setup, dashboard, detail, **Handoffs** tab (`.intentra` Markdown via `GET /intentra/files`), Intent screen (culture + artifacts) | [`mobile-app/app/`](mobile-app/app/) |
| Markdown intent layer | Append-only `PROMPTS.md`, `PLANS.md`, `HANDOFFS.md` | [`.intentra/`](.intentra/) |
| Container | `Dockerfile` in `mobile-app/server/` | [`mobile-app/server/Dockerfile`](mobile-app/server/Dockerfile) |
| CI | Smoke tests on `mobile-app/server/**` changes | [`.github/workflows/intentra-progress-server.yml`](.github/workflows/intentra-progress-server.yml) |
| CI image | GHCR build/push `intentra-progress` on `main` (server paths) | [`.github/workflows/intentra-docker.yml`](.github/workflows/intentra-docker.yml) |
| Deploy config | `fly.toml`, root `docker-compose.yml`, `DEPLOY.md` | repo root |
| Claude hook + CLI | Example env/curl: [`mobile-app/docs/claude-guard-hook.example.json`](mobile-app/docs/claude-guard-hook.example.json); helper `bin/intentra-guard-http` | — |
| Contributors | Humans + AI co-authorship policy | [`CONTRIBUTORS.md`](CONTRIBUTORS.md) |

## gstack vs Intentra (boundary)

| Layer | Responsibility |
|-------|----------------|
| **gstack** | Skills, `~/.gstack/culture.json`, safety hooks, `skill-usage.jsonl` telemetry |
| **Intentra (this layer)** | Watches JSONL, **normalizes** lines into a single event model (`ingest_lane`, `upstream_kind`), streams SSE, `/intentra/*` HTTP, `.intentra/` JSON + Markdown, mobile monitor |

## Deployment (progress server)

See **[`DEPLOY.md`](DEPLOY.md)** for Docker, `docker compose`, Fly.io, and GHCR image tags.

- **Docker:** from repo root, `docker build -f mobile-app/server/Dockerfile -t intentra-progress .` then run with `-p 7891:7891` and volumes for `GSTACK_STATE_DIR` (e.g. host `~/.gstack` → `/data/gstack`) and `INTENTRA_REPO_ROOT` (host repo → `/repo`). See comments in the Dockerfile.
- **CI:** GitHub Actions runs `bun run test:progress-server` when server files change; Docker workflow pushes to GHCR after the same tests pass.
- **Hosted SaaS:** not in-repo; use any container host with the same env vars as local.

### Route inventory checklist (sync with `server.ts`)

When adding routes, update [`docs/intentra-architecture.md`](docs/intentra-architecture.md) and this table. Quick grep: `url.pathname` and `req.method` in [`mobile-app/server/server.ts`](mobile-app/server/server.ts).

## Environment variables (progress server)

| Variable | Role |
|----------|------|
| `GSTACK_PROGRESS_PORT` | Listen port (default `7891`) |
| `GSTACK_STATE_DIR` | gstack home for JSONL path (default `~/.gstack`) |
| `INTENTRA_TOKEN` | If set, bearer auth on mutating HTTP methods |
| `INTENTRA_REPO_ROOT` | Repo root for resolving `.intentra/` (default: server `cwd`) |

Full curl examples: [`mobile-app/README.md`](mobile-app/README.md).
