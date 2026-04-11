import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, router } from "./_core/trpc";
import { clientsRouter } from "./routers/clientsRouter";
import { estimatesRouter } from "./routers/estimatesRouter";
import { fieldReportsRouter } from "./routers/fieldReportsRouter";
import { finishSelectionsRouter } from "./routers/finishSelectionsRouter";
import { ledgerRouter } from "./routers/ledgerRouter";
import { materialsRouter } from "./routers/materialsRouter";
import { notificationsRouter } from "./routers/notificationsRouter";
import { portfolioRouter } from "./routers/portfolioRouter";
import { projectsRouter } from "./routers/projectsRouter";
import { scheduleRouter } from "./routers/scheduleRouter";
import { subContractorsRouter } from "./routers/subContractorsRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
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
  projects: projectsRouter,
  clients: clientsRouter,
  fieldReports: fieldReportsRouter,
  schedule: scheduleRouter,
  estimates: estimatesRouter,
  ledger: ledgerRouter,
  materials: materialsRouter,
  subContractors: subContractorsRouter,
  finishSelections: finishSelectionsRouter,
  notifications: notificationsRouter,
  portfolio: portfolioRouter,
});

export type AppRouter = typeof appRouter;
