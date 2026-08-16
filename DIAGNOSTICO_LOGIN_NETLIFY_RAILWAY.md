# Diagnóstico de inicio de sesión entre Netlify y Railway

## Evidencia observada

- La interfaz estática se publica en `https://saytaxi.netlify.app` mediante Netlify Drop.
- El cliente usa rutas relativas como `/api/trpc/localAuth.login`; en Netlify esa ruta devuelve `404`, pues el sitio no tiene funciones ni backend propios.
- El backend identificado por el estado de despliegue de GitHub es `https://saytaxi-production.up.railway.app`.
- Al momento de la comprobación, `GET /healthz` y la raíz del backend de Railway devolvieron `502`, por lo que el servidor de autenticación no está disponible.
- La configuración de producción recién añadida puede detener el proceso si faltan `DATABASE_URL`, `JWT_SECRET`, `APP_URL` o `ALLOWED_ORIGINS`; la cuenta superadministradora también era obligatoria aunque el flujo local admite que no exista.

## Corrección necesaria

1. Hacer configurable la URL pública de API en el cliente con `VITE_API_BASE_URL`.
2. Reemplazar las llamadas tRPC relativas por una utilidad común que use esa base.
3. Restringir CORS del backend a los orígenes explícitamente permitidos, incluido `https://saytaxi.netlify.app`.
4. Permitir que el backend arranque sin credenciales de superadministrador, manteniendo esa cuenta como una capacidad opcional, no como un requisito del proceso.
5. Configurar en Railway `APP_URL=https://saytaxi.netlify.app` y `ALLOWED_ORIGINS=https://saytaxi.netlify.app,https://saytaxi-production.up.railway.app`; conservar los secretos existentes de base de datos y JWT.
6. Configurar en Netlify `VITE_API_BASE_URL=https://saytaxi-production.up.railway.app` y publicar nuevamente la interfaz.

## Limitación actual

Restaurar el backend de Railway y cargar sus variables requiere acceso a ese proyecto. Hasta que `/healthz` devuelva `200`, ningún ajuste de interfaz puede completar un inicio de sesión real.

## Configuración de Netlify verificada

- El proyecto `saytaxi` está publicado mediante Netlify Drop.
- No tenía variables de entorno configuradas; en particular, faltaba `VITE_API_BASE_URL`, por lo que la compilación usaba rutas relativas contra el dominio estático.


## Corrección publicada y estado de validación

La interfaz se reconstruyó con `VITE_API_BASE_URL=https://saytaxi-production.up.railway.app`, se publicó en Netlify y el commit `9369b05` se publicó en GitHub. El estado de GitHub para Railway figura como exitoso; sin embargo, la comprobación directa posterior de `https://saytaxi-production.up.railway.app/healthz` continúa devolviendo `502 Application failed to respond`. Esto confirma que el bloqueo restante está en el proceso, las variables o los servicios dependientes de Railway y requiere revisar sus registros de ejecución.
