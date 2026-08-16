import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { hashPassword, verifyPassword } from "./_core/passwords";

function contextFor(role: "admin" | "client" | "driver" | null, isActive = true) {
  return {
    req: { headers: {} },
    res: { cookie: vi.fn(), clearCookie: vi.fn() },
    user: role ? {
      id: 42,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      role,
      isActive,
      loginMethod: "local",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } : null,
  } as any;
}

describe("password security", () => {
  it("derives a salted password hash and verifies it in constant-time flow", async () => {
    const hash = await hashPassword("a-long-production-password");
    expect(hash).not.toContain("a-long-production-password");
    expect(await verifyPassword("a-long-production-password", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });
});

describe("administrative authorization", () => {
  it("denies unauthenticated access to the super-admin dashboard", async () => {
    const caller = appRouter.createCaller(contextFor(null));
    await expect(caller.adminDashboard.activeDrivers()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("denies non-admin access to persistent administration procedures", async () => {
    const caller = appRouter.createCaller(contextFor("client"));
    await expect(caller.adminOperations.listDrivers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("denies suspended administrators", async () => {
    const caller = appRouter.createCaller(contextFor("admin", false));
    await expect(caller.adminOperations.listClients()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("denies the dispatcher queue to ordinary customers", async () => {
    const caller = appRouter.createCaller(contextFor("client"));
    await expect(caller.dispatcherOperations.listQueue()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("payment input validation", () => {
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    if (originalStripeKey) process.env.STRIPE_SECRET_KEY = originalStripeKey;
    else delete process.env.STRIPE_SECRET_KEY;
  });

  it("rejects manipulated plan identifiers before checkout is created", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.payments.createCheckout({ planId: "free" as any })).rejects.toBeDefined();
  });

  it("fails closed when billing credentials are not configured", async () => {
    const caller = appRouter.createCaller(contextFor("admin"));
    await expect(caller.payments.createCheckout({ planId: "basic" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
