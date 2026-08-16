import { io, type Socket } from "socket.io-client";
import mysql from "mysql2/promise";
import { createClient } from "redis";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { sdk } from "../server/_core/sdk";

type Actor = {
  index: number;
  driverOpenId: string;
  clientOpenId: string;
  driverToken: string;
  clientToken: string;
  tripId: number;
};

type Results = {
  runId: string;
  target: string;
  drivers: number;
  durationSeconds: number;
  intervalMs: number;
  connections: { driverConnected: number; clientConnected: number; failures: number };
  telemetry: { sent: number; acknowledged: number; broadcastReceived: number; ackErrors: number; sendErrors: number; e2eMisses: number };
  ackLatencyMs: number[];
  e2eLatencyMs: number[];
  startedAt: string;
  finishedAt?: string;
};

const readNumberArg = (name: string, fallback: number) => {
  const entry = process.argv.find(arg => arg.startsWith(`--${name}=`));
  if (!entry) return fallback;
  const value = Number(entry.slice(name.length + 3));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const percentile = (values: number[], p: number) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
};

function sampleSummary(values: number[]) {
  return {
    count: values.length,
    avg: values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null,
    p50: percentile(values, 50),
    p95: percentile(values, 95),
    p99: percentile(values, 99),
    max: values.length ? Math.max(...values) : null,
  };
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function waitForJoin(socket: Socket, tripId: number): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`join timeout for trip ${tripId}`)), 10_000);
    socket.once("message_history", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("room_error", (event: { message?: string }) => {
      clearTimeout(timeout);
      reject(new Error(event.message || `room error for trip ${tripId}`));
    });
    socket.emit("join_room", { roomId: String(tripId) });
  });
}

async function connectActor(target: string, token: string, tripId: number): Promise<Socket> {
  const socket = io(target, {
    path: "/socket.io",
    transports: ["websocket"],
    extraHeaders: { Authorization: `Bearer ${token}` },
    forceNew: true,
    reconnection: false,
    timeout: 10_000,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`connect timeout for trip ${tripId}`)), 10_000);
    socket.once("connect", () => {
      clearTimeout(timeout);
      resolve();
    });
    socket.once("connect_error", error => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  await waitForJoin(socket, tripId);
  return socket;
}

async function seedActors(pool: mysql.Pool, count: number, runId: string): Promise<Actor[]> {
  const drivers = Array.from({ length: count }, (_, index) => index + 1);
  const userRows = drivers.flatMap(index => [
    [`load_driver_${runId}_${index}`, `Load Driver ${index}`, `load-driver-${runId}-${index}@example.test`, "load", "driver", 1],
    [`load_client_${runId}_${index}`, `Load Client ${index}`, `load-client-${runId}-${index}@example.test`, "load", "client", 1],
  ]);

  await pool.query(
    "INSERT INTO users (openId, name, email, loginMethod, role, isActive) VALUES ?",
    [userRows],
  );

  const [userRowsResult] = await pool.query<any[]>(
    "SELECT id, openId FROM users WHERE openId LIKE ? OR openId LIKE ?",
    [`load_driver_${runId}_%`, `load_client_${runId}_%`],
  );
  const usersByOpenId = new Map<string, number>(userRowsResult.map(row => [String(row.openId), Number(row.id)]));

  const clientRows = drivers.map(index => [
    usersByOpenId.get(`load_client_${runId}_${index}`),
    "Load",
    `Client ${index}`,
    `load-client-${runId}-${index}@example.test`,
    `+1555${String(index).padStart(7, "0")}`,
  ]);
  const driverRows = drivers.map(index => [
    usersByOpenId.get(`load_driver_${runId}_${index}`),
    "Load",
    `Driver ${index}`,
    `load-driver-${runId}-${index}@example.test`,
    `+1666${String(index).padStart(7, "0")}`,
    `LOAD-${runId.slice(-6)}-${index}`,
    "active",
    JSON.stringify({ canAcceptTrips: true }),
  ]);

  await pool.query(
    "INSERT INTO clients (userId, firstName, lastName, email, phone) VALUES ?",
    [clientRows],
  );
  await pool.query(
    "INSERT INTO drivers (userId, firstName, lastName, email, phone, licenseNumber, status, permissions) VALUES ?",
    [driverRows],
  );

  const [clients] = await pool.query<any[]>("SELECT id, userId FROM clients WHERE email LIKE ?", [`load-client-${runId}-%@example.test`]);
  const [driverProfiles] = await pool.query<any[]>("SELECT id, userId FROM drivers WHERE email LIKE ?", [`load-driver-${runId}-%@example.test`]);
  const clientByUserId = new Map<number, number>(clients.map(row => [Number(row.userId), Number(row.id)]));
  const driverByUserId = new Map<number, number>(driverProfiles.map(row => [Number(row.userId), Number(row.id)]));

  const tripRows = drivers.map(index => {
    const clientUserId = usersByOpenId.get(`load_client_${runId}_${index}`)!;
    const driverUserId = usersByOpenId.get(`load_driver_${runId}_${index}`)!;
    const offset = index / 100_000;
    return [
      clientByUserId.get(clientUserId),
      driverByUserId.get(driverUserId),
      `Load ${runId} pickup ${index}`,
      JSON.stringify({ lat: 25.7617 + offset, lng: -80.1918 + offset }),
      `Load dropoff ${index}`,
      JSON.stringify({ lat: 25.7717 + offset, lng: -80.1818 + offset }),
      2.5,
      10,
      "accepted",
      12.5,
      "cash",
      "pending",
      "client",
      new Date(),
    ];
  });
  await pool.query(
    `INSERT INTO trips
      (clientId, driverId, pickupLocation, pickupLatLng, dropoffLocation, dropoffLatLng,
       distance, duration, status, fare, paymentMethod, paymentStatus, source, acceptedAt)
     VALUES ?`,
    [tripRows],
  );

  const [trips] = await pool.query<any[]>(
    `SELECT t.id, d.userId AS driverUserId
       FROM trips t
       INNER JOIN drivers d ON d.id = t.driverId
      WHERE t.pickupLocation LIKE ?`,
    [`Load ${runId} pickup %`],
  );
  const tripByDriverUserId = new Map<number, number>();
  for (const trip of trips) tripByDriverUserId.set(Number(trip.driverUserId), Number(trip.id));

  return Promise.all(drivers.map(async index => {
    const driverOpenId = `load_driver_${runId}_${index}`;
    const clientOpenId = `load_client_${runId}_${index}`;
    const driverUserId = usersByOpenId.get(driverOpenId)!;
    return {
      index,
      driverOpenId,
      clientOpenId,
      driverToken: await sdk.createSessionToken(driverOpenId, { name: `Load Driver ${index}`, expiresInMs: 60 * 60 * 1000 }),
      clientToken: await sdk.createSessionToken(clientOpenId, { name: `Load Client ${index}`, expiresInMs: 60 * 60 * 1000 }),
      tripId: tripByDriverUserId.get(driverUserId)!,
    };
  }));
}

async function cleanupTelemetryCache(redisUrl: string | undefined, tripIds: number[]) {
  if (!redisUrl || !tripIds.length) return;
  const client = createClient({ url: redisUrl });
  try {
    await client.connect();
    await client.del(tripIds.flatMap(tripId => [`trip:${tripId}:location`, `trip:${tripId}:sequence`]));
  } finally {
    if (client.isOpen) await client.quit();
  }
}

async function cleanupActors(pool: mysql.Pool, runId: string) {
  const [trips] = await pool.query<any[]>("SELECT id FROM trips WHERE pickupLocation LIKE ?", [`Load ${runId} pickup %`]);
  const tripIds = trips.map(row => Number(row.id));
  if (tripIds.length) {
    await pool.query("DELETE FROM trip_location_samples WHERE tripId IN (?)", [tripIds]);
    await pool.query("DELETE FROM trips WHERE id IN (?)", [tripIds]);
  }
  await pool.query("DELETE FROM clients WHERE email LIKE ?", [`load-client-${runId}-%@example.test`]);
  await pool.query("DELETE FROM drivers WHERE email LIKE ?", [`load-driver-${runId}-%@example.test`]);
  await pool.query("DELETE FROM users WHERE openId LIKE ? OR openId LIKE ?", [`load_driver_${runId}_%`, `load_client_${runId}_%`]);
}

async function main() {
  const drivers = readNumberArg("drivers", 200);
  const durationSeconds = readNumberArg("duration", 60);
  const intervalMs = readNumberArg("intervalMs", 5_000);
  const rampMs = readNumberArg("rampMs", 20);
  const target = process.env.LOAD_TARGET ?? "http://127.0.0.1:4173";
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for isolated load actors");

  const runId = `${Date.now()}_${Math.floor(Math.random() * 100_000)}`;
  const pool = mysql.createPool(databaseUrl);
  const results: Results = {
    runId, target, drivers, durationSeconds, intervalMs,
    connections: { driverConnected: 0, clientConnected: 0, failures: 0 },
    telemetry: { sent: 0, acknowledged: 0, broadcastReceived: 0, ackErrors: 0, sendErrors: 0, e2eMisses: 0 },
    ackLatencyMs: [], e2eLatencyMs: [], startedAt: new Date().toISOString(),
  };
  const sockets: Socket[] = [];
  const pending = new Map<string, number>();
  const timers: NodeJS.Timeout[] = [];
  let actors: Actor[] = [];

  try {
    actors = await seedActors(pool, drivers, runId);
    for (const actor of actors) {
      try {
        const [driverSocket, clientSocket] = await Promise.all([
          connectActor(target, actor.driverToken, actor.tripId),
          connectActor(target, actor.clientToken, actor.tripId),
        ]);
        results.connections.driverConnected++;
        results.connections.clientConnected++;
        sockets.push(driverSocket, clientSocket);

        clientSocket.on("trip_location", (event: { tripId: number; sequence: number }) => {
          const key = `${event.tripId}:${event.sequence}`;
          const sentAt = pending.get(key);
          if (sentAt !== undefined) {
            results.telemetry.broadcastReceived++;
            results.e2eLatencyMs.push(Date.now() - sentAt);
            pending.delete(key);
          }
        });

        let sequence = 0;
        const sendLocation = () => {
          const currentSequence = ++sequence;
          const key = `${actor.tripId}:${currentSequence}`;
          const startedAt = Date.now();
          pending.set(key, startedAt);
          results.telemetry.sent++;
          const movement = currentSequence / 100_000;
          driverSocket.emit("trip_location_update", {
            tripId: actor.tripId,
            sequence: currentSequence,
            position: {
              lat: 25.7617 + actor.index / 100_000 + movement,
              lng: -80.1918 + actor.index / 100_000 + movement,
              accuracyM: 8,
              headingDeg: 90,
              speedMps: 8,
              capturedAt: new Date().toISOString(),
            },
          }, (reply: { ok?: boolean }) => {
            if (reply?.ok) {
              results.telemetry.acknowledged++;
              results.ackLatencyMs.push(Date.now() - startedAt);
            } else {
              results.telemetry.ackErrors++;
              pending.delete(key);
            }
          });
        };
        sendLocation();
        timers.push(setInterval(sendLocation, intervalMs));
      } catch (error) {
        results.connections.failures++;
        console.warn("[load] actor connection failed", actor.index, error instanceof Error ? error.message : error);
      }
      if (rampMs) await sleep(rampMs);
    }

    await sleep(durationSeconds * 1_000);
    results.telemetry.e2eMisses = pending.size;
  } finally {
    for (const timer of timers) clearInterval(timer);
    for (const socket of sockets) socket.disconnect();
    await cleanupTelemetryCache(process.env.REDIS_URL, actors.map(actor => actor.tripId));
    await cleanupActors(pool, runId);
    await pool.end();
  }

  results.finishedAt = new Date().toISOString();
  const { ackLatencyMs, e2eLatencyMs, ...summary } = results;
  const output = {
    ...summary,
    ackLatency: sampleSummary(ackLatencyMs),
    e2eLatency: sampleSummary(e2eLatencyMs),
    successRate: results.telemetry.sent ? Number((results.telemetry.acknowledged / results.telemetry.sent).toFixed(4)) : 0,
    broadcastRate: results.telemetry.sent ? Number((results.telemetry.broadcastReceived / results.telemetry.sent).toFixed(4)) : 0,
  };
  const destination = path.resolve("load-results", `telemetry-${runId}.json`);
  await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`);
  console.log(JSON.stringify(output, null, 2));
}

main().catch(error => {
  console.error("[load] failed", error);
  process.exitCode = 1;
});
