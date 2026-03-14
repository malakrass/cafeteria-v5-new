import {
  pgTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  integer,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

import { relations, sql } from "drizzle-orm";


/**
 * CAFETERIA V2 - Complete Database Schema
 * 18 tables for multi-role cafeteria points management system with recharge-based commissions
 */

// ============================================================================
// Enums
// ============================================================================
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "owner",
  "marketer",
  "cafeteria_admin",
  "manager",
  "waiter",
  "chef",
]);
export const loginMethodEnum = pgEnum("login_method", ["email", "google", "github"]);
export const rechargeStatusEnum = pgEnum("recharge_status", ["pending", "approved", "rejected"]);
export const commissionStatusEnum = pgEnum("commission_status", ["pending", "available", "withdrawn"]);
export const ledgerTypeEnum = pgEnum("ledger_type", [
  "points_deduction",
  "points_credit",
  "commission_pending",
  "commission_available",
  "commission_withdrawn",
  "recharge_approval",
  "points_cancelled",
]);
export const periodTypeEnum = pgEnum("period_type", ["global_first_time", "special_grant"]);
export const tableStatusEnum = pgEnum("table_status", ["available", "occupied", "reserved", "cleaning"]);
export const orderStatusEnum = pgEnum("order_status", ["open", "closed", "cancelled"]);
export const orderItemStatusEnum = pgEnum("order_item_status", [
  "pending",
  "sent_to_kitchen",
  "in_preparation",
  "ready",
  "served",
  "cancelled",
]);
export const shiftStatusEnum = pgEnum("shift_status", ["active", "completed", "cancelled"]);
export const reportTypeEnum = pgEnum("report_type", ["daily", "weekly", "monthly"]);
export const staffStatusEnum = pgEnum("staff_status", ["active", "inactive"]);
export const staffRoleEnum = pgEnum("staff_role", ["admin", "manager", "waiter", "chef"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected"]);

// ============================================================================
// 1. USERS TABLE - Authentication & Authorization
// ============================================================================
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: loginMethodEnum("loginMethod").default("email"),
    role: userRoleEnum("role").default("user").notNull(),
    preferredLanguage: varchar("preferred_language", { length: 10 }).default("en"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().$onUpdate(() => new Date()).notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    cafeteriaId: text("cafeteriaId"),
    referenceCode: varchar("referenceCode", { length: 50 }),
    marketerId: text("marketerId"),
  }
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// 2. MARKETERS TABLE - Hierarchical Marketer Management
// ============================================================================
export const marketers = pgTable(
  "marketers",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 320 }),
    parentId: text("parentId"),
    isRoot: boolean("isRoot").default(false),
    referenceCode: varchar("referenceCode", { length: 50 }).unique(),
    country: varchar("country", { length: 2 }),
    currency: varchar("currency", { length: 3 }),
    currencyOverrideBy: text("currencyOverrideBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const marketersRelations = relations(marketers, ({ one, many }) => ({
  parent: one(marketers, {
    fields: [marketers.parentId],
    references: [marketers.id],
  }),
  children: many(marketers),
  cafeterias: many(cafeterias),
  commissionConfigs: many(commissionConfigs),
  marketerBalance: one(marketerBalances, {
    fields: [marketers.id],
    references: [marketerBalances.marketerId],
  }),
}));

export type Marketer = typeof marketers.$inferSelect;
export type InsertMarketer = typeof marketers.$inferInsert;

// ============================================================================
// 3. CAFETERIAS TABLE - Cafeteria Management with Points & Grace Mode
// ============================================================================
export const cafeterias = pgTable(
  "cafeterias",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    marketerId: text("marketerId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    location: varchar("location", { length: 255 }),
    pointsBalance: decimal("pointsBalance", { precision: 10, scale: 2 }).default("0"),
    graceMode: boolean("graceMode").default(false),
    referenceCode: varchar("referenceCode", { length: 50 }).unique(),
    country: varchar("country", { length: 2 }),
    currency: varchar("currency", { length: 3 }),
    currencyOverrideBy: text("currencyOverrideBy"),
    freeOperationEndDate: timestamp("freeOperationEndDate"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const cafeteriasRelations = relations(cafeterias, ({ one, many }) => ({
  marketer: one(marketers, {
    fields: [cafeterias.marketerId],
    references: [marketers.id],
  }),
  rechargeRequests: many(rechargeRequests),
  sections: many(sections),
  cafeteriaTables: many(cafeteriaTables),
  cafeteriaStaff: many(cafeteriaStaff),
  menuCategories: many(menuCategories),
  orders: many(orders),
  cafeteriaReports: many(cafeteriaReports),
}));

export type Cafeteria = typeof cafeterias.$inferSelect;
export type InsertCafeteria = typeof cafeterias.$inferInsert;

// ============================================================================
// 4. COMMISSION CONFIGS TABLE - Commission Settings
// ============================================================================
export const commissionConfigs = pgTable(
  "commissionConfigs",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    marketerId: text("marketerId").notNull(),
    rate: decimal("rate", { precision: 5, scale: 2 }).default("0"),
    expiryOverrideMonths: integer("expiryOverrideMonths"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const commissionConfigsRelations = relations(commissionConfigs, ({ one }) => ({
  marketer: one(marketers, {
    fields: [commissionConfigs.marketerId],
    references: [marketers.id],
  }),
}));

export type CommissionConfig = typeof commissionConfigs.$inferSelect;
export type InsertCommissionConfig = typeof commissionConfigs.$inferInsert;

// ============================================================================
// 5. RECHARGE REQUESTS TABLE - Recharge Workflow with Image Storage
// ============================================================================
export const rechargeRequests = pgTable(
  "rechargeRequests",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    imageUrl: text("imageUrl"),
    status: rechargeStatusEnum("status").default("pending"),
    processedAt: timestamp("processedAt"),
    processedBy: text("processedBy"),
    notes: text("notes"),
    commissionCalculated: boolean("commissionCalculated").default(false),
    commissionDistributionId: text("commissionDistributionId"),
    pointsAddedToBalance: decimal("pointsAddedToBalance", { precision: 10, scale: 2 }).default("0"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const rechargeRequestsRelations = relations(rechargeRequests, ({ one }) => ({
  cafeteria: one(cafeterias, {
    fields: [rechargeRequests.cafeteriaId],
    references: [cafeterias.id],
  }),
  commissionDistribution: one(commissionDistributions, {
    fields: [rechargeRequests.commissionDistributionId],
    references: [commissionDistributions.id],
  }),
}));

export type RechargeRequest = typeof rechargeRequests.$inferSelect;
export type InsertRechargeRequest = typeof rechargeRequests.$inferInsert;

// ============================================================================
// 6. MARKETER BALANCES TABLE - Track Pending/Available Commissions
// ============================================================================
export const marketerBalances = pgTable(
  "marketerBalances",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    marketerId: text("marketerId").notNull().unique(),
    pendingBalance: decimal("pendingBalance", { precision: 15, scale: 2 }).default("0"),
    availableBalance: decimal("availableBalance", { precision: 15, scale: 2 }).default("0"),
    totalWithdrawn: decimal("totalWithdrawn", { precision: 15, scale: 2 }).default("0"),
    lastUpdated: timestamp("lastUpdated").defaultNow().$onUpdate(() => new Date()).notNull(),
  }
);

export const marketerBalancesRelations = relations(marketerBalances, ({ one }) => ({
  marketer: one(marketers, {
    fields: [marketerBalances.marketerId],
    references: [marketers.id],
  }),
}));

export type MarketerBalance = typeof marketerBalances.$inferSelect;
export type InsertMarketerBalance = typeof marketerBalances.$inferInsert;

// ============================================================================
// 7. COMMISSION DISTRIBUTIONS TABLE - Track Commission Distribution per Recharge
// ============================================================================
export const commissionDistributions = pgTable(
  "commissionDistributions",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    rechargeRequestId: text("rechargeRequestId").notNull(),
    marketerId: text("marketerId").notNull(),
    level: integer("level").notNull(),
    commissionAmount: decimal("commissionAmount", { precision: 15, scale: 2 }).notNull(),
    status: commissionStatusEnum("status").default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const commissionDistributionsRelations = relations(commissionDistributions, ({ one }) => ({
  rechargeRequest: one(rechargeRequests, {
    fields: [commissionDistributions.rechargeRequestId],
    references: [rechargeRequests.id],
  }),
  marketer: one(marketers, {
    fields: [commissionDistributions.marketerId],
    references: [marketers.id],
  }),
}));

export type CommissionDistribution = typeof commissionDistributions.$inferSelect;
export type InsertCommissionDistribution = typeof commissionDistributions.$inferInsert;

// ============================================================================
// 8. CAFETERIA MARKETER RELATIONSHIPS TABLE - Track Commission Lifetime
// ============================================================================
export const cafeteriaMarketerRelationships = pgTable(
  "cafeteriaMarketerRelationships",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    marketerId: text("marketerId").notNull(),
    commissionStartDate: timestamp("commissionStartDate").defaultNow().notNull(),
    commissionExpiryDate: timestamp("commissionExpiryDate").notNull(),
    isExpired: boolean("isExpired").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const cafeteriaMarketerRelationshipsRelations = relations(cafeteriaMarketerRelationships, ({ one }) => ({
  cafeteria: one(cafeterias, {
    fields: [cafeteriaMarketerRelationships.cafeteriaId],
    references: [cafeterias.id],
  }),
  marketer: one(marketers, {
    fields: [cafeteriaMarketerRelationships.marketerId],
    references: [marketers.id],
  }),
}));

export type CafeteriaMarketerRelationship = typeof cafeteriaMarketerRelationships.$inferSelect;
export type InsertCafeteriaMarketerRelationship = typeof cafeteriaMarketerRelationships.$inferInsert;

// ============================================================================
// 9. FREE OPERATION PERIODS TABLE - Track Free Operation Periods
// ============================================================================
export const freeOperationPeriods = pgTable(
  "freeOperationPeriods",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    periodType: periodTypeEnum("periodType").notNull(),
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    reason: text("reason"),
    createdBy: text("createdBy"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const freeOperationPeriodsRelations = relations(freeOperationPeriods, ({ one }) => ({
  cafeteria: one(cafeterias, {
    fields: [freeOperationPeriods.cafeteriaId],
    references: [cafeterias.id],
  }),
}));

export type FreeOperationPeriod = typeof freeOperationPeriods.$inferSelect;
export type InsertFreeOperationPeriod = typeof freeOperationPeriods.$inferInsert;

// ============================================================================
// 10. LEDGER ENTRIES TABLE - Financial Transaction Audit Trail
// ============================================================================
export const ledgerEntries = pgTable(
  "ledgerEntries",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    type: varchar("type", { length: 50 }).notNull(),
    ledgerType: ledgerTypeEnum("ledgerType"),
    description: text("description"),
    cafeteriaId: text("cafeteriaId"),
    marketerId: text("marketerId"),
    amount: decimal("amount", { precision: 10, scale: 2 }),
    refId: text("refId"),
    relatedMarketerIds: jsonb("relatedMarketerIds"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const ledgerEntriesRelations = relations(ledgerEntries, ({ one }) => ({
  cafeteria: one(cafeterias, {
    fields: [ledgerEntries.cafeteriaId],
    references: [cafeterias.id],
  }),
  marketer: one(marketers, {
    fields: [ledgerEntries.marketerId],
    references: [marketers.id],
  }),
}));

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;

// ============================================================================
// 11. SYSTEM CONFIGS TABLE - System-wide Configuration
// ============================================================================
export const systemConfigs = pgTable(
  "systemConfigs",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    key: varchar("key", { length: 255 }).notNull().unique(),
    value: text("value"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export type SystemConfig = typeof systemConfigs.$inferSelect;
export type InsertSystemConfig = typeof systemConfigs.$inferInsert;

// ============================================================================
// 12. SECTIONS TABLE - Table Groupings within Cafeteria
// ============================================================================
export const sections = pgTable(
  "sections",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    displayOrder: integer("displayOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [sections.cafeteriaId],
    references: [cafeterias.id],
  }),
  cafeteriaTables: many(cafeteriaTables),
  staffSectionAssignments: many(staffSectionAssignments),
}));

export type Section = typeof sections.$inferSelect;
export type InsertSection = typeof sections.$inferInsert;

// ============================================================================
// 13. CAFETERIA TABLES TABLE - Table Management
// ============================================================================
export const cafeteriaTables = pgTable(
  "cafeteriaTables",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    sectionId: text("sectionId"),
    tableNumber: integer("tableNumber").notNull(),
    capacity: integer("capacity"),
    status: tableStatusEnum("status").default("available"),
    tableToken: varchar("tableToken", { length: 64 }).unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const cafeteriaTablesRelations = relations(cafeteriaTables, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [cafeteriaTables.cafeteriaId],
    references: [cafeterias.id],
  }),
  section: one(sections, {
    fields: [cafeteriaTables.sectionId],
    references: [sections.id],
  }),
  orders: many(orders),
}));

export type CafeteriaTable = typeof cafeteriaTables.$inferSelect;
export type InsertCafeteriaTable = typeof cafeteriaTables.$inferInsert;

// ============================================================================
// 14. STAFF SECTION ASSIGNMENTS TABLE - Waiter to Section Assignments
// ============================================================================
export const staffSectionAssignments = pgTable(
  "staffSectionAssignments",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    staffId: text("staffId").notNull(),
    sectionId: text("sectionId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const staffSectionAssignmentsRelations = relations(staffSectionAssignments, ({ one }) => ({
  staff: one(cafeteriaStaff, {
    fields: [staffSectionAssignments.staffId],
    references: [cafeteriaStaff.id],
  }),
  section: one(sections, {
    fields: [staffSectionAssignments.sectionId],
    references: [sections.id],
  }),
}));

export type StaffSectionAssignment = typeof staffSectionAssignments.$inferSelect;
export type InsertStaffSectionAssignment = typeof staffSectionAssignments.$inferInsert;

// ============================================================================
// 15. CAFETERIA STAFF TABLE - Staff Management with Login Permissions
// ============================================================================
export const cafeteriaStaff = pgTable(
  "cafeteriaStaff",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    userId: text("userId"),
    name: varchar("name", { length: 255 }).notNull(),
    role: staffRoleEnum("role").default("waiter"),
    status: staffStatusEnum("status").default("active"),
    canLogin: boolean("canLogin").default(false),
    permissions: jsonb("permissions"),
    loginPermissionGrantedAt: timestamp("loginPermissionGrantedAt"),
    loginPermissionGrantedBy: text("loginPermissionGrantedBy"),
    lastLoginAt: timestamp("lastLoginAt"),
    country: varchar("country", { length: 2 }),
    currency: varchar("currency", { length: 3 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const cafeteriaStaffRelations = relations(cafeteriaStaff, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [cafeteriaStaff.cafeteriaId],
    references: [cafeterias.id],
  }),
  user: one(users, {
    fields: [cafeteriaStaff.userId],
    references: [users.id],
  }),
  shifts: many(shifts),
  staffSectionAssignments: many(staffSectionAssignments),
  staffCategoryAssignments: many(staffCategoryAssignments),
  staffPerformance: many(staffPerformance),
}));

export type CafeteriaStaff = typeof cafeteriaStaff.$inferSelect;
export type InsertCafeteriaStaff = typeof cafeteriaStaff.$inferInsert;

// ============================================================================
// 16. MENU CATEGORIES TABLE - Menu Organization
// ============================================================================
export const menuCategories = pgTable(
  "menuCategories",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    displayOrder: integer("displayOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [menuCategories.cafeteriaId],
    references: [cafeterias.id],
  }),
  menuItems: many(menuItems),
  staffCategoryAssignments: many(staffCategoryAssignments),
}));

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;

// ============================================================================
// 17. STAFF CATEGORY ASSIGNMENTS TABLE - Chef to Prep Category Assignments
// ============================================================================
export const staffCategoryAssignments = pgTable(
  "staffCategoryAssignments",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    staffId: text("staffId").notNull(),
    categoryId: text("categoryId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const staffCategoryAssignmentsRelations = relations(staffCategoryAssignments, ({ one }) => ({
  staff: one(cafeteriaStaff, {
    fields: [staffCategoryAssignments.staffId],
    references: [cafeteriaStaff.id],
  }),
  category: one(menuCategories, {
    fields: [staffCategoryAssignments.categoryId],
    references: [menuCategories.id],
  }),
}));

export type StaffCategoryAssignment = typeof staffCategoryAssignments.$inferSelect;
export type InsertStaffCategoryAssignment = typeof staffCategoryAssignments.$inferInsert;

// ============================================================================
// 18. MENU ITEMS TABLE - Individual Menu Items
// ============================================================================
export const menuItems = pgTable(
  "menuItems",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    categoryId: text("categoryId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }),
    available: boolean("available").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
  orderItems: many(orderItems),
}));

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

// ============================================================================
// 19. ORDERS TABLE - Order Tracking with Points Consumption
// ============================================================================
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    tableId: text("tableId"),
    waiterId: text("waiterId"),
    totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0"),
    status: orderStatusEnum("status").default("open"),
    pointsConsumed: decimal("pointsConsumed", { precision: 10, scale: 2 }).default("0"),
    source: varchar("source", { length: 50 }).default("staff"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    closedAt: timestamp("closedAt"),
  }
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [orders.cafeteriaId],
    references: [cafeterias.id],
  }),
  table: one(cafeteriaTables, {
    fields: [orders.tableId],
    references: [cafeteriaTables.id],
  }),
  waiter: one(cafeteriaStaff, {
    fields: [orders.waiterId],
    references: [cafeteriaStaff.id],
  }),
  orderItems: many(orderItems),
  shiftSales: many(shiftSales),
  ledgerEntries: many(ledgerEntries),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ============================================================================
// 20. ORDER ITEMS TABLE - Individual Items in Orders
// ============================================================================
export const orderItems = pgTable(
  "orderItems",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    orderId: text("orderId").notNull(),
    menuItemId: text("menuItemId").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
    totalPrice: decimal("totalPrice", { precision: 10, scale: 2 }).notNull(),
    status: orderItemStatusEnum("status").default("pending"),
    sentToKitchenAt: timestamp("sentToKitchenAt"),
    readyAt: timestamp("readyAt"),
    servedAt: timestamp("servedAt"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ============================================================================
// 21. SHIFTS TABLE - Staff Shift Tracking
// ============================================================================
export const shifts = pgTable(
  "shifts",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    staffId: text("staffId").notNull(),
    startTime: timestamp("startTime").notNull(),
    endTime: timestamp("endTime"),
    status: shiftStatusEnum("status").default("active"),
    totalSales: decimal("totalSales", { precision: 15, scale: 2 }).default("0"),
    totalOrders: integer("totalOrders").default(0),
    totalItemsSold: integer("totalItemsSold").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const shiftsRelations = relations(shifts, ({ one, many }) => ({
  cafeteria: one(cafeterias, {
    fields: [shifts.cafeteriaId],
    references: [cafeterias.id],
  }),
  staff: one(cafeteriaStaff, {
    fields: [shifts.staffId],
    references: [cafeteriaStaff.id],
  }),
  shiftSales: many(shiftSales),
}));

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

// ============================================================================
// 22. SHIFT SALES TABLE - Sales Tracking per Shift
// ============================================================================
export const shiftSales = pgTable(
  "shiftSales",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    shiftId: text("shiftId").notNull(),
    orderId: text("orderId").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    pointsDeducted: decimal("pointsDeducted", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  }
);

export const shiftSalesRelations = relations(shiftSales, ({ one }) => ({
  shift: one(shifts, {
    fields: [shiftSales.shiftId],
    references: [shifts.id],
  }),
  order: one(orders, {
    fields: [shiftSales.orderId],
    references: [orders.id],
  }),
}));

export type ShiftSale = typeof shiftSales.$inferSelect;
export type InsertShiftSale = typeof shiftSales.$inferInsert;

// ============================================================================
// 23. CAFETERIA REPORTS TABLE - Daily/Period Reports
// ============================================================================
export const cafeteriaReports = pgTable(
  "cafeteriaReports",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    cafeteriaId: text("cafeteriaId").notNull(),
    reportType: reportTypeEnum("reportType").notNull(),
    reportDate: timestamp("reportDate").notNull(),
    totalSales: decimal("totalSales", { precision: 15, scale: 2 }).default("0"),
    totalOrders: integer("totalOrders").default(0),
    totalItemsSold: integer("totalItemsSold").default(0),
    totalPointsDeducted: decimal("totalPointsDeducted", { precision: 15, scale: 2 }).default("0"),
    averageOrderValue: decimal("averageOrderValue", { precision: 10, scale: 2 }).default("0"),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  }
);

export const cafeteriaReportsRelations = relations(cafeteriaReports, ({ one }) => ({
  cafeteria: one(cafeterias, {
    fields: [cafeteriaReports.cafeteriaId],
    references: [cafeterias.id],
  }),
}));

export type CafeteriaReport = typeof cafeteriaReports.$inferSelect;
export type InsertCafeteriaReport = typeof cafeteriaReports.$inferInsert;

// ============================================================================
// 24. STAFF PERFORMANCE TABLE - Staff Performance Metrics
// ============================================================================
export const staffPerformance = pgTable(
  "staffPerformance",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    staffId: text("staffId").notNull(),
    cafeteriaId: text("cafeteriaId").notNull(),
    reportDate: timestamp("reportDate").notNull(),
    totalShifts: integer("totalShifts").default(0),
    totalSales: decimal("totalSales", { precision: 15, scale: 2 }).default("0"),
    totalOrders: integer("totalOrders").default(0),
    averageOrderValue: decimal("averageOrderValue", { precision: 10, scale: 2 }).default("0"),
    totalItemsSold: integer("totalItemsSold").default(0),
    totalHoursWorked: decimal("totalHoursWorked", { precision: 8, scale: 2 }).default("0"),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  }
);

export const staffPerformanceRelations = relations(staffPerformance, ({ one }) => ({
  staff: one(cafeteriaStaff, {
    fields: [staffPerformance.staffId],
    references: [cafeteriaStaff.id],
  }),
  cafeteria: one(cafeterias, {
    fields: [staffPerformance.cafeteriaId],
    references: [cafeterias.id],
  }),
}));

export type StaffPerformance = typeof staffPerformance.$inferSelect;
export type InsertStaffPerformance = typeof staffPerformance.$inferInsert;

// ============================================================================
// 25. WITHDRAWAL REQUESTS TABLE - Marketer Withdrawal Workflow
// ============================================================================
export const withdrawalRequests = pgTable(
  "withdrawalRequests",
  {
    id: text("id").primaryKey().$defaultFn(() => nanoid()),
    marketerId: text("marketerId").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    status: withdrawalStatusEnum("status").default("pending"),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
    processedBy: text("processedBy"),
    notes: text("notes"),
  }
);

export const withdrawalRequestsRelations = relations(withdrawalRequests, ({ one }) => ({
  marketer: one(marketers, {
    fields: [withdrawalRequests.marketerId],
    references: [marketers.id],
  }),
}));

export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = typeof withdrawalRequests.$inferInsert;

// ============================================================================
// Helper for nanoid
// ============================================================================
function nanoid() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}
