# Plan de pruebas de carga — Telemetría de taxis en tiempo real

**Objetivo:** demostrar, en staging aislado, que el servicio Socket.IO y Redis de SayTaxi admite **cientos de conductores conectados simultáneamente** sin perder autorización, orden de eventos, frescura de ubicación ni estabilidad operativa.

> No ejecutes estas pruebas contra producción ni contra el staging compartido con pruebas manuales. Utiliza un entorno dedicado, cuentas ficticias, una base de datos desechable y un Redis exclusivo. La prueba de carga también es tráfico de alto volumen y puede consumir cuotas de mapas, base de datos y mensajería si no se aíslan esos servicios.

## 1. Herramienta adecuada

Socket.IO tiene protocolo propio —handshake, heartbeats y codificación de paquetes—, por lo que la propia documentación recomienda usar el cliente Socket.IO para crear muchos clientes o una herramienta que implemente el protocolo, como Artillery. [1] Para este proyecto se recomienda una combinación de dos tipos de prueba.

| Herramienta | Uso recomendado | Motivo |
|---|---|---|
| `socket.io-client` en un generador Node.js | Prueba principal de telemetría. | Reproduce el handshake, las salas, acknowledgements y los eventos `trip_location_update`/`trip_location`. |
| Artillery con motor Socket.IO compatible | Rampas sencillas de conexión, emisión y acknowledgements. | Su DSL es útil para escenarios cliente→servidor; Socket.IO la menciona como opción de carga. [1] |
| k6 | APIs HTTP/tRPC auxiliares, health checks, webhooks y WebSocket puro si se usa un gateway nativo. | k6 recomienda su módulo `k6/websockets` para pruebas WebSocket nuevas, pero no sustituye por sí solo un cliente Socket.IO completo. [2] |
| Grafana/Prometheus u observabilidad del hosting | Correlación entre carga y CPU, memoria, Redis, MySQL y red. | Permite decidir con evidencia si el cuello está en el servidor, Redis, DB o balanceador. |

## 2. Modelo de tráfico de referencia

El conductor no debe enviar una posición cada segundo de forma sostenida. Para una beta, usa actualización adaptativa con un máximo habitual de una muestra cada 10 segundos y una reducción adicional cuando el vehículo está detenido. Las pruebas deben incluir un caso normal, otro de máxima frecuencia permitida y picos sincronizados.

| Escenario | Conductores | Intervalo | Eventos entrantes/s | Destinatarios promedio por actualización | Entregas/s estimadas |
|---|---:|---:|---:|---:|---:|
| Base | 200 | 10 s | 20.00 | 2 | 40.00 |
| Objetivo beta | 500 | 10 s | 50.00 | 2 | 100.00 |
| Pico razonable | 500 | 5 s | 100.00 | 2 | 200.00 |
| Estrés | 1,000 | 5 s | 200.00 | 2 | 400.00 |
| Límite de rate limiter | 500 | 3 s | 166.66 | 3 | 499.98 |

Las estimaciones suponen que cada ubicación llega a un cliente y a un observador operativo. Si una sala tiene más suscriptores, las entregas crecen linealmente; por eso el escenario de operaciones debe ser explícito y no mezclarse con el tráfico normal de clientes.

## 3. Preparación del entorno

| Recurso | Configuración requerida |
|---|---|
| Aplicación | Misma imagen y configuración de runtime que producción, salvo secretos y cuotas. |
| Socket.IO | TLS, autenticación, autorización de sala y telemetría habilitados. Desactivar envíos reales de correo, WhatsApp y Stripe. |
| Redis | Instancia exclusiva de prueba, con métricas de memoria, CPU, latencia y conexiones. |
| MySQL | Base desechable con índices y esquema de producción. No usar la base de staging funcional. |
| Datos | Al menos 1,000 conductores, 1,000 clientes y viajes con asociaciones válidas. |
| Mapas | Mock o caché de ETA; no invocar APIs externas por cada coordenada durante la carga. |
| Observabilidad | Dashboards de proceso Node.js, Socket.IO, Redis, MySQL, balanceador y red. |
| Generadores | Ejecutar desde una o varias máquinas separadas del servidor probado. |

Crea tokens/sesiones reales de prueba antes de la carga. No eludas autenticación para “hacer más fácil” el generador: la prueba debe cubrir el coste real del middleware de sesión y de la validación de propiedad del viaje.

## 4. Escenarios de prueba recomendados

### A. Conectividad y autenticación incremental

Conecta 50, 100, 200, 300 y 500 pares de conductor/cliente, con una rampa de 20–50 conexiones nuevas por segundo. Cada conductor entra exclusivamente en la sala de su viaje y cada cliente se une a la misma sala.

| Métrica | Umbral inicial sugerido |
|---|---|
| Conexiones establecidas | ≥ 99% de las conexiones planificadas. |
| Fallos de autenticación inesperados | < 0.5%. |
| Tiempo de conexión, p95 | < 2 segundos. |
| Tiempo de conexión, p99 | < 5 segundos. |
| Desconexiones no solicitadas durante 10 min | < 1% de sockets activos. |

Esta prueba detecta límites de descriptores, cookies/sesiones defectuosas, CORS, balanceador y memoria de Socket.IO antes de introducir carga de mensajes.

### B. Carga normal de telemetría — objetivo beta

Mantén **500 conductores**, cada uno con un cliente observador, durante 30 minutos. Cada conductor publica una posición válida cada 10 segundos, con `sequence` creciente y coordenadas que avanzan de forma plausible. Esto genera aproximadamente 50 actualizaciones entrantes por segundo y 100 entregas por segundo.

| Métrica | Umbral inicial sugerido |
|---|---|
| Acknowledgement de `trip_location_update`, p95 | < 250 ms. |
| Acknowledgement, p99 | < 500 ms. |
| Latencia end-to-end conductor → cliente, p95 | < 1 s. |
| Latencia end-to-end, p99 | < 2 s. |
| Eventos de ubicación perdidos | < 0.1%. |
| Eventos fuera de orden aceptados | 0. |
| Ubicaciones de otro viaje recibidas | 0. |
| Errores de Redis/MySQL | < 0.1% y sin degradación progresiva. |

Mide la latencia end-to-end al incluir un `capturedAt`, capturar `serverReceivedAt` en el broadcast y registrar la hora de recepción del cliente observador. La latencia debe calcularse con relojes sincronizados o desde un generador único para evitar falsos positivos.

### C. Pico sincronizado

Los teléfonos pueden recuperar conectividad al mismo tiempo, por ejemplo después de atravesar una zona sin cobertura. Con 500 conductores conectados, provoca un burst de una actualización por conductor durante 1–2 segundos y vuelve al intervalo normal.

**Aprobación:** no debe caerse el proceso ni bloquearse Redis; se permiten respuestas `RATE_LIMITED` si esa es la política, pero no pérdida de autorización, corrupción de secuencia ni crecimiento de cola que dure más de 30 segundos.

### D. Estrés por encima del objetivo

Incrementa gradualmente hasta 1,000 conductores y 1,000 clientes, con posición cada 5 segundos durante 15–20 minutos. El objetivo no es aprobar el mismo SLO estricto de la beta, sino encontrar el punto donde aumentan la latencia, los descartes o la memoria.

| Señal | Interpretación |
|---|---|
| CPU de Node.js sostenida > 75–80% | Añadir capacidad o reducir trabajo por evento. |
| Memoria aumenta sin estabilizarse | Posible fuga de sockets, listeners o buffers. |
| Redis p99 de comandos aumenta | Ajustar tamaño, red, pipeline, TTL o cargas de Pub/Sub. |
| MySQL se degrada al aumentar mensajes | Reducir persistencia de muestras; usar cola/batching. |
| Latencia aumenta solo en multiinstancia | Revisar Redis adapter, red interna y afinidad de sesión. |

### E. Soak test de resistencia

Mantén 300–500 conductores durante **2–4 horas** con la frecuencia normal. Introduce pequeñas variaciones en ubicación y ciclos de entrada/salida. Este escenario es el más útil para detectar fugas de memoria, acumulación de datos efímeros, agotamiento de conexiones de DB y crecimiento del historial.

**Aprobación:** la memoria y los descriptores deben estabilizarse tras el periodo de calentamiento; no deben aparecer reconexiones en cascada, crecimiento continuo de latencia ni acumulación de claves Redis después de que terminen viajes.

### F. Reconexión y recuperación de red

Durante la carga normal, desconecta de forma controlada 5% de conductores y 5% de clientes cada minuto; reconéctalos tras 5–15 segundos. Cada cliente debe solicitar `trip_location_snapshot` al volver.

| Caso | Resultado esperado |
|---|---|
| Conductor reconecta | Restablece sesión, se une a su sala y continúa con la siguiente secuencia. |
| Cliente reconecta | Recibe último snapshot válido, no una posición antigua de otro viaje. |
| Posición expirada | El cliente recibe estado `stale`, no ETA engañosa. |
| Recuperación fallida | Sincronización explícita por snapshot. |

La recuperación de estado de Socket.IO ayuda a reconexiones temporales, pero no se garantiza en todos los casos; la sincronización por snapshot sigue siendo necesaria. [3]

### G. Seguridad y abuso bajo carga

Inyecta una mezcla controlada de clientes maliciosos simulados, por ejemplo 1–5% de la carga, sin salir del staging.

| Prueba negativa | Resultado exigido |
|---|---|
| Cliente intenta `trip_location_update` | Rechazo `FORBIDDEN`; no escritura en Redis. |
| Conductor publica para otro `tripId` | Rechazo `NOT_ASSIGNED_TO_TRIP`. |
| Posición con `accuracyM` alto o coordenadas inválidas | Rechazo controlado. |
| Secuencia repetida o menor | Ignorada; no sobrescribe última ubicación. |
| 10 eventos/s desde un conductor | Rate limit sin afectar a otros viajes. |
| Cambios de ubicación físicamente imposibles | Evento descartado y métrica de anomalía. |

La prueba debe demostrar que los controles de seguridad siguen funcionando cuando el servidor está ocupado; no basta con probarlos de manera aislada con una sola conexión.

### H. Multiinstancia y Redis adapter

Despliega al menos dos instancias Socket.IO detrás del balanceador. Coloca conductor y cliente de un mismo viaje en nodos diferentes y confirma que el broadcast atraviesa Redis. Repite con 500 conductores. El adaptador Redis propaga paquetes entre nodos, pero Redis debe considerarse infraestructura confiable y protegida. [4]

Si el cliente permite `polling` como fallback, configura afinidad de sesión en el balanceador. Socket.IO indica que las sesiones pegajosas son necesarias para ese modelo incluso con Redis adapter. [4] [5]

### I. Degradación de dependencias

Ejecuta en staging controlado, no en producción.

| Fallo inducido | Comportamiento esperado |
|---|---|
| Redis no disponible | Alertar; limitar el broadcast a la instancia local o degradar explícitamente; no confirmar persistencia inexistente. |
| MySQL lento | El hot path sigue mostrando última ubicación Redis; la persistencia histórica se atrasa o se muestrea. |
| Una instancia Socket.IO cae | El balanceador reconecta; cliente solicita snapshot. |
| Proveedor de rutas lento | Se conserva última ETA con marca de antigüedad; no bloquear ubicación GPS. |

## 5. Instrumentación mínima del servidor

Expón métricas etiquetadas por entorno y versión de despliegue. Evita etiquetas con `tripId`, `driverId` o teléfonos porque generan cardinalidad excesiva y exponen datos.

| Métrica | Tipo | Etiquetas seguras |
|---|---|---|
| `telemetry_updates_total` | Counter | `result`, `reason`, `trip_status` |
| `telemetry_ack_duration_ms` | Histogram | `result` |
| `telemetry_e2e_duration_ms` | Histogram | `source` |
| `telemetry_active_trip_locations` | Gauge | Ninguna o `zone` agregada. |
| `telemetry_stale_locations_total` | Counter | `trip_status` |
| `socket_connections_active` | Gauge | `role` |
| `socket_disconnects_total` | Counter | `reason`, `role` |
| `redis_command_duration_ms` | Histogram | `command` |
| `telemetry_samples_persisted_total` | Counter | `reason` (`time`/`distance`). |

## 6. Ejecución segura

1. Congela cambios de aplicación durante la prueba y registra el commit/imagen desplegada.
2. Verifica que no se envíen Stripe, correo, WhatsApp ni llamadas de Maps reales.
3. Ejecuta primero 10 minutos a 50 conductores; revisa logs y métricas antes de subir la rampa.
4. Ejecuta los escenarios A–G en una sola instancia para hallar límites de aplicación.
5. Ejecuta H en dos instancias con Redis y balanceador para validar el modelo de producción.
6. Ejecuta I solo con ventana de mantenimiento de staging y observadores presentes.
7. Guarda los resultados, dashboards y configuración de generadores; compara cada nueva versión contra la línea base.

Usa thresholds que fallen automáticamente el run cuando no se cumpla el SLO. k6 denomina a estos criterios de paso/fallo **thresholds**, útiles para codificar SLOs y automatizar la decisión. [6]

## 7. Criterio de decisión para beta

| Resultado | Decisión |
|---|---|
| Escenario B aprobado, pruebas negativas 100% bloqueadas, no hay fugas en soak y Redis multiinstancia funciona | Apto para beta de hasta 500 conductores activos, sujeto a monitoreo. |
| Escenario B pasa pero H falla | Apto solo para una instancia; no escalar horizontalmente todavía. |
| Latencia p99 o tasa de errores supera el objetivo | Optimizar y repetir; no incrementar capacidad solo a ciegas. |
| Soak genera crecimiento continuo de memoria o claves | Corregir limpieza/TTL antes de beta. |
| Seguridad falla en cualquier prueba negativa | Bloqueador de lanzamiento. |

## Referencias

[1]: https://socket.io/docs/v4/load-testing/ "Load testing — Socket.IO"
[2]: https://grafana.com/docs/k6/latest/using-k6/protocols/websockets/ "WebSockets — Grafana k6"
[3]: https://socket.io/docs/v4/connection-state-recovery/ "Connection state recovery — Socket.IO"
[4]: https://socket.io/docs/v4/redis-adapter/ "Redis adapter — Socket.IO"
[5]: https://socket.io/docs/v4/using-multiple-nodes/ "Using multiple nodes — Socket.IO"
[6]: https://grafana.com/docs/k6/latest/using-k6/thresholds/ "Thresholds — Grafana k6"
