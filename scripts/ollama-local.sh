#!/usr/bin/env bash
set -euo pipefail

export HOME="/tmp/ollama-home"
mkdir -p "$HOME"
export LD_PRELOAD="/tmp/libfcntl64shim.so"
export LD_LIBRARY_PATH="/tmp/ollama-compat/usr/lib:/tmp/ollama-compat/lib:/tmp/gcompat/lib${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
OLLAMA_LIBRARY_PATH="${OLLAMA_LIBRARY_PATH:-/tmp/ollama}"
export OLLAMA_LIBRARY_PATH
exec /tmp/ollama-gcompat "$@"
