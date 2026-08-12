# Informe de cambios — SayTaxi

Fecha: 2026-08-10

## Resumen
Se aplicaron los cambios solicitados para preparar el proyecto para despliegue y mejorar el manejo de medios, además se añadieron scripts de apoyo, CI y generación de informe en PDF.

## Cambios realizados

- Media y uploads
  - Almacenamiento de uploads movido a `server/uploads` (antes `client/public/uploads`).
  - Servidor ahora expone `/uploads/*` estático desde `server/uploads`.
  - `siteSettings.uploadNewsImage`, `getMediaList` y `deleteMedia` actualizados para usar `server/uploads`.
- Servidor
  - `server/_core/index.ts`: agrega el middleware para servir `server/uploads` y asegura el directorio.
- Seeds y utilidades
  - `scripts/seed.js`: genera `server/_data/news_posts.json` con entradas iniciales.
- CI / CD
  - `.github/workflows/ci.yml`: pipeline básico que instala dependencias, ejecuta `pnpm check`, tests y build.
- Reportes
  - `scripts/make-report.js`: script que convierte `REPORT.md` a `REPORT.pdf` usando Puppeteer.
  - `REPORT.md`: este informe en Markdown.
- Git
  - `server/uploads/.gitkeep` añadido para mantener la carpeta en el repo.

## Archivos modificados / añadidos

- Modified: `server/routers/siteSettings.ts`
- Modified: `server/_core/index.ts`
- Added: `server/uploads/.gitkeep`
- Added: `scripts/seed.js`
- Added: `.github/workflows/ci.yml`
- Modified: `package.json` (scripts + devDependencies)
- Added: `scripts/make-report.js`
- Added: `REPORT.md`

## Pasos para generar el informe PDF localmente

1. Instalar dependencias:

```bash
pnpm install
```

2. Ejecutar el script que genera `REPORT.pdf`:

```bash
pnpm run generate-report
```

El PDF resultante quedará en `REPORT.pdf`.

## Pasos recomendados para poner en producción

(Sectión abreviada; ver README_COMPLETO.md para detalles.)

1. Configurar variables de entorno: `VITE_APP_ID`, `JWT_SECRET`, `DATABASE_URL`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `NODE_ENV=production`, `PORT`.
2. Ejecutar migraciones: `pnpm run db:push`.
3. Construir: `pnpm build`.
4. Configurar servicio (nginx + systemd/pm2) y SSL.
5. Asegurar carpeta `server/uploads` o migrar a S3 para producción.

---

Fin del informe.
