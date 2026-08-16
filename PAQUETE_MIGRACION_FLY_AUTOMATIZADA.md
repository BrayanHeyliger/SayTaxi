# Paquete de Migración Automatizada a Fly.io

**Autor:** Manus AI
**Estado:** preparado y validado localmente; pendiente de una cuenta Fly.io, servicios administrados y secretos de producción.

## 1. Errores encontrados y soluciones

| Error o riesgo | Solución aplicada |
|---|---|
| Railway devuelve `502` aunque GitHub muestra un despliegue exitoso. | Se elimina la dependencia de Railway mediante un paquete de servicio Node autocontenido para Fly.io. |
| La interfaz de Netlify no puede alojar por sí sola API Express ni Socket.IO. | El contenedor sirve la interfaz compilada, Express, tRPC y Socket.IO desde el mismo proceso y dominio. |
| Una versión puede activarse antes de actualizar el esquema de MySQL. | `fly.toml` define `release_command` con `drizzle-kit migrate` antes de la liberación. |
| Secretos y datos locales podrían llegar a la imagen. | `.dockerignore` excluye archivos `.env`, resultados de carga, dependencias locales y artefactos no necesarios. |
| Los despliegues futuros serían manuales y propensos a omisiones. | GitHub Actions incluye un workflow manual que valida la versión antes de invocar Fly.io con `FLY_API_TOKEN`. |

## 2. Mejoras aplicadas

El `Dockerfile` construye una imagen reproducible con Node 22, compila React y empaqueta el servidor Express con sus migraciones. La definición `fly.toml` mantiene una instancia inicial para Socket.IO, habilita HTTPS y comprueba `/healthz` cada quince segundos. El script `scripts/migrate-to-fly.sh` valida secretos y la versión antes de transferir secretos a Fly, desplegar y comprobar la salud.

| Archivo | Finalidad |
|---|---|
| `Dockerfile` | Imagen reproducible de aplicación completa. |
| `.dockerignore` | Exclusión de secretos y artefactos locales. |
| `fly.toml` | Servicio HTTPS persistente, health check y migración previa a lanzamiento. |
| `scripts/migrate-to-fly.sh` | Preflight y despliegue automatizado controlado. |
| `.github/workflows/fly-deploy.yml` | Despliegue manual validado desde GitHub Actions. |
| `MIGRACION_SIN_RAILWAY.md` | Justificación arquitectónica y alternativa serverless. |

La validación técnica fue satisfactoria: el script pasó `bash -n`, los tipos de TypeScript no reportaron errores, las 13 pruebas automatizadas pasaron, la compilación de producción terminó correctamente y `git diff --check` no detectó errores de formato.

## 3. Intervenciones externas mínimas

La automatización no puede crear cuentas, contratar servicios, transferir datos ni cambiar DNS sin el acceso del titular. Debes completar los pasos de esta tabla una sola vez; después el script y el workflow cubren los despliegues futuros.

| Orden | Intervención del titular | Dato o acceso resultante |
|---:|---|---|
| 1 | Crear o habilitar una cuenta en Fly.io. | Inicio de sesión de Fly o token `FLY_API_TOKEN`. |
| 2 | Crear una base MySQL administrada y Redis con TLS. | `DATABASE_URL` y `REDIS_URL`. |
| 3 | Elegir un nombre de aplicación Fly y ejecutar `flyctl launch --no-deploy`. | Valor `FLY_APP`. |
| 4 | Crear secretos de producción: `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `APP_URL` y `ALLOWED_ORIGINS`. | Archivo local `.env.fly.production`, fuera de Git. |
| 5 | Ejecutar el script de despliegue. | URL `https://<FLY_APP>.fly.dev`. |
| 6 | Ejecutar una reserva de prueba y verificar `/healthz`. | Confirmación técnica antes de DNS. |
| 7 | Cambiar DNS del dominio al nuevo servicio y, después, retirar Railway. | Corte definitivo reversible. |

> Nunca añadas el archivo `.env.fly.production`, `FLY_API_TOKEN`, URLs con contraseñas, ni credenciales de Stripe, mapas o WhatsApp al repositorio. Los secretos deben residir únicamente en el proveedor de destino o en GitHub Secrets.

## 4. Comandos de activación

Primero, instala `flyctl`, inicia sesión y crea el nombre de aplicación. Después, prepara un archivo local con secretos reales y ejecuta:

```bash
cd SayTaxi
set -a
. ./.env.fly.production
set +a
FLY_APP=tu-nombre-de-app ./scripts/migrate-to-fly.sh prepare
FLY_APP=tu-nombre-de-app ./scripts/migrate-to-fly.sh deploy
```

El segundo comando configura los secretos, ejecuta la migración de Drizzle antes de activar la versión y espera una respuesta válida de `https://<FLY_APP>.fly.dev/healthz`.

## 5. Hoja de ruta priorizada

1. **Alta prioridad:** provisionar MySQL y Redis administrados, ejecutar el primer despliegue y probar registro, login, reserva, telemetría y panel administrativo en la URL de Fly.
2. **Media prioridad:** configurar dominio propio, Stripe, mapas, WhatsApp y alertas de salud; entonces retirar Netlify o dejarlo solo como página comercial.
3. **Media prioridad:** activar el secreto `FLY_API_TOKEN` en GitHub para usar el workflow de despliegue manual aprobado.
4. **Baja prioridad:** evaluar una futura transición a BaaS/serverless cuando el volumen y el equipo justifiquen reescribir la capa Express/Socket.IO.
