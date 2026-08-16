import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { rawMutate, rawQuery } from "../db";

const defaultPermissions = {
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

type DispatcherProfile = { id: number; permissions: string | typeof defaultPermissions; status: string };

async function requireDispatcher(userId: number) {
  const rows = await rawQuery<DispatcherProfile>("SELECT id, permissions, status FROM dispatchers WHERE userId = ? LIMIT 1", [userId]);
  const profile = rows[0];
  if (!profile || profile.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "El usuario no tiene un perfil de despachador activo." });
  }
  const saved = typeof profile.permissions === "string" ? JSON.parse(profile.permissions) : profile.permissions;
  return { ...profile, permissions: { ...defaultPermissions, ...saved } };
}

const dispatcherProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    if (ctx.user.role !== "dispatcher" && ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Acceso exclusivo para despacho." });
    }
    return next({ ctx });
  },
);

export const dispatcherOperationsRouter = router({
  getMyProfile: dispatcherProcedure.query(async ({ ctx }) => requireDispatcher(ctx.user.id)),

  listQueue: dispatcherProcedure.query(async ({ ctx }) => {
    await requireDispatcher(ctx.user.id);
    return rawQuery(`
      SELECT t.id, t.pickupLocation AS pickup, t.dropoffLocation AS dropoff, t.fare, t.status, t.requestedAt,
             CONCAT_WS(' ', c.firstName, c.lastName) AS clientName, c.phone AS clientPhone
      FROM trips t
      INNER JOIN clients c ON c.id = t.clientId
      WHERE t.status IN ('requested', 'accepted', 'in_progress')
      ORDER BY t.requestedAt ASC
      LIMIT 100
    `);
  }),

  listAvailableDrivers: dispatcherProcedure.query(async ({ ctx }) => {
    await requireDispatcher(ctx.user.id);
    return rawQuery(`
      SELECT d.id, CONCAT_WS(' ', d.firstName, d.lastName) AS name,
             CONCAT_WS(' ', v.make, v.model) AS vehicle, v.licensePlate AS plate,
             d.currentLocation, d.isOnline, d.currentTrip, d.totalTrips AS trips
      FROM drivers d
      LEFT JOIN vehicles v ON v.driverId = d.id AND v.isActive = true
      WHERE d.status = 'active'
      ORDER BY d.isOnline DESC, d.firstName ASC
    `);
  }),

  assignTrip: dispatcherProcedure
    .input(z.object({ tripId: z.number().int().positive(), driverId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const dispatcher = await requireDispatcher(ctx.user.id);
      if (!dispatcher.permissions.assignTrips) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para asignar viajes." });
      }
      const result = await rawMutate(
        `UPDATE trips t
         INNER JOIN drivers d ON d.id = ? AND d.status = 'active'
         LEFT JOIN vehicles v ON v.driverId = d.id AND v.isActive = true
         SET t.driverId = d.id, t.vehicleId = v.id, t.status = 'accepted', t.acceptedAt = NOW(), t.source = 'dispatcher'
         WHERE t.id = ? AND t.status = 'requested'`,
        [input.driverId, input.tripId],
      );
      if (!result.affectedRows) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El viaje ya no está disponible o el conductor no está activo." });
      }
      return { success: true } as const;
    }),

  cancelTrip: dispatcherProcedure
    .input(z.object({ tripId: z.number().int().positive(), reason: z.string().trim().min(3).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const dispatcher = await requireDispatcher(ctx.user.id);
      if (!dispatcher.permissions.cancelTrips) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para cancelar viajes." });
      }
      const result = await rawMutate(
        `UPDATE trips SET status = 'cancelled', cancelledAt = NOW(), cancellationReason = ?
         WHERE id = ? AND status IN ('requested', 'accepted')`,
        [input.reason, input.tripId],
      );
      if (!result.affectedRows) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El viaje no puede cancelarse en su estado actual." });
      }
      await ctx.req.app?.locals.telemetry?.endTripTracking(input.tripId);
      return { success: true } as const;
    }),
});
