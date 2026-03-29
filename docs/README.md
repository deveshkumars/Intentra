# Documentation index

Maintenance rule: when you change **progress server routes** or **auth behavior** in `mobile-app/server/server.ts`, update in the same PR:

1. [`docs/intentra-architecture.md`](intentra-architecture.md) — route / auth matrix  
2. [`INTENTRA.md`](../INTENTRA.md) — “Shipped in this repo” table  
3. [`docs/openapi/intentra-progress.json`](openapi/intentra-progress.json) — OpenAPI contract  

CI runs `bun run scripts/check-intentra-contracts.ts` (also part of `bun run test:progress-server`) so OpenAPI drift fails the build.

**Narrative tour:** [Root README](../README.md) — gstack positioning, install copy-paste prompts, sprint skill table, Intentra overview.

### Reading paths (by role)

| Role | Start here | Then |
|------|------------|------|
| **Server / API implementer** | [Architecture](intentra-architecture.md) — invariants, route matrix, guard pipeline | [API reference](api-reference.md), source [`server.ts`](../mobile-app/server/server.ts) |
| **Mobile or client author** | [Mobile app architecture](mobile-app.md) | [API reference — mobile client](api-reference.md#mobile-client-behavior), [Handoffs (mobile)](handoffs-mobile.md) |
| **Security / threat review** | [Security](security.md) | [Architecture — auth + CORS](intentra-architecture.md#http-route-and-auth-matrix), [Guard engine](guard-engine.md) |
| **SRE / deploy** | [Deploy](../DEPLOY.md) | [Env reference](env-reference.md), [Scaling](scaling.md), [Troubleshooting](troubleshooting.md) |

---

## Intentra runtime

| Doc | Contents |
|-----|----------|
| [`INTENTRA.md`](../INTENTRA.md) | Shipped mobile app + HTTP APIs + file layout |
| [`quickstart.md`](quickstart.md) | Local server, ngrok, first events, mobile connect |
| [`api-reference.md`](api-reference.md) | Endpoints, schemas, errors |
| [`intent-lifecycle.md`](intent-lifecycle.md) | Intents under `.intentra/` |
| [`use-cases.md`](use-cases.md) | Real-world scenarios, walkthroughs, curl examples |
| [`risks-and-benefits.md`](risks-and-benefits.md) | Trade-off analysis for every major feature |
| [`handoffs-mobile.md`](handoffs-mobile.md) | Handoffs tab, parsing |
| [`mobile-app.md`](mobile-app.md) | Screen layout, SSE, event-to-agent linking |
| [`claude-code-hooks.md`](claude-code-hooks.md) | Claude Code hooks for progress + guard |
| [`../mobile-app/README.md`](../mobile-app/README.md) | Operator guide, telemetry paths |
| [`../mobile-app/TESTING.md`](../mobile-app/TESTING.md) | Mobile + server tests |

## Guard

| Doc | Contents |
|-----|----------|
| [`guard-engine.md`](guard-engine.md) | Policy pipeline overview |
| [`guard-rules-reference.md`](guard-rules-reference.md) | Rule IDs and semantics |
| [`culture-config.md`](culture-config.md) | `culture.json` overrides |
| [`security.md`](security.md) | Auth model, data handling |

## Ops

| Doc | Contents |
|-----|----------|
| [`../DEPLOY.md`](../DEPLOY.md) | Docker, Fly.io, GHCR |
| [`scaling.md`](scaling.md) | Capacity and deployment notes |
| [`env-reference.md`](env-reference.md) | `process.env` for server, CLI, hooks |

## Testing

| Doc / command | Contents |
|---------------|----------|
| [`../CLAUDE.md`](../CLAUDE.md) | `bun test`, `test:progress-server`, eval commands |
| `bun run test:progress-server` | Contract check + server + guard tests |
| [`openapi/intentra-progress.json`](openapi/intentra-progress.json) | OpenAPI subset (`check-intentra-contracts` in CI) |

## ADRs

Architectural decisions: [`adr/`](adr/).

## Design drafts

Proposals and explorations (not shipped specs): [`designs/README.md`](designs/README.md).

## gstack skills (this repo)

| Doc | Contents |
|-----|----------|
| [`skills.md`](skills.md) | Deep dives per skill |
| [`../AGENTS.md`](../AGENTS.md) | Full slash-command inventory |

## Contributing

| Doc | Contents |
|-----|----------|
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | Dev setup, eval tiers, **documentation PR checklist** |
