import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, router } from "./_core/trpc";
import { blueprintRouter } from "./routers/blueprintRouter";
import { clientsRouter } from "./routers/clientsRouter";
import { estimatesRouter } from "./routers/estimatesRouter";
import { fieldReportsRouter } from "./routers/fieldReportsRouter";
import { finishSelectionsRouter } from "./routers/finishSelectionsRouter";
import { leadsRouter } from "./routers/leadsRouter";
import { ledgerRouter } from "./routers/ledgerRouter";
import { materialsRouter } from "./routers/materialsRouter";
import { notificationsRouter } from "./routers/notificationsRouter";
import { portfolioRouter } from "./routers/portfolioRouter";
import { projectsRouter } from "./routers/projectsRouter";
import { purchaseOrdersRouter } from "./routers/purchaseOrdersRouter";
import { scheduleRouter } from "./routers/scheduleRouter";
import { sitePlansRouter } from "./routers/sitePlansRouter";
import { subContractorsRouter } from "./routers/subContractorsRouter";
import { vendorsRouter } from "./routers/vendorsRouter";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: protectedProcedure.query(opts => opts.ctx.user),
  }),
  projects: projectsRouter,
  clients: clientsRouter,
  fieldReports: fieldReportsRouter,
  schedule: scheduleRouter,
  estimates: estimatesRouter,
  ledger: ledgerRouter,
  leads: leadsRouter,
  materials: materialsRouter,
  purchaseOrders: purchaseOrdersRouter,
  subContractors: subContractorsRouter,
  vendors: vendorsRouter,
  finishSelections: finishSelectionsRouter,
  notifications: notificationsRouter,
  portfolio: portfolioRouter,
  sitePlans: sitePlansRouter,
  blueprint: blueprintRouter,
});

export type AppRouter = typeof appRouter;
