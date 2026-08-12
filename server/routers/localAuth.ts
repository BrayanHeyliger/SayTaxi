import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, clients, drivers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { ENV } from "../_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export const localAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Check for super admin via environment variables (avoid hardcoded creds)
      if (
        ENV.superAdminEmail &&
        ENV.superAdminPassword &&
        input.email === ENV.superAdminEmail &&
        input.password === ENV.superAdminPassword
      ) {
        const openId = `local_admin_${input.email}`;
        if (db) {
          // Ensure super admin user exists in DB
          const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
          if (!existing) {
            await db.insert(users).values({ openId, name: "Super Admin", email: input.email, role: "admin", loginMethod: "local" });
          }
        }

        const sessionToken = await sdk.createSessionToken(openId, { name: "Super Admin", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { id: 0, name: "Super Admin", email: ENV.superAdminEmail, role: "admin" as const };
      }

      if (!db) throw new Error("Base de datos no disponible");

      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) throw new Error("Credenciales incorrectas");

      // Verify password hash
      const storedHash = (user as any).passwordHash;
      if (storedHash) {
        const inputHash = hashPassword(input.password);
        if (storedHash !== inputHash) throw new Error("Credenciales incorrectas");
      }
      // Create session cookie for authenticated user
      const userOpenId = (user as any).openId as string;
      const sessionToken = await sdk.createSessionToken(userOpenId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        id: user.id,
        name: user.name || "Usuario",
        email: user.email || "",
        role: user.role as "user" | "admin" | "client" | "driver",
        phone: user.phone ?? undefined,
      };
    }),

  register: publicProcedure
    .input(z.object({
      firstName: z.string().min(1),
      lastName: z.string().optional(),
      email: z.string().email(),
      phone: z.string().min(1),
      password: z.string().min(6),
      role: z.enum(["client", "driver", "fleet"]),
      // Driver fields
      licenseNumber: z.string().optional(),
      vehicleMake: z.string().optional(),
      vehicleModel: z.string().optional(),
      vehiclePlate: z.string().optional(),
      // Fleet fields
      companyName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      const hashedPassword = hashPassword(input.password);
      const role = input.role === "fleet" ? "admin" : (input.role as "client" | "driver");

      // Create user
      const [result] = await db.insert(users).values({
        openId: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: `${input.firstName} ${input.lastName || ""}`.trim(),
        email: input.email,
        phone: input.phone,
        role: role as "user" | "admin" | "client" | "driver",
        loginMethod: "local",
      }).$returningId();

      const userId = result.id;

      // Create role-specific profile
      if (input.role === "client") {
        await db.insert(clients).values({
          userId,
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          phone: input.phone,
        });
      } else if (input.role === "driver") {
        await db.insert(drivers).values({
          userId,
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          phone: input.phone,
          licenseNumber: input.licenseNumber || `DL-${Date.now()}`,
        });
      }

      return {
        id: userId,
        name: `${input.firstName} ${input.lastName || ""}`.trim(),
        email: input.email,
        role: input.role as "client" | "driver" | "fleet",
      };
    }),
});
