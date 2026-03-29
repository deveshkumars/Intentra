# Risks and benefits

Every Intentra feature involves trade-offs. This document explains what each feature gives you, what it costs, and when the trade-off shifts.

**Related docs:** [Documentation hub](README.md) · [Use cases](use-cases.md) · [Security](security.md) · [Guard engine](guard-engine.md) · [Scaling](scaling.md) · [Architecture](intentra-architecture.md)

---

## Guard engine

The command guard intercepts destructive shell commands before they execute. It covers 8 categories: filesystem deletion, SQL data loss, git history rewriting, Kubernetes resource removal, and Docker cleanup.

### Benefits

- **Prevents costly mistakes.** A single `rm -rf ./src` or `DROP TABLE users` can destroy hours of work. The guard catches these before execution.
- **Works without configuration.** All 8 rules are active by default with `deny` verdicts. No setup required.
- **Customizable per team.** Culture overrides let you relax rules for development workflows (e.g., allow Docker cleanup locally) while keeping strict defaults for production.
- **Transparent.** Debug traces show exactly which rule matched and why. No black-box decisions.
- **Auditable.** Every deny and warn is logged to `.intentra/telemetry/intentra-guard.jsonl` with timestamps, pattern IDs, and risk scores.
- **Unicode-aware.** NFKC normalization prevents evasion via homoglyphs (e.g., fullwidth `ｒｍ` normalizes to ASCII `rm` before matching).

### Risks

- **False positives are possible.** The guard is a heuristic engine, not a shell parser. Some patterns may match benign commands. For example, `git push --force-with-lease` is denied because the flag contains `f` — even though `--force-with-lease` is safer than `--force`.
- **False negatives exist.** The guard only covers 8 specific patterns. Novel destructive commands (e.g., custom scripts, cloud CLI operations, `psql -c "DELETE FROM users"`) are not caught. The guard does not replace human judgment.
- **Enforcement is cooperative.** The guard returns a verdict; it does not kill processes. If the calling hook script ignores the verdict, the command still runs.
- **No command substitution awareness.** The tokenizer does not expand variables or command substitution. `rm -rf $(echo ./src)` would not be caught because `$(echo ./src)` is treated as a literal token.
- **Performance overhead.** Each guard call takes <1ms, but when wired as a PreToolUse hook, it adds a network round-trip (~5-10ms) per Bash invocation.

### When the trade-off shifts

The guard is most valuable during **automated agent sessions** where destructive commands could execute without human review. It is less valuable during **manual interactive development** where you see each command before running it. Consider using `warn` (not `deny`) in development environments to get visibility without blocking your workflow.

---

## Bearer token auth

When `INTENTRA_TOKEN` is set, all write endpoints require `Authorization: Bearer <token>`. Read endpoints remain public.

### Benefits

- **Prevents unauthorized writes.** Random internet traffic (or misconfigured scripts) cannot create agents, send events, or modify intents.
- **Simple to set up.** One environment variable. No user database, no OAuth, no certificates.
- **Read access stays open.** The mobile app can always reconnect SSE and read health/events without re-authenticating. This prevents reconnection failures when the app backgrounds and resumes.

### Risks

- **Single shared secret.** Everyone who needs write access shares one token. You cannot revoke one person's access without rotating the token for everyone.
- **No per-user identity.** The server cannot tell who sent an event. You must use `session_id` or agent names to distinguish developers.
- **Token rotation requires restart.** Changing the token means restarting the server. All clients get 401 until they update. There is no graceful rotation mechanism.
- **Read endpoints are always public.** Anyone with the URL can read all events, agent states, and intent artifacts. If your events contain sensitive information, this is a concern for public-facing deployments.
- **Token in memory.** The mobile app stores the token in AsyncStorage (unencrypted on-device storage). This is acceptable for developer tools but not for production secrets.

### When the trade-off shifts

For a solo developer on localhost, auth adds friction with no security benefit — skip it. For a team sharing a server over ngrok, the single token prevents accidental cross-talk. For a publicly deployed server, consider adding a reverse proxy with proper per-user auth instead of relying solely on bearer tokens.

---

## In-memory ring buffer (200 events)

All progress events are stored in a fixed-size circular buffer. When full, the oldest event is evicted.

### Benefits

- **Bounded memory.** The server never grows unbounded. 200 events at ~500 bytes each = ~100KB maximum. Predictable resource usage.
- **Fast replay.** New SSE subscribers receive the entire buffer on connect — no database query needed.
- **Simple implementation.** No external storage dependencies. No cleanup jobs. No disk I/O for events.

### Risks

- **Data loss on restart.** All events are lost when the server stops. There is no persistence layer for events.
- **Data loss under high volume.** At 2 events/second, the buffer fills in ~100 seconds. Events older than this are evicted. During busy agent sessions, meaningful events may be pushed out before you can review them.
- **No historical queries.** You cannot ask "what happened yesterday?" — only "what's in the buffer right now?"
- **No aggregation.** You cannot compute statistics across sessions (e.g., "how many guard blocks this week?"). Guard telemetry on disk partially fills this gap, but only for deny/warn events.

### When the trade-off shifts

For real-time monitoring (watching agents work now), the ring buffer is ideal. For post-hoc analysis or compliance auditing, you would need to add a persistence layer (database, log aggregator, or structured log files). The guard telemetry JSONL partially addresses this for safety events.

---

## SSE (Server-Sent Events) for real-time updates

The mobile app connects via SSE at `GET /events/stream` and receives all events in real-time.

### Benefits

- **Instant updates.** Events appear on the mobile app within milliseconds of being posted. No polling delay.
- **Efficient.** One persistent HTTP connection replaces many polling requests. Low bandwidth overhead.
- **Automatic reconnection.** SSE has built-in reconnection semantics. When the connection drops, the client reconnects and receives the current buffer replay.
- **Buffer replay on connect.** New subscribers immediately get all 200 buffered events plus all tracked agents — no separate "catch up" request needed.
- **Heartbeat keep-alive.** 15-second heartbeat comments prevent proxy/firewall timeouts.

### Risks

- **No delivery guarantee.** If the client is disconnected when an event fires, that event may be evicted from the buffer before reconnection. There is no event ID-based resume (Last-Event-ID is not implemented).
- **Memory per subscriber.** Each connected client holds a `ReadableStreamController`. Many simultaneous connections (100+) increase server memory usage linearly.
- **Proxy compatibility.** Some reverse proxies buffer SSE responses, breaking real-time delivery. ngrok handles this correctly, but custom setups may need configuration (`X-Accel-Buffering: no`).
- **Mobile battery drain.** A persistent HTTP connection on mobile prevents the radio from sleeping. The 15-second heartbeat resets the radio idle timer. For extended monitoring, this increases battery consumption.

### When the trade-off shifts

SSE is ideal for "I'm watching my agent work right now" scenarios. For "check in once an hour" usage, consider closing the SSE connection when the app backgrounds and relying on `/events/history` for catch-up. The mobile app handles reconnection automatically when foregrounded.

---

## Intent artifacts (.intentra/*.json)

Structured JSON files that capture the prompt, constraints, plan, repo context, and outcome for each agent task.

### Benefits

- **Full audit trail.** Every intent records what was asked, what was planned, and how it ended. Queryable via API.
- **Cross-session linking.** The `intent_id` field connects intents to progress events, guard telemetry, and SSE events. You can answer: "For this intent, what happened?"
- **Git-trackable.** Intent files live in `.intentra/` and can be committed alongside code. This creates a permanent record of agent actions in the repository history.
- **Machine-readable.** JSON format enables tooling: dashboards, analytics, compliance checks, and automated workflows.
- **Auto-detected context.** The server automatically reads the git branch from `.git/HEAD` and links to `culture.json` if present.

### Risks

- **Disk accumulation.** Each intent creates a new JSON file. Over months of active use, `.intentra/` can accumulate hundreds of files. There is no built-in cleanup — you must manually archive or delete old intents.
- **Prompt exposure.** Intent files contain the exact prompts given to agents. If prompts contain sensitive information (internal project names, customer data, credentials), these are written to disk in plain text.
- **No schema evolution.** The intent schema is not versioned within the files. Future schema changes may require migration of existing files.
- **Timestamp-based IDs.** Intent IDs use second-precision timestamps (`intent_2026-03-29T10:00:00Z`). Two intents created within the same second would collide (though this is extremely unlikely in practice).

### When the trade-off shifts

Intent artifacts are most valuable for **multi-step, multi-session work** where you need to trace what happened across days or weeks. For quick one-off commands, creating an intent adds overhead with little benefit — just use `POST /progress` directly.

---

## Handoff markdown files

`.intentra/HANDOFFS.md`, `PROMPTS.md`, and `PLANS.md` are append-only Markdown files for human-readable session context.

### Benefits

- **Human-readable.** Unlike JSON intents, Markdown files are easy to read and write. No special tooling needed.
- **Collaborative.** Multiple agents and humans can append entries. The append-only convention prevents conflicts.
- **Structured enough for parsing.** The `---` separator and `**date — author**` header conventions enable automated parsing in the mobile app and API.
- **Git-friendly.** Append-only means merge conflicts are rare and easy to resolve (both sides added to the bottom).
- **Three-way split.** PROMPTS (what was asked), PLANS (how it was done), HANDOFFS (current state) serve distinct purposes and can be consumed independently.

### Risks

- **Convention-dependent.** The parser expects `---` separators and bold date headers. Non-standard formatting (different separators, no dates, informal prose) degrades parsing quality — summaries may show "(no content)" and dates may be null.
- **Append-only growth.** Files grow indefinitely. After months of active development, HANDOFFS.md can become thousands of lines. There is no built-in archiving.
- **No structured queries.** You cannot ask "show me all handoffs from last week by Alice" — the API returns all entries, and filtering must happen client-side.
- **Duplicate information risk.** Handoff entries and intent artifacts can describe the same work. Without discipline, teams may record information in both places inconsistently.

### When the trade-off shifts

Handoff files excel for **session-to-session continuity** — the "what should the next agent do?" question. Intent artifacts excel for **structured querying and automation**. Use both when you need both human narrative and machine-queryable records.

---

## Culture.json risk_gates

Team-level configuration that overrides guard engine verdicts per rule.

### Benefits

- **Per-team policy.** Different teams can have different risk tolerances. A DevOps team might allow `docker system prune` while a production team denies it.
- **No code changes.** Adjusting verdicts requires editing one JSON file, not modifying guard-policy.ts.
- **Typo detection.** Unknown rule IDs produce `culture_warnings` in every guard response. Typos are caught immediately.
- **Graduated enforcement.** The three-level system (deny → warn → allow) lets you soften rules without turning them off completely. `warn` gives visibility without blocking.

### Risks

- **Global scope.** Culture overrides apply to all commands evaluated by the server. You cannot set "allow docker_destructive only in the CI environment" — the override applies everywhere.
- **Silent degradation.** Setting `rm_recursive: "allow"` removes protection against accidental file deletion. A developer might set this for convenience and forget it's in effect.
- **No inheritance.** There is no per-repo or per-branch culture override. The server reads one `culture.json` from `$GSTACK_STATE_DIR`.
- **Risk score inflation.** When a rule is overridden to `allow`, the risk score drops to 12% of base — but it's not zero. This can be confusing: "Why does my allowed command have a risk score of 11?"

### When the trade-off shifts

Culture overrides are most valuable when the **defaults are too aggressive for your workflow** (e.g., you regularly clean Docker images and don't want a deny on every `docker system prune`). They become risky when used to **permanently silence important guardrails** in production environments. Consider using `warn` instead of `allow` to maintain visibility.

---

## CORS (open by default)

The server allows requests from any origin, supporting ngrok tunnels and mobile app connections.

### Benefits

- **Works out of the box.** No origin configuration needed. The mobile app connects through any ngrok URL without CORS errors.
- **Flexible development.** Developers can point any client (browser, mobile, CLI) at the server without configuring allowed origins.

### Risks

- **Browser-based attacks.** Any web page can make requests to your server from the user's browser. Combined with open read endpoints, a malicious page could read your event stream. Bearer token auth mitigates this for write endpoints only.
- **No origin filtering.** You cannot restrict which origins can connect. If you need origin restrictions, add a reverse proxy.

### When the trade-off shifts

Open CORS is fine for localhost and ngrok-tunneled development. For publicly deployed servers, consider restricting origins via a reverse proxy (nginx, Cloudflare) while keeping the application-level CORS open for ngrok compatibility.

---

## See also

- **[Use Cases](use-cases.md)** — practical scenarios showing features in action
- **[Security](security.md)** — auth model and threat model
- **[Guard Engine](guard-engine.md)** — pipeline deep dive
- **[Culture Config](culture-config.md)** — customize guard verdicts
- **[Scaling](scaling.md)** — capacity limits and resource usage
- **[Architecture](intentra-architecture.md)** — route matrix and event pipeline
