# mobile-app fixtures

## `skill-usage-evaluator-sample.jsonl`

**Synthetic, committed sample** of the same shapes gstack writes to `~/.gstack/analytics/skill-usage.jsonl`:

- `event_type: skill_run` lines (from `gstack-telemetry-log`)
- `event: hook_fire` lines (from `/careful` and `/freeze` shell hooks)

**Not real session data** — no secrets, no installation IDs. Use it to:

- Verify JSONL parsing in tests
- Show evaluators the telemetry contract without cloning a developer’s home directory

The live progress server still watches **`$GSTACK_STATE_DIR/analytics/skill-usage.jsonl`** at runtime; this file is **not** watched automatically unless you copy or symlink it for demos.

## Redacting a local JSONL for sharing

To produce a shareable sample from your machine (paths and session-like fields scrubbed):

```bash
bun run scripts/redact-skill-usage-sample.ts ~/.gstack/analytics/skill-usage.jsonl > /tmp/skill-usage-redacted.jsonl
```

Review the output before committing or publishing. The committed [`skill-usage-evaluator-sample.jsonl`](skill-usage-evaluator-sample.jsonl) remains **synthetic**; redacted exports are optional evidence aligned with [`masterdoc3.md`](../../masterdoc3.md) telemetry claims.
