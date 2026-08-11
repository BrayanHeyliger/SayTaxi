# Variables de Entorno (Producción)

No comitees secretos reales. Usa Railway/GitHub Secrets para valores sensibles.

## Core

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL=mysql://[user]:[pass]@[host]:[port]/saytaxi`
- `JWT_SECRET=<generar_32+_chars>`

## App URLs

- `VITE_APP_TITLE=SayTaxi`
- `VITE_API_URL=https://saytaxi-prod.railway.app`
- `CORS_ORIGIN=https://saytaxi-prod.railway.app`

## Seguridad

- `RATE_LIMIT_WINDOW=15m`
- `RATE_LIMIT_MAX_REQUESTS=100`

## Integraciones (solo entorno)

- `STRIPE_SECRET_KEY=...`
- `STRIPE_PUBLISHABLE_KEY=...`
- `WHATSAPP_ACCESS_TOKEN=...`
- `GOOGLE_MAPS_API_KEY=...`
- `RAILWAY_TOKEN=...` (GitHub Secrets)
