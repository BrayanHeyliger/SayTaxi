import type { Request, Response } from "express";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { rawMutate } from "../db";

const PLAN_CATALOG = {
  basic: { name: "Básico", amountInCents: 4_900 },
  pro: { name: "Pro", amountInCents: 14_900 },
  enterprise: { name: "Enterprise", amountInCents: 39_900 },
} as const;

type PlanId = keyof typeof PLAN_CATALOG;

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  return secretKey ? new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" }) : null;
}

function requireStripe() {
  const stripe = getStripeClient();
  if (!stripe) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Los pagos todavía no están configurados." });
  }
  return stripe;
}

export const paymentsRouter = router({
  createCheckout: protectedProcedure
    .input(z.object({ planId: z.enum(["basic", "pro", "enterprise"]) }))
    .mutation(async ({ input, ctx }) => {
      const stripe = requireStripe();
      const plan = PLAN_CATALOG[input.planId as PlanId];
      const appUrl = ENV.appUrl.replace(/\/$/, "");

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `SayTaxi — Plan ${plan.name}`,
              description: `Suscripción mensual al plan ${plan.name}`,
            },
            unit_amount: plan.amountInCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        allow_promotion_codes: true,
        success_url: `${appUrl}/payments?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payments?cancelled=true`,
        client_reference_id: String(ctx.user.id),
        customer_email: ctx.user.email || undefined,
        metadata: { plan_id: input.planId, user_id: String(ctx.user.id) },
        subscription_data: { metadata: { plan_id: input.planId, user_id: String(ctx.user.id) } },
      });

      if (!session.url) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe no devolvió una URL de pago." });
      }
      return { url: session.url };
    }),
});

/**
 * Express handler mounted before the JSON parser. It verifies Stripe's signature
 * and records the event exactly once so the billing lifecycle is auditable.
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const stripe = getStripeClient();
  const signature = req.header("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !signature || !webhookSecret) {
    return res.status(503).json({ error: "Billing webhook is not configured" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({ error: "Invalid Stripe webhook signature" });
  }

  const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
  const metadata = "metadata" in object ? object.metadata : {};
  const subscriptionId = "subscription" in object && typeof object.subscription === "string"
    ? object.subscription
    : "id" in object && event.type.startsWith("customer.subscription.")
      ? object.id
      : null;
  const userId = Number(metadata?.user_id ?? 0) || null;

  const insert = await rawMutate(
    `INSERT IGNORE INTO billingEvents (stripeEventId, userId, eventType, status, stripeSubscriptionId, payload)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [event.id, userId, event.type, event.type.includes("failed") ? "failed" : "received", subscriptionId, JSON.stringify(event)],
  );

  if (insert.affectedRows === 0) {
    return res.status(200).json({ received: true, duplicate: true });
  }

  const planId = metadata?.plan_id;
  const validPlan = planId === "basic" || planId === "pro" || planId === "enterprise";

  if (event.type === "checkout.session.completed" && validPlan && userId && subscriptionId) {
    const session = object as Stripe.Checkout.Session;
    await rawMutate(
      `INSERT INTO userSubscriptions (userId, planId, stripeCustomerId, stripeSubscriptionId, status)
       VALUES (?, ?, ?, ?, 'active')
       ON DUPLICATE KEY UPDATE planId = VALUES(planId), stripeCustomerId = VALUES(stripeCustomerId),
         stripeSubscriptionId = VALUES(stripeSubscriptionId), status = 'active'`,
      [userId, planId, typeof session.customer === "string" ? session.customer : null, subscriptionId],
    );
  }

  if ((event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") && subscriptionId) {
    const subscription = object as Stripe.Subscription;
    const currentPeriodEnd = (subscription as any).current_period_end ?? (subscription as any).items?.data?.[0]?.current_period_end;
    await rawMutate(
      `UPDATE userSubscriptions SET status = ?, currentPeriodEnd = ? WHERE stripeSubscriptionId = ?`,
      [subscription.status, currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null, subscriptionId],
    );
  }

  return res.status(200).json({ received: true });
}
