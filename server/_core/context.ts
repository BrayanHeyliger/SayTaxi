import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;

    // Fallback: if a session cookie exists and matches the super-admin
    // pattern `local_admin_<email>`, treat it as an admin user even when the
    // database is not available. This enables local dev workflows where the
    // SUPER_ADMIN_* credentials are stored in `.env`.
    try {
      const cookieHeader = opts.req.headers.cookie ?? "";
      const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      const cookieVal = match ? decodeURIComponent(match[1]) : undefined;
      if (cookieVal) {
        const session = await sdk.verifySession(cookieVal as string);
        if (session && ENV.superAdminEmail) {
          const expectedOpenId = `local_admin_${ENV.superAdminEmail}`;
          if (session.openId === expectedOpenId) {
            const now = new Date();
            user = {
              id: -1,
              openId: session.openId,
              name: session.name || "Super Admin",
              email: ENV.superAdminEmail || null,
              loginMethod: "local",
              role: "admin",
              createdAt: now,
              updatedAt: now,
              lastSignedIn: now,
            } as User;
          }
        }
      }
    } catch {
      // ignore fallback errors
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
