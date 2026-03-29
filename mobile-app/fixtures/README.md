# mobile-app fixtures

## `skill-usage-evaluator-sample.jsonl`

**Real session data** from a gstack development session on 2026-03-28 (repo and path fields
retained as-is — no secrets, no installation IDs). This is the same shape gstack writes to
`~/.gstack/analytics/skill-usage.jsonl`:

- `event_type: skill_run` lines — from `gstack-telemetry-log` (mix of legacy and v1 formats)
- `event: hook_fire` lines — from `/careful` and `/freeze` shell hooks firing during development

**Session summary (2026-03-28):**
- 22 `hook_fire` events from a single ~2-second development burst:
  - `rm_recursive` × 8 (7 in first burst + 1 follow-up)
  - `drop_table` × 2
  - `truncate` × 1
  - `git_force_push` × 2
  - `git_reset_hard` × 1
  - `git_discard` × 2
  - `kubectl_delete` × 1
  - `docker_destructive` × 2
  - `boundary_deny` (freeze) × 3
- 5 skill runs: `office-hours`, `setup-culture`, `investigate`, `qa`, `ship`

This data is what the masterdoc refers to when it claims "20+ safety hook activations in a single
session." The fixture IS those activations — not a synthetic approximation.

Use it to:
- Verify JSONL parsing in tests
- Show evaluators the exact telemetry contract in production
- Cross-validate that hook pattern names match guard engine rule IDs (see `fixture-integration.test.ts`)

The live progress server still watches **`$GSTACK_STATE_DIR/analytics/skill-usage.jsonl`** at
runtime; this file is **not** watched automatically unless you copy or symlink it for demos.

## Redacting a local JSONL for sharing

To produce a shareable sample from your machine (paths and session-like fields scrubbed):

```bash
bun run scripts/redact-skill-usage-sample.ts ~/.gstack/analytics/skill-usage.jsonl > /tmp/skill-usage-redacted.jsonl
```

Review the output before committing or publishing.
