import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { localAuthRouter } from "./routers/localAuth";
import { paymentsRouter } from "./routers/payments";
import { siteSettingsRouter } from "./routers/siteSettings";
import { referralsRouter } from "./routers/referrals";
import { announcementsRouter } from "./routers/announcements";
import { safetyTipsRouter } from "./routers/safetyTips";
import { parcelsRouter } from "./routers/parcels";
import { adminOperationsRouter } from "./routers/adminOperations";
import { dispatcherOperationsRouter } from "./routers/dispatcherOperations";
import { tripOperationsRouter } from "./routers/tripOperations";
import { rawQuery } from "./db";

export const appRouter = router({
  system: systemRouter,
  localAuth: localAuthRouter,
  payments: paymentsRouter,
  siteSettings: siteSettingsRouter,
  referrals: referralsRouter,
  announcements: announcementsRouter,
  safetyTips: safetyTipsRouter,
  parcels: parcelsRouter,
  adminOperations: adminOperationsRouter,
  dispatcherOperations: dispatcherOperationsRouter,
  tripOperations: tripOperationsRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  // ── Nuevo: Datos para el panel Super Admin ─────────────────────────────────
  adminDashboard: router({
    activeDrivers: adminProcedure.query(async () => {
      const sql = `
        SELECT d.id, d.firstName, d.lastName, d.email,
               CONCAT_WS(' ', v.make, v.model) AS vehicle, v.licensePlate,
               d.currentLocation, d.status, d.isOnline,
               COALESCE(
                 (SELECT json_arrayagg(t)
                  FROM (
                    SELECT id, clientId, pickupLocation, dropoffLocation, status, fare,
                           requestedAt, acceptedAt, startedAt, completedAt
                    FROM trips WHERE driverId = d.id AND status IN ('accepted','in_progress','completed')
                    ORDER BY requestedAt DESC LIMIT 5
                  ) t), JSON_ARRAY()) as recentTrips
        FROM drivers d
        LEFT JOIN vehicles v ON v.driverId = d.id AND v.isActive = true
        WHERE d.status IN ('active','pending')
        ORDER BY d.isOnline DESC, d.firstName
      `;
      return rawQuery(sql);
    }),

    activeTrips: adminProcedure.query(async () => {
      const sql = `
        SELECT t.id, t.clientId, t.driverId, t.vehicleId, t.pickupLocation, t.dropoffLocation,
               t.status, t.fare, t.requestedAt,
               c.firstName as clientFirstName, c.lastName as clientLastName,
               d.firstName as driverFirstName, d.lastName as driverLastName,
               d.vehicle, d.licensePlate
        FROM trips t
        LEFT JOIN clients c ON t.clientId = c.id
        LEFT JOIN drivers d ON t.driverId = d.id
        WHERE t.status IN ('requested','accepted','in_progress')
        ORDER BY t.requestedAt DESC
        LIMIT 20
      `;
      return rawQuery(sql);
    }),

    completedTripsToday: adminProcedure.query(async () => {
      const sql = `
        SELECT t.id, t.clientId, t.driverId, t.fare, t.pickupLocation, t.dropoffLocation,
               t.status, t.completedAt, t.requestedAt,
               c.firstName as clientFirstName, c.lastName as clientLastName,
               d.firstName as driverFirstName, d.lastName as driverLastName
        FROM trips t
        LEFT JOIN clients c ON t.clientId = c.id
        LEFT JOIN drivers d ON t.driverId = d.id
        WHERE t.status = 'completed'
          AND DATE(t.completedAt) = CURDATE()
        ORDER BY t.completedAt DESC
        LIMIT 20
      `;
      return rawQuery(sql);
    }),

    driverLocation: adminProcedure
      .input(z.string())
      .query(async ({ input }) => {
        const sql = `SELECT currentLocation FROM drivers WHERE id = ?`;
        const rows = await rawQuery<{currentLocation: any}>(sql, [input]);
        return rows[0]?.currentLocation || null;
      }),
  }),
});
export type AppRouter = typeof appRouter;
