/**
 * Staff Router
 * Handles staff management, permissions, and assignments
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  cafeteriaStaff,
  sections,
  staffSectionAssignments,
  staffCategoryAssignments,
  menuCategories,
} from "../../drizzle/schema";
import {
  canGrantLoginPermission,
  canRevokeLoginPermission,
  getVisibleSections,
  getVisibleCategories,
  isValidStaffRole,
  getDefaultPermissionsForRole,
} from "../utils/staffPermissions";
import {
  grantStaffLoginPermission,
  revokeStaffLoginPermission,
  canStaffLogin,
  assignStaffToSection,
  getStaffSectionAssignments,
  assignStaffToCategory,
  getStaffCategoryAssignments,
  createSection,
  getSectionsByCafeteria,
} from "../db";

export const staffRouter = router({
  /**
   * Create a new staff member
   */
  createStaff: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        name: z.string(),
        role: z.enum(["admin", "manager", "waiter", "chef"]),
        country: z.string().optional(),
        currency: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!isValidStaffRole(input.role)) {
        throw new Error(`Invalid staff role: ${input.role}`);
      }

      const id = nanoid();

      await db.insert(cafeteriaStaff).values({
        id,
        cafeteriaId: input.cafeteriaId,
        name: input.name,
        role: input.role,
        status: "active",
        canLogin: false,
        country: input.country,
        currency: input.currency,
        createdAt: new Date(),
      });

      return {
        id,
        name: input.name,
        role: input.role,
        canLogin: false,
        permissions: getDefaultPermissionsForRole(input.role),
      };
    }),

  /**
   * Get staff members for a cafeteria
   */
  getStaff: protectedProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const staff = await db
        .select()
        .from(cafeteriaStaff)
        .where(eq(cafeteriaStaff.cafeteriaId, input.cafeteriaId));

      return staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
        status: s.status,
        canLogin: s.canLogin,
        loginPermissionGrantedAt: s.loginPermissionGrantedAt,
        loginPermissionGrantedBy: s.loginPermissionGrantedBy,
        lastLoginAt: s.lastLoginAt,
        country: s.country,
        currency: s.currency,
        createdAt: s.createdAt,
      }));
    }),

  /**
   * Grant login permission to staff
   */
  grantLoginPermission: protectedProcedure
    .input(z.object({ staffId: z.string(), targetRole: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if user can grant permission
      const userRole = ctx.user?.role || "user";
      if (!canGrantLoginPermission(userRole, input.targetRole)) {
        throw new Error("You do not have permission to grant login access");
      }

      await grantStaffLoginPermission(input.staffId, ctx.user?.name || "admin");

      return {
        success: true,
        staffId: input.staffId,
        canLogin: true,
      };
    }),

  /**
   * Revoke login permission from staff
   */
  revokeLoginPermission: protectedProcedure
    .input(z.object({ staffId: z.string(), targetRole: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if user can revoke permission
      const userRole = ctx.user?.role || "user";
      if (!canRevokeLoginPermission(userRole, input.targetRole)) {
        throw new Error("You do not have permission to revoke login access");
      }

      await revokeStaffLoginPermission(input.staffId);

      return {
        success: true,
        staffId: input.staffId,
        canLogin: false,
      };
    }),

  /**
   * Check if staff can log in
   */
  canLogin: protectedProcedure
    .input(z.object({ staffId: z.string() }))
    .query(async ({ input }) => {
      const hasPermission = await canStaffLogin(input.staffId);
      return {
        canLogin: hasPermission,
      };
    }),

  /**
   * Assign staff to section (for waiters)
   */
  assignToSection: protectedProcedure
    .input(z.object({ staffId: z.string(), sectionId: z.string() }))
    .mutation(async ({ input }) => {
      await assignStaffToSection(input.staffId, input.sectionId);

      return {
        success: true,
        staffId: input.staffId,
        sectionId: input.sectionId,
      };
    }),

  /**
   * Get sections assigned to staff
   */
  getAssignedSections: protectedProcedure
    .input(z.object({ staffId: z.string() }))
    .query(async ({ input }) => {
      const sectionAssignments = await getStaffSectionAssignments(input.staffId);
      return { sectionIds: sectionAssignments.map(s => ({ id: s.sectionId })) };
    }),

  /**
   * Assign staff to category (for chefs)
   */
  assignToCategory: protectedProcedure
    .input(z.object({ staffId: z.string(), categoryId: z.string() }))
    .mutation(async ({ input }) => {
      await assignStaffToCategory(input.staffId, input.categoryId);

      return {
        success: true,
        staffId: input.staffId,
        categoryId: input.categoryId,
      };
    }),

  /**
   * Get categories assigned to staff
   */
  getAssignedCategories: protectedProcedure
    .input(z.object({ staffId: z.string() }))
    .query(async ({ input }) => {
      const categoryAssignments = await getStaffCategoryAssignments(input.staffId);
      return { categoryIds: categoryAssignments.map(c => ({ id: c.categoryId })) };
    }),

  /**
   * Create a section in cafeteria
   */
  createSection: protectedProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        name: z.string(),
        displayOrder: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createSection(input.cafeteriaId, input.name, input.displayOrder || 0);

      return {
        id,
        name: input.name,
        displayOrder: input.displayOrder || 0,
      };
    }),

  /**
   * Get sections for a cafeteria
   */
  getSections: protectedProcedure
    .input(z.object({ cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const sections_list = await getSectionsByCafeteria(input.cafeteriaId);

      return sections_list.map((s) => ({
        id: s.id,
        name: s.name,
        displayOrder: s.displayOrder,
        createdAt: s.createdAt,
      }));
    }),

  /**
   * Get visible sections for a staff member
   */
  getVisibleSectionsForStaff: protectedProcedure
    .input(z.object({ staffId: z.string(), cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get staff details
      const staff_result = await db
        .select()
        .from(cafeteriaStaff)
        .where(eq(cafeteriaStaff.id, input.staffId));

      if (staff_result.length === 0) {
        throw new Error("Staff not found");
      }

      const staff = staff_result[0];

      // Get all sections
      const all_sections = await getSectionsByCafeteria(input.cafeteriaId);
      const allSectionIds = all_sections.map((s) => s.id);

        // Get assigned sections
      const assignedSectionRaw = await getStaffSectionAssignments(input.staffId);
      const assignedSectionIds = assignedSectionRaw.map((s) => s.sectionId);
      // Get visible sections based on role
      const visibleSectionIds = getVisibleSections(staff.role || "waiter", assignedSectionIds, allSectionIds);
      return {
        visibleSectionIds,
        allSectionIds,
        assignedSectionIds,
      };
    }),

  /**
   * Get visible categories for a staff member
   */
  getVisibleCategoriesForStaff: protectedProcedure
    .input(z.object({ staffId: z.string(), cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get staff details
      const staff_result = await db
        .select()
        .from(cafeteriaStaff)
        .where(eq(cafeteriaStaff.id, input.staffId));

      if (staff_result.length === 0) {
        throw new Error("Staff not found");
      }

      const staff = staff_result[0];

      // Get assigned categories
      const assignedCategoryRaw = await getStaffCategoryAssignments(input.staffId);
      const assignedCategoryIds = assignedCategoryRaw.map((c) => c.categoryId);

      // Get all categories for cafeteria
      const allCategoriesResult = await db
        .select({ id: menuCategories.id })
        .from(menuCategories)
        .where(eq(menuCategories.cafeteriaId, input.cafeteriaId));
      const allCategoryIds: string[] = allCategoriesResult.map((c) => c.id);

      // Get visible categories based on role
      const visibleCategoryIds = getVisibleCategories(
        staff.role || "chef",
        assignedCategoryIds as string[],
        allCategoryIds
      );

      return {
        visibleCategoryIds,
        allCategoryIds,
        assignedCategoryIds,
      };
    }),

  /**
   * Update staff details
   */
  updateStaff: protectedProcedure
    .input(
      z.object({
        staffId: z.string(),
        name: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        country: z.string().optional(),
        currency: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updates: Record<string, any> = {};

      if (input.name) updates.name = input.name;
      if (input.status) updates.status = input.status;
      if (input.country) updates.country = input.country;
      if (input.currency) updates.currency = input.currency;

      if (Object.keys(updates).length === 0) {
        throw new Error("No updates provided");
      }

      await db.update(cafeteriaStaff).set(updates).where(eq(cafeteriaStaff.id, input.staffId));

      return {
        success: true,
        staffId: input.staffId,
        updates,
      };
    }),

  /**
   * Get staff permissions
   */
  getPermissions: protectedProcedure
    .input(z.object({ staffId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const staff_result = await db
        .select()
        .from(cafeteriaStaff)
        .where(eq(cafeteriaStaff.id, input.staffId));

      if (staff_result.length === 0) {
        throw new Error("Staff not found");
      }

      const staff = staff_result[0];
      const permissions = getDefaultPermissionsForRole(staff.role || "waiter");

      return {
        staffId: input.staffId,
        role: staff.role,
        canLogin: staff.canLogin,
        permissions,
      };
    }),

  /**
   * Update staff role
   */
  updateStaffRole: protectedProcedure
    .input(
      z.object({
        staffId: z.string(),
        newRole: z.enum(["admin", "manager", "waiter", "chef"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (!isValidStaffRole(input.newRole)) {
        throw new Error(`Invalid staff role: ${input.newRole}`);
      }

      const permissions = getDefaultPermissionsForRole(input.newRole);

      await db
        .update(cafeteriaStaff)
        .set({
          role: input.newRole,
          permissions: JSON.stringify(permissions),
        })
        .where(eq(cafeteriaStaff.id, input.staffId));

      return {
        success: true,
        staffId: input.staffId,
        newRole: input.newRole,
        permissions,
      };
    }),

  /**
   * Delete a staff member
   */
  deleteStaff: protectedProcedure
    .input(z.object({ staffId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Remove section assignments first
      await db
        .delete(staffSectionAssignments)
        .where(eq(staffSectionAssignments.staffId, input.staffId));

      // Remove category assignments
      await db
        .delete(staffCategoryAssignments)
        .where(eq(staffCategoryAssignments.staffId, input.staffId));

      // Delete the staff member
      await db
        .delete(cafeteriaStaff)
        .where(eq(cafeteriaStaff.id, input.staffId));

      return {
        success: true,
        staffId: input.staffId,
      };
    }),

  /**
   * Toggle staff login permission
   */
  toggleStaffLogin: protectedProcedure
    .input(
      z.object({
        staffId: z.string(),
        enable: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const staffResult = await db
        .select()
        .from(cafeteriaStaff)
        .where(eq(cafeteriaStaff.id, input.staffId));

      if (staffResult.length === 0) {
        throw new Error("Staff not found");
      }

      const now = new Date();
      const updates: Record<string, any> = {
        canLogin: input.enable,
      };

      if (input.enable) {
        updates.loginPermissionGrantedAt = now;
        updates.loginPermissionGrantedBy = ctx.user?.name || "admin";
      }

      await db
        .update(cafeteriaStaff)
        .set(updates)
        .where(eq(cafeteriaStaff.id, input.staffId));

      return {
        success: true,
        staffId: input.staffId,
        canLogin: input.enable,
        updatedAt: now,
      };
    }),
});
