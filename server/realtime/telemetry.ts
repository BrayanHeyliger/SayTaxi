import type { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { z } from "zod";
import { rawMutate, rawQuery } from "../db";

const LOCATION_TTL_SECONDS = 120;
const MIN_UPDATE_INTERVAL_MS = 3_000;
const MAX_ACCURACY_METERS = 100;
const MAX_PLAUSIBLE_SPEED_MPS = 60;
const MAX_CLIENT_CLOCK_SKEW_MS = 120_000;
const PERSIST_EVERY_MS = 30_000;
const PERSIST_AFTER_METERS = 100;
const ACTIVE_TRIPS_KEY = "telemetry:active_trips";
const ADMIN_OPERATIONS_ROOM = "ops:admin";

const payloadSchema = z.object({
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

type LocationPayload = z.infer<typeof payloadSchema>;
type SocketUser = { id: number; role: string; name: string };
type TripDriver = { tripId: number; driverId: number; driverUserId: number; status: string };
type LastLocation = LocationPayload["position"] & {
  sequence: number;
  driverId: number;
  serverReceivedAt: string;
  persistedAt?: string;
};
type OperationsTrip = {
  tripId: number;
  driverId: number;
  driverName: string;
  vehicleLabel: string | null;
  licensePlate: string | null;
  tripStatus: "accepted" | "in_progress";
};
type FleetEntry = OperationsTrip & {
  position: LastLocation;
  stale: boolean;
};
type TelemetryAck =
  | { ok: true; sequence: number; serverReceivedAt: string; ignored?: "OUT_OF_ORDER" | "RATE_LIMITED" }
  | { ok: false; code: string };

export type TelemetryService = {
  sendSnapshot: (socket: Socket, tripId: number) => Promise<void>;
  sendAdminSnapshot: (socket: Socket) => Promise<void>;
  endTripTracking: (tripId: number) => Promise<void>;
  close: () => Promise<void>;
};

const roomForTrip = (tripId: number) => String(tripId);

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadius = 6_371_000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lng - a.lng);
  const haversine = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

async function loadTripDriver(tripId: number): Promise<TripDriver | null> {
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

async function persistLocationSample(input: {
  tripId: number;
  driverId: number;
  position: LocationPayload["position"];
  receivedAt: string;
}) {
  await rawMutate(
    `INSERT INTO trip_location_samples
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

export async function configureTelemetry(io: Server, redisUrl: string): Promise<TelemetryService> {
  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();
  const cacheClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect(), cacheClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));

  async function getLastLocation(tripId: number): Promise<LastLocation | null> {
    const cached = await cacheClient.get(`trip:${tripId}:location`);
    if (!cached) return null;
    try {
      return JSON.parse(cached) as LastLocation;
    } catch {
      await cacheClient.del(`trip:${tripId}:location`);
      return null;
    }
  }

  async function loadOperationsEntries(tripIds: number[]): Promise<FleetEntry[]> {
    const ids = Array.from(new Set(tripIds.filter(id => Number.isInteger(id) && id > 0)));
    if (!ids.length) return [];

    const locations = await Promise.all(ids.map(async tripId => ({ tripId, location: await getLastLocation(tripId) })));
    const withLocation = locations.filter((item): item is { tripId: number; location: LastLocation } => Boolean(item.location));
    if (!withLocation.length) return [];

    const placeholders = withLocation.map(() => "?").join(",");
    const rows = await rawQuery<OperationsTrip>(
      `SELECT t.id AS tripId, d.id AS driverId,
              CONCAT_WS(' ', d.firstName, d.lastName) AS driverName,
              CONCAT_WS(' ', v.make, v.model) AS vehicleLabel,
              v.licensePlate AS licensePlate,
              t.status AS tripStatus
         FROM trips t
         INNER JOIN drivers d ON d.id = t.driverId
         LEFT JOIN vehicles v ON v.id = t.vehicleId
        WHERE t.id IN (${placeholders}) AND t.status IN ('accepted', 'in_progress')`,
      withLocation.map(item => item.tripId),
    );
    const metadataByTrip = new Map(rows.map(row => [Number(row.tripId), row]));
    const now = Date.now();

    return withLocation.flatMap(({ tripId, location }) => {
      const metadata = metadataByTrip.get(tripId);
      if (!metadata || Number(metadata.driverId) !== location.driverId) return [];
      return [{
        ...metadata,
        tripId: Number(metadata.tripId),
        driverId: Number(metadata.driverId),
        vehicleLabel: metadata.vehicleLabel || "Vehículo no asignado",
        licensePlate: metadata.licensePlate || null,
        position: location,
        stale: now - Date.parse(location.serverReceivedAt) > 60_000,
      }];
    });
  }

  async function sendSnapshot(socket: Socket, tripId: number) {
    if (!socket.rooms.has(roomForTrip(tripId))) return;
    const location = await getLastLocation(tripId);
    if (!location) return;
    socket.emit("trip_location_snapshot", {
      tripId,
      driverId: location.driverId,
      position: location,
      stale: Date.now() - Date.parse(location.serverReceivedAt) > 60_000,
    });
  }

  async function sendAdminSnapshot(socket: Socket) {
    const user = socket.data.user as SocketUser;
    if (user.role !== "admin" || !socket.rooms.has(ADMIN_OPERATIONS_ROOM)) return;

    const now = Date.now();
    await cacheClient.zRemRangeByScore(ACTIVE_TRIPS_KEY, 0, now - LOCATION_TTL_SECONDS * 1_000);
    const ids = (await cacheClient.zRangeByScore(ACTIVE_TRIPS_KEY, now - LOCATION_TTL_SECONDS * 1_000, "+inf"))
      .map(value => Number(value))
      .filter(Number.isInteger);
    const vehicles = await loadOperationsEntries(ids);
    socket.emit("fleet_location_snapshot", { generatedAt: new Date().toISOString(), vehicles });
  }

  io.on("connection", socket => {
    const user = socket.data.user as SocketUser;

    socket.on("join_operations_tracking", async () => {
      if (user.role !== "admin") {
        socket.emit("operations_error", { code: "FORBIDDEN", message: "Acceso operativo no autorizado." });
        return;
      }
      socket.join(ADMIN_OPERATIONS_ROOM);
      await sendAdminSnapshot(socket);
    });

    socket.on("trip_location_snapshot_request", async ({ tripId }: { tripId: number }) => {
      if (Number.isInteger(tripId) && tripId > 0) await sendSnapshot(socket, tripId);
    });

    socket.on(
      "trip_location_update",
      async (rawPayload: unknown, acknowledge?: (reply: TelemetryAck) => void) => {
        try {
          const payload = payloadSchema.parse(rawPayload);
          const respond = (reply: TelemetryAck) => acknowledge?.(reply);

          if (user.role !== "driver") return respond({ ok: false, code: "FORBIDDEN" });
          if (!socket.rooms.has(roomForTrip(payload.tripId))) return respond({ ok: false, code: "ROOM_NOT_JOINED" });
          if (payload.position.accuracyM > MAX_ACCURACY_METERS) return respond({ ok: false, code: "LOW_ACCURACY" });

          const capturedAtMs = Date.parse(payload.position.capturedAt);
          if (!Number.isFinite(capturedAtMs) || Math.abs(Date.now() - capturedAtMs) > MAX_CLIENT_CLOCK_SKEW_MS) {
            return respond({ ok: false, code: "STALE_OR_FUTURE_TIMESTAMP" });
          }

          const trip = await loadTripDriver(payload.tripId);
          if (!trip || trip.driverUserId !== user.id) return respond({ ok: false, code: "NOT_ASSIGNED_TO_TRIP" });
          if (!['accepted', 'in_progress'].includes(trip.status)) return respond({ ok: false, code: "TRIP_NOT_TRACKABLE" });

          const previous = await getLastLocation(payload.tripId);
          if (previous && payload.sequence <= previous.sequence) {
            return respond({ ok: true, sequence: previous.sequence, serverReceivedAt: previous.serverReceivedAt, ignored: "OUT_OF_ORDER" });
          }

          if (previous) {
            const previousReceivedAtMs = Date.parse(previous.serverReceivedAt);
            if (Date.now() - previousReceivedAtMs < MIN_UPDATE_INTERVAL_MS) {
              return respond({ ok: true, sequence: previous.sequence, serverReceivedAt: previous.serverReceivedAt, ignored: "RATE_LIMITED" });
            }

            const elapsedSeconds = (capturedAtMs - Date.parse(previous.capturedAt)) / 1_000;
            const movedMeters = distanceMeters(previous, payload.position);
            const computedSpeed = elapsedSeconds > 0 ? movedMeters / elapsedSeconds : Number.POSITIVE_INFINITY;
            if (computedSpeed > MAX_PLAUSIBLE_SPEED_MPS) return respond({ ok: false, code: "IMPLAUSIBLE_MOVEMENT" });
          }

          const serverReceivedAt = new Date().toISOString();
          const location: LastLocation = {
            ...payload.position,
            sequence: payload.sequence,
            driverId: trip.driverId,
            serverReceivedAt,
          };

          const movedEnough = !previous || distanceMeters(previous, location) >= PERSIST_AFTER_METERS;
          const persistenceDue = !previous?.persistedAt || Date.now() - Date.parse(previous.persistedAt) >= PERSIST_EVERY_MS;
          if (movedEnough || persistenceDue) {
            await persistLocationSample({ tripId: payload.tripId, driverId: trip.driverId, position: payload.position, receivedAt: serverReceivedAt });
            location.persistedAt = serverReceivedAt;
          }

          await cacheClient.set(`trip:${payload.tripId}:location`, JSON.stringify(location), { EX: LOCATION_TTL_SECONDS });
          await cacheClient.set(`trip:${payload.tripId}:sequence`, String(payload.sequence), { EX: LOCATION_TTL_SECONDS });
          await cacheClient.zAdd(ACTIVE_TRIPS_KEY, { score: Date.now(), value: String(payload.tripId) });
          await cacheClient.zRemRangeByScore(ACTIVE_TRIPS_KEY, 0, Date.now() - LOCATION_TTL_SECONDS * 1_000);

          io.to(roomForTrip(payload.tripId)).emit("trip_location", {
            tripId: payload.tripId,
            driverId: trip.driverId,
            sequence: payload.sequence,
            position: payload.position,
            serverReceivedAt,
            stale: false,
          });
          io.to(ADMIN_OPERATIONS_ROOM).emit("fleet_location_update", {
            tripId: payload.tripId,
            driverId: trip.driverId,
            sequence: payload.sequence,
            tripStatus: trip.status,
            position: payload.position,
            serverReceivedAt,
            stale: false,
          });
          respond({ ok: true, sequence: payload.sequence, serverReceivedAt });
        } catch (error) {
          console.warn("[telemetry] rejected location update", error instanceof Error ? error.message : error);
          acknowledge?.({ ok: false, code: "INVALID_LOCATION_PAYLOAD" });
        }
      },
    );
  });

  async function endTripTracking(tripId: number) {
    await cacheClient.del([`trip:${tripId}:location`, `trip:${tripId}:sequence`]);
    await cacheClient.zRem(ACTIVE_TRIPS_KEY, String(tripId));
    io.to(roomForTrip(tripId)).emit("trip_tracking_ended", { tripId, endedAt: new Date().toISOString() });
    io.to(ADMIN_OPERATIONS_ROOM).emit("fleet_tracking_ended", { tripId, endedAt: new Date().toISOString() });
  }

  return {
    sendSnapshot,
    sendAdminSnapshot,
    endTripTracking,
    close: async () => {
      await Promise.allSettled([pubClient.quit(), subClient.quit(), cacheClient.quit()]);
    },
  };
}
