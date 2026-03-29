# Claude Code hooks integration

This document explains how to wire Claude Code hooks to the Intentra progress server. Hooks let you:

1. **Stream agent activity** to the mobile monitor automatically (no manual curl calls)
2. **Run the guard engine** on every Bash command before Claude executes it

**Related:** [API Reference](api-reference.md) · [Guard Engine](guard-engine.md) · [Architecture](intentra-architecture.md)

---

## How it works

Claude Code runs `PreToolUse` and `PostToolUse` shell scripts before and after every tool call. You write those scripts to call the progress server.

The repo ships two helpers:
- `bin/gstack-progress` — POST a progress event to `POST /progress`
- `bin/intentra-guard-http` — POST a command to `POST /intentra/guard` and exit non-zero on deny

---

## Wiring progress events

Add a `PostToolUse` hook to `~/.claude/settings.json` (global) or `.claude/settings.json` (project-scoped):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/skills/gstack/bin/gstack-progress --message \"$CLAUDE_TOOL_NAME completed\" --skill \"$GSTACK_SKILL\""
          }
        ]
      }
    ]
  }
}
```

This fires after every Bash tool call. The `gstack-progress` helper reads `GSTACK_PROGRESS_PORT` (default 7891) and silently no-ops if the server isn't running.

**Environment variables available in hooks:**

| Variable | Set by | Description |
|----------|--------|-------------|
| `GSTACK_SKILL` | gstack skill preambles | Current skill name (e.g. `ship`, `qa`) |
| `CLAUDE_SESSION_ID` | Claude Code | Session identifier — used as `session_id` in progress events |
| `GSTACK_PROGRESS_PORT` | You (optional) | Override server port (default 7891) |
| `GSTACK_PROGRESS_URL` | You (optional) | Full base URL override |
| `INTENTRA_TOKEN` | You (optional) | Bearer token for authenticated server |
| `INTENTRA_INTENT_ID` | You (optional) | Link progress events to an intent artifact |

### Full `gstack-progress` flags

```bash
gstack-progress \
  --message "Running tests"   # required
  --step    "lint"            # optional — substep label
  --pct     42                # optional — 0-100 progress percent
  --skill   "ship"            # optional — overrides GSTACK_SKILL
  --intent-id "intent_..."    # optional — overrides INTENTRA_INTENT_ID
```

The helper is non-blocking and silent-fails — it never causes a hook to fail. If the server is down, the call returns immediately.

---

## Wiring the guard engine

The guard engine evaluates Bash commands before execution and can block or warn on destructive patterns.

Add a `PreToolUse` hook:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/skills/gstack/bin/intentra-guard-http --command \"$CLAUDE_TOOL_INPUT_COMMAND\""
          }
        ]
      }
    ]
  }
}
```

When the guard returns `deny`, the helper exits non-zero — Claude Code blocks the tool call and shows the guard's message. When it returns `warn` or `allow`, the helper exits 0 and Claude proceeds.

**The guard engine:**
1. NFKC-normalizes the command
2. Splits on `&&` and `;` outside quotes (compound-command segmentation, [ADR-002](adr/002-guard-segmentation-limits.md))
3. Runs each segment through the 8-rule ordered registry ([ADR-003](adr/003-first-match-rule-registry.md))
4. Applies `culture.json` risk_gate overrides
5. Returns `deny` / `warn` / `allow` with a risk score

**Deny example:**

```
$ bin/intentra-guard-http --command "git push --force origin main"
{
  "verdict": "deny",
  "pattern": "git_force_push",
  "message": "[intentra guard] DENY: Git force-push (history rewrite on remote).",
  "risk_score": 82
}
```

**Using with auth:** If your server requires `INTENTRA_TOKEN`:

```bash
export INTENTRA_TOKEN=my-secret-token
bin/intentra-guard-http --command "rm -rf ./dist"
```

The helper reads `INTENTRA_TOKEN` automatically.

---

## Combining both hooks

A common pattern: guard on PreToolUse, report on PostToolUse.

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/skills/gstack/bin/intentra-guard-http --command \"$CLAUDE_TOOL_INPUT_COMMAND\""
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "~/.claude/skills/gstack/bin/gstack-progress --message \"$CLAUDE_TOOL_NAME\" --skill \"$GSTACK_SKILL\""
          }
        ]
      }
    ]
  }
}
```

This gives you: every Bash command guarded before execution, and every completed tool call visible in the mobile feed.

---

## Hook telemetry in the progress server

When `bin/intentra-guard-http` fires and the guard returns `deny` or `warn`, the server appends a record to `.intentra/telemetry/intentra-guard.jsonl` (gitignored at runtime). It also emits an SSE event with `kind: "hook_fire"` and `upstream_kind: "intentra_guard"`.

The mobile Dashboard shows `hook_fire` events in the live feed, so you can see guard decisions alongside skill activity in real time.

---

## Example: per-agent tracking with hooks

If you want each Claude Code session to appear as a named agent in the mobile Dashboard:

```bash
# In your shell or hook script
AGENT_ID=$(curl -sS -X POST http://localhost:7891/agents \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"$(basename $PWD) — $(git branch --show-current)\"}" \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["id"])')

export INTENTRA_AGENT_ID="$AGENT_ID"
```

Then on completion:

```bash
curl -sS -X PATCH "http://localhost:7891/agents/$INTENTRA_AGENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```

The agent appears in the mobile Dashboard and tapping it shows the event timeline filtered to your session's events (by `session_id` if `CLAUDE_SESSION_ID` was set in progress events).

---

## See also

- `mobile-app/docs/claude-guard-hook.example.json` — annotated example hook config in the repo
- [Guard Engine](guard-engine.md) — pipeline internals
- [Guard Rules Reference](guard-rules-reference.md) — all 8 rules with trigger examples
- [Culture Config](culture-config.md) — customize guard verdicts via `culture.json`
