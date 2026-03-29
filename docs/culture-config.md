# Culture Configuration Guide

Intentra reads your team's `culture.json` to customize guard engine behavior. This file is shared with gstack skills — one source of truth for team DNA.

## Where it lives

The server looks for `culture.json` at the path resolved by `GSTACK_STATE_DIR`:

```
~/.gstack/culture.json          # default location
$GSTACK_STATE_DIR/culture.json  # if GSTACK_STATE_DIR is set
```

You can also place a `culture.json` at the repo root for project-specific overrides. The server reads whichever is found at the gstack state path.

## Full schema

```json
{
  "$schema": "https://gstack.dev/schemas/culture/v1.json",
  "version": "1.0.0",
  "org": {
    "name": "Your Company",
    "mission": "What you're building and why",
    "values": ["ship fast", "quality matters"]
  },
  "coding": {
    "languages": ["TypeScript", "Python"],
    "style": "functional-preferred",
    "test_coverage_min": 80,
    "forbidden_patterns": ["any type", "console.log in production"],
    "preferred_patterns": ["typed errors", "structured logging"]
  },
  "risk": {
    "frontend": "moderate",
    "backend": "moderate",
    "infra": "conservative",
    "new_features": "experimental"
  },
  "review": {
    "required_approvals": 1,
    "pr_size_max_lines": 400,
    "conventional_commits": true,
    "merge_strategy": "squash"
  },
  "priorities": {
    "stability": 10,
    "performance": 8,
    "features": 7,
    "refactoring": 5,
    "docs": 4
  },
  "team": {
    "communication": "async-first",
    "decision_making": "data-driven",
    "ownership": "you-build-it-you-own-it",
    "timezone": "America/New_York"
  },
  "intentra": {
    "risk_gates": {
      "rm_recursive": "deny",
      "drop_table": "deny",
      "truncate": "deny",
      "git_force_push": "deny",
      "git_reset_hard": "deny",
      "git_discard": "deny",
      "kubectl_delete": "warn",
      "docker_destructive": "warn"
    }
  }
}
```

## The `intentra.risk_gates` section

This is where Intentra reads guard engine overrides. Each key is a rule ID from the guard policy registry. Values are verdicts:

| Verdict | Effect |
|---------|--------|
| `deny` | Block the command, emit SSE `hook_fire` event, log to telemetry |
| `warn` | Allow the command but emit a warning event (risk score scaled to 72% of base) |
| `allow` | Permit the command, no event emitted (risk score scaled to 12% of base) |

If a rule ID is not listed in `risk_gates`, the guard uses the rule's `defaultVerdict` (usually `deny`).

## Available rule IDs

| Rule ID | Category | Default | Base Risk | What it catches |
|---------|----------|---------|-----------|-----------------|
| `rm_recursive` | filesystem | deny | 88 | `rm -rf` outside safe directories (node_modules, dist, etc.) |
| `drop_table` | sql | deny | 92 | `DROP TABLE` or `DROP DATABASE` |
| `truncate` | sql | deny | 85 | SQL `TRUNCATE` |
| `git_force_push` | vcs | deny | 82 | `git push --force` or `git push -f` |
| `git_reset_hard` | vcs | deny | 78 | `git reset --hard` |
| `git_discard` | vcs | deny | 72 | `git checkout .` or `git restore .` |
| `kubectl_delete` | orchestration | deny | 80 | `kubectl delete` |
| `docker_destructive` | container | deny | 75 | `docker rm -f` or `docker system prune` |

## Customization examples

**Relaxed dev environment** — allow force-push on feature branches, warn on rm:

```json
{
  "intentra": {
    "risk_gates": {
      "git_force_push": "warn",
      "rm_recursive": "warn",
      "drop_table": "deny",
      "truncate": "deny"
    }
  }
}
```

**Strict production** — deny everything, including containers:

```json
{
  "intentra": {
    "risk_gates": {
      "rm_recursive": "deny",
      "drop_table": "deny",
      "truncate": "deny",
      "git_force_push": "deny",
      "git_reset_hard": "deny",
      "git_discard": "deny",
      "kubectl_delete": "deny",
      "docker_destructive": "deny"
    }
  }
}
```

## Validation

The guard engine validates culture keys on every request. Unknown keys produce `culture_warnings` in the response:

```bash
curl -s -X POST http://localhost:7891/intentra/guard \
  -H "Content-Type: application/json" \
  -d '{"command": "ls"}'
```

If your culture has a typo like `"rm_recursve"`, the response includes:

```json
{
  "verdict": "allow",
  "culture_warnings": [
    "unknown intentra.risk_gates key \"rm_recursve\" (not in policy registry)"
  ]
}
```

## Checking your configuration

**View what the server loaded:**

```bash
curl -s http://localhost:7891/intentra/culture | jq .
```

**View the JSON Schema for risk_gates:**

```bash
curl -s http://localhost:7891/intentra/guard/schema | jq .culture_fragment_schema
```

**View all available rule IDs:**

```bash
curl -s http://localhost:7891/intentra/guard/schema | jq .rule_ids
```

## See also

- **[Guard Engine](guard-engine.md)** — pipeline deep dive (normalization, tokenization, matching)
- **[Guard Rules Reference](guard-rules-reference.md)** — detailed rule examples with trigger commands
- **[API Reference](api-reference.md)** — all HTTP endpoints
- **[Architecture](intentra-architecture.md)** — route matrix and auth model
