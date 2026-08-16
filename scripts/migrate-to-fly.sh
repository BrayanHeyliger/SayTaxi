#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   set -a && . ./.env.fly.production && set +a
#   FLY_APP=nombre-de-tu-app ./scripts/migrate-to-fly.sh deploy
# El archivo de entorno no debe versionarse y debe contener secretos reales.

COMMAND="${1:-prepare}"
: "${FLY_APP:?Define FLY_APP con el nombre de la aplicación de Fly.io}"

required=(DATABASE_URL JWT_SECRET APP_URL ALLOWED_ORIGINS REDIS_URL)
missing=()
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    missing+=("$name")
  fi
done

if (( ${#missing[@]} > 0 )); then
  printf 'Faltan variables obligatorias: %s\n' "${missing[*]}" >&2
  exit 1
fi

if ! command -v flyctl >/dev/null 2>&1; then
  echo "flyctl no está instalado. Instálalo e inicia sesión antes de desplegar." >&2
  exit 1
fi

if [[ "$COMMAND" == "prepare" ]]; then
  pnpm verify:release
  echo "Preflight correcto. Ejecuta con 'deploy' cuando Fly.io, MySQL y Redis estén listos."
  exit 0
fi

if [[ "$COMMAND" != "deploy" ]]; then
  echo "Uso: $0 [prepare|deploy]" >&2
  exit 1
fi

pnpm verify:release

# Las claves se transmiten al gestor de secretos de Fly; no se guardan en fly.toml.
flyctl secrets set \
  DATABASE_URL="$DATABASE_URL" \
  JWT_SECRET="$JWT_SECRET" \
  APP_URL="$APP_URL" \
  ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  REDIS_URL="$REDIS_URL" \
  TELEMETRY_ENABLED="${TELEMETRY_ENABLED:-true}" \
  SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-}" \
  SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}" \
  --app "$FLY_APP"

# Fly ejecuta la migración configurada en [deploy].release_command antes de activar la nueva versión.
flyctl deploy --app "$FLY_APP" --config fly.toml

health_url="https://${FLY_APP}.fly.dev/healthz"
for attempt in {1..12}; do
  if curl --fail --silent --show-error "$health_url" >/dev/null; then
    echo "Despliegue correcto: $health_url"
    exit 0
  fi
  sleep 5
done

echo "El despliegue terminó, pero /healthz no respondió correctamente." >&2
exit 1
