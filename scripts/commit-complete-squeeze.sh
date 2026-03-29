#!/usr/bin/env bash
# Create branch complete-squeeze and commit mobile completeness work.
# Run from repo root after: sudo xcodebuild -license (if git fails with exit 69)

set -euo pipefail
cd "$(dirname "$0")/.."

git checkout -b complete-squeeze 2>/dev/null || git checkout complete-squeeze

git add \
  mobile-app/app/App.tsx \
  mobile-app/app/src/apiHeaders.ts \
  mobile-app/app/src/useEventStream.ts \
  mobile-app/app/src/screens/SetupScreen.tsx \
  mobile-app/app/src/screens/HandoffScreen.tsx \
  mobile-app/app/src/screens/DashboardScreen.tsx \
  mobile-app/app/src/screens/IntentScreen.tsx \
  mobile-app/app/src/screens/DetailScreen.tsx \
  mobile-app/shared/handoff-parse.ts \
  mobile-app/shared/handoff-parse.test.ts \
  mobile-app/TESTING.md \
  scripts/commit-complete-squeeze.sh

git status
git commit -m "Mobile completeness: auth probe, token-aware SSE/fetches, handoff CRLF

- Setup: POST /agents probe detects missing or invalid INTENTRA_TOKEN before save
- useEventStream: reconnect when authToken changes; shared progressFetchHeaders
- Dashboard, Handoffs, Intent: Bearer + ngrok headers on fetches
- Detail: newest-first timeline; curl hint for Authorization
- handoff-parse: normalize CRLF; regression test
- TESTING: manual Expo checklist

Co-authored-by: Cursor <noreply@cursor.com>"

echo "Done. Push with: git push -u origin complete-squeeze"
