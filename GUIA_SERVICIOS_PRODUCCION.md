# Guía de conexión de servicios reales — SayTaxi

**Propósito:** conectar pagos, mapas y mensajería en producción sin exponer secretos, sin tratar datos de prueba como operaciones reales y con validación previa en staging.

> Esta guía se basa en la implementación actual del repositorio. La conexión de **Stripe** ya tiene una base de código funcional; los módulos de **mapas** y **mensajería** aún requieren integración de producción adicional. Deben completarse y probarse en staging antes de activar cualquier servicio con usuarios reales.

## 1. Orden seguro de implantación

| Orden | Servicio | Resultado exigido antes de continuar |
|---:|---|---|
| 1 | Base de producción, dominio y secretos | Aplicación disponible por HTTPS y variables guardadas en el gestor de secretos del proveedor. |
| 2 | Mapas | Autocompletado, geocodificación y cálculo de rutas verificados con claves restringidas y cuotas alertadas. |
| 3 | Mensajería | Dominio de correo autenticado, opt-ins registrados y recepción de callbacks probada. |
| 4 | Stripe en sandbox | Checkout, webhook firmado y actualización de suscripción comprobados con claves de prueba. |
| 5 | Stripe live | Un cobro real de importe controlado y su webhook quedan conciliados antes de abrir al público. |

La secuencia evita habilitar cobros o campañas antes de que las dependencias de direcciones, notificaciones y auditoría estén disponibles. Mantén **staging** y **producción** como proyectos, bases de datos y claves diferentes.

## 2. Preparación común de producción

Primero publica SayTaxi en un dominio HTTPS estable, por ejemplo `https://app.tudominio.com`, y define `APP_URL` exactamente con esa URL. La configuración de producción actual ya valida que existan base de datos, secreto de sesión, URL pública, orígenes permitidos y credenciales de superadministración antes del arranque.

| Variable | Ejemplo de producción | Reglas |
|---|---|---|
| `NODE_ENV` | `production` | Debe ser exactamente este valor. |
| `APP_URL` | `https://app.tudominio.com` | Sin barra final; debe usar HTTPS. |
| `ALLOWED_ORIGINS` | `https://app.tudominio.com` | Añade varios orígenes solo si son indispensables, separados por coma. |
| `DATABASE_URL` | `mysql://...` | Usuario con privilegios mínimos para la aplicación; nunca la cuenta raíz. |
| `JWT_SECRET` | valor aleatorio de alta entropía | Generar y guardar exclusivamente en el gestor de secretos. |
| `SUPER_ADMIN_EMAIL` | `admin@tudominio.com` | Cuenta inicial de operación. |
| `SUPER_ADMIN_PASSWORD` | secreto único | Entregar por canal protegido y cambiar después del primer acceso. |

No subas archivos `.env` al repositorio. Usa el gestor de secretos de la plataforma de alojamiento y rota claves inmediatamente si se pegan por error en un commit, ticket o conversación.

## 3. Pagos — Stripe

### 3.1 Alcance que ya está implementado

El archivo `server/routers/payments.ts` crea sesiones de **Stripe Checkout en modo suscripción** para los planes `basic`, `pro` y `enterprise`. El importe se decide en el servidor y no se acepta desde el navegador. El endpoint `POST /api/stripe/webhook` conserva el cuerpo sin procesar, verifica `Stripe-Signature`, guarda el evento de forma idempotente en `billingEvents` y actualiza `userSubscriptions` cuando recibe eventos de checkout o de suscripción.

Stripe indica que Checkout crea una sesión en el servidor, devuelve una URL alojada para el cliente y debe completar la operación mediante webhook, no solamente por el retorno a la página de éxito. [1] El código actual sigue ese patrón.

> **Distinción importante:** la implementación actual cobra una **suscripción a SayTaxi**, no el precio de cada viaje de taxi. Para cobrar viajes individuales con tarjeta se debe añadir un flujo separado de `PaymentIntent` o Checkout con `mode: "payment"`, ligado a `tripId`, con autorización/captura y reembolsos definidos. No reutilices las suscripciones para cobrar un traslado.

### 3.2 Configuración en Stripe

1. Crea una cuenta de Stripe para la entidad legal que recibirá los pagos y completa la verificación empresarial, fiscal y bancaria aplicable a tu país.
2. En el Dashboard de Stripe, empieza en **modo de prueba** y localiza las claves de API. Configura en el gestor de secretos de staging:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Publica staging en una URL HTTPS, por ejemplo `https://staging.tudominio.com`.
4. En Stripe Workbench/Dashboard, crea un destino de eventos para:

```text
https://staging.tudominio.com/api/stripe/webhook
```

5. Suscribe, como mínimo, los eventos que la implementación actual procesa:

| Evento | Uso actual en SayTaxi |
|---|---|
| `checkout.session.completed` | Crea o actualiza la suscripción activa del usuario. |
| `customer.subscription.updated` | Actualiza el estado y la fecha de fin de período. |
| `customer.subscription.deleted` | Actualiza el estado tras cancelación o cierre. |

6. Haz una compra de prueba y comprueba tres elementos: la redirección a `success_url`, una entrega `2xx` en Workbench y una fila en `billingEvents` y `userSubscriptions`.
7. Repite el proceso en **modo live**, pero crea un segundo endpoint con la URL de producción. El secreto `whsec_...` de test y live son diferentes y no intercambiables.

Stripe exige que un endpoint registrado sea públicamente accesible mediante HTTPS y que la firma se verifique usando el cuerpo sin modificar, `Stripe-Signature` y el secreto de ese endpoint. [2] [3] La ruta actual ya se registra antes de `express.json()`, lo cual preserva el cuerpo requerido para verificar la firma.

### 3.3 Prueba local o de staging

Con el servidor en ejecución y la Stripe CLI instalada/autenticada, usa un listener de prueba:

```bash
stripe listen \
  --events checkout.session.completed,customer.subscription.updated,customer.subscription.deleted \
  --forward-to http://localhost:3000/api/stripe/webhook
```

Copia el secreto que imprime la CLI únicamente al archivo de entorno local. Después crea una sesión de prueba desde la interfaz y revisa la entrega. Stripe recomienda este mecanismo de reenvío y permite disparar eventos de prueba desde la CLI antes de pasar a producción. [2]

### 3.4 Endurecimiento recomendado antes de activar live

| Control | Acción concreta |
|---|---|
| Catálogo | Mover los precios a objetos `Product` y `Price` de Stripe o mantener un catálogo interno versionado; no aceptar importes desde el cliente. |
| Eventos | Mantener `billingEvents` idempotente; procesar eventos fuera de orden y usar la API de Stripe si falta información. Stripe no garantiza el orden de entrega. [2] |
| Acceso | Definir qué estados de suscripción habilitan cada función y comprobarlos en procedimientos de servidor. |
| Fallos | Alertar por entregas fallidas y conservar reintentos. Stripe reintenta entregas de webhooks en live durante un periodo limitado. [2] |
| Fraude | Revisar Radar, reembolsos, disputas y criterios de soporte antes de habilitar cobros. |

## 4. Mapas, geocodificación y rutas

### 4.1 Estado actual del proyecto

SayTaxi usa principalmente **Leaflet + teselas CARTO + Nominatim** desde el navegador. También existe `client/src/components/Map.tsx`, que intenta cargar Google Maps mediante un proxy Forge y usa `VITE_FRONTEND_FORGE_API_KEY`; por tanto, la variable `VITE_GOOGLE_MAPS_API_KEY` incluida en `.env.example` **todavía no conecta por sí misma los flujos actuales**.

Para producción no conviene depender de llamadas directas desde cada navegador a Nominatim para autocompletado, geocodificación inversa y confirmación de direcciones. Es preferible centralizar esas solicitudes en el backend, aplicar límites, validar entradas, cachear respuestas y usar un proveedor con contrato y cuotas de producción.

### 4.2 Arquitectura recomendada con Google Maps Platform

Usa dos credenciales independientes, nunca una sola clave sin restricciones.

| Uso | Ubicación | Credencial | Restricción requerida |
|---|---|---|---|
| Mapa interactivo y Places en navegador | Cliente web | `VITE_GOOGLE_MAPS_BROWSER_KEY` | Restricción por **HTTP referrer** para `https://app.tudominio.com/*` y APIs Maps JavaScript/Places. |
| Geocodificación, rutas, distancia y ETA | Backend | `GOOGLE_MAPS_SERVER_KEY` u OAuth donde aplique | Restricción por IP/CIDR de salida del servidor y solo APIs de servidor autorizadas. |

Google exige clave y facturación para uso estándar de Maps JavaScript y recomienda restringir cada clave por aplicación y por API. [4] [5] Para la clave de navegador usa restricciones de sitio; para tráfico de servidor usa restricciones de IP. [5]

### 4.3 Pasos concretos

1. Crea un proyecto de Google Cloud dedicado a producción y vincula la cuenta de facturación.
2. Habilita únicamente las APIs que correspondan al diseño final:

| Función | API probable |
|---|---|
| Mapa en navegador | Maps JavaScript API |
| Autocompletado y detalles de lugares | Places API / Places Library |
| Geocodificación de direcciones | Geocoding API |
| Distancia, ruta y ETA de taxi | Routes API |

3. Crea la clave de navegador, aplica restricciones por sitio y por API, y configura:

```dotenv
VITE_GOOGLE_MAPS_BROWSER_KEY=AIza...
```

4. Crea una clave de servidor distinta, restríngela a la IP de salida de producción y configura:

```dotenv
GOOGLE_MAPS_SERVER_KEY=AIza...
```

5. Cambia `Map.tsx` para leer explícitamente `VITE_GOOGLE_MAPS_BROWSER_KEY` o conserva el proxy Forge solamente si ese proxy es el servicio elegido y admite la clave de Google de forma segura. No dejes variables incoherentes entre `.env.example` y el código.
6. Implementa rutas de backend, por ejemplo `maps.autocomplete`, `maps.geocode` y `maps.routeEstimate`, que reciben consultas limitadas, llaman a Google con la clave de servidor, cachean resultados y devuelven únicamente los campos necesarios al cliente.
7. Sustituye las llamadas directas a `https://nominatim.openstreetmap.org` en `HeroSection`, `NominatimAutocomplete`, `QuickQuoteForm`, `HeroParcelForm` y `AdminDashboard` por estos procedimientos.
8. Actualiza `tripOperations.requestTrip` para calcular la tarifa desde distancia/ETA obtenida por el backend y la regla de precios persistente, no solo mediante distancia de línea recta.
9. Configura presupuestos, alertas de cuota y panel de métricas de Google Cloud. Revisa semanalmente uso por clave durante el lanzamiento.

## 5. Mensajería — correo, WhatsApp y notificaciones

### 5.1 Estado actual del proyecto

El archivo `.env.example` define variables SMTP, pero el panel administrativo bloquea correctamente los envíos porque todavía no existe un proveedor integrado. Esto evita confirmar campañas que no se entregaron, pero la funcionalidad debe implementarse antes de operar.

La recomendación es separar tres canales: correo transaccional, WhatsApp transaccional y notificaciones push. Elige un proveedor principal por canal, guarda consentimientos y estados de entrega, y nunca envíes una campaña directamente dentro del ciclo HTTP de una acción administrativa.

### 5.2 Correo transaccional con SendGrid SMTP

1. Crea una cuenta de SendGrid/Twilio y usa **autenticación de dominio**, no solo un remitente individual, para producción.
2. En **Sender Authentication**, añade el dominio raíz desde el que enviarás; por ejemplo, `tudominio.com` para usar `notificaciones@tudominio.com`.
3. Publica los registros DNS que genere SendGrid y espera la verificación.
4. Crea una API key SMTP con privilegios mínimos y configura secretos:

```dotenv
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG_...
SMTP_FROM=notificaciones@tudominio.com
```

5. Implementa un servicio de correo en el backend, con una tabla `notificationMessages` que almacene `id`, canal, destinatario, plantilla, datos, proveedor, identificador externo, estado, error y marcas de tiempo.
6. Envía en una cola de trabajos con reintentos y límites de velocidad. La interfaz debe mostrar **en cola**, **enviado**, **entregado** o **fallido**, nunca éxito inmediato sin confirmación.

SendGrid recomienda la autenticación completa de dominio para producción y señala que la verificación de un remitente individual sirve solo como alternativa de prueba. [6] [7]

### 5.3 WhatsApp con Twilio

1. Crea una cuenta de Twilio y conecta/verifica la cuenta de Meta Business Manager durante el alta de WhatsApp.
2. Registra y habilita un número de WhatsApp como sender de producción.
3. Crea y consigue aprobación de las plantillas necesarias, por ejemplo: confirmación de reserva, conductor asignado, llegada del conductor, viaje completado y recibo. Fuera de la ventana de atención iniciada por el usuario, WhatsApp exige plantillas aprobadas para notificaciones empresariales. [8]
4. Obtén los secretos y configúralos solo en backend:

```dotenv
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_MESSAGING_SERVICE_SID=MG...
TWILIO_WHATSAPP_FROM=whatsapp:+NUMERO_E164
TWILIO_WEBHOOK_AUTH_TOKEN=...
```

5. Registra consentimiento explícito y reversible del usuario: fecha, canal, número E.164, texto o versión de la autorización, origen y estado de exclusión. Twilio informa que WhatsApp requiere opt-in explícito y respeto de solicitudes de baja. [8]
6. Expón endpoints HTTPS públicos para recepción y estado, por ejemplo:

```text
POST https://app.tudominio.com/api/webhooks/twilio/inbound
POST https://app.tudominio.com/api/webhooks/twilio/status
```

7. Verifica la cabecera `X-Twilio-Signature` en cada callback antes de crear conversaciones, cambiar estados o registrar entregas. Twilio firma sus solicitudes y recomienda validar la firma. [9]
8. Al enviar cada mensaje, envía `statusCallback` y conserva el SID de Twilio; actualiza el estado en la base cuando llegue el callback.

### 5.4 Push notifications

Para web push, configura un proveedor como Firebase Cloud Messaging o un proveedor de mensajería equivalente. Guarda dispositivos/suscripciones por usuario, solicita permiso solo tras una acción explícita del usuario y permite desactivar cada clase de aviso. Las notificaciones de viaje deben ser transaccionales y no reutilizarse para marketing sin consentimiento.

## 6. Prueba y lanzamiento por entorno

| Entorno | Stripe | Mapas | Mensajería | Criterio de paso |
|---|---|---|---|---|
| Desarrollo local | Claves test/CLI | Claves de desarrollo restringidas a `localhost` | Sandboxes o buzones de prueba | Unitarias y pruebas manuales. |
| Staging HTTPS | Stripe test + endpoint de staging | Proyecto/clave de staging | Sender/buzón sandbox y número sandbox | Pruebas E2E de reserva, pago y callbacks. |
| Producción restringida | Live con controles de monitoreo | Claves y cuotas live | Dominio y sender aprobados | Prueba de humo controlada con cuentas internas. |
| Producción pública | Live | Live | Live | Métricas, alertas y plan de reversión activos. |

Antes de activar producción pública, realiza un ensayo que cubra: reserva de taxi, cálculo de ruta, selección de dirección, notificación al cliente, asignación del conductor, checkout de suscripción si corresponde, recepción de cada webhook y conciliación de los estados finales en la base de datos.

## 7. Lista de comprobación final

| Servicio | Lista de aprobación |
|---|---|
| Stripe | [ ] Secretos live en gestor seguro. [ ] Webhook HTTPS configurado. [ ] Firma verificada. [ ] Eventos probados y auditados. [ ] Política de reembolsos, disputas y soporte definida. |
| Google Maps | [ ] Facturación habilitada. [ ] Clave browser con referrers. [ ] Clave server con IPs. [ ] APIs mínimas habilitadas. [ ] Alertas de cuota. [ ] Nominatim directo sustituido o acotado explícitamente. |
| Correo | [ ] Dominio autenticado. [ ] SPF/DKIM/DMARC verificados. [ ] API key SMTP mínima. [ ] Lista de bajas y rebotes procesada. |
| WhatsApp | [ ] Meta Business verificado. [ ] Número de producción habilitado. [ ] Plantillas aprobadas. [ ] Opt-in y opt-out almacenados. [ ] Callbacks con firma verificada. |
| Aplicación | [ ] Secretos fuera del repositorio. [ ] HTTPS. [ ] Copia de seguridad. [ ] Monitoreo. [ ] Pruebas E2E aprobadas. |

## Referencias

[1]: https://docs.stripe.com/payments/checkout/how-checkout-works "How Checkout works — Stripe"
[2]: https://docs.stripe.com/webhooks "Receive Stripe events in your webhook endpoint — Stripe"
[3]: https://docs.stripe.com/webhooks/signature "Resolve webhook signature verification errors — Stripe"
[4]: https://developers.google.com/maps/documentation/javascript/get-api-key "Set up the Maps JavaScript API — Google Maps Platform"
[5]: https://developers.google.com/maps/api-security-best-practices "Google Maps Platform security guidance"
[6]: https://www.twilio.com/docs/sendgrid/ui/account-and-settings/how-to-set-up-domain-authentication "Configure domain authentication — Twilio SendGrid"
[7]: https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity "Sender Identity — Twilio SendGrid"
[8]: https://www.twilio.com/docs/whatsapp/api "Overview of the WhatsApp Business Platform with Twilio"
[9]: https://www.twilio.com/docs/usage/webhooks/getting-started-twilio-webhooks "Getting Started with Twilio Webhooks"
