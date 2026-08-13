#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

NODE_BIN=${NODE_BIN:-/vscode/bin/linux-alpine/c2d1b13fdc4a77628e5f3bb70173351c8f2fbad1/node}
if [ ! -x "$NODE_BIN" ]; then
  NODE_BIN=$(command -v node || true)
fi

if [ -z "${NODE_BIN:-}" ]; then
  echo "ERROR: no se encontro node."
  echo "Define NODE_BIN o instala node en PATH."
  exit 1
fi

# Apaga procesos de Ollama/llama que generan ruido y errores en recovery mode.
pkill -f "ollama-local.sh serve" 2>/dev/null || true
pkill -f "llama-server" 2>/dev/null || true

# Reinicia el chat local ligero.
lsof -tiTCP:4891 -sTCP:LISTEN -n -P | xargs -r kill
nohup "$NODE_BIN" "$ROOT_DIR/scripts/local-chat-server.mjs" >/tmp/passenger-local-chat.log 2>&1 &

echo "Modo ahorro activo."
echo "Chat local: http://127.0.0.1:4895/ (o fallback http://127.0.0.1:4891/)"
echo "Logs: /tmp/passenger-local-chat.log"

if [ -n "${BROWSER:-}" ]; then
  "$BROWSER" "http://127.0.0.1:4895/" || "$BROWSER" "http://127.0.0.1:4891/" || true
fi
