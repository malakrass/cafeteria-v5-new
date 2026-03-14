import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { cafeteriaTables, sections } from "../../drizzle/schema";
import {
  getTablesBySection,
  getAvailableTablesInSection,
  getBestFitTable,
  getSectionStats,
  getCafeteriaOccupancy,
  validateTableData,
  validateSectionData,
  getTableStatusDistribution,
} from "../utils/tableEngine";
import { generateQRPrintLayout } from "../utils/qrPrintKit";

export const tablesRouter = router({
  createSection: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const validation = validateSectionData(input.name);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      const id = nanoid();
      const now = new Date();

      await db.insert(sections).values({
        id,
        cafeteriaId: input.cafeteriaId,
        name: input.name,
        displayOrder: 0,
        createdAt: now,
      });

      return {
        id,
        cafeteriaId: input.cafeteriaId,
        name: input.name,
        createdAt: now,
      };
    }),

  getSections: protectedProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const result = await db
        .select()
        .from(sections)
        .where(eq(sections.cafeteriaId, input.cafeteriaId));

      return result.map((section) => ({
        id: section.id,
        cafeteriaId: section.cafeteriaId,
        name: section.name,
        displayOrder: section.displayOrder || 0,
        createdAt: section.createdAt,
      }));
    }),

  createTable: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        sectionId: z.string(),
        tableNumber: z.number().positive(),
        capacity: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const validation = validateTableData(input.tableNumber, input.capacity, input.sectionId);
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }

      const id = nanoid();
      const tableToken = nanoid(32);
      const now = new Date();

      await db.insert(cafeteriaTables).values({
        id,
        cafeteriaId: input.cafeteriaId,
        sectionId: input.sectionId,
        tableNumber: input.tableNumber,
        capacity: input.capacity,
        status: "available",
        tableToken,
        createdAt: now,
      });

      return {
        id,
        cafeteriaId: input.cafeteriaId,
        sectionId: input.sectionId,
        tableNumber: input.tableNumber,
        capacity: input.capacity,
        status: "available",
        tableToken,
        createdAt: now,
      };
    }),

  getTables: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        sectionId: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(cafeteriaTables.cafeteriaId, input.cafeteriaId)];
      if (input.sectionId) {
        conditions.push(eq(cafeteriaTables.sectionId, input.sectionId));
      }

      const result = await db
        .select()
        .from(cafeteriaTables)
        .where(and(...conditions));

      return result.map((table) => ({
        id: table.id,
        cafeteriaId: table.cafeteriaId,
        sectionId: table.sectionId,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        status: table.status,
        tableToken: table.tableToken,
        createdAt: table.createdAt,
      }));
    }),

  updateTableStatus: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        status: z.enum(["available", "occupied", "reserved", "cleaning"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(cafeteriaTables)
        .set({ status: input.status })
        .where(eq(cafeteriaTables.id, input.tableId));

      return {
        success: true,
        tableId: input.tableId,
        status: input.status,
      };
    }),

  getAvailableTables: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        sectionId: z.string().optional(),
        minCapacity: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [eq(cafeteriaTables.cafeteriaId, input.cafeteriaId)];
      if (input.sectionId) {
        conditions.push(eq(cafeteriaTables.sectionId, input.sectionId));
      }

      const result = await db
        .select()
        .from(cafeteriaTables)
        .where(and(...conditions));

      const availableTables = result.filter((t) => t.status === "available");

      if (input.minCapacity !== undefined) {
        return availableTables
          .filter((t) => (t.capacity || 0) >= input.minCapacity!)
          .map((table) => ({
            id: table.id,
            tableNumber: table.tableNumber,
            capacity: table.capacity,
            sectionId: table.sectionId,
          }));
      }

      return availableTables.map((table) => ({
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        sectionId: table.sectionId,
      }));
    }),

  getCafeteriaOccupancy: protectedProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tables = await db
        .select()
        .from(cafeteriaTables)
        .where(eq(cafeteriaTables.cafeteriaId, input.cafeteriaId));

      const sectionsList = await db
        .select()
        .from(sections)
        .where(eq(sections.cafeteriaId, input.cafeteriaId));

      const occupancy = getCafeteriaOccupancy(tables, sectionsList);

      return {
        cafeteriaId: input.cafeteriaId,
        ...occupancy,
      };
    }),

  getTableStatusDistribution: protectedProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tables = await db
        .select()
        .from(cafeteriaTables)
        .where(eq(cafeteriaTables.cafeteriaId, input.cafeteriaId));

      const distribution = getTableStatusDistribution(tables);

      return {
        cafeteriaId: input.cafeteriaId,
        ...distribution,
      };
    }),

  /**
   * Update table details
   */
  updateTable: protectedProcedure
    .input(
      z.object({
        tableId: z.string(),
        tableNumber: z.number().positive().optional(),
        capacity: z.number().positive().optional(),
        sectionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.tableNumber !== undefined) updateData.tableNumber = input.tableNumber;
      if (input.capacity !== undefined) updateData.capacity = input.capacity;
      if (input.sectionId !== undefined) updateData.sectionId = input.sectionId;

      await db
        .update(cafeteriaTables)
        .set(updateData)
        .where(eq(cafeteriaTables.id, input.tableId));

      return {
        success: true,
        tableId: input.tableId,
      };
    }),

  /**
   * Update section details
   */
  updateSection: protectedProcedure
    .input(
      z.object({
        sectionId: z.string(),
        name: z.string().optional(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.displayOrder !== undefined) updateData.displayOrder = input.displayOrder;

      await db
        .update(sections)
        .set(updateData)
        .where(eq(sections.id, input.sectionId));

      return {
        success: true,
        sectionId: input.sectionId,
      };
    }),

  deleteTable: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(cafeteriaTables).where(eq(cafeteriaTables.id, input.tableId));

      return {
        success: true,
        tableId: input.tableId,
      };
    }),

  deleteSection: protectedProcedure
    .input(z.object({ sectionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(sections).where(eq(sections.id, input.sectionId));

      return {
        success: true,
        sectionId: input.sectionId,
      };
    }),

  regenerateTableToken: protectedProcedure
    .input(z.object({ tableId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const newToken = nanoid(32);
      await db
        .update(cafeteriaTables)
        .set({ tableToken: newToken })
        .where(eq(cafeteriaTables.id, input.tableId));

      return {
        success: true,
        tableId: input.tableId,
        tableToken: newToken,
      };
    }),

  generatePrintableQRPack: protectedProcedure
    .input(z.object({ cafeteriaId: z.string(), baseUrl: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const tables = await db
        .select()
        .from(cafeteriaTables)
        .where(eq(cafeteriaTables.cafeteriaId, input.cafeteriaId));

      const tableQRData = tables.map((t) => ({
        tableNumber: t.tableNumber || 0,
        qrToken: t.tableToken || "",
        baseUrl: input.baseUrl,
      }));

      const html = generateQRPrintLayout(tableQRData);
      return { html };
    }),
});
