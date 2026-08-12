import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2026-07-29.dahlia" })
  : null;

export const paymentsRouter = router({
  createCheckout: publicProcedure
    .input(z.object({
      planId: z.string(),
      planName: z.string(),
      amount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!stripe) {
        throw new Error("Stripe no está configurado. Define STRIPE_SECRET_KEY para habilitar pagos.");
      }

      const origin = ctx.req.headers.origin || "https://whatsapptaxi-jkudqcvs.manus.space";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `Passenger — Plan ${input.planName}`,
              description: `Suscripción mensual al Plan ${input.planName} de Passenger`,
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
