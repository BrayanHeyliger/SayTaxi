import { vi } from "vitest";

// Stripe requires a valid API key at instantiation time.
// In unit tests we never call Stripe; mock the entire module so that
// importing routers.ts (which loads payments.ts) doesn't throw.
vi.mock("stripe", () => {
  const Stripe = vi.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://stripe.com/checkout/mock" }),
      },
    },
  }));
  return { default: Stripe };
});
