# Quickstart: Intentra Progress Server

Get the progress server running locally in under 5 minutes, then connect the mobile app.

## Prerequisites

- [Bun](https://bun.sh/) v1.1+ (`curl -fsSL https://bun.sh/install | bash`)
- [ngrok](https://ngrok.com/) (free tier is fine) for mobile ↔ localhost tunnelling
- An iOS or Android device with [Expo Go](https://expo.dev/go)

## 1. Install and start the server

```bash
cd mobile-app/server
bun install
bun run server.ts
```

You should see:

```
gstack progress server running on http://localhost:7891
Watching: ~/.gstack/analytics/skill-usage.jsonl
```

Verify with a health check:

```bash
curl -s http://localhost:7891/health | jq .
```

Expected response:

```json
{
  "ok": true,
  "events": 0,
  "buffered": 0,
  "subscribers": 0,
  "uptime": 3,
  "guard_engine_version": 2,
  "rule_count": 8,
  "metrics": {
    "post_progress_total": 0,
    "jsonl_lines_ingested_total": 0,
    "sse_subscriber_opens_total": 0,
    "sse_subscriber_closes_total": 0
  }
}
```

## 2. Expose via ngrok

```bash
ngrok http 7891
```

Copy the `https://xxxx.ngrok-free.app` URL — you'll paste this into the mobile app.

## 3. Send your first progress event

```bash
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{"kind": "progress", "message": "Hello from the terminal!"}'
```

The event appears instantly on any connected SSE subscriber (including the mobile app).

## 4. Create your first intent

```bash
curl -s -X POST http://localhost:7891/intentra/intent \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Add dark mode to the settings page"}' | jq .
```

This creates a JSON artifact under `.intentra/` and emits an SSE `intent_created` event.

## 5. Start the mobile app

```bash
cd mobile-app/app
bun install
bunx expo start
```

Scan the QR code with Expo Go. On the Setup screen, paste the ngrok URL from step 2.

## 6. (Optional) Enable bearer auth

Set `INTENTRA_TOKEN` to require authentication on write endpoints:

```bash
INTENTRA_TOKEN=my-secret-token bun run server.ts
```

Then include the header on POST/PATCH/DELETE requests:

```bash
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-secret-token" \
  -d '{"kind": "progress", "message": "Authenticated event"}'
```

GET endpoints (`/health`, `/events/stream`, `/agents`, etc.) remain public.

## What's next

- **[API Reference](api-reference.md)** — full endpoint docs with request/response schemas
- **[Intent Lifecycle](intent-lifecycle.md)** — create → track → resolve workflow
- **[Guard Engine](guard-engine.md)** — command safety policy engine
- **[Culture Config](culture-config.md)** — customize guard rules via `culture.json`
- **[Architecture](intentra-architecture.md)** — route matrix, auth model, evaluator playbook
