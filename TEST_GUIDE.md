# TEST_GUIDE — How to Write Tests for SayTaxi SaaS

## Quick Start

```bash
# Run all tests
pnpm test

# Watch mode during development
pnpm exec vitest
```

---

## File Naming & Location

All tests live alongside the source files they cover:

```
server/
  routers/
    localAuth.ts
    localAuth.test.ts   ← unit tests for this router
  _core/
    trpc.ts
    trpc.test.ts
  auth.logout.test.ts
```

Vitest picks up any `*.test.ts` or `*.spec.ts` file inside `server/`.

---

## Writing a Server Unit Test

### Template

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";          // adjust relative path
import type { TrpcContext } from "./_core/context";

// 1. Mock the database — tests should never need a real MySQL server
vi.mock("../db", () => ({
  getDb: vi.fn(),
  rawQuery: vi.fn(),
  rawMutate: vi.fn(),
}));
import { getDb, rawQuery, rawMutate } from "../db";

// 2. Build a minimal tRPC context
function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("myRouter.myProcedure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns expected value", async () => {
    // Arrange
    vi.mocked(getDb).mockResolvedValue({ /* drizzle stub */ } as any);

    // Act
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.myRouter.myProcedure({ /* input */ });

    // Assert
    expect(result).toMatchObject({ success: true });
  });
});
```

---

## Business Rules to Assert

SayTaxi is a **SaaS / lead-generation platform** — not a TNC. Every test touching trips must respect:

| Rule | ✅ Should work | ❌ Should never happen |
|------|---------------|----------------------|
| Driver rejects trip | No error, no penalty | Rejection blocked or penalised |
| Payment flow | Only Stripe subscription for driver | Fare charged by the app |
| Trip assignment | Alert sent; driver chooses freely | Forced assignment |

---

## Input Validation Tests

Zod schemas are enforced by tRPC at the procedure boundary. Test invalid inputs:

```ts
it("rejects invalid email", async () => {
  const caller = appRouter.createCaller(makeCtx());
  await expect(
    caller.localAuth.login({ email: "bad", password: "x" })
  ).rejects.toThrow();
});
```

---

## Mocking DB Results

```ts
// Return a list of rows
vi.mocked(rawQuery).mockResolvedValue([{ id: 1, name: "Test" }]);

// Return an inserted ID
vi.mocked(rawMutate).mockResolvedValue({ insertId: 1 } as any);

// Simulate DB error
vi.mocked(getDb).mockResolvedValue(null as any); // triggers "Base de datos no disponible"
```

---

## Coverage

Target: **80 %** statement coverage on `server/`.

Generate an HTML report:

```bash
pnpm exec vitest run --coverage
# open coverage/index.html
```
