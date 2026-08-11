import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { localAuthRouter } from "./routers/localAuth";
import { paymentsRouter } from "./routers/payments";
import { siteSettingsRouter } from "./routers/siteSettings";
import { referralsRouter } from "./routers/referrals";
import { announcementsRouter } from "./routers/announcements";
import { safetyTipsRouter } from "./routers/safetyTips";
import { parcelsRouter } from "./routers/parcels";
import { whatsappRouter } from "./routers/whatsapp";

export const appRouter = router({
  system: systemRouter,
  localAuth: localAuthRouter,
  payments: paymentsRouter,
  siteSettings: siteSettingsRouter,
  referrals: referralsRouter,
  announcements: announcementsRouter,
  safetyTips: safetyTipsRouter,
  parcels: parcelsRouter,
  whatsapp: whatsappRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
