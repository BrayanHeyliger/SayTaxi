import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("payments router", () => {
  const originalStripeKey = process.env.STRIPE_SECRET_KEY;

  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_SECRET_KEY;
  });

  afterEach(() => {
    vi.resetModules();
    if (originalStripeKey) {
      process.env.STRIPE_SECRET_KEY = originalStripeKey;
    } else {
      delete process.env.STRIPE_SECRET_KEY;
    }
  });

  it("loads without crashing when Stripe is not configured", async () => {
    const { paymentsRouter } = await import("./payments");

    expect(paymentsRouter).toBeDefined();
  });
});
