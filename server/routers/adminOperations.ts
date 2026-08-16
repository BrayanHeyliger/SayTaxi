import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, router } from "../_core/trpc";
import { rawMutate, rawQuery } from "../db";
import { hashPassword } from "../_core/passwords";

const driverStatuses = ["active", "inactive", "suspended", "pending"] as const;
const clientStatuses = ["active", "suspended"] as const;

const defaultPermissions = {
  canAcceptTrips: true,
  canSetOwnFare: false,
  canViewClientPhone: true,
  canCancelTrip: true,
};

const dispatcherDefaultPermissions = {
  viewMap: true,
  assignTrips: true,
  viewDrivers: true,
  contactUsers: true,
  viewTripHistory: true,
  cancelTrips: false,
  viewFinancials: false,
  editPrices: false,
  editSite: false,
};

async function requireMutation(sql: string, params: unknown[], notFoundMessage: string) {
  const result = await rawMutate(sql, params);
  if (result.affectedRows < 1) {
    throw new TRPCError({ code: "NOT_FOUND", message: notFoundMessage });
  }
  return { success: true } as const;
}

export const adminOperationsRouter = router({
  provisionDispatcher: adminProcedure
    .input(z.object({
      name: z.string().trim().min(2).max(200),
      email: z.string().email(),
      phone: z.string().trim().max(20).optional(),
      password: z.string().min(12).max(128),
      assignedZone: z.string().trim().max(200).optional(),
      permissions: z.object({
        viewMap: z.boolean().default(true),
        assignTrips: z.boolean().default(true),
        viewDrivers: z.boolean().default(true),
        contactUsers: z.boolean().default(true),
        viewTripHistory: z.boolean().default(true),
        cancelTrips: z.boolean().default(false),
        viewFinancials: z.boolean().default(false),
        editPrices: z.boolean().default(false),
        editSite: z.boolean().default(false),
      }).default(dispatcherDefaultPermissions),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await rawQuery<{ id: number }>("SELECT id FROM users WHERE email = ? LIMIT 1", [input.email]);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Ya existe una cuenta con este correo." });
      const passwordHash = await hashPassword(input.password);
      const insertUser = await rawMutate(
        "INSERT INTO users (openId, name, email, phone, passwordHash, role, loginMethod, isActive) VALUES (?, ?, ?, ?, ?, 'dispatcher', 'local', true)",
        [`dispatcher_${crypto.randomUUID()}`, input.name, input.email, input.phone ?? null, passwordHash],
      );
      if (!insertUser.affectedRows) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No se pudo crear la cuenta de despacho." });
      const users = await rawQuery<{ id: number }>("SELECT id FROM users WHERE email = ? LIMIT 1", [input.email]);
      const userId = users[0]?.id;
      if (!userId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No se pudo recuperar la cuenta creada." });
      const insertDispatcher = await rawMutate(
        "INSERT INTO dispatchers (userId, name, email, phone, status, permissions, assignedZone, createdBy) VALUES (?, ?, ?, ?, 'active', ?, ?, ?)",
        [userId, input.name, input.email, input.phone ?? null, JSON.stringify({ ...dispatcherDefaultPermissions, ...input.permissions }), input.assignedZone ?? null, ctx.user.id],
      );
      if (!insertDispatcher.affectedRows) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No se pudo crear el perfil de despacho." });
      return { success: true, userId } as const;
    }),

  listDrivers: adminProcedure.query(async () => {
    return rawQuery(`
      SELECT d.id, d.userId, d.firstName, d.lastName, d.email, d.phone, d.status,
             d.averageRating AS rating, d.totalTrips AS trips, d.totalEarnings AS earnings,
             d.isOnline AS online, d.permissions, d.createdAt AS joinDate,
             CONCAT_WS(' ', v.make, v.model, v.year) AS vehicle, v.licensePlate AS plate
      FROM drivers d
      LEFT JOIN vehicles v ON v.driverId = d.id AND v.isActive = true
      ORDER BY d.createdAt DESC
    `);
  }),

  listClients: adminProcedure.query(async () => {
    return rawQuery(`
      SELECT c.id, c.userId, CONCAT_WS(' ', c.firstName, c.lastName) AS name,
             c.email, c.phone, c.totalTrips AS trips, c.walletBalance AS spent,
             c.averageRating AS rating, c.createdAt AS joinDate,
             CASE WHEN u.isActive THEN 'active' ELSE 'suspended' END AS status
      FROM clients c
      INNER JOIN users u ON u.id = c.userId
      ORDER BY c.createdAt DESC
    `);
  }),

  listManualBookings: adminProcedure.query(async () => {
    return rawQuery(`
      SELECT t.id, t.status, t.pickupLocation AS pickup, t.dropoffLocation AS dropoff,
             t.fare, t.scheduledAt, t.requestedAt, t.internalNotes AS notes,
             CONCAT_WS(' ', c.firstName, c.lastName) AS clientName, c.phone AS clientPhone,
             CONCAT_WS(' ', d.firstName, d.lastName) AS driver
      FROM trips t
      INNER JOIN clients c ON c.id = t.clientId
      LEFT JOIN drivers d ON d.id = t.driverId
      WHERE t.source = 'admin_manual'
      ORDER BY t.requestedAt DESC
      LIMIT 50
    `);
  }),

  updateDriverStatus: adminProcedure
    .input(z.object({ driverId: z.number().int().positive(), status: z.enum(driverStatuses) }))
    .mutation(async ({ input }) => {
      return requireMutation(
        `UPDATE drivers
         SET status = ?, isOnline = CASE WHEN ? IN ('suspended', 'inactive') THEN false ELSE isOnline END
         WHERE id = ?`,
        [input.status, input.status, input.driverId],
        "Conductor no encontrado",
      );
    }),

  updateDriverPermissions: adminProcedure
    .input(z.object({
      driverId: z.number().int().positive(),
      permissions: z.object({
        canAcceptTrips: z.boolean(),
        canSetOwnFare: z.boolean(),
        canViewClientPhone: z.boolean(),
        canCancelTrip: z.boolean(),
      }),
    }))
    .mutation(async ({ input }) => {
      return requireMutation(
        "UPDATE drivers SET permissions = ? WHERE id = ?",
        [JSON.stringify({ ...defaultPermissions, ...input.permissions }), input.driverId],
        "Conductor no encontrado",
      );
    }),

  updateClientStatus: adminProcedure
    .input(z.object({ clientId: z.number().int().positive(), status: z.enum(clientStatuses) }))
    .mutation(async ({ input }) => {
      return requireMutation(
        `UPDATE users u
         INNER JOIN clients c ON c.userId = u.id
         SET u.isActive = ?
         WHERE c.id = ?`,
        [input.status === "active", input.clientId],
        "Cliente no encontrado",
      );
    }),

  createManualBooking: adminProcedure
    .input(z.object({
      clientId: z.number().int().positive(),
      driverId: z.number().int().positive().optional(),
      vehicleId: z.number().int().positive().optional(),
      pickupLocation: z.string().trim().min(3).max(1000),
      pickupLat: z.number().min(-90).max(90),
      pickupLng: z.number().min(-180).max(180),
      dropoffLocation: z.string().trim().min(3).max(1000),
      dropoffLat: z.number().min(-90).max(90),
      dropoffLng: z.number().min(-180).max(180),
      fare: z.number().positive().max(100000),
      paymentMethod: z.enum(["cash", "card", "paypal", "stripe"]).default("cash"),
      internalNotes: z.string().trim().max(5000).optional(),
      scheduledAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ input }) => {
      const status = input.driverId ? "accepted" : "requested";
      const result = await rawMutate(
        `INSERT INTO trips
         (clientId, driverId, vehicleId, pickupLocation, pickupLatLng, dropoffLocation, dropoffLatLng, fare, paymentMethod, source, internalNotes, scheduledAt, status, acceptedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin_manual', ?, ?, ?, CASE WHEN ? = 'accepted' THEN NOW() ELSE NULL END)`,
        [
          input.clientId,
          input.driverId ?? null,
          input.vehicleId ?? null,
          input.pickupLocation,
          JSON.stringify({ lat: input.pickupLat, lng: input.pickupLng }),
          input.dropoffLocation,
          JSON.stringify({ lat: input.dropoffLat, lng: input.dropoffLng }),
          input.fare,
          input.paymentMethod,
          input.internalNotes ?? null,
          input.scheduledAt ? new Date(input.scheduledAt) : null,
          status,
          status,
        ],
      );
      if (result.affectedRows < 1) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No se pudo crear la reserva" });
      }
      return { success: true, status } as const;
    }),
});
