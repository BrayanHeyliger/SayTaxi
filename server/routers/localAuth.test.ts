import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// ── Mock the database so tests don't need a running MySQL server ───────────────

vi.mock("../db", () => ({
  getDb: vi.fn(),
  rawQuery: vi.fn(),
  rawMutate: vi.fn(),
}));

import { getDb, rawQuery, rawMutate } from "../db";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── localAuth.login ────────────────────────────────────────────────────────────

describe("localAuth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns super-admin data for hardcoded admin credentials", async () => {
    // getDb() is called first; provide a minimal stub so execution continues.
    vi.mocked(getDb).mockResolvedValue({} as any);

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.localAuth.login({
      email: "admin@whatsapptaxi.com",
      password: "Hosting01",
    });

    expect(result).toMatchObject({
      id: 0,
      name: "Heyliger",
      email: "admin@whatsapptaxi.com",
      role: "admin",
    });
  });

  it("rejects login with wrong credentials (no user row returned)", async () => {
    vi.mocked(getDb).mockResolvedValue({
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    } as any);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.login({ email: "unknown@example.com", password: "wrong" })
    ).rejects.toThrow("Credenciales incorrectas");
  });

  it("rejects login when DB is not available", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.login({ email: "x@example.com", password: "pass" })
    ).rejects.toThrow("Base de datos no disponible");
  });

  it("throws input validation error for invalid email", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.login({ email: "not-an-email", password: "pass" })
    ).rejects.toThrow();
  });

  it("throws input validation error for empty password", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.login({ email: "user@example.com", password: "" })
    ).rejects.toThrow();
  });
});

// ── localAuth.register ─────────────────────────────────────────────────────────

describe("localAuth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when DB is not available", async () => {
    vi.mocked(getDb).mockResolvedValue(null as any);

    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.register({
        firstName: "John",
        email: "john@example.com",
        phone: "+1234567890",
        password: "secure123",
        role: "client",
      })
    ).rejects.toThrow("Base de datos no disponible");
  });

  it("throws validation error for short password (< 6 chars)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.register({
        firstName: "John",
        email: "john@example.com",
        phone: "+1234567890",
        password: "123",
        role: "client",
      })
    ).rejects.toThrow();
  });

  it("throws validation error for invalid role", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.localAuth.register({
        firstName: "John",
        email: "john@example.com",
        phone: "+1234567890",
        password: "secure123",
        role: "superadmin" as any,
      })
    ).rejects.toThrow();
  });
});
