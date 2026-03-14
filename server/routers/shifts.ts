import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq, and, gte, lte } from "drizzle-orm";
import { getDb } from "../db";
import {
  shifts,
  shiftSales,
  staffPerformance,
  cafeteriaStaff,
} from "../../drizzle/schema";
import {
  calculateShiftDuration,
  calculateShiftDurationHours,
  calculateAverageOrderValue,
  calculateSalesPerHour,
  buildShiftSummary,
  buildStaffPerformanceMetrics,
  validateShiftData,
} from "../utils/shiftEngine";

export const shiftsRouter = router({
  startShift: protectedProcedure
    .input(
      z.object({
        staffId: z.string(),
        cafeteriaId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = nanoid();
      const now = new Date();

      await db.insert(shifts).values({
        id,
        cafeteriaId: input.cafeteriaId,
        staffId: input.staffId,
        startTime: now,
        status: "active",
        totalSales: "0",
        totalOrders: 0,
        totalItemsSold: 0,
        createdAt: now,
      });

      return {
        id,
        staffId: input.staffId,
        startTime: now,
        status: "active",
      };
    }),

  endShift: protectedProcedure
    .input(z.object({ shiftId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const shiftResult = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, input.shiftId));

      if (shiftResult.length === 0) {
        throw new Error("Shift not found");
      }

      const shift = shiftResult[0];
      const now = new Date();
      const duration = calculateShiftDurationHours(shift.startTime, now);

      await db.update(shifts).set({
        endTime: now,
        status: "completed",
      }).where(eq(shifts.id, input.shiftId));

      return {
        success: true,
        shiftId: input.shiftId,
        endTime: now,
        duration,
        status: "completed",
      };
    }),

  getShift: protectedProcedure
    .input(z.object({ shiftId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const shiftResult = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, input.shiftId));

      if (shiftResult.length === 0) {
        throw new Error("Shift not found");
      }

      const shift = shiftResult[0];
      const sales = await db
        .select()
        .from(shiftSales)
        .where(eq(shiftSales.shiftId, input.shiftId));

      const duration = calculateShiftDurationHours(shift.startTime, shift.endTime || undefined);

      return {
        id: shift.id,
        staffId: shift.staffId,
        cafeteriaId: shift.cafeteriaId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
        totalSales: Number(shift.totalSales) || 0,
        totalOrders: shift.totalOrders || 0,
        totalItemsSold: shift.totalItemsSold || 0,
        duration,
        sales: sales.map((s) => ({
          id: s.id,
          orderId: s.orderId,
          amount: Number(s.amount) || 0,
          pointsDeducted: Number(s.pointsDeducted) || 0,
        })),
      };
    }),

  getStaffShifts: protectedProcedure
    .input(
      z.object({
        staffId: z.string(),
        cafeteriaId: z.string(),
        status: z.enum(["active", "completed", "cancelled"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(shifts.staffId, input.staffId),
        eq(shifts.cafeteriaId, input.cafeteriaId),
      ];

      if (input.status) {
        conditions.push(eq(shifts.status, input.status));
      }

      const result = await db
        .select()
        .from(shifts)
        .where(and(...conditions));

      return result.map((shift) => ({
        id: shift.id,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
        totalSales: Number(shift.totalSales) || 0,
        totalOrders: shift.totalOrders || 0,
        totalItemsSold: shift.totalItemsSold || 0,
      }));
    }),

  getCafeteriaShifts: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(shifts.cafeteriaId, input.cafeteriaId)];

      if (input.startDate) {
        conditions.push(gte(shifts.startTime, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(shifts.startTime, input.endDate));
      }

      const result = await db
        .select()
        .from(shifts)
        .where(and(...conditions));

      return result.map((shift) => ({
        id: shift.id,
        staffId: shift.staffId,
        cafeteriaId: shift.cafeteriaId,
        startTime: shift.startTime,
        endTime: shift.endTime,
        status: shift.status,
        totalSales: Number(shift.totalSales) || 0,
        totalOrders: shift.totalOrders || 0,
        totalItemsSold: shift.totalItemsSold || 0,
      }));
    }),

  getStaffPerformance: protectedProcedure
    .input(
      z.object({
        staffId: z.string(),
        cafeteriaId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [
        eq(staffPerformance.staffId, input.staffId),
        eq(staffPerformance.cafeteriaId, input.cafeteriaId),
      ];

      if (input.startDate) {
        conditions.push(gte(staffPerformance.reportDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(staffPerformance.reportDate, input.endDate));
      }

      const result = await db
        .select()
        .from(staffPerformance)
        .where(and(...conditions));

      return result.map((perf) => ({
        id: perf.id,
        reportDate: perf.reportDate,
        totalShifts: perf.totalShifts || 0,
        totalSales: Number(perf.totalSales) || 0,
        totalOrders: perf.totalOrders || 0,
        totalItemsSold: perf.totalItemsSold || 0,
        averageOrderValue: Number(perf.averageOrderValue) || 0,
        totalHoursWorked: Number(perf.totalHoursWorked) || 0,
      }));
    }),

  getCafeteriaPerformance: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(staffPerformance.cafeteriaId, input.cafeteriaId)];

      if (input.startDate) {
        conditions.push(gte(staffPerformance.reportDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(staffPerformance.reportDate, input.endDate));
      }

      const result = await db
        .select()
        .from(staffPerformance)
        .where(and(...conditions));

      let totalSales = 0;
      let totalOrders = 0;
      let totalItemsSold = 0;
      let totalHours = 0;

      result.forEach((perf) => {
        totalSales += Number(perf.totalSales) || 0;
        totalOrders += perf.totalOrders || 0;
        totalItemsSold += perf.totalItemsSold || 0;
        totalHours += Number(perf.totalHoursWorked) || 0;
      });

      const averageOrderValue = calculateAverageOrderValue(totalSales, totalOrders);
      const salesPerHour = calculateSalesPerHour(totalSales, totalHours);

      return {
        cafeteriaId: input.cafeteriaId,
        totalSales,
        totalOrders,
        totalItemsSold,
        totalHours,
        averageOrderValue,
        salesPerHour,
        staffCount: result.length,
      };
    }),

  /**
   * Cancel/delete a shift
   */
  cancelShift: protectedProcedure
    .input(z.object({ shiftId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const shiftResult = await db
        .select()
        .from(shifts)
        .where(eq(shifts.id, input.shiftId));

      if (shiftResult.length === 0) {
        throw new Error("Shift not found");
      }

      await db
        .update(shifts)
        .set({ status: "cancelled" })
        .where(eq(shifts.id, input.shiftId));

      return {
        success: true,
        shiftId: input.shiftId,
        status: "cancelled",
      };
    }),

  /**
   * Delete a shift record (admin only)
   */
  deleteShift: protectedProcedure
    .input(z.object({ shiftId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Delete associated shift sales first
      await db
        .delete(shiftSales)
        .where(eq(shiftSales.shiftId, input.shiftId));

      // Delete the shift
      await db
        .delete(shifts)
        .where(eq(shifts.id, input.shiftId));

      return {
        success: true,
        shiftId: input.shiftId,
      };
    }),

  updateShiftMetrics: protectedProcedure
    .input(
      z.object({
        shiftId: z.string(),
        totalSales: z.number().optional(),
        totalOrders: z.number().optional(),
        totalItemsSold: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};

      if (input.totalSales !== undefined) {
        updateData.totalSales = String(input.totalSales);
      }

      if (input.totalOrders !== undefined) {
        updateData.totalOrders = input.totalOrders;
      }

      if (input.totalItemsSold !== undefined) {
        updateData.totalItemsSold = input.totalItemsSold;
      }

      await db
        .update(shifts)
        .set(updateData)
        .where(eq(shifts.id, input.shiftId));

      return {
        success: true,
        shiftId: input.shiftId,
      };
    }),
});
