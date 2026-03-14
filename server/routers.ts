import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter as coreSystemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ordersRouter } from "./routers/orders";
import { systemRouter } from "./routers/system";
import { shiftsRouter } from "./routers/shifts";
import { reportingRouter } from "./routers/reporting";
import { menuRouter } from "./routers/menu";
import { tablesRouter } from "./routers/tables";
import { rechargesRouter } from "./routers/recharges";
import { staffRouter } from "./routers/staff";
import { withdrawalsRouter } from "./routers/withdrawals";
import { qrOrdersRouter } from "./routers/qr-orders";
import { marketersRouter } from "./routers/marketers";
import { commissionsRouter } from "./routers/commissions";
import { cafeteriasRouter } from "./routers/cafeterias";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  coreSystem: coreSystemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  orders: ordersRouter,
  shifts: shiftsRouter,
  reporting: reportingRouter,
  menu: menuRouter,
  tables: tablesRouter,
  cafeterias: cafeteriasRouter,
  recharges: rechargesRouter,
  staff: staffRouter,
  withdrawals: withdrawalsRouter,
  qrOrders: qrOrdersRouter,
  marketers: marketersRouter,
  commissions: commissionsRouter,
});

export type AppRouter = typeof appRouter;
