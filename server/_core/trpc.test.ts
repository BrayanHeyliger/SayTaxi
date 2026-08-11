import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../routers";
import { protectedProcedure, adminProcedure, router } from "./trpc";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import type { TrpcContext } from "./context";

// ── Minimal test routers to exercise middleware directly ───────────────────────

const guardRouter = router({
  protected: protectedProcedure.query(() => "protected-ok"),
  admin: adminProcedure.query(() => "admin-ok"),
});

// ── Context helpers ────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeUser(role: "user" | "admin" | "client" | "driver" = "user") {
  return {
    id: 42,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "local" as const,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

// ── auth.me ────────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null when not authenticated", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: null }));
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns the current user when authenticated", async () => {
    const user = makeUser("admin");
    const caller = appRouter.createCaller(makeCtx({ user }));
    const result = await caller.auth.me();
    expect(result).toMatchObject({ id: 42, email: "test@example.com", role: "admin" });
  });
});

// ── auth.logout ────────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("succeeds and clears the session cookie", async () => {
    const cleared: { name: string; options: Record<string, unknown> }[] = [];
    const ctx = makeCtx({
      user: makeUser(),
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          cleared.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
    expect(cleared[0]?.name).toBe("app_session_id");
  });

  it("succeeds even when called unauthenticated (public procedure)", async () => {
    const cleared: unknown[] = [];
    const ctx = makeCtx({
      user: null,
      res: {
        clearCookie: (...args: unknown[]) => cleared.push(args),
      } as unknown as TrpcContext["res"],
    });
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.logout()).resolves.toEqual({ success: true });
  });
});

// ── protectedProcedure middleware ──────────────────────────────────────────────

describe("protectedProcedure — UNAUTHORIZED guard", () => {
  it("throws UNAUTHORIZED when user is null", async () => {
    const caller = guardRouter.createCaller(makeCtx({ user: null }));
    await expect(caller.protected()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: UNAUTHED_ERR_MSG,
    });
  });

  it("resolves when user is authenticated", async () => {
    const caller = guardRouter.createCaller(makeCtx({ user: makeUser() }));
    await expect(caller.protected()).resolves.toBe("protected-ok");
  });
});

// ── adminProcedure middleware ──────────────────────────────────────────────────

describe("adminProcedure — FORBIDDEN guard", () => {
  it("throws FORBIDDEN when user has non-admin role", async () => {
    const caller = guardRouter.createCaller(makeCtx({ user: makeUser("user") }));
    await expect(caller.admin()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: NOT_ADMIN_ERR_MSG,
    });
  });

  it("throws FORBIDDEN for driver role", async () => {
    const caller = guardRouter.createCaller(makeCtx({ user: makeUser("driver") }));
    await expect(caller.admin()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("resolves when user has admin role", async () => {
    const caller = guardRouter.createCaller(makeCtx({ user: makeUser("admin") }));
    await expect(caller.admin()).resolves.toBe("admin-ok");
  });
});
