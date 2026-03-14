/**
 * Marketers Router
 * Handles marketer and cafeteria creation with hierarchical reference codes
 */

import { z } from "zod";
import { protectedProcedure, adminProcedure, marketerProcedure, router } from "../_core/trpc";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, getMarketerBalance } from "../db";
import { marketers, cafeterias } from "../../drizzle/schema";
import {
  generateInitialReferenceCode,
  generateChildReferenceCode,
  getParentCode,
  canMarketerCreateChild,
  EntityType,
  ReferenceCodePrefix,
} from "../utils/referenceCodeGenerator";

export const marketersRouter = router({
  /**
   * Create a new root marketer (only for admins)
   */
  createRootMarketer: adminProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Only admins can create root marketers
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can create root marketers");
      }

      const referenceCode = await generateInitialReferenceCode(EntityType.MARKETER);

      const id = nanoid();

      await db.insert(marketers).values({
        id,
        name: input.name,
        email: input.email,
        referenceCode,
        isRoot: true,
        country: input.country,
        currency: input.currency,
        createdAt: new Date(),
      });

      return {
        id,
        name: input.name,
        referenceCode,
        isRoot: true,
      };
    }),

  /**
   * Create a child marketer under an existing marketer
   */
  createChildMarketer: marketerProcedure
    .input(
      z.object({
        parentMarketerCode: z.string(),
        name: z.string(),
        email: z.string().email().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if parent marketer exists
      const parentMarketer = await db
        .select()
        .from(marketers)
        .where(eq(marketers.referenceCode, input.parentMarketerCode));

      if (parentMarketer.length === 0) {
        throw new Error(`Parent marketer not found: ${input.parentMarketerCode}`);
      }

      // Check if parent marketer can create children
      if (!canMarketerCreateChild(input.parentMarketerCode, EntityType.MARKETER)) {
        throw new Error(`Marketer ${input.parentMarketerCode} cannot create child marketers (only son marketers can create cafeterias)`);
      }

      // Generate child reference code
      const childReferenceCode = await generateChildReferenceCode(
        input.parentMarketerCode,
        EntityType.MARKETER
      );

      const id = nanoid();

      await db.insert(marketers).values({
        id,
        name: input.name,
        email: input.email,
        parentId: parentMarketer[0].id,
        referenceCode: childReferenceCode,
        isRoot: false,
        country: input.country,
        currency: input.currency,
        createdAt: new Date(),
      });

      return {
        id,
        name: input.name,
        referenceCode: childReferenceCode,
        parentReferenceCode: input.parentMarketerCode,
        isRoot: false,
      };
    }),

  /**
   * Create a cafeteria under a marketer
   * Only son marketers can create cafeterias
   */
  createCafeteria: marketerProcedure
    .input(
      z.object({
        marketerCode: z.string(),
        name: z.string(),
        location: z.string().optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if marketer exists
      const marketer = await db
        .select()
        .from(marketers)
        .where(eq(marketers.referenceCode, input.marketerCode));

      if (marketer.length === 0) {
        throw new Error(`Marketer not found: ${input.marketerCode}`);
      }

      // Check if marketer can create cafeterias
      if (!canMarketerCreateChild(input.marketerCode, EntityType.CAFETERIA)) {
        throw new Error(`Marketer ${input.marketerCode} cannot create cafeterias (only son marketers can)`);
      }

      // Generate cafeteria reference code
      const cafeteriaReferenceCode = await generateChildReferenceCode(
        input.marketerCode,
        EntityType.CAFETERIA
      );

      const id = nanoid();

      await db.insert(cafeterias).values({
        id,
        marketerId: marketer[0].id,
        name: input.name,
        location: input.location,
        referenceCode: cafeteriaReferenceCode,
        pointsBalance: "0",
        graceMode: false,
        country: input.country,
        currency: input.currency,
        createdAt: new Date(),
      });

      return {
        id,
        name: input.name,
        referenceCode: cafeteriaReferenceCode,
        marketerCode: input.marketerCode,
      };
    }),

  /**
   * Get marketer hierarchy information
   */
  getMarketerHierarchy: marketerProcedure
    .input(z.object({ marketerCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const marketer = await db
        .select()
        .from(marketers)
        .where(eq(marketers.referenceCode, input.marketerCode));

      if (marketer.length === 0) {
        throw new Error(`Marketer not found: ${input.marketerCode}`);
      }

      const marketerData = marketer[0];

      // Get parent information
      let parentInfo = null;
      if (marketerData.parentId) {
        const parent = await db
          .select()
          .from(marketers)
          .where(eq(marketers.id, marketerData.parentId));
        if (parent.length > 0) {
          parentInfo = {
            id: parent[0].id,
            name: parent[0].name,
            referenceCode: parent[0].referenceCode,
          };
        }
      }

      // Get children marketers
      const children = await db
        .select()
        .from(marketers)
        .where(eq(marketers.parentId, marketerData.id));

      // Get cafeterias
      const cafeteriaList = await db
        .select()
        .from(cafeterias)
        .where(eq(cafeterias.marketerId, marketerData.id));

      return {
        id: marketerData.id,
        name: marketerData.name,
        referenceCode: marketerData.referenceCode,
        isRoot: marketerData.isRoot,
        parent: parentInfo,
        childMarketerCount: children.length,
        childMarketers: children.map((c) => ({
          id: c.id,
          name: c.name,
          referenceCode: c.referenceCode,
        })),
        cafeteriaCount: cafeteriaList.length,
        cafeterias: cafeteriaList.map((c) => ({
          id: c.id,
          name: c.name,
          referenceCode: c.referenceCode,
        })),
      };
    }),

  /**
   * Get cafeteria information
   */
  getCafeteria: marketerProcedure
    .input(z.object({ cafeteriaCode: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const cafeteria = await db
        .select()
        .from(cafeterias)
        .where(eq(cafeterias.referenceCode, input.cafeteriaCode));

      if (cafeteria.length === 0) {
        throw new Error(`Cafeteria not found: ${input.cafeteriaCode}`);
      }

      const cafeteriaData = cafeteria[0];

      // Get marketer information
      const marketer = await db
        .select()
        .from(marketers)
        .where(eq(marketers.id, cafeteriaData.marketerId));

      return {
        id: cafeteriaData.id,
        name: cafeteriaData.name,
        referenceCode: cafeteriaData.referenceCode,
        location: cafeteriaData.location,
        pointsBalance: cafeteriaData.pointsBalance,
        graceMode: cafeteriaData.graceMode,
        marketer: marketer.length > 0 ? {
          id: marketer[0].id,
          name: marketer[0].name,
          referenceCode: marketer[0].referenceCode,
        } : null,
      };
    }),
  
  /**
   * Get marketer balance information
   */
  getMarketerBalance: protectedProcedure
    .input(z.object({ marketerId: z.string() }))
    .query(async ({ input }) => {
      const balance = await getMarketerBalance(input.marketerId);
      if (!balance) {
        return {
          pendingBalance: "0",
          availableBalance: "0",
          totalWithdrawn: "0",
        };
      }
      return balance;
    }),
});
