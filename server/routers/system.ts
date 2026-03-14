import { publicProcedure, adminProcedure, ownerProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { cafeteriaTables, orders } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "../utils/logger";
import { closeDay } from "../utils/dailyClosing";
import { exportDailyBackup } from "../utils/backupExport";
import { z } from "zod";

const startTime = new Date();

/**
 * System Router
 * Provides health checks and system-level monitoring
 */
export const systemRouter = router({
  /**
   * TASK 5 — Production Health Endpoint
   * Returns database status, active tables, orders in progress, and server uptime
   */
  health: publicProcedure.query(async () => {
    let dbStatus = "healthy";
    let activeTables = 0;
    let ordersInProgress = 0;

    try {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Check database by performing simple queries
      const tablesResult = await db
        .select()
        .from(cafeteriaTables)
        .where(eq(cafeteriaTables.status, "occupied"));
      activeTables = tablesResult.length;

      const ordersResult = await db
        .select()
        .from(orders)
        .where(eq(orders.status, "open"));
      ordersInProgress = ordersResult.length;

    } catch (error: any) {
      dbStatus = "unhealthy";
      logger.error("SYSTEM_HEALTH_CHECK_FAILED", error.message);
    }

    const uptimeSeconds = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    return {
      status: dbStatus === "healthy" ? "ok" : "error",
      database: dbStatus,
      activeTables,
      ordersInProgress,
      uptime: `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m ${uptimeSeconds % 60}s`,
      timestamp: new Date(),
    };
  }),

  /**
   * Get recent system logs (for admin monitoring)
   */
  getLogs: adminProcedure.query(async () => {
    return logger.getLogs(50);
  }),

  /**
   * TASK 4 — Daily Closing Tool
   * Closes all open orders and resets tables
   */
  closeDay: ownerProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const summary = await closeDay(input.cafeteriaId);
        return { success: true, summary };
      } catch (error: any) {
        logger.error("DAILY_CLOSE_FAILED", error.message);
        throw new Error("Failed to close day. Please try again.");
      }
    }),

  /**
   * TASK 5 — Backup Export Tool
   * Exports system data as JSON
   */
  exportBackup: ownerProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const backup = await exportDailyBackup(input.cafeteriaId);
        return { success: true, backup };
      } catch (error: any) {
        logger.error("BACKUP_EXPORT_FAILED", error.message);
        throw new Error("Failed to export backup. Please try again.");
      }
    }),
});
