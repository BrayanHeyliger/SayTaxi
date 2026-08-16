import mysql from "mysql2/promise";
import { appRouter } from "../server/routers";
import { hashPassword } from "../server/_core/passwords";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL es obligatoria para la prueba de staging.");

type Role = "admin" | "client" | "driver" | "dispatcher";

function makeContext(user: { id: number; openId: string; name: string; email: string; role: Role }) {
  const now = new Date();
  return {
    req: { headers: {}, protocol: "http" },
    res: { cookie: () => undefined, clearCookie: () => undefined },
    user: {
      ...user,
      phone: null,
      loginMethod: "local",
      passwordHash: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
  } as any;
}

async function main() {
  const connection = await mysql.createConnection(databaseUrl);
  const runId = `stg_${Date.now()}`;
  const emails = {
    admin: `${runId}.admin@saytaxi.test`,
    client: `${runId}.client@saytaxi.test`,
    driver: `${runId}.driver@saytaxi.test`,
    dispatcher: `${runId}.dispatcher@saytaxi.test`,
  };

  const passwordHash = await hashPassword("StagingFlowPassword_2026");
  const users: Record<string, number> = {};

  try {
    for (const [role, email] of Object.entries(emails)) {
      const [result] = await connection.execute<mysql.ResultSetHeader>(
        "INSERT INTO users (openId, name, email, phone, passwordHash, role, loginMethod, isActive) VALUES (?, ?, ?, ?, ?, ?, 'local', true)",
        [`${runId}_${role}`, `Staging ${role}`, email, "+15550000000", passwordHash, role],
      );
      users[role] = result.insertId;
    }

    const [clientResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO clients (userId, firstName, lastName, email, phone) VALUES (?, 'Cliente', 'Staging', ?, '+15550000001')",
      [users.client, emails.client],
    );
    const clientId = clientResult.insertId;

    const [driverResult] = await connection.execute<mysql.ResultSetHeader>(
      "INSERT INTO drivers (userId, firstName, lastName, email, phone, licenseNumber, status, isOnline, permissions) VALUES (?, 'Conductor', 'Staging', ?, '+15550000002', ?, 'active', true, ?)",
      [users.driver, emails.driver, `${runId}_license`, JSON.stringify({ canAcceptTrips: true, canSetOwnFare: false, canViewClientPhone: true, canCancelTrip: true })],
    );
    const driverId = driverResult.insertId;

    await connection.execute(
      "INSERT INTO vehicles (driverId, licensePlate, make, model, year, isActive) VALUES (?, ?, 'Toyota', 'Corolla', 2024, true)",
      [driverId, `${runId.slice(-6).toUpperCase()}STG`],
    );

    await connection.execute(
      "INSERT INTO dispatchers (userId, name, email, phone, status, permissions, assignedZone, createdBy) VALUES (?, 'Despachador Staging', ?, '+15550000003', 'active', ?, 'Zona Staging', ?)",
      [users.dispatcher, emails.dispatcher, JSON.stringify({ viewMap: true, assignTrips: true, viewDrivers: true, contactUsers: true, viewTripHistory: true, cancelTrips: true, viewFinancials: false, editPrices: false, editSite: false }), users.admin],
    );

    const clientCaller = appRouter.createCaller(makeContext({ id: users.client, openId: `${runId}_client`, name: "Cliente Staging", email: emails.client, role: "client" }));
    const requested = await clientCaller.tripOperations.requestTrip({
      pickupLocation: "Centro de Staging",
      pickup: { lat: 25.7617, lng: -80.1918 },
      dropoffLocation: "Aeropuerto de Staging",
      dropoff: { lat: 25.7959, lng: -80.2870 },
      paymentMethod: "cash",
    });

    const dispatcherCaller = appRouter.createCaller(makeContext({ id: users.dispatcher, openId: `${runId}_dispatcher`, name: "Despachador Staging", email: emails.dispatcher, role: "dispatcher" }));
    const queue = await dispatcherCaller.dispatcherOperations.listQueue();
    const queuedTrip = (queue as any[]).find((trip) => Number(trip.id) === requested.tripId);
    if (!queuedTrip || queuedTrip.status !== "requested") throw new Error("La solicitud no apareció en la cola de despacho.");

    await dispatcherCaller.dispatcherOperations.assignTrip({ tripId: requested.tripId, driverId });

    const driverCaller = appRouter.createCaller(makeContext({ id: users.driver, openId: `${runId}_driver`, name: "Conductor Staging", email: emails.driver, role: "driver" }));
    await driverCaller.tripOperations.startTrip({ tripId: requested.tripId });
    await driverCaller.tripOperations.completeTrip({ tripId: requested.tripId });

    const [rows] = await connection.execute<mysql.RowDataPacket[]>(
      "SELECT id, clientId, driverId, status, paymentMethod, paymentStatus, distance, fare, source, requestedAt, acceptedAt, startedAt, completedAt FROM trips WHERE id = ?",
      [requested.tripId],
    );
    const trip = rows[0];
    if (!trip) throw new Error("No se encontró el viaje después del flujo.");
    if (trip.status !== "completed" || Number(trip.driverId) !== driverId || trip.paymentStatus !== "completed" || trip.source !== "dispatcher") {
      throw new Error(`Estado final inesperado: ${JSON.stringify(trip)}`);
    }

    console.log(JSON.stringify({
      success: true,
      runId,
      clientId,
      driverId,
      trip: {
        id: Number(trip.id), status: trip.status, paymentMethod: trip.paymentMethod,
        paymentStatus: trip.paymentStatus, source: trip.source,
        distanceKm: Number(trip.distance), fare: Number(trip.fare),
        requestedAt: trip.requestedAt, acceptedAt: trip.acceptedAt, startedAt: trip.startedAt, completedAt: trip.completedAt,
      },
    }, null, 2));
  } finally {
    await connection.end();
  }
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
