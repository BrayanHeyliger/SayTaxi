# Deploy Automático en Railway

## 1) Railway

1. Crea proyecto en Railway y conecta `BrayanHeyliger/SayTaxi`.
2. Railway usa `.railway/railway.json` para build/start.
3. Configura las variables de entorno de `docs/ENV.md`.
4. (Opcional) usa `.railway/docker-compose.yml` para entorno local con MySQL.

## 2) Dominio

- URL automática Railway: `https://saytaxi-prod-xxxxx.railway.app`
- Dominio propio: CNAME `saytaxi.com` -> `railway.app`

## 3) Inicialización de base de datos

Ejecuta en entorno con `DATABASE_URL`:

```bash
pnpm tsx scripts/init-db.ts
```

El script:

- crea la base de datos si no existe,
- corre migraciones de Drizzle,
- crea índices base,
- ejecuta seeding inicial (`scripts/seed-data.ts`).

## 4) CI/CD

- `.github/workflows/test-deploy.yml`: valida check + test + build.
- `.github/workflows/deploy.yml`: deploy automático al hacer push a `main` usando `RAILWAY_TOKEN`.

## 5) Salud y monitoreo

- Health check: `GET /health`
- Logging centralizado: `server/_core/logger.ts`
- Seguridad de producción: `server/_core/security.ts`
