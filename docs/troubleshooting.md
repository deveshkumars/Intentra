# Troubleshooting

Common issues and how to fix them. Each section is self-contained — jump to the one that matches your symptom.

**Related docs:** [Quickstart](quickstart.md) · [API Reference](api-reference.md) · [Architecture](intentra-architecture.md) · [Env Reference](env-reference.md) · [Scaling](scaling.md)

---

## Server won't start

### Port 7891 already in use (EADDRINUSE)

Another process is holding the port. Find and kill it:

```bash
lsof -ti:7891 | xargs kill -9
bun run server.ts
```

Or change the port:

```bash
GSTACK_PROGRESS_PORT=7892 bun run server.ts
```

Remember to update your ngrok tunnel to point to the new port.

### "Cannot find module" errors

Dependencies not installed. Run from the server directory:

```bash
cd mobile-app/server
bun install
```

### Server starts but no JSONL watching

If you see `Watching: ~/.gstack/analytics/skill-usage.jsonl` but the file doesn't exist yet, that's normal — the server uses a polling fallback until gstack creates the file. Events from `POST /progress` still work. The JSONL watcher activates automatically once gstack writes its first telemetry line.

---

## Mobile app won't connect

### "Project is incompatible with this version of Expo Go"

Your Expo SDK version doesn't match the Expo Go app on your phone. Check the installed SDK:

```bash
cat mobile-app/app/node_modules/expo/package.json | grep '"version"'
```

Then match it to your Expo Go version. If your Expo Go is on SDK 54, install SDK 54:

```bash
cd mobile-app/app
npx expo install expo@^54.0.0 --fix
```

If peer dependency conflicts occur, update `@types/react` in `package.json` to match the React version required, then:

```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Expo Go stuck on “Opening project…”

Expo Go is trying to load the JavaScript bundle from the **Metro** dev server (default **8081**), not from the ngrok URL you pasted on the Setup screen (that URL is only for the **progress server** on **7891**).

1. **Same Wi‑Fi:** Put the phone and dev machine on the same network; run `bunx expo start` or `npx expo start` from `mobile-app/app` and use **LAN** (`npx expo start --lan` if connections fail).
2. **Firewall:** Allow incoming **8081** (and **7891** if you use raw LAN for the server) on the dev machine.
3. **Tunnel mode:** If LAN is blocked, use Expo’s tunnel for Metro (`npx expo start --tunnel`) or run a **second ngrok** (or similar) tunnel for port **8081** and use the URL Expo prints for that tunnel.

More context: [mobile-app/README.md](../mobile-app/README.md#development-lan-vs-tunnel).

### "Network request failed" when connecting

The phone and your Mac are on different networks. Verify:

1. Both devices are on the **same Wi-Fi network**
2. No VPN is active on either device
3. Your Mac's firewall isn't blocking port 7891 or 8081

Find your Mac's LAN IP:

```bash
ifconfig en0 | grep 'inet '
```

### App loads but shows empty dashboard

The app connected to the server but no events exist yet. Send a test event:

```bash
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -d '{"kind": "progress", "message": "Hello from terminal"}'
```

If the event still doesn't appear, check the SSE connection by opening the stream directly:

```bash
curl -N http://localhost:7891/events/stream
```

You should see a heartbeat comment (`: heartbeat`) every 15 seconds. If not, the server isn't running.

### App shows "Connection lost" repeatedly

The SSE stream is disconnecting. Common causes:

- **ngrok free tier limits:** Free ngrok tunnels have connection time limits. Restart ngrok if the tunnel expired.
- **Phone went to sleep:** iOS/Android suspend background connections. The app reconnects automatically with exponential backoff when brought back to foreground.
- **Proxy/firewall:** Corporate networks may terminate long-lived HTTP connections. Try a direct LAN connection instead of ngrok.

---

## ngrok issues

### "ERR_NGROK_4018: authentication required"

ngrok requires a (free) auth token. Sign up at [ngrok.com](https://ngrok.com), then:

```bash
ngrok config add-authtoken YOUR_TOKEN
ngrok http 7891
```

### ngrok URL changed after restart

Free-tier ngrok generates a new URL every time you restart the tunnel. You need to paste the new URL into the app's Setup screen each time. For a stable URL, upgrade to a paid ngrok plan or deploy the server to a cloud host (see [DEPLOY.md](../DEPLOY.md)).

### "Not found" when accessing ngrok URL

Verify the tunnel is actually connected to your server:

```bash
curl -s https://YOUR-NGROK-URL.ngrok-free.dev/health \
  -H "ngrok-skip-browser-warning: true"
```

If this returns `{"ok": true, ...}`, the tunnel works. If it returns an ngrok error page, the tunnel isn't connected to port 7891. Restart both the server and ngrok.

---

## SSE (Server-Sent Events) issues

### Events arriving out of order

Events are ordered by their `id` field (monotonically increasing integer). The ring buffer preserves insertion order. If events appear out of order in the mobile app, it's likely a display sorting issue — the server guarantees FIFO delivery.

### Missing events after reconnect

On reconnect, the SSE stream replays the ring buffer (last 200 events). If more than 200 events were emitted while disconnected, older events are lost. Use `GET /events/history?limit=200` for the maximum backfill.

### Heartbeat but no events

If you see `: heartbeat` comments but no `event: progress` lines in the SSE stream, no events have been posted since you connected. The server is healthy — it's just waiting for activity. Post a test event to verify.

---

## Guard engine issues

### False positive on safe commands

The guard engine uses pattern matching, not full shell parsing. Known false positives:

| Command | Triggered rule | Why |
|---------|---------------|-----|
| `truncate -s 0 logfile.txt` | `truncate` (SQL) | The word "truncate" matches the SQL TRUNCATE pattern |
| `docker rm container-name` (without `-f`) | Does NOT trigger | Only `docker rm -f` matches |

**Workaround:** Override the verdict in `culture.json`:

```json
{
  "intentra": {
    "risk_gates": {
      "truncate": "allow"
    }
  }
}
```

See [Culture Config](culture-config.md) for details.

### Unknown risk_gates key warning

If the guard response includes `culture_warnings` like:

```json
"culture_warnings": ["unknown intentra.risk_gates key \"rmrf\" (not in policy registry)"]
```

You have a typo in your `culture.json`. Valid rule IDs are: `rm_recursive`, `drop_table`, `truncate`, `git_force_push`, `git_reset_hard`, `git_discard`, `kubectl_delete`, `docker_destructive`. See [Guard Rules Reference](guard-rules-reference.md).

### Debug trace for a guard evaluation

Add `"debug": true` to the request body or set the header `X-Intentra-Guard-Debug: 1`:

```bash
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "rm -rf /tmp/build", "debug": true}' | jq .trace
```

The trace shows each pipeline phase: normalize → tokenize → per-rule match/skip → final verdict.

---

## Authentication issues

### 401 Unauthorized on POST/PATCH/DELETE

When `INTENTRA_TOKEN` is set, all write endpoints require the `Authorization` header:

```bash
curl -s -X POST http://localhost:7891/progress \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"kind": "progress", "message": "authenticated"}'
```

GET endpoints (`/health`, `/events/stream`, `/agents`, `/intentra/*` reads) never require auth.

### Token not taking effect

The token is read from the `INTENTRA_TOKEN` environment variable at server startup. If you change it, restart the server:

```bash
INTENTRA_TOKEN=new-token bun run server.ts
```

To run without auth (local dev), simply don't set the variable.

---

## Intent artifacts

### Intent not found (404)

Intent IDs are timestamp-based (e.g., `intent_2026-03-28T10:15:00Z`). The ID must exactly match the filename under `.intentra/`. Check existing intents:

```bash
curl -s http://localhost:7891/intentra/intents | jq '.intents[].intent_id'
```

### .intentra/ directory not created

The directory is created on first `POST /intentra/intent`. If `INTENTRA_REPO_ROOT` is set, it creates `.intentra/` under that path. Otherwise, it uses the server's working directory. Verify:

```bash
echo $INTENTRA_REPO_ROOT
ls -la .intentra/
```

---

## Smoke test failures

### Tests fail with ECONNREFUSED

The test harness spawns its own server subprocess on a random port. If tests fail with connection errors, check for stale processes:

```bash
lsof -ti:7891 | xargs kill -9
bun test
```

### Tests pass locally but fail in CI

Ensure `bun install` ran in `mobile-app/server/` before running tests. The CI workflow handles this automatically — see `.github/workflows/intentra-progress-server.yml`.

---

## Quick diagnostic commands

```bash
# Server health
curl -s http://localhost:7891/health | jq .

# SSE subscriber count
curl -s http://localhost:7891/health | jq .subscribers

# Event count since startup
curl -s http://localhost:7891/health | jq .events

# List all agents
curl -s http://localhost:7891/agents | jq .

# List all intents
curl -s http://localhost:7891/intentra/intents | jq .

# Guard engine version + rule count
curl -s http://localhost:7891/intentra/guard/rules | jq '.engine'

# Test the guard with a dangerous command
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "rm -rf /", "debug": true}' | jq .

# Watch live SSE stream
curl -N http://localhost:7891/events/stream
```
