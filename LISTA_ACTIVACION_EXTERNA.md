# Lista de activación externa — SayTaxi

Este documento aplica los pasos que deben completarse fuera del repositorio para abrir una beta hospedada. No contiene secretos y no debe sustituirse por credenciales reales dentro de Git.

## 1. Preparación ya aplicada localmente

| Componente | Estado actual | Comprobación disponible |
|---|---|---|
| Esquema de base de datos | Migraciones `0000` a `0004` listas y aplicadas en staging local. | `pnpm db:push` con `DATABASE_URL` del entorno destino. |
| Configuración | Plantilla `.env.example` y validador de entorno listos. | `pnpm verify:env staging` o `pnpm verify:env production`. |
| Calidad | Tipos, pruebas, compilación y CI listos. | `pnpm verify:release`. |
| Reserva | Flujo persistente de staging probado. | `pnpm test:staging:reservation`. |
| Telemetría | Redis y canal God’s Eye implementados. | `pnpm test:load:telemetry` en staging con servidor activo. |
| Monitoreo | Endpoint HTTP de salud implementado. | `GET /healthz`. |

## 2. Variables que debe cargar el propietario en el hosting

| Grupo | Variables | Condición de activación |
|---|---|---|
| Núcleo | `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `ALLOWED_ORIGINS`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` | Obligatorias para producción. |
| Telemetría | `TELEMETRY_ENABLED=true`, `REDIS_URL` | Obligatorias si se activa GPS/God’s Eye. |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Obligatorias para cobro con tarjeta. |
| Mapas | `GOOGLE_MAPS_API_KEY` | Necesaria para proveedor de geocodificación/rutas configurado. |
| Correo | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Necesarias para mensajes por correo. |
| WhatsApp | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Necesarias si se habilita WhatsApp. |

> Carga estos valores exclusivamente en el gestor de secretos del proveedor de hosting. No los copies a `.env.example`, GitHub, archivos adjuntos ni conversaciones.

## 3. Activación en orden seguro

1. Crea un entorno de **staging hospedado** con MySQL, Redis privado, HTTPS y una URL temporal.
2. Carga las variables mínimas de núcleo y telemetría. Ejecuta `pnpm verify:env staging` desde el entorno hospedado.
3. Aplica las migraciones. Comprueba `GET /healthz` y ejecuta `pnpm test:staging:reservation`.
4. Crea una cuenta de Stripe en modo de prueba, registra el webhook en `https://<staging>/api/stripe/webhook` y realiza una compra de prueba.
5. Configura la clave de mapas con restricciones por dominio para navegador y por IP/servidor para operaciones backend; prueba geocodificación y ruta.
6. Configura correo o WhatsApp inicialmente para destinatarios internos; verifica entrega y registro de errores antes de activar comunicaciones masivas.
7. Ejecuta una prueba de navegador completa con un administrador, un cliente y un conductor: solicitud, asignación, GPS, God’s Eye, cierre y pago.
8. Repite los pasos con variables de producción y abre una beta limitada, no una campaña pública inicial.

## 4. Intervención mínima del propietario

| Acción | Por qué requiere intervención del propietario |
|---|---|
| Elegir hosting y conectar dominio | El proveedor exige control de cuenta, método de pago y DNS. |
| Crear MySQL/Redis administrados | Se requieren región, plan, red y política de respaldo propias. |
| Verificar Stripe | Stripe valida identidad y cuenta bancaria del negocio. |
| Activar mapas | El proveedor exige proyecto de facturación y restricciones de clave. |
| Verificar correo/WhatsApp | Los proveedores verifican remitente, número y/o negocio. |
| Aceptar textos legales | Privacidad, ubicación y condiciones deben adaptarse a la jurisdicción de operación. |

## 5. Criterio de apertura de beta

La beta puede abrirse cuando el entorno hospedado tenga `verify:env` aprobado sin errores, `/healthz` responda `200`, el recorrido completo se complete con servicios reales habilitados según alcance, y los accesos de administrador/cliente/conductor hayan sido verificados desde navegador. Las advertencias de integraciones no utilizadas pueden mantenerse; las de un servicio que se vaya a ofrecer a usuarios deben resolverse antes de activarlo.
