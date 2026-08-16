import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, clients, drivers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "../_core/env";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { hashPassword, verifyPassword } from "../_core/passwords";

const credentialError = "Credenciales incorrectas";

export const localAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // The emergency super-admin account remains environment-controlled and is
      // intentionally separate from public registration.
      if (
        ENV.superAdminEmail &&
        ENV.superAdminPassword &&
        input.email === ENV.superAdminEmail &&
        input.password === ENV.superAdminPassword
      ) {
        const openId = `local_admin_${input.email}`;
        if (db) {
          const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
          if (!existing) {
            await db.insert(users).values({
              openId,
              name: "Super Admin",
              email: input.email,
              role: "admin",
              loginMethod: "local",
              isActive: true,
            });
          } else if (!existing.isActive) {
            throw new Error("Cuenta de administrador desactivada");
          }
        }

        const sessionToken = await sdk.createSessionToken(openId, { name: "Super Admin", expiresInMs: ONE_YEAR_MS });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { id: 0, name: "Super Admin", email: ENV.superAdminEmail, role: "admin" as const };
      }

      if (!db) throw new Error("Base de datos no disponible");

      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user || !user.isActive || !user.passwordHash) throw new Error(credentialError);

      if (!(await verifyPassword(input.password, user.passwordHash))) {
        throw new Error(credentialError);
      }

      const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return {
        id: user.id,
        name: user.name || "Usuario",
        email: user.email || "",
        role: user.role,
        phone: user.phone ?? undefined,
      };
    }),

  register: publicProcedure
    .input(z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().max(100).optional(),
      email: z.string().email(),
      phone: z.string().trim().min(7).max(20),
      password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres").max(128),
      // Public registration must never create an administrator.
      role: z.enum(["client", "driver", "fleet"]),
      licenseNumber: z.string().trim().max(50).optional(),
      vehicleMake: z.string().trim().max(100).optional(),
      vehicleModel: z.string().trim().max(100).optional(),
      vehiclePlate: z.string().trim().max(20).optional(),
      companyName: z.string().trim().max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
      if (existing) throw new Error("Ya existe una cuenta con este correo");

      const passwordHash = await hashPassword(input.password);
      const [result] = await db.insert(users).values({
        openId: `local_${crypto.randomUUID()}`,
        name: `${input.firstName} ${input.lastName || ""}`.trim(),
        email: input.email,
        phone: input.phone,
        passwordHash,
        role: input.role,
        loginMethod: "local",
        isActive: true,
      }).$returningId();

      const userId = result.id;
      if (input.role === "client") {
        await db.insert(clients).values({
          userId,
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          phone: input.phone,
        });
      } else if (input.role === "driver") {
        if (!input.licenseNumber) throw new Error("La licencia es obligatoria para registrar un conductor");
        await db.insert(drivers).values({
          userId,
          firstName: input.firstName,
          lastName: input.lastName || null,
          email: input.email,
          phone: input.phone,
          licenseNumber: input.licenseNumber,
          status: "pending",
        });
      }

      return {
        id: userId,
        name: `${input.firstName} ${input.lastName || ""}`.trim(),
        email: input.email,
        role: input.role,
      };
    }),
});
