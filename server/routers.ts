import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /**
     * Returns the current session user.
     * Phase 1: always null. Phase 2: reads Supabase JWT from cookie.
     */
    me: publicProcedure.query(opts => opts.ctx.user),
  }),

  // Feature routers added per phase:
  // Phase 2: projects, clients, fieldReports, materials, scheduleItems,
  //          estimates, ledger, portfolio, subContractors, leads
});

export type AppRouter = typeof appRouter;
