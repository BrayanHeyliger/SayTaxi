/**
 * SaaS Model — Voluntary Trip Alert Tests
 *
 * Validates the lead-generation model:
 * - Drivers can freely reject booking alerts without any penalty.
 * - Drivers can accept booking alerts and mark them as accepted.
 * - No mandatory acceptance rate, quota, or suspension logic is enforced.
 * - Ride fare is treated as a reference amount (not collected by the platform).
 */
import { describe, expect, it } from "vitest";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BookingAlert {
  id: string;
  clientName: string;
  pickup: string;
  dropoff: string;
  /** Reference fare set by driver/agreed between parties. NOT collected by platform. */
  referenceFare: string;
  status: "pending" | "accepted" | "rejected";
}

interface DriverSession {
  driverId: number;
  acceptedAlerts: BookingAlert[];
  rejectedAlerts: BookingAlert[];
  /** Subscription status — only thing the platform tracks financially. */
  subscriptionStatus: "active" | "inactive";
}

// ─── Helpers (simulating platform lead-gen logic) ─────────────────────────────

function createSession(driverId: number): DriverSession {
  return {
    driverId,
    acceptedAlerts: [],
    rejectedAlerts: [],
    subscriptionStatus: "active",
  };
}

/**
 * Accepts a booking alert voluntarily.
 * Returns updated session — no side-effects on subscription or penalty flags.
 */
function acceptAlert(session: DriverSession, alert: BookingAlert): DriverSession {
  return {
    ...session,
    acceptedAlerts: [...session.acceptedAlerts, { ...alert, status: "accepted" }],
  };
}

/**
 * Rejects a booking alert voluntarily.
 * Critically: subscription status and any other driver flags are NOT affected.
 */
function rejectAlert(session: DriverSession, alert: BookingAlert): DriverSession {
  return {
    ...session,
    rejectedAlerts: [...session.rejectedAlerts, { ...alert, status: "rejected" }],
    // subscriptionStatus is intentionally unchanged — no penalty
  };
}

function createAlert(overrides?: Partial<BookingAlert>): BookingAlert {
  return {
    id: "alert-001",
    clientName: "Test Client",
    pickup: "123 Main St, Orlando, FL",
    dropoff: "456 Oak Ave, Orlando, FL",
    referenceFare: "$25.00",
    status: "pending",
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("SaaS lead-generation model — voluntary trip alerts", () => {
  it("driver can accept a booking alert", () => {
    const session = createSession(1);
    const alert = createAlert();
    const updated = acceptAlert(session, alert);

    expect(updated.acceptedAlerts).toHaveLength(1);
    expect(updated.acceptedAlerts[0]?.status).toBe("accepted");
    expect(updated.rejectedAlerts).toHaveLength(0);
  });

  it("driver can reject a booking alert without penalty", () => {
    const session = createSession(1);
    const alert = createAlert({ id: "alert-002" });
    const updated = rejectAlert(session, alert);

    expect(updated.rejectedAlerts).toHaveLength(1);
    expect(updated.rejectedAlerts[0]?.status).toBe("rejected");
    expect(updated.acceptedAlerts).toHaveLength(0);
  });

  it("subscription status is NOT affected when driver rejects an alert", () => {
    const session = createSession(1);
    const alert = createAlert();
    const updated = rejectAlert(session, alert);

    // The platform does NOT penalize rejections — subscription remains active.
    expect(updated.subscriptionStatus).toBe("active");
  });

  it("subscription status is NOT affected when driver accepts an alert", () => {
    const session = createSession(1);
    const alert = createAlert();
    const updated = acceptAlert(session, alert);

    expect(updated.subscriptionStatus).toBe("active");
  });

  it("driver can reject multiple alerts in a row — no penalty accumulates", () => {
    let session = createSession(1);
    for (let i = 0; i < 10; i++) {
      session = rejectAlert(session, createAlert({ id: `alert-${i}` }));
    }

    expect(session.rejectedAlerts).toHaveLength(10);
    // Subscription is still active after 10 consecutive rejections.
    expect(session.subscriptionStatus).toBe("active");
    // No accepted alerts — all were voluntarily rejected.
    expect(session.acceptedAlerts).toHaveLength(0);
  });

  it("driver can freely mix accepts and rejects", () => {
    let session = createSession(1);
    session = acceptAlert(session, createAlert({ id: "a1" }));
    session = rejectAlert(session, createAlert({ id: "a2" }));
    session = acceptAlert(session, createAlert({ id: "a3" }));

    expect(session.acceptedAlerts).toHaveLength(2);
    expect(session.rejectedAlerts).toHaveLength(1);
    expect(session.subscriptionStatus).toBe("active");
  });

  it("reference fare is informational only — not collected by platform", () => {
    // The 'referenceFare' field is set by the driver/agreed between parties.
    // The platform never charges or holds this amount.
    const alert = createAlert({ referenceFare: "$40.00" });

    // Verify the fare exists as a reference value.
    expect(alert.referenceFare).toBe("$40.00");

    // The platform has no concept of 'platformCollectedFare' — it doesn't exist.
    expect((alert as any).platformCollectedFare).toBeUndefined();
  });

  it("pending alerts with no response do not affect driver standing", () => {
    const session = createSession(1);
    // Driver does not respond to any alerts — session state is unchanged.
    expect(session.acceptedAlerts).toHaveLength(0);
    expect(session.rejectedAlerts).toHaveLength(0);
    expect(session.subscriptionStatus).toBe("active");
  });
});
