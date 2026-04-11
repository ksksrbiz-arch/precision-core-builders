import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /**
     * Returns the current session user.
     * Phase 1: always null. Phase 2: reads Supabase JWT from cookie.
     */
    me: publicProcedure.query(opts => opts.ctx.user),

    /**
     * Clears the session cookie and logs the user out.
     * Implemented as publicProcedure so logout is idempotent even when
     * the session cookie is already expired or invalid.
     */
    logout: publicProcedure.mutation(opts => {
      opts.ctx.res.clearCookie(COOKIE_NAME, {
        ...getSessionCookieOptions(opts.ctx.req),
      });
      return { success: true };
    }),
  }),

  // Feature routers added per phase:
  // Phase 2: projects, clients, fieldReports, materials, scheduleItems,
  //          estimates, ledger, portfolio, subContractors, leads
});

export type AppRouter = typeof appRouter;
