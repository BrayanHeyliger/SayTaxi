# Arquitectura de seguimiento de taxis en tiempo real — Producción

**Objetivo:** mostrar al cliente, al conductor y al equipo de operaciones la posición autorizada de un taxi durante un viaje, con baja latencia, control de acceso, trazabilidad y capacidad de escalar sin exponer ubicaciones de terceros.

> El seguimiento debe ser un servicio de **telemetría de viaje**, no un mapa público de todos los conductores. Un cliente solo ve al conductor asignado a su viaje activo; el conductor solo publica su propia posición; y el personal operativo ve ubicaciones únicamente según su ámbito de autorización.

## 1. Situación actual de SayTaxi

| Componente actual | Hallazgo | Implicación de producción |
|---|---|---|
| `LeafletMap` | Renderiza el mapa y marcadores correctamente. | Puede conservarse como capa visual inicial. |
| `ClientDashboard` | Anima un conductor ficticio y conserva parte del estado en `localStorage`. | Debe sustituirse por eventos GPS del servidor; nunca usar como fuente operativa. |
| `useSocket` | Se conecta por Socket.IO con reconexión y sala por viaje. | Es la base adecuada para recibir actualizaciones de un viaje. |
| Socket.IO del servidor | Autentica el socket, valida acceso a la sala por viaje y deriva la identidad desde servidor. | Debe ampliarse con eventos de ubicación, manteniendo esa misma validación. |
| Mapas | Hay llamadas directas a Nominatim y un componente alternativo de Google Maps. | La ruta, ETA y geocodificación deben centralizarse en backend con un proveedor apto para producción. |

La base de Socket.IO ya impide que un usuario se una a una sala de viaje ajena. El diseño propuesto conserva esa garantía y añade controles equivalentes para publicar y consumir coordenadas.

## 2. Arquitectura propuesta

```mermaid
flowchart LR
  D[App conductor<br/>GPS del dispositivo] -->|HTTPS / Socket.IO TLS| I[Servicio de ingesta<br/>de ubicación]
  I --> V[Validación, autorización<br/>y antifraude]
  V --> C[(Redis<br/>última posición / PubSub)]
  V --> H[(MySQL<br/>historial resumido)]
  C --> R[Servicio Socket.IO<br/>salas trip:{id}]
  R --> P[Cliente del viaje]
  R --> O[Despacho autorizado]
  C --> E[Motor ETA/ruta<br/>Maps backend]
  E --> R
  H --> A[Auditoría, soporte<br/>y analítica]
```

La posición más reciente es un dato de **baja latencia** y debe vivir en Redis con expiración. El historial necesario para soporte, incidentes, disputas y analítica se persiste en MySQL con menor frecuencia. No es necesario escribir cada punto GPS en MySQL: hacerlo aumenta coste, ruido y riesgo de privacidad sin mejorar el mapa de forma apreciable.

| Capa | Responsabilidad | Tecnología inicial | Escalamiento |
|---|---|---|---|
| App del conductor | Obtiene GPS, filtra ruido, pausa al terminar y reintenta. | Web PWA o app móvil nativa. | Permisos de ubicación y modo de fondo para app móvil. |
| API de ubicación | Autentica, valida pertenencia y recibe coordenadas. | Socket.IO, con fallback HTTPS para recuperación. | Instancias sin estado detrás de balanceador. |
| Posición actual | Conserva la última posición por conductor y viaje. | Redis con TTL. | Redis administrado con TLS, ACL y réplica. |
| Broadcast de viaje | Emite solo a las salas autorizadas. | Socket.IO room `trip:{tripId}`. | Adaptador Redis de Socket.IO. |
| Historial operativo | Registra muestras agregadas y eventos de estado. | MySQL/Drizzle. | Particionado/retención si el volumen lo exige. |
| ETA y ruta | Calcula distancia por carretera y tiempo estimado. | Google Routes/Geocoding API desde backend. | Caché y límites de tasa por viaje. |

## 3. Contrato de eventos

Se debe reservar un nombre de sala inequívoco y no reutilizar la sala de chat como un canal global. Puede mantenerse el identificador del viaje, pero se recomienda el formato `trip:{tripId}` en nuevos eventos para mejorar legibilidad.

### 3.1 Publicación de ubicación por conductor

```ts
socket.emit("trip_location_update", {
  tripId: 1842,
  sequence: 37,
  position: {
    lat: 25.76210,
    lng: -80.19240,
    accuracyM: 12,
    headingDeg: 84,
    speedMps: 8.2,
    capturedAt: "2026-08-16T17:32:40.000Z"
  }
});
```

El servidor no debe aceptar `driverId`, `userId`, nombre ni rol enviados por el navegador. Los deriva de `socket.data.user`, igual que ya lo hace con chat y llamadas. El cliente conductor publica solo si el viaje está asignado a su perfil y en un estado que permite seguimiento, por ejemplo `accepted` o `in_progress`.

### 3.2 Evento reenviado a destinatarios autorizados

```ts
socket.on("trip_location", (event: {
  tripId: number;
  driverId: number;
  position: { lat: number; lng: number; headingDeg?: number; speedMps?: number; accuracyM?: number };
  serverReceivedAt: string;
  etaSeconds?: number;
  stale: boolean;
}) => {
  // Actualizar únicamente el marcador del viaje activo.
});
```

El servicio transmite el mensaje a la sala del viaje y, opcionalmente, a una sala administrativa restringida por zona. El cliente nunca debe inferir conductores cercanos ni recibir posiciones de conductores sin viaje asignado.

### 3.3 Confirmación y recuperación

| Evento | Emisor | Propósito |
|---|---|---|
| `trip_location_update` | Conductor | Publicar una muestra GPS. |
| `trip_location` | Servidor | Entregar una muestra autorizada y validada. |
| `trip_location_ack` | Servidor → conductor | Confirmar la última secuencia procesada. |
| `trip_location_snapshot` | Servidor → cliente/operaciones | Enviar última posición al entrar o reconectar. |
| `trip_location_stale` | Servidor | Indicar que no hay muestra reciente. |
| `trip_tracking_ended` | Servidor | Quitar marcador y detener suscripción al completar/cancelar. |

El `sequence` evita que un paquete retrasado sobrescriba uno más reciente. El servidor debe descartar una actualización si su secuencia o `capturedAt` retrocede respecto al último punto aceptado para ese viaje.

## 4. Ciclo de vida de seguimiento

| Estado del viaje | Publicación del conductor | Visibilidad de cliente | Frecuencia sugerida |
|---|---|---|---|
| `requested` | No. | No hay conductor asignado. | No aplica. |
| `accepted` | Sí, si el conductor ha activado ubicación. | Cliente ve aproximación y ETA. | 8–15 segundos o cambio relevante. |
| `in_progress` | Sí. | Cliente ve ruta en curso según producto. | 10–20 segundos o cambio relevante. |
| `completed` / `cancelled` | Detener y borrar la posición efímera. | Ocultar marcador. | Inmediato. |

El intervalo debe ser **adaptativo**, no fijo. Publica antes si el taxi recorrió más de 25–50 metros, cambió de rumbo significativamente, cambió de estado o transcurrieron 10–15 segundos desde el último envío. En espera o con velocidad baja, reduce frecuencia; al moverse, aumenta moderadamente. La app del conductor debe descartar puntos con precisión inaceptable, por ejemplo mayor de 100 metros, excepto cuando se use solo para marcar estado degradado.

## 5. Validaciones de servidor obligatorias

Cada `trip_location_update` debe ejecutar estos controles antes de redistribuir o persistir:

| Control | Regla sugerida | Acción ante fallo |
|---|---|---|
| Sesión | Socket autenticado y cuenta activa. | Desconectar o rechazar. |
| Rol | Solo rol `driver` publica GPS. | Rechazar y registrar. |
| Propiedad | `drivers.userId` coincide con la sesión y `trips.driverId` coincide con el conductor. | Rechazar. |
| Estado | Viaje en `accepted` o `in_progress`. | Rechazar o detener tracking. |
| Coordenadas | Latitud entre -90/90 y longitud entre -180/180. | Rechazar. |
| Precisión | `accuracyM` dentro de un límite razonable. | Marcar degradado o descartar. |
| Orden | Secuencia y timestamp no retroceden. | Ignorar paquete atrasado. |
| Velocidad | Distancia/tiempo no supera umbral físico configurable. | No emitir; generar alerta de anomalía. |
| Tasa | Máximo de eventos por conductor, por ejemplo 1 cada 3 segundos. | Aplicar rate limit y conservar el último. |

La separación actual de `join_room` y `requireRoom` es una buena base. El nuevo evento debe usar además una consulta específica de propiedad del conductor; no basta con que el conductor esté en la sala porque también el cliente entra a esa misma sala.

## 6. Datos y retención

### Redis: estado en tiempo real

```text
trip:{tripId}:location        -> JSON de última posición, TTL 120 s
trip:{tripId}:sequence        -> número de última secuencia, TTL 120 s
driver:{driverId}:activeTrip  -> tripId, TTL sincronizado al viaje
```

Actualiza el TTL con cada posición válida. Si expira, emite `trip_location_stale` y muestra al cliente “actualización de ubicación interrumpida” en vez de una falsa ETA.

### MySQL: trazabilidad compacta

Se recomienda una tabla `tripLocationSamples` con `tripId`, `driverId`, coordenadas redondeadas según política, precisión, rumbo, velocidad, origen, `capturedAt` y `receivedAt`. No persistas cada punto a máxima frecuencia: guarda puntos al producirse un cambio material, cada 30–60 segundos durante una carrera o al cambiar de estado. Define una retención, por ejemplo 30 días operativos y agregados anonimizados a más largo plazo solo si existe una finalidad documentada.

## 7. ETA, ruta y mapa

El backend debe ser el único que llama al servicio de rutas con una clave de servidor restringida. Cada vez que se acepte una ubicación, recalcula ETA solo cuando exista un cambio material: inicio de seguimiento, desviación de ruta, cada 30–60 segundos o cuando el viaje entre a una nueva fase. Cachea una ETA corta por `tripId` para evitar solicitudes en cada muestra GPS.

| Función | Fuente | Resultado en interfaz |
|---|---|---|
| Coordenada actual | GPS del conductor validado. | Marcador animado, sin interpolar hacia una posición inexistente. |
| Ruta a recogida | API de rutas desde backend. | Línea de aproximación y ETA al cliente. |
| Ruta en viaje | API de rutas desde backend. | Progreso y ETA al destino, si el producto lo requiere. |
| Dirección legible | Geocodificación backend/cacheada. | Texto de recogida y destino, no la fuente de verdad del GPS. |

No expongas la clave de servidor de Maps al navegador. La clave de navegador, si se usa para renderizar Maps JavaScript/Places, debe estar restringida por dominios HTTPS y por APIs. Google recomienda aplicar simultáneamente restricciones de aplicación y de API; si se usan diferentes plataformas, deben existir claves separadas. [1]

## 8. Privacidad, consentimiento y seguridad

La ubicación de un conductor es información personal y operativa sensible. Antes de activar seguimiento en producción, documenta el propósito, la base de consentimiento o interés operativo aplicable, la retención, el acceso de soporte y el proceso de eliminación conforme a la jurisdicción aplicable.

| Principio | Implementación en SayTaxi |
|---|---|
| Mínima exposición | Cliente solo recibe el conductor de su viaje activo. |
| Fin de seguimiento | El TTL vence y se envía `trip_tracking_ended` tras completar/cancelar. |
| Acceso por necesidad | Administradores/despachadores se autorizan por rol, zona y viaje. |
| Auditoría | Registrar quién consultó historial y qué acción operativa realizó. |
| Precisión limitada | Redondear o reducir precisión histórica si no se requiere exactitud total. |
| Transparencia | Mostrar al conductor cuándo comparte ubicación y al cliente el estado de actualización. |
| Revocación | Gestionar permisos de ubicación del dispositivo; si se revocan, indicar estado degradado al despacho. |

## 9. Escalamiento de Socket.IO

La versión actual mantiene estado de chat en memoria y funciona para una sola instancia. En producción con varias instancias, mueve el broadcast entre nodos a Redis usando `@socket.io/redis-adapter`; el adaptador publica los paquetes a otros servidores conectados al clúster. [2] Redis debe estar en red privada, con TLS, ACL, autenticación y credenciales dedicadas, porque el adaptador no cifra ni firma los paquetes por sí mismo. [2]

| Fase | Infraestructura | Decisión |
|---|---|---|
| Beta cerrada | Una instancia Socket.IO + MySQL + Redis. | Suficiente para validar la experiencia; habilitar respaldos y monitoreo. |
| Crecimiento inicial | 2–3 instancias Socket.IO + Redis adapter + balanceador. | Configurar afinidad de sesión si se conserva long-polling. |
| Escala | Redis administrado/cluster, workers separados de ETA y observabilidad. | Usar partición por zona, métricas y pruebas de carga. |

Socket.IO explica que, al balancear varias instancias, se deben manejar afinidad de sesión y reenvío de mensajes entre servidores; el Redis adapter necesita sesiones pegajosas si se conserva HTTP long-polling. [2] [3] Como el cliente actual permite `websocket` y `polling`, configura afinidad en el balanceador. Si en el futuro se permite solo WebSocket, esa necesidad se reduce, a costa de compatibilidad de red. [3]

La recuperación de estado de Socket.IO puede ayudar con desconexiones breves, pero no debe ser la fuente de verdad de GPS. Aun con recuperación, el cliente debe solicitar `trip_location_snapshot` al reconectar porque la recuperación no siempre tiene éxito. [4]

## 10. Plan de implementación por etapas

| Etapa | Entregable | Prueba de aceptación |
|---:|---|---|
| 1 | Migración `tripLocationSamples`, índices, servicio Redis y TTL. | Un punto válido se escribe en Redis y expira correctamente. |
| 2 | Evento `trip_location_update` con autorización estricta y rate limit. | Un cliente no puede publicar; un conductor de otro viaje es rechazado. |
| 3 | Snapshot y broadcast por sala de viaje. | Cliente asignado ve el marcador en menos de 2 segundos; otro cliente no recibe el evento. |
| 4 | Integración Routes/ETA desde backend. | ETA se actualiza sin exceder cuota y coincide con una ruta válida. |
| 5 | Pantalla de conductor con GPS real y control de permisos. | Revocar ubicación provoca aviso al usuario y estado `stale` al despacho. |
| 6 | Redis adapter, balanceador, métricas y prueba de carga. | Reconexiones y actualizaciones se mantienen al distribuir instancias. |
| 7 | Auditoría, retención y revisión de privacidad. | Historial accesible solo a roles autorizados y depurado según política. |

## 11. Métricas y alertas

| Métrica | Alerta inicial |
|---|---|
| Posiciones recibidas por viaje activo | Caída abrupta frente a viajes en curso. |
| Edad de última ubicación | Más de 60 segundos en viaje activo. |
| Rechazos de autorización GPS | Incremento sostenido o intento de suplantación. |
| Precisión mediana | Superior a 50–100 metros de forma persistente. |
| Latencia GPS a cliente | Percentil 95 superior a 2–3 segundos. |
| Errores del proveedor de rutas | Aumento sostenido o cuota cercana al límite. |
| Redis/Socket.IO | Desconexiones, memoria, conexiones activas y mensajes descartados. |

## Referencias

[1]: https://developers.google.com/maps/api-security-best-practices "Google Maps Platform security guidance"
[2]: https://socket.io/docs/v4/redis-adapter/ "Redis adapter — Socket.IO"
[3]: https://socket.io/docs/v4/using-multiple-nodes/ "Using multiple nodes — Socket.IO"
[4]: https://socket.io/docs/v4/connection-state-recovery/ "Connection state recovery — Socket.IO"
