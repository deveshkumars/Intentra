# Scaling and performance

System limits, resource usage, and what to expect at different loads.

**Related docs:** [Architecture](intentra-architecture.md) · [Troubleshooting](troubleshooting.md) · [Env Reference](env-reference.md) · [Deploy](../DEPLOY.md)

---

## System limits

### Ring buffer

The event ring buffer has a fixed capacity of **200 events**. This is a circular buffer — when full, the oldest event is evicted to make room for the newest.

| Property | Value |
|----------|-------|
| Capacity | 200 events |
| Eviction | Oldest-first (FIFO) |
| Persistence | In-memory only — lost on server restart |
| Backfill | `GET /events/history?limit=N` returns up to `min(N, 200)` events |
| SSE replay | Full buffer + all tracked agents replayed on every new SSE connection |

**Implication:** If a mobile client disconnects for long enough that >200 events are emitted, the oldest events are permanently lost from the buffer. For most single-developer usage, 200 events covers several hours of activity.

### SSE subscribers

There is no hard limit on concurrent SSE subscribers. Each subscriber is a `ReadableStreamDefaultController` held in a `Set`. Practical limits:

| Subscribers | Expected behavior |
|-------------|-------------------|
| 1–5 | Normal operation. Typical single-developer setup. |
| 5–20 | Works fine. Broadcast cost is linear (one encode per event, N enqueues). |
| 20–100 | Memory usage increases. Each subscriber holds a reference to the stream. |
| 100+ | Consider whether you actually need this many — the server is designed for small teams. |

Failed enqueues (closed connections) are automatically cleaned up on the next broadcast or heartbeat cycle.

### Heartbeat interval

A `: heartbeat` comment is sent to every SSE subscriber every **15 seconds**. This keeps connections alive through proxies and load balancers that terminate idle connections.

### Event throughput

The server is single-threaded (Bun's event loop). Expected throughput:

| Operation | Expected performance |
|-----------|---------------------|
| `POST /progress` | <1ms per request |
| SSE broadcast (1 subscriber) | <0.1ms per event |
| SSE broadcast (10 subscribers) | <1ms per event |
| JSONL watcher processing | Batch — reads all new lines on `fs.watch` trigger |
| Guard evaluation | <1ms per command (regex matching, no I/O) |
| Intent create/read | <5ms (file I/O) |

### JSONL file size

The server reads `skill-usage.jsonl` incrementally using a byte offset — it never reads the entire file. File size has minimal impact on performance.

| File size | Impact |
|-----------|--------|
| <1 MB | Negligible |
| 1–100 MB | Fine — only new bytes are read |
| 100+ MB | No server impact, but the file itself may be slow to open in editors. Consider rotating with the telemetry redact script. |

### Tracked agents

Agents are stored in a `Map` in memory. No hard limit, but each agent is broadcast to all SSE subscribers on status change.

| Agents | Expected behavior |
|--------|-------------------|
| 1–10 | Normal operation |
| 10–50 | Fine — `GET /agents` returns all, sorted by creation time |
| 50+ | Consider cleaning up completed agents via `DELETE /agents/:id` |

### Intent artifacts

Intent artifacts are individual JSON files under `.intentra/`. The directory is scanned on every `GET /intentra/intents` call.

| Intents | Expected behavior |
|---------|-------------------|
| 1–50 | Normal — directory listing is fast |
| 50–500 | Slight latency on list endpoint (file I/O per intent) |
| 500+ | Consider archiving old intents (move resolved `.json` files out of `.intentra/`) |

---

## Resource usage

### Memory

The server's memory footprint is dominated by:

1. **Ring buffer:** 200 events × ~500 bytes each ≈ 100 KB
2. **SSE subscribers:** One controller reference per subscriber ≈ minimal
3. **Tracked agents:** One object per agent ≈ minimal
4. **Bun runtime:** ~30 MB baseline

**Expected total:** 30–50 MB under normal single-developer load.

### CPU

The server is I/O-bound, not CPU-bound. CPU usage is negligible during normal operation:

- **Idle:** Near zero (only heartbeat timer runs)
- **Receiving events:** Brief spike for JSON parse + broadcast
- **Guard evaluation:** Brief spike for NFKC normalization + regex matching

### Network

| Traffic type | Size per event |
|--------------|---------------|
| `POST /progress` request | ~200–500 bytes |
| SSE `progress` event | ~200–500 bytes |
| SSE heartbeat | 14 bytes (`: heartbeat\n\n`) |
| `GET /health` response | ~300 bytes |

With a 15-second heartbeat, each SSE subscriber generates ~56 bytes/minute of keep-alive traffic.

---

## Mobile app resource usage

### Battery

The SSE connection is a long-lived HTTP connection. Battery impact:

- **Foreground:** Minimal — the connection is idle between events
- **Background:** iOS and Android suspend background connections. The app reconnects when brought back to foreground.

### Data usage

At typical development rates (1 event per minute), data usage is negligible (<1 MB/hour including heartbeats).

---

## Scaling beyond single-developer

The Intentra progress server is designed for **single-developer or small-team** use. If you need to support multiple concurrent developers:

1. **Run one server per developer** — each developer runs their own instance on a different port
2. **Shared server** — multiple developers POST to the same server, using `session_id` to distinguish their events. The mobile app can filter by session.
3. **Cloud deployment** — deploy to Fly.io or any container host (see [DEPLOY.md](../DEPLOY.md)). The server's memory footprint is small enough for a single Fly machine.

For multi-team deployment at scale, consider adding:
- Event persistence (database or append-only log instead of ring buffer)
- Authentication per user (instead of a single shared token)
- Horizontal scaling with a message bus (the current broadcast model is single-process)

These are out of scope for the current version — the server is intentionally simple.
