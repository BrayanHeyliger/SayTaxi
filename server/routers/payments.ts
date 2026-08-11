import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import Stripe from "stripe";

/**
 * Payments Router — SaaS Subscriptions ONLY
 *
 * SayTaxi operates exclusively as a Software-as-a-Service (SaaS) booking engine.
 * This router handles ONLY driver/fleet software subscription payments via Stripe.
 *
 * IMPORTANT:
 * - Ride fares are NEVER collected, held, or processed here.
 * - Ride fare payments are settled directly between Clients and Drivers.
 * - The platform only charges Drivers a periodic software subscription fee.
 * - Drivers are independent contractors; SayTaxi is NOT a Transportation Network Company (TNC).
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-07-29.dahlia" });

export const paymentsRouter = router({
  createCheckout: publicProcedure
    .input(z.object({
      planId: z.string(),
      planName: z.string(),
      amount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || "https://whatsapptaxi-jkudqcvs.manus.space";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `SayTaxi — Software Plan ${input.planName}`,
              description: `Suscripción mensual al Plan ${input.planName} de SayTaxi SaaS. NOTA: Esta suscripción cubre solo el uso del software. La tarifa del viaje es pagada directamente entre cliente y conductor.`,
            },
            unit_amount: input.amount * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        }],
        mode: "subscription",
        allow_promotion_codes: true,
        success_url: `${origin}/payments?success=true&plan=${input.planId}`,
        cancel_url: `${origin}/payments?cancelled=true`,
        metadata: {
          plan_id: input.planId,
          plan_name: input.planName,
        },
      });
      return { url: session.url };
    }),
});
