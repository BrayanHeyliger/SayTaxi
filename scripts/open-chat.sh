#!/usr/bin/env sh
set -eu

# Abre el chat en el puerto reenviado (4895) y deja fallback manual a 4891.
if [ -z "${BROWSER:-}" ]; then
  echo "ERROR: BROWSER no esta definido."
  echo "Abre manualmente: http://127.0.0.1:4895/"
  echo "Fallback:         http://127.0.0.1:4891/"
  exit 1
fi

"$BROWSER" "http://127.0.0.1:4895/" || "$BROWSER" "http://127.0.0.1:4891/"
