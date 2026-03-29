# mobile-app fixtures

## `skill-usage-evaluator-sample.jsonl`

**Synthetic, committed sample** of the same shapes gstack writes to `~/.gstack/analytics/skill-usage.jsonl`:

- `event_type: skill_run` lines (from `gstack-telemetry-log`)
- `event: hook_fire` lines (from `/careful` and `/freeze` shell hooks)

**Not real session data** — no secrets, no installation IDs. Use it to:

- Verify JSONL parsing in tests
- Show evaluators the telemetry contract without cloning a developer’s home directory

The live progress server still watches **`$GSTACK_STATE_DIR/analytics/skill-usage.jsonl`** at runtime; this file is **not** watched automatically unless you copy or symlink it for demos.
