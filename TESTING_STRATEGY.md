# Testing Strategy — SayTaxi SaaS

## Architecture

SayTaxi is a **SaaS / Lead-Generation platform**: the app does not charge trip fares and drivers accept or reject ride alerts freely without penalties. Tests must reflect this business model.

### Stack

| Layer | Technology |
|-------|-----------|
| Test runner | **Vitest** (shared config `vitest.config.ts`) |
| Server | Express + tRPC + Drizzle ORM (MySQL) |
| Client | React 19 + Wouter + TanStack Query |

---

## Test Types

### 1. Unit Tests — `server/**/*.test.ts`

Run with: `pnpm test`

Tests for individual procedures that do **not** need a live database. Use `vi.mock("../db", ...)` to stub `getDb`, `rawQuery`, and `rawMutate`.

```
server/
  auth.logout.test.ts          ← auth cookie clearing
  _core/
    trpc.test.ts               ← auth.me, auth.logout, middleware messages
  routers/
    localAuth.test.ts          ← login validation, hardcoded admin, register input
```

Pattern from `server/auth.logout.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "./_core/context";

vi.mock("../db", () => ({
  getDb: vi.fn(),
  rawQuery: vi.fn(),
  rawMutate: vi.fn(),
}));
```

### 2. Integration Tests (future)

For full auth flows (register → login → token) integration tests require a test database. Recommended approach: use Docker Compose with a test MySQL container. Scope these in a separate `integration/` folder included via an additional Vitest project config.

### 3. E2E Tests — Playwright (future)

Install Playwright: `pnpm add -D @playwright/test && pnpm playwright install`

Critical paths to cover:
1. **Admin**: login → create user → assign permissions → logout
2. **Client**: login → request ride (lead) → driver accepts → rate trip
3. **Driver**: login → receive alert → **accept OR reject freely** (no penalty) → complete
4. **Fleet admin**: view drivers → suspend → reactivate

### 4. Security Tests

Validated via:
- Zod schemas on every tRPC input (server-side)
- `protectedProcedure` / `adminProcedure` middleware for role checks
- Rate limiting via Express middleware

### 5. Performance Baselines

| Metric | Target |
|--------|--------|
| Page load (p85) | < 3 s |
| API response | < 200 ms |
| `main.js` bundle | < 500 KB |

---

## CI Pipeline

`.github/workflows/ci.yml` runs on every PR:
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Run tests with coverage (`pnpm test -- --coverage`)
3. Upload coverage artifact

---

## SaaS Business Rules to Test

Because SayTaxi is a **lead-generation platform** (not a TNC):

- ✅ Drivers must be able to reject trips **without any error or penalty**
- ✅ The app must never process trip fares between client and driver
- ✅ Stripe charges only the **driver subscription**, not per-trip fees
- ✅ Trip requests are alerts/leads, not mandatory assignments
