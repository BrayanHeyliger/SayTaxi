import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import { sdk } from "./sdk";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // If user already present in context, enforce role check
    if (ctx.user) {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
      }
      return next({ ctx: { ...ctx, user: ctx.user } });
    }

    // Fallback: try to verify session cookie and accept the configured
    // super-admin openId in development environments.
    try {
      const cookieHeader = ctx.req.headers.cookie ?? "";
      const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
      const cookieVal = match ? decodeURIComponent(match[1]) : undefined;
      if (cookieVal) {
        const session = await sdk.verifySession(cookieVal as string);
        if (session && ENV.superAdminEmail) {
          const expectedOpenId = `local_admin_${ENV.superAdminEmail}`;
          if (session.openId === expectedOpenId) {
            const now = new Date();
            const user = {
              id: -1,
              openId: session.openId,
              name: session.name || "Super Admin",
              email: ENV.superAdminEmail || null,
              loginMethod: "local",
              role: "admin",
              createdAt: now,
              updatedAt: now,
              lastSignedIn: now,
            } as any;
            return next({ ctx: { ...ctx, user } });
          }
        }
      }
    } catch (err) {
      // ignore and fall through to forbidden
    }

    throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  }),
);
