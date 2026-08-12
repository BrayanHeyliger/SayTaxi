import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import Stripe from "stripe";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return null;
  }

  return new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" });
}

export const paymentsRouter = router({
  createCheckout: publicProcedure
    .input(z.object({
      planId: z.string(),
      planName: z.string(),
      amount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const stripe = getStripeClient();

      if (!stripe) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "STRIPE_SECRET_KEY no está configurada.",
        });
      }

      const origin = ctx.req.headers.origin || "https://whatsapptaxi-jkudqcvs.manus.space";
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `WhatsAppTaxi — Plan ${input.planName}`,
              description: `Suscripción mensual al Plan ${input.planName} de WhatsApp Taxi SaaS`,
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
