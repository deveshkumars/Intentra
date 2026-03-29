#!/usr/bin/env bash
# check-careful.sh — PreToolUse hook for /careful skill
# Reads JSON from stdin, checks Bash command for destructive patterns.
# Verdict (deny/warn/allow) is resolved from intentra.risk_gates in culture.json,
# falling back to built-in defaults when culture is absent or the key is missing.
set -euo pipefail

# --- Culture-aware verdict resolution ---
# Usage: resolve_verdict <pattern_id> <default_verdict>
# Reads $GSTACK_STATE_DIR/culture.json (fallback: $HOME/.gstack/culture.json).
# Prints one of: deny | warn | allow
resolve_verdict() {
  local pattern="$1"
  local default_verdict="$2"
  local culture_path
  if [ -n "${GSTACK_STATE_DIR:-}" ]; then
    culture_path="$GSTACK_STATE_DIR/culture.json"
  else
    culture_path="$HOME/.gstack/culture.json"
  fi
  if [ ! -f "$culture_path" ]; then
    echo "$default_verdict"
    return
  fi
  local verdict
  verdict=$(python3 - "$culture_path" "$pattern" <<'PYEOF' 2>/dev/null
import sys, json
culture_path, pattern = sys.argv[1], sys.argv[2]
try:
    with open(culture_path) as f:
        data = json.load(f)
    gates = data.get('intentra', {}).get('risk_gates', {})
    v = gates.get(pattern)
    if v in ('deny', 'warn', 'allow'):
        print(v)
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
PYEOF
  ) || true
  if [ "$verdict" = "deny" ] || [ "$verdict" = "warn" ] || [ "$verdict" = "allow" ]; then
    echo "$verdict"
  else
    echo "$default_verdict"
  fi
}

# Read stdin (JSON with tool_input)
INPUT=$(cat)

# Extract the "command" field value from tool_input
# Try grep/sed first (handles 99% of cases), fall back to Python for escaped quotes
CMD=$(printf '%s' "$INPUT" | grep -o '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

# Python fallback if grep returned empty (e.g., escaped quotes in command)
if [ -z "$CMD" ]; then
  CMD=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("tool_input",{}).get("command",""))' 2>/dev/null || true)
fi

# If we still couldn't extract a command, allow
if [ -z "$CMD" ]; then
  echo '{}'
  exit 0
fi

# Normalize: lowercase for case-insensitive SQL matching
CMD_LOWER=$(printf '%s' "$CMD" | tr '[:upper:]' '[:lower:]')

# --- Check for safe exceptions (rm -rf of build artifacts) ---
if printf '%s' "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive\s+)' 2>/dev/null; then
  SAFE_ONLY=true
  RM_ARGS=$(printf '%s' "$CMD" | sed -E 's/.*rm\s+(-[a-zA-Z]+\s+)*//;s/--recursive\s*//')
  for target in $RM_ARGS; do
    case "$target" in
      */node_modules|node_modules|*/\.next|\.next|*/dist|dist|*/__pycache__|__pycache__|*/\.cache|\.cache|*/build|build|*/\.turbo|\.turbo|*/coverage|coverage)
        ;; # safe target
      -*)
        ;; # flag, skip
      *)
        SAFE_ONLY=false
        break
        ;;
    esac
  done
  if [ "$SAFE_ONLY" = true ]; then
    echo '{}'
    exit 0
  fi
fi

# --- Destructive pattern checks ---
WARN=""
PATTERN=""
DEFAULT_VERDICT=""

# rm -rf / rm -r / rm --recursive
if printf '%s' "$CMD" | grep -qE 'rm\s+(-[a-zA-Z]*r|--recursive)' 2>/dev/null; then
  WARN="Destructive: recursive delete (rm -r). This permanently removes files."
  PATTERN="rm_recursive"
  DEFAULT_VERDICT="deny"
fi

# DROP TABLE / DROP DATABASE
if [ -z "$WARN" ] && printf '%s' "$CMD_LOWER" | grep -qE 'drop\s+(table|database)' 2>/dev/null; then
  WARN="Destructive: SQL DROP detected. This permanently deletes database objects."
  PATTERN="drop_table"
  DEFAULT_VERDICT="deny"
fi

# TRUNCATE
if [ -z "$WARN" ] && printf '%s' "$CMD_LOWER" | grep -qE '\btruncate\b' 2>/dev/null; then
  WARN="Destructive: SQL TRUNCATE detected. This deletes all rows from a table."
  PATTERN="truncate"
  DEFAULT_VERDICT="deny"
fi

# git push --force / git push -f
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+push\s+.*(-f\b|--force)' 2>/dev/null; then
  WARN="Destructive: git force-push rewrites remote history. Other contributors may lose work."
  PATTERN="git_force_push"
  DEFAULT_VERDICT="deny"
fi

# git reset --hard
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+reset\s+--hard' 2>/dev/null; then
  WARN="Destructive: git reset --hard discards all uncommitted changes."
  PATTERN="git_reset_hard"
  DEFAULT_VERDICT="deny"
fi

# git checkout . / git restore .
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'git\s+(checkout|restore)\s+\.' 2>/dev/null; then
  WARN="Destructive: discards all uncommitted changes in the working tree."
  PATTERN="git_discard"
  DEFAULT_VERDICT="deny"
fi

# kubectl delete
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'kubectl\s+delete' 2>/dev/null; then
  WARN="Destructive: kubectl delete removes Kubernetes resources. May impact production."
  PATTERN="kubectl_delete"
  DEFAULT_VERDICT="warn"
fi

# docker rm -f / docker system prune
if [ -z "$WARN" ] && printf '%s' "$CMD" | grep -qE 'docker\s+(rm\s+-f|system\s+prune)' 2>/dev/null; then
  WARN="Destructive: Docker force-remove or prune. May delete running containers or cached images."
  PATTERN="docker_destructive"
  DEFAULT_VERDICT="warn"
fi

# --- Output ---
if [ -n "$WARN" ]; then
  VERDICT=$(resolve_verdict "$PATTERN" "$DEFAULT_VERDICT")

  # Allow: culture explicitly permits this pattern — pass through silently
  if [ "$VERDICT" = "allow" ]; then
    echo '{}'
    exit 0
  fi

  # Log hook fire event (pattern name + resolved verdict; never command content)
  ANALYTICS_DIR="${GSTACK_STATE_DIR:-$HOME/.gstack}/analytics"
  mkdir -p "$ANALYTICS_DIR" 2>/dev/null || true
  echo '{"event":"hook_fire","skill":"careful","pattern":"'"$PATTERN"'","verdict":"'"$VERDICT"'","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}' >> "$ANALYTICS_DIR/skill-usage.jsonl" 2>/dev/null || true

  WARN_ESCAPED=$(printf '%s' "$WARN" | sed 's/"/\\"/g')
  if [ "$VERDICT" = "deny" ]; then
    printf '{"permissionDecision":"deny","message":"[careful/deny] %s"}\n' "$WARN_ESCAPED"
  else
    printf '{"permissionDecision":"ask","message":"[careful/warn] %s"}\n' "$WARN_ESCAPED"
  fi
else
  echo '{}'
fi
