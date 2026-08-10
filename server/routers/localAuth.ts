import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users, clients, drivers } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { randomBytes, pbkdf2Sync } from "node:crypto";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = "sha512";

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString("hex");
}

function createPasswordHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = hashPassword(password, salt);
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const inputHash = hashPassword(password, salt);
  return inputHash === hash;
}

export const localAuthRouter = router({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      // Find user by email
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) throw new Error("Credenciales incorrectas");

      // Verify password
      const storedHash = user.passwordHash;
      if (!storedHash || !verifyPassword(input.password, storedHash)) {
        throw new Error("Credenciales incorrectas");
      }

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

      const hashedPassword = createPasswordHash(input.password);
      const role = input.role === "fleet" ? "admin" : (input.role as "client" | "driver");

      // Create user
      const [result] = await db.insert(users).values({
        openId: `local_${Date.now()}_${randomBytes(8).toString("hex")}`,
        name: `${input.firstName} ${input.lastName || ""}`.trim(),
        email: input.email,
        phone: input.phone,
        role: role as "user" | "admin" | "client" | "driver",
        loginMethod: "local",
        passwordHash: hashedPassword,
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

