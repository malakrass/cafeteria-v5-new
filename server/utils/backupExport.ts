import { getDb } from "../db";
import { orders, cafeteriaTables, cafeteriaStaff, menuItems, menuCategories } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Backup Export Utility
 * Exports critical system data as JSON for backup purposes.
 */

export interface BackupData {
  orders: any[];
  tables: any[];
  staff: any[];
  menu: any[];
  timestamp: Date;
}

export async function exportDailyBackup(cafeteriaId: string): Promise<BackupData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [ordersData, tablesData, staffData, menuData] = await Promise.all([
    db.select().from(orders).where(eq(orders.cafeteriaId, cafeteriaId)),
    db.select().from(cafeteriaTables).where(eq(cafeteriaTables.cafeteriaId, cafeteriaId)),
    db.select().from(cafeteriaStaff).where(eq(cafeteriaStaff.cafeteriaId, cafeteriaId)),
    db.select().from(menuItems).innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id)).where(eq(menuCategories.cafeteriaId, cafeteriaId)),
  ]);

  return {
    orders: ordersData,
    tables: tablesData,
    staff: staffData,
    menu: menuData,
    timestamp: new Date(),
  };
}
