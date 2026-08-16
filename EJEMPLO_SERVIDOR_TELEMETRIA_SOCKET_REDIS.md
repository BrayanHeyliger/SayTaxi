# Ejemplo de servidor: telemetría de conductor con Socket.IO y Redis

Este ejemplo se integra con el diseño actual de SayTaxi: el socket ya se autentica y `socket.data.user` contiene la identidad comprobada por el servidor. El módulo añade un evento `trip_location_update`, valida que el conductor pertenece al viaje y emite la actualización solo a la sala de ese viaje.

> **Antes de usarlo:** instala las dependencias y configura Redis en una red privada. El adaptador de Redis de Socket.IO permite propagar broadcasts entre instancias, pero Redis debe tener TLS, autenticación, ACL y no exponerse a Internet. [1]

```bash
pnpm add redis @socket.io/redis-adapter zod
```

## 1. Módulo de telemetría

Guarda el siguiente archivo como `server/realtime/telemetry.ts`.

```ts
import type { Server, Socket } from "socket.io";
import { createClient, type RedisClientType } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { z } from "zod";
import { rawMutate, rawQuery } from "../db";

const LOCATION_TTL_SECONDS = 120;
const MIN_UPDATE_INTERVAL_MS = 3_000;
const MAX_ACCURACY_METERS = 100;
const MAX_PLAUSIBLE_SPEED_MPS = 60; // 216 km/h: detectar GPS anómalo, no aplicar sanción automática.
const PERSIST_EVERY_MS = 30_000;
const PERSIST_AFTER_METERS = 100;

const locationPayloadSchema = z.object({
  tripId: z.number().int().positive(),
  sequence: z.number().int().nonnegative(),
  position: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracyM: z.number().min(0).max(10_000),
    headingDeg: z.number().min(0).max(360).optional(),
    speedMps: z.number().min(0).max(100).optional(),
    capturedAt: z.string().datetime(),
  }),
});

type LocationPayload = z.infer<typeof locationPayloadSchema>;

type SocketUser = {
  id: number;
  role: string;
  name: string;
};

type LastLocation = LocationPayload["position"] & {
  sequence: number;
  driverId: number;
  serverReceivedAt: string;
  persistedAt?: string;
};

type TripDriver = {
  tripId: number;
  driverId: number;
  driverUserId: number;
  status: "requested" | "accepted" | "in_progress" | "completed" | "cancelled";
};

function tripRoom(tripId: number) {
  // Compatibilidad con SayTaxi actual: join_room usa String(roomId).
  // Si migra a "trip:{id}", cambie esta función y todos los joins de forma conjunta.
  return String(tripId);
}

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 6_371_000;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(x));
}

async function getTripDriver(tripId: number): Promise<TripDriver | null> {
  const rows = await rawQuery<TripDriver>(
    `SELECT t.id AS tripId, t.driverId, d.userId AS driverUserId, t.status
       FROM trips t
       INNER JOIN drivers d ON d.id = t.driverId
      WHERE t.id = ?
      LIMIT 1`,
    [tripId],
  );
  return rows[0] ?? null;
}

async function persistSample(input: {
  tripId: number;
  driverId: number;
  position: LocationPayload["position"];
  receivedAt: string;
}) {
  // Crear previamente tripLocationSamples en una migración de Drizzle.
  await rawMutate(
    `INSERT INTO tripLocationSamples
      (tripId, driverId, latitude, longitude, accuracyM, headingDeg, speedMps, capturedAt, receivedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.tripId,
      input.driverId,
      input.position.lat,
      input.position.lng,
      input.position.accuracyM,
      input.position.headingDeg ?? null,
      input.position.speedMps ?? null,
      new Date(input.position.capturedAt),
      new Date(input.receivedAt),
    ],
  );
}

export async function configureTelemetry(io: Server, redisUrl: string) {
  // Se usan clientes dedicados para evitar compartir permisos con otros módulos.
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();
  const cacheClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect(), cacheClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  async function lastLocation(tripId: number): Promise<LastLocation | null> {
    const raw = await cacheClient.get(`trip:${tripId}:location`);
    return raw ? JSON.parse(raw) as LastLocation : null;
  }

  async function sendSnapshot(socket: Socket, tripId: number) {
    const location = await lastLocation(tripId);
    if (!location) return;
    socket.emit("trip_location_snapshot", {
      tripId,
      position: location,
      stale: Date.now() - Date.parse(location.serverReceivedAt) > 60_000,
    });
  }

  // Llamar esta función inmediatamente después del join_room autorizado existente.
  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;

    socket.on("trip_location_snapshot_request", async ({ tripId }: { tripId: number }) => {
      if (!socket.rooms.has(tripRoom(tripId))) return;
      await sendSnapshot(socket, tripId);
    });

    socket.on(
      "trip_location_update",
      async (rawPayload: unknown, acknowledge?: (reply: unknown) => void) => {
        try {
          const payload = locationPayloadSchema.parse(rawPayload);

          if (user.role !== "driver") {
            return acknowledge?.({ ok: false, code: "FORBIDDEN" });
          }

          // Una muestra solo es válida si corresponde al conductor asignado y al viaje activo.
          const trip = await getTripDriver(payload.tripId);
          if (!trip || trip.driverUserId !== user.id) {
            return acknowledge?.({ ok: false, code: "NOT_ASSIGNED_TO_TRIP" });
          }
          if (!["accepted", "in_progress"].includes(trip.status)) {
            return acknowledge?.({ ok: false, code: "TRIP_NOT_TRACKABLE" });
          }

          // Exigir que el conductor haya pasado por el join autorizado de esa sala.
          const room = tripRoom(payload.tripId);
          if (!socket.rooms.has(room)) {
            return acknowledge?.({ ok: false, code: "ROOM_NOT_JOINED" });
          }

          if (payload.position.accuracyM > MAX_ACCURACY_METERS) {
            return acknowledge?.({ ok: false, code: "LOW_ACCURACY" });
          }

          const now = new Date().toISOString();
          const cacheKey = `trip:${payload.tripId}:location`;
          const previous = await lastLocation(payload.tripId);

          if (previous && payload.sequence <= previous.sequence) {
            return acknowledge?.({ ok: true, ignored: "OUT_OF_ORDER", sequence: previous.sequence });
          }

          if (previous) {
            const elapsedSeconds = (Date.parse(payload.position.capturedAt) - Date.parse(previous.capturedAt)) / 1_000;
            const movedMeters = distanceMeters(previous, payload.position);
            const computedSpeed = elapsedSeconds > 0 ? movedMeters / elapsedSeconds : Infinity;

            if (elapsedSeconds >= 0 && elapsedSeconds < MIN_UPDATE_INTERVAL_MS / 1_000) {
              return acknowledge?.({ ok: true, ignored: "RATE_LIMITED", sequence: previous.sequence });
            }
            if (computedSpeed > MAX_PLAUSIBLE_SPEED_MPS) {
              // Guardar métrica/alerta de anomalía; no difundir una posición sospechosa.
              return acknowledge?.({ ok: false, code: "IMPLAUSIBLE_MOVEMENT" });
            }
          }

          const location: LastLocation = {
            ...payload.position,
            sequence: payload.sequence,
            driverId: trip.driverId,
            serverReceivedAt: now,
          };

          // TTL: si el conductor deja de reportar, el estado se invalida solo.
          await cacheClient.set(cacheKey, JSON.stringify(location), { EX: LOCATION_TTL_SECONDS });
          await cacheClient.set(`trip:${payload.tripId}:sequence`, String(payload.sequence), { EX: LOCATION_TTL_SECONDS });

          const hasMovedEnough = !previous || distanceMeters(previous, location) >= PERSIST_AFTER_METERS;
          const isPersistenceDue = !previous?.persistedAt ||
            Date.now() - Date.parse(previous.persistedAt) >= PERSIST_EVERY_MS;

          if (hasMovedEnough || isPersistenceDue) {
            await persistSample({ tripId: payload.tripId, driverId: trip.driverId, position: payload.position, receivedAt: now });
            location.persistedAt = now;
            await cacheClient.set(cacheKey, JSON.stringify(location), { EX: LOCATION_TTL_SECONDS });
          }

          // Solo miembros de la sala ya autorizada reciben la coordenada.
          io.to(room).emit("trip_location", {
            tripId: payload.tripId,
            driverId: trip.driverId,
            position: payload.position,
            serverReceivedAt: now,
            stale: false,
          });

          return acknowledge?.({ ok: true, sequence: payload.sequence, serverReceivedAt: now });
        } catch (error) {
          // Evitar devolver detalles internos de validación o base de datos al conductor.
          console.warn("[telemetry] rejected location update", error);
          return acknowledge?.({ ok: false, code: "INVALID_LOCATION_PAYLOAD" });
        }
      },
    );
  });

  // Debe invocarse desde el manejador de estado de viaje al completar o cancelar.
  async function endTripTracking(tripId: number) {
    const room = tripRoom(tripId);
    await cacheClient.del(`trip:${tripId}:location`, `trip:${tripId}:sequence`);
    io.to(room).emit("trip_tracking_ended", { tripId, endedAt: new Date().toISOString() });
  }

  return { endTripTracking };
}
```

## 2. Integración mínima en el servidor existente

En `server/_core/index.ts`, después de crear `io` y antes de aceptar conexiones, inicializa el módulo con una URL privada de Redis:

```ts
import { configureTelemetry } from "../realtime/telemetry";

const telemetry = await configureTelemetry(io, process.env.REDIS_URL!);
(app as any).telemetry = telemetry;
```

Después del `socket.join(roomId)` actual en `join_room`, llama al snapshot:

```ts
socket.emit("trip_location_snapshot_request", { tripId: Number(roomId) });
```

La alternativa más eficiente es exportar un método `sendSnapshot` desde el módulo y llamarlo directamente desde el handler `join_room`, en lugar de emitir un evento de ida y vuelta.

Al completar o cancelar un viaje en las mutaciones de servidor, termina el tracking:

```ts
const telemetry = (ctx.req.app as any).telemetry;
await telemetry?.endTripTracking(input.tripId);
```

En una aplicación Express conviene guardar la referencia en `app.locals.telemetry` y exponerla mediante el contexto tRPC de forma tipada, en vez de utilizar `any`.

## 3. Esquema SQL de historial mínimo

```sql
CREATE TABLE tripLocationSamples (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  tripId INT NOT NULL,
  driverId INT NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracyM DECIMAL(8,2) NOT NULL,
  headingDeg DECIMAL(6,2) NULL,
  speedMps DECIMAL(8,2) NULL,
  capturedAt DATETIME NOT NULL,
  receivedAt DATETIME NOT NULL,
  INDEX idx_trip_captured (tripId, capturedAt),
  INDEX idx_driver_captured (driverId, capturedAt)
);
```

No almacenes cada actualización a máxima frecuencia. El ejemplo persiste solo por distancia significativa o al superar un intervalo de tiempo. Define una política de retención antes de activarlo: por ejemplo, conservar coordenadas operativas detalladas durante 30 días y eliminar o agregar datos históricos posteriormente.

## 4. Contrato mínimo de cliente del conductor

```ts
let sequence = 0;

navigator.geolocation.watchPosition(
  (position) => {
    socket.emit("trip_location_update", {
      tripId,
      sequence: ++sequence,
      position: {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        headingDeg: position.coords.heading ?? undefined,
        speedMps: position.coords.speed ?? undefined,
        capturedAt: new Date(position.timestamp).toISOString(),
      },
    }, (result: { ok: boolean; code?: string }) => {
      if (!result.ok) console.warn("Ubicación no aceptada", result.code);
    });
  },
  (error) => console.warn("GPS no disponible", error.message),
  { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 },
);
```

En una aplicación web, la ubicación en segundo plano depende del navegador y del sistema operativo; para conductores que deban reportar durante toda la carrera, una aplicación móvil nativa o una PWA instalada con pruebas por dispositivo es más confiable. No mantengas el seguimiento después de `completed` o `cancelled`.

## 5. Ajustes de producción

| Variable | Finalidad |
|---|---|
| `REDIS_URL` | URL TLS de Redis privado, con usuario/ACL dedicado. |
| `TELEMETRY_TTL_SECONDS` | Tiempo máximo permitido sin señal antes de marcarla obsoleta. |
| `TELEMETRY_MIN_INTERVAL_MS` | Límite de frecuencia de actualizaciones por conductor. |
| `TELEMETRY_MAX_ACCURACY_M` | Umbral de calidad de GPS. |
| `TELEMETRY_RETENTION_DAYS` | Política de eliminación de historial. |

El adaptador de Redis distribuye broadcasts entre instancias Socket.IO, pero requiere infraestructura Redis confiable y protegida. [1] Si se ejecutan varias instancias y se mantiene el transporte `polling`, configura afinidad de sesión en el balanceador; Socket.IO lo requiere para enrutar las solicitudes de una sesión al proceso correcto. [2]

## 6. Pruebas obligatorias

| Caso | Resultado esperado |
|---|---|
| Conductor asignado, viaje aceptado | Se guarda Redis, se emite a la sala y se recibe `ack` positivo. |
| Cliente intenta publicar ubicación | `FORBIDDEN`; no se modifica Redis. |
| Conductor de otro viaje publica | `NOT_ASSIGNED_TO_TRIP`; no hay broadcast. |
| Paquete con secuencia menor | Ignorado como `OUT_OF_ORDER`. |
| Precisión de 500 m | Rechazado como `LOW_ACCURACY`. |
| Viaje completado | Redis se limpia y clientes reciben `trip_tracking_ended`. |
| Reconexión de cliente | Recibe `trip_location_snapshot` si hay ubicación no vencida. |
| Dos instancias de servidor | Cliente y conductor en nodos distintos reciben el mismo `trip_location`. |

## Referencias

[1]: https://socket.io/docs/v4/redis-adapter/ "Redis adapter — Socket.IO"
[2]: https://socket.io/docs/v4/using-multiple-nodes/ "Using multiple nodes — Socket.IO"
