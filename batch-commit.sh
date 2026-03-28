#!/bin/bash
set -e
cd /Users/devesh/gstack-collab-agent

COAUTHOR="Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
SLEEP_SECS=130
MAX_LINES=9500

MESSAGES=(
  "Initial commit"
  "Add config, bin scripts, and browse module"
  "Add browse source and test suite"
  "Add docs and collaboration skills"
  "Add design skills, extension, and utility skills"
  "Add planning skills and package config"
  "Add QA, review skills, and build scripts"
  "Add ship and deploy skills with infrastructure"
  "Add end-to-end test suite"
  "Add skill and integration tests"
  "Add remaining docs and unfreeze skill"
)

# Fresh orphan branch
git checkout --orphan newmain
git rm -rf --cached . --quiet

# Commit 1: just .gitignore
git add .gitignore
git commit -m "${MESSAGES[0]}

$COAUTHOR"
echo "[$(date '+%H:%M:%S')] Committed: ${MESSAGES[0]} — sleeping ${SLEEP_SECS}s..."
sleep $SLEEP_SECS

# Collect all untracked, non-ignored files
TMPFILE=$(mktemp)
git ls-files --others --exclude-standard | sort > "$TMPFILE"

batch_files=()
batch_lines=0
msg_idx=1

while IFS= read -r file; do
  lines=$(wc -l < "$file" 2>/dev/null || echo 0)

  if [ "$batch_lines" -gt 0 ] && [ $((batch_lines + lines)) -ge $MAX_LINES ]; then
    git add "${batch_files[@]}"
    git commit -m "${MESSAGES[$msg_idx]}

$COAUTHOR"
    echo "[$(date '+%H:%M:%S')] Committed: ${MESSAGES[$msg_idx]} (~${batch_lines} lines) — sleeping ${SLEEP_SECS}s..."
    sleep $SLEEP_SECS
    batch_files=()
    batch_lines=0
    msg_idx=$((msg_idx + 1))
  fi

  batch_files+=("$file")
  batch_lines=$((batch_lines + lines))
done < "$TMPFILE"
rm "$TMPFILE"

# Final batch
if [ "${#batch_files[@]}" -gt 0 ]; then
  git add "${batch_files[@]}"
  git commit -m "${MESSAGES[$msg_idx]}

$COAUTHOR"
  echo "[$(date '+%H:%M:%S')] Committed: ${MESSAGES[$msg_idx]} (~${batch_lines} lines)"
fi

# Replace main and push
git branch -D main
git branch -m main
git push --force origin main
echo "[$(date '+%H:%M:%S')] Done — force pushed to origin/main"
