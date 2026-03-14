import { getDb } from "../db";
import { orders, cafeteriaTables } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Daily Closing Utility
 * Handles end-of-day operations like closing open orders and resetting tables.
 */

export interface DailySummary {
  orderCount: number;
  totalRevenue: number;
  closedOrdersCount: number;
  resetTablesCount: number;
}

export async function closeDay(cafeteriaId: string): Promise<DailySummary> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  // 1. Get summary before closing
  const openOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.cafeteriaId, cafeteriaId), eq(orders.status, "open")));

  const totalRevenue = openOrders.reduce((sum, order) => sum + parseFloat(order.totalAmount || "0"), 0);

  // 2. Mark all open orders as closed
  const closedResult = await db
    .update(orders)
    .set({ 
      status: "closed",
      closedAt: now 
    })
    .where(and(eq(orders.cafeteriaId, cafeteriaId), eq(orders.status, "open")));

  // 3. Reset all tables to available
  const resetResult = await db
    .update(cafeteriaTables)
    .set({ status: "available" })
    .where(eq(cafeteriaTables.cafeteriaId, cafeteriaId));

  logger.info("DAILY_CLOSE", `Day closed for cafeteria ${cafeteriaId}`, { 
    orderCount: openOrders.length, 
    revenue: totalRevenue 
  });

  return {
    orderCount: openOrders.length,
    totalRevenue,
    closedOrdersCount: openOrders.length,
    resetTablesCount: 0, // Drizzle update result doesn't return count easily in all drivers
  };
}
