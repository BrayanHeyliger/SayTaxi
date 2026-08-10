import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import Stripe from "stripe";
import type { Application, Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2026-07-29.dahlia" });

export const paymentsRouter = router({
  createCheckout: publicProcedure
    .input(z.object({
      planId: z.string(),
      planName: z.string(),
      amount: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || process.env.APP_URL || "http://localhost:3000";
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

/**
 * Register the Stripe webhook endpoint on the Express app.
 * Must be called with the raw body parser (before express.json) so that
 * stripe.webhooks.constructEvent can verify the signature.
 */
export function registerStripeWebhook(app: Application): void {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  app.post(
    "/api/stripe/webhook",
    // Raw body needed for signature verification
    (req: Request, res: Response, next) => {
      let rawBody = "";
      req.setEncoding("utf8");
      req.on("data", (chunk: string) => { rawBody += chunk; });
      req.on("end", () => {
        (req as any).rawBody = rawBody;
        next();
      });
    },
    (req: Request, res: Response) => {
      if (!webhookSecret) {
        console.warn("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification");
        res.sendStatus(400);
        return;
      }

      const sig = req.headers["stripe-signature"];
      if (!sig) {
        res.status(400).send("Missing stripe-signature header");
        return;
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig, webhookSecret);
      } catch (err) {
        console.error("[Stripe Webhook] Signature verification failed:", err);
        res.status(400).send("Webhook signature verification failed");
        return;
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          console.log(`[Stripe Webhook] checkout.session.completed — session ${session.id}, plan: ${session.metadata?.plan_name}`);
          // TODO: update companySubscriptions table with session.subscription
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          console.log(`[Stripe Webhook] customer.subscription.deleted — ${sub.id}`);
          // TODO: mark companySubscriptions as cancelled
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          console.log(`[Stripe Webhook] invoice.payment_failed — ${invoice.id}`);
          // TODO: notify customer of failed payment
          break;
        }
        default:
          break;
      }

      res.sendStatus(200);
    }
  );
}

