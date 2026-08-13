#!/usr/bin/env sh
set -eu

if [ -z "${BROWSER:-}" ]; then
  echo "ERROR: BROWSER no esta definido."
  echo "Abre manualmente en navegador: file:///workspaces/SayTaxi/chat.html"
  exit 1
fi

"$BROWSER" "file:///workspaces/SayTaxi/chat.html"
