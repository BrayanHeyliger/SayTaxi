import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { rawMutate, rawQuery } from "../db";

const coordinate = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

function haversineKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const radiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.max(0.1, 2 * radiusKm * Math.asin(Math.sqrt(a)));
}

async function requireClient(userId: number) {
  const rows = await rawQuery<{ id: number }>("SELECT id FROM clients WHERE userId = ? LIMIT 1", [userId]);
  const client = rows[0];
  if (!client) throw new TRPCError({ code: "FORBIDDEN", message: "La cuenta no tiene un perfil de cliente." });
  return client;
}

async function requireDriver(userId: number) {
  const rows = await rawQuery<{ id: number; status: string }>("SELECT id, status FROM drivers WHERE userId = ? LIMIT 1", [userId]);
  const driver = rows[0];
  if (!driver || driver.status !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "La cuenta no tiene un perfil de conductor activo." });
  }
  return driver;
}

const clientProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "client") throw new TRPCError({ code: "FORBIDDEN", message: "Acceso exclusivo para clientes." });
  return next({ ctx });
});

const driverProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "driver") throw new TRPCError({ code: "FORBIDDEN", message: "Acceso exclusivo para conductores." });
  return next({ ctx });
});

export const tripOperationsRouter = router({
  requestTrip: clientProcedure
    .input(z.object({
      pickupLocation: z.string().trim().min(3).max(1000),
      pickup: coordinate,
      dropoffLocation: z.string().trim().min(3).max(1000),
      dropoff: coordinate,
      paymentMethod: z.enum(["cash", "card", "paypal", "stripe"]).default("cash"),
    }))
    .mutation(async ({ ctx, input }) => {
      const client = await requireClient(ctx.user.id);
      const distanceKm = haversineKm(input.pickup, input.dropoff);
      const fare = Math.max(2.5, 2.5 + distanceKm * 1.2);
      const result = await rawMutate(
        `INSERT INTO trips (clientId, pickupLocation, pickupLatLng, dropoffLocation, dropoffLatLng, distance, fare, paymentMethod, source, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'client', 'requested')`,
        [client.id, input.pickupLocation, JSON.stringify(input.pickup), input.dropoffLocation, JSON.stringify(input.dropoff), distanceKm.toFixed(2), fare.toFixed(2), input.paymentMethod],
      );
      if (!result.insertId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No se pudo crear la solicitud de viaje." });
      return { tripId: result.insertId, status: "requested" as const, distanceKm: Number(distanceKm.toFixed(2)), fare: Number(fare.toFixed(2)) };
    }),

  startTrip: driverProcedure
    .input(z.object({ tripId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await requireDriver(ctx.user.id);
      const result = await rawMutate(
        `UPDATE trips SET status = 'in_progress', startedAt = NOW()
         WHERE id = ? AND driverId = ? AND status = 'accepted'`,
        [input.tripId, driver.id],
      );
      if (!result.affectedRows) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El viaje no está listo para iniciar." });
      return { success: true, status: "in_progress" as const };
    }),

  completeTrip: driverProcedure
    .input(z.object({ tripId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const driver = await requireDriver(ctx.user.id);
      const result = await rawMutate(
        `UPDATE trips SET status = 'completed', completedAt = NOW(), paymentStatus = CASE WHEN paymentMethod = 'cash' THEN 'completed' ELSE paymentStatus END
         WHERE id = ? AND driverId = ? AND status = 'in_progress'`,
        [input.tripId, driver.id],
      );
      if (!result.affectedRows) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "El viaje no está en curso o no pertenece al conductor." });
      await ctx.req.app?.locals.telemetry?.endTripTracking(input.tripId);
      return { success: true, status: "completed" as const };
    }),
});
