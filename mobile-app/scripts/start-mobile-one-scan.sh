#!/usr/bin/env bash
# Start progress server + (ngrok or LAN) + Expo with EXPO_PUBLIC_INTENTRA_SERVER_URL baked in.
# Then scan the Expo QR code only — no manual URL paste on first launch.
#
# Usage:
#   From repo root:  bun run dev:mobile
#   Or:              bash mobile-app/scripts/start-mobile-one-scan.sh
#
# Requires: bun, npm/npx, curl. For phone off-LAN: ngrok on PATH + `ngrok config add-authtoken` once.
# Same-WiFi only (no ngrok):  bash mobile-app/scripts/start-mobile-one-scan.sh --lan

set -euo pipefail

USE_LAN=false
for arg in "$@"; do
  if [[ "$arg" == "--lan" ]]; then USE_LAN=true; fi
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SERVER_DIR="$REPO_ROOT/mobile-app/server"
APP_DIR="$REPO_ROOT/mobile-app/app"
ENV_FILE="$APP_DIR/.env.development.local"
PORT="${GSTACK_PROGRESS_PORT:-7891}"

cleanup() {
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  [[ -n "${NGROK_PID:-}" ]] && kill "$NGROK_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

if [[ ! -d "$SERVER_DIR" || ! -d "$APP_DIR" ]]; then
  echo "error: expected repo layout with mobile-app/server and mobile-app/app"
  exit 1
fi

echo "==> Starting progress server on port $PORT ..."
cd "$SERVER_DIR"
export INTENTRA_REPO_ROOT="${INTENTRA_REPO_ROOT:-$REPO_ROOT}"
bun run server.ts &
SERVER_PID=$!

for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "==> Server healthy."
    break
  fi
  if [[ "$i" -eq 40 ]]; then
    echo "error: server did not become ready on :${PORT}"
    exit 1
  fi
  sleep 0.15
done

PUBLIC_URL=""
if [[ "$USE_LAN" == true ]]; then
  LAN_IP=""
  for iface in en0 en1; do
    LAN_IP="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
    [[ -n "$LAN_IP" ]] && break
  done
  if [[ -z "$LAN_IP" ]]; then
    echo "error: could not detect LAN IP (en0/en1). Try without --lan and use ngrok."
    exit 1
  fi
  PUBLIC_URL="http://${LAN_IP}:${PORT}"
  echo "==> Using LAN URL (phone must be on same Wi-Fi): $PUBLIC_URL"
else
  if ! command -v ngrok >/dev/null 2>&1; then
    echo "error: ngrok not found. Install https://ngrok.com/download or run:"
    echo "  bash mobile-app/scripts/start-mobile-one-scan.sh --lan"
    exit 1
  fi
  echo "==> Starting ngrok (public URL for your phone) ..."
  ngrok http "$PORT" --log=stdout >/tmp/intentra-ngrok.log 2>&1 &
  NGROK_PID=$!

  for i in $(seq 1 45); do
    JSON="$(curl -fsS http://127.0.0.1:4040/api/tunnels 2>/dev/null || true)"
    if [[ -n "$JSON" ]]; then
      PUBLIC_URL="$(printf '%s' "$JSON" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    for t in d.get('tunnels') or []:
        if t.get('proto') == 'https':
            print(t.get('public_url') or '', end='')
            break
except Exception:
    pass
" 2>/dev/null || true)"
    fi
    if [[ -n "$PUBLIC_URL" ]]; then
      echo "==> Tunnel: $PUBLIC_URL"
      break
    fi
    sleep 0.3
  done
  if [[ -z "$PUBLIC_URL" ]]; then
    echo "error: ngrok did not expose a tunnel. Is port 4040 free? Log: /tmp/intentra-ngrok.log"
    exit 1
  fi
fi

printf 'EXPO_PUBLIC_INTENTRA_SERVER_URL=%s\n' "$PUBLIC_URL" > "$ENV_FILE"
echo "==> Wrote $ENV_FILE"

cd "$APP_DIR"
if [[ ! -d node_modules ]]; then
  echo "==> npm install (app) ..."
  npm install
fi

echo "==> Expo — scan the QR code with Expo Go (server URL is preconfigured)."
echo ""
# Metro over LAN (same Wi‑Fi as this Mac). Avoids Expo's --tunnel, which often crashes with
# TypeError: Cannot read properties of undefined (reading 'body') inside @expo/ngrok when ngrok/network errors lack response bodies.
npx expo start --lan
