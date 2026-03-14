
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { getDb } from "../db";
import {
  cafeteriaReports,
  orders,
  orderItems,
  shifts,
  cafeterias,
  cafeteriaStaff,
} from "../../drizzle/schema";
import {
  generateCafeteriaReport,
  calculateTotalSales,
  calculateTotalItemsSold,
  calculateAverageOrderValue,
  getTopSellingItems,
  getTopPerformingStaff,
  calculatePeakHours,
  compareReports,
  validateReportParameters,
} from "../utils/reportingEngine";

// Helper to check if a user has access to a cafeteria
async function checkCafeteriaAccess(db: any, userId: string, cafeteriaId: string) {
    const staffRecord = await db
        .select()
        .from(cafeteriaStaff)
        .where(and(eq(cafeteriaStaff.id, userId), eq(cafeteriaStaff.cafeteriaId, cafeteriaId)))
        .limit(1);
    return staffRecord.length > 0;
}

export const reportingRouter = router({
  generateDailyReport: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        reportDate: z.date(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== 'admin' && !(await checkCafeteriaAccess(db, ctx.user.id, input.cafeteriaId))) {
          throw new Error("Unauthorized access to cafeteria data");
      }

      const startOfDay = new Date(input.reportDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(input.reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const ordersInCafeteria = await db.select({ id: orders.id }).from(orders).where(eq(orders.cafeteriaId, input.cafeteriaId));
      const orderIds = ordersInCafeteria.map(o => o.id);

      const ordersData = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.cafeteriaId, input.cafeteriaId),
            gte(orders.closedAt, startOfDay),
            lte(orders.closedAt, endOfDay),
            eq(orders.status, "closed")
          )
        );

      const itemsData = orderIds.length > 0 ? await db
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.status, "served"),
            gte(orderItems.servedAt, startOfDay),
            lte(orderItems.servedAt, endOfDay),
            (orderIds.length > 0 ? inArray(orderItems.orderId, orderIds) : undefined)
          )
        ) : [];

      const shiftsData = await db
        .select()
        .from(shifts)
        .where(
          and(
            eq(shifts.cafeteriaId, input.cafeteriaId),
            gte(shifts.startTime, startOfDay),
            lte(shifts.startTime, endOfDay)
          )
        );

      const totalSales = calculateTotalSales(ordersData);
      const totalOrders = ordersData.length;
      const totalItemsSold = calculateTotalItemsSold(itemsData);
      const totalPointsDeducted = ordersData.reduce(
        (sum, order) => sum + (Number(order.pointsConsumed) || 0),
        0
      );
      const averageOrderValue = calculateAverageOrderValue(totalSales, totalOrders);

      const reportId = nanoid();
      const now = new Date();

      await db.insert(cafeteriaReports).values({
        id: reportId,
        cafeteriaId: input.cafeteriaId,
        reportType: "daily",
        reportDate: input.reportDate,
        totalSales: String(totalSales),
        totalOrders,
        totalItemsSold,
        totalPointsDeducted: String(totalPointsDeducted),
        averageOrderValue: String(averageOrderValue),
        generatedAt: now,
      });

      return {
        id: reportId,
        cafeteriaId: input.cafeteriaId,
        reportType: "daily",
        reportDate: input.reportDate,
        totalSales,
        totalOrders,
        totalItemsSold,
        totalPointsDeducted,
        averageOrderValue,
        topItems: getTopSellingItems(itemsData, 5),
        topStaff: getTopPerformingStaff(shiftsData, 5),
        peakHours: calculatePeakHours(ordersData),
      };
    }),

  getReport: protectedProcedure
    .input(z.object({ reportId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const reportResult = await db
        .select()
        .from(cafeteriaReports)
        .where(eq(cafeteriaReports.id, input.reportId));

      if (reportResult.length === 0) {
        throw new Error("Report not found");
      }

      const report = reportResult[0];

      if (ctx.user.role !== 'admin' && !(await checkCafeteriaAccess(db, ctx.user.id, report.cafeteriaId))) {
        throw new Error("Unauthorized access to report");
      }

      return {
        id: report.id,
        cafeteriaId: report.cafeteriaId,
        reportType: report.reportType,
        reportDate: report.reportDate,
        totalSales: Number(report.totalSales) || 0,
        totalOrders: report.totalOrders || 0,
        totalItemsSold: report.totalItemsSold || 0,
        totalPointsDeducted: Number(report.totalPointsDeducted) || 0,
        averageOrderValue: Number(report.averageOrderValue) || 0,
        generatedAt: report.generatedAt,
      };
    }),

  getCafeteriaReports: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        reportType: z.enum(["daily", "weekly", "monthly"]).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== 'admin' && !(await checkCafeteriaAccess(db, ctx.user.id, input.cafeteriaId))) {
        throw new Error("Unauthorized access to cafeteria reports");
      }

      const conditions = [eq(cafeteriaReports.cafeteriaId, input.cafeteriaId)];

      if (input.reportType) {
        conditions.push(eq(cafeteriaReports.reportType, input.reportType));
      }

      if (input.startDate) {
        conditions.push(gte(cafeteriaReports.reportDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(cafeteriaReports.reportDate, input.endDate));
      }

      const result = await db
        .select()
        .from(cafeteriaReports)
        .where(and(...conditions));

      return result.map((report) => ({
        id: report.id,
        reportType: report.reportType,
        reportDate: report.reportDate,
        totalSales: Number(report.totalSales) || 0,
        totalOrders: report.totalOrders || 0,
        totalItemsSold: report.totalItemsSold || 0,
        totalPointsDeducted: Number(report.totalPointsDeducted) || 0,
        averageOrderValue: Number(report.averageOrderValue) || 0,
        generatedAt: report.generatedAt,
      }));
    }),

  getTopItemsReport: protectedProcedure
    .input(z.object({ cafeteriaId: z.string(), startDate: z.date().optional(), endDate: z.date().optional(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const itemsData = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.status, "served"));

      return getTopSellingItems(itemsData, input.limit || 5);
    }),

  getTopStaffReport: protectedProcedure
    .input(z.object({ cafeteriaId: z.string(), startDate: z.date().optional(), endDate: z.date().optional(), limit: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const shiftsData = await db
        .select()
        .from(shifts)
        .where(eq(shifts.cafeteriaId, input.cafeteriaId));

      return getTopPerformingStaff(shiftsData, input.limit || 5);
    }),

  getSalesComparison: protectedProcedure
    .input(z.object({ cafeteriaId: z.string(), startDate: z.date(), endDate: z.date() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const ordersData = await db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.cafeteriaId, input.cafeteriaId),
            gte(orders.closedAt, input.startDate),
            lte(orders.closedAt, input.endDate),
            eq(orders.status, "closed")
          )
        );

      const totalSales = calculateTotalSales(ordersData);
      const totalOrders = ordersData.length;
      const totalPointsDeducted = ordersData.reduce(
        (sum, order) => sum + (Number(order.pointsConsumed) || 0),
        0
      );

      return {
        totalSales,
        totalOrders,
        totalItemsSold: 0, // Placeholder as we don't have items here yet, but the client expects it
        totalPointsDeducted,
        averageOrderValue: calculateAverageOrderValue(totalSales, totalOrders),
      };
    }),
});
