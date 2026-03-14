# CAFETERIA V2 - API Reference

## Overview

This document provides a comprehensive reference for the CAFETERIA V2 API, built using tRPC. The API is designed to be type-safe end-to-end, leveraging TypeScript and Zod for input and output validation. It is organized into various routers, each handling a specific domain of the application.

## Routers and Procedures

### 1. `authRouter`

**Description:** Handles user authentication and session management.

| Procedure Name | Type    | Input Structure                                | Output Structure                               |
| :------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `me`           | Query   | None                                           | `User` object (if authenticated) or `null`     |
| `logout`       | Mutation| None                                           | `{ success: boolean }`                         |

### 2. `ordersRouter`

**Description:** Manages order creation, item addition, and status updates.

| Procedure Name     | Type    | Input Structure                                | Output Structure                               |
| :----------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `createOrder`      | Mutation| `{ cafeteriaId: string, tableId?: string, waiterId?: string }` | `{ id: string, status: "open", createdAt: Date }` |
| `addItem`          | Mutation| `{ orderId: string, menuItemId: string, quantity: number, unitPrice: number, notes?: string }` | `{ id: string, status: "pending", totalPrice: number }` |
| `updateItemStatus` | Mutation| `{ orderItemId: string, newStatus: "in_preparation" | "ready" | "served" | "cancelled" }` | `{ success: boolean, itemId: string, newStatus: string }` |
| `getKitchenOrders` | Query   | `{ chefId: string, cafeteriaId: string }`      | `OrderItem[]` (filtered by chef and cafeteria) |
| `closeOrder`       | Mutation| `{ orderId: string, exchangeRate: number, shiftId?: string }` | `{ success: boolean, orderId: string, totalAmount: number, pointsDeducted: number, newBalance: number }` |
| `getOrders`        | Query   | `{ cafeteriaId: string, status?: "open" | "closed" }` | `Order[]` (filtered by cafeteria and status)   |
| `getOrder`         | Query   | `{ orderId: string }`                          | `Order` object with `items: OrderItem[]`       |
| `getOrderCompletion`| Query   | `{ orderId: string }`                          | `{ orderId: string, totalItems: number, completedItems: number, completionPercentage: number }` |

### 3. `shiftsRouter`

**Description:** Manages staff shifts, including start/end and metrics.

| Procedure Name        | Type    | Input Structure                                | Output Structure                               |
| :-------------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `startShift`          | Mutation| `{ staffId: string, cafeteriaId: string }`     | `{ id: string, staffId: string, startTime: Date, status: "active" }` |
| `endShift`            | Mutation| `{ shiftId: string }`                          | `{ success: boolean, shiftId: string, endTime: Date, duration: number, status: "completed" }` |
| `getShift`            | Query   | `{ shiftId: string }`                          | `Shift` object with sales details              |
| `getStaffShifts`      | Query   | `{ staffId: string, cafeteriaId: string, status?: "active" | "completed" | "cancelled" }` | `Shift[]` (filtered by staff, cafeteria, status) |
| `getCafeteriaShifts`  | Query   | `{ cafeteriaId: string, startDate?: Date, endDate?: Date }` | `Shift[]` (filtered by cafeteria and date range) |
| `getStaffPerformance` | Query   | `{ staffId: string, cafeteriaId: string, startDate?: Date, endDate?: Date }` | `StaffPerformance[]` (filtered by staff, cafeteria, date range) |
| `getCafeteriaPerformance`| Query   | `{ cafeteriaId: string, startDate?: Date, endDate?: Date }` | `{ cafeteriaId: string, totalSales: number, totalOrders: number, totalItemsSold: number, totalHours: number, averageOrderValue: number, salesPerHour: number, staffCount: number }` |
| `updateShiftMetrics`  | Mutation| `{ shiftId: string, totalSales?: number, totalOrders?: number, totalItemsSold?: number }` | `{ success: boolean, shiftId: string }`        |

### 4. `reportingRouter`

**Description:** Generates various cafeteria reports and analytics.

| Procedure Name        | Type    | Input Structure                                | Output Structure                               |
| :-------------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `generateDailyReport` | Mutation| `{ cafeteriaId: string, date: Date }`          | `{ success: boolean, reportId: string }`       |
| `getReport`           | Query   | `{ reportId: string }`                         | `CafeteriaReport` object                       |
| `getCafeteriaReports` | Query   | `{ cafeteriaId: string, reportType?: "daily" | "weekly" | "monthly", startDate?: Date, endDate?: Date }` | `CafeteriaReport[]` (filtered by cafeteria, type, date range) |
| `getSalesComparison`  | Query   | `{ cafeteriaId: string, startDate?: Date, endDate?: Date }` | `{ totalSales: number, totalOrders: number, totalItemsSold: number, totalPointsDeducted: number, averageOrderValue: number }` |
| `getTopItemsReport`   | Query   | `{ cafeteriaId: string, startDate?: Date, endDate?: Date, limit?: number }` | `{ topItems: { itemId: string, quantity: number }[] }` |
| `getTopStaffReport`   | Query   | `{ cafeteriaId: string, startDate?: Date, endDate?: Date, limit?: number }` | `{ topStaff: { staffId: string, totalSales: number, totalOrders: number }[] }` |

### 5. `menuRouter`

**Description:** Manages menu categories and individual menu items.

| Procedure Name        | Type    | Input Structure                                | Output Structure                               |
| :-------------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `createCategory`      | Mutation| `{ cafeteriaId: string, name: string, description?: string }` | `{ id: string, name: string }`                 |
| `getCategories`       | Query   | `{ cafeteriaId: string }`                      | `MenuCategory[]`                               |
| `createMenuItem`      | Mutation| `{ cafeteriaId: string, categoryId: string, name: string, description?: string, price: number, imageUrl?: string }` | `{ id: string, name: string }`                 |
| `getMenuItems`        | Query   | `{ cafeteriaId: string, categoryId?: string }` | `MenuItem[]` (filtered by cafeteria and category) |
| `updateItemAvailability`| Mutation| `{ itemId: string, isAvailable: boolean }`     | `{ success: boolean, itemId: string, isAvailable: boolean }` |
| `getMenuSummary`      | Query   | `{ cafeteriaId: string }`                      | `{ totalCategories: number, totalItems: number, availableItems: number }` |

### 6. `tablesRouter`

**Description:** Manages cafeteria sections and tables.

| Procedure Name        | Type    | Input Structure                                | Output Structure                               |
| :-------------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `createSection`       | Mutation| `{ cafeteriaId: string, name: string, description?: string }` | `{ id: string, name: string }`                 |
| `getSections`         | Query   | `{ cafeteriaId: string }`                      | `Section[]`                                    |
| `createTable`         | Mutation| `{ cafeteriaId: string, sectionId: string, tableNumber: number, capacity: number }` | `{ id: string, tableNumber: number }`          |
| `getTables`           | Query   | `{ cafeteriaId: string, sectionId?: string }`  | `Table[]` (filtered by cafeteria and section)  |
| `updateTableStatus`   | Mutation| `{ tableId: string, status: "available" | "occupied" | "reserved" | "maintenance" }` | `{ success: boolean, tableId: string, newStatus: string }` |
| `getCafeteriaOccupancy`| Query   | `{ cafeteriaId: string }`                      | `{ totalTables: number, occupiedTables: number, availableTables: number, reservedTables: number, maintenanceTables: number }` |

### 7. `rechargesRouter`

**Description:** Handles recharge requests and cafeteria points balance.

| Procedure Name        | Type    | Input Structure                                | Output Structure                               |
| :-------------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `createRequest`       | Mutation| `{ cafeteriaId: string, amount: number, imageUrl?: string }` | `{ id: string, status: "pending", createdAt: Date }` |
| `getRequests`         | Query   | `{ cafeteriaId: string, status?: "pending" | "approved" | "rejected" }` | `RechargeRequest[]` (filtered by cafeteria and status) |
| `getPendingRequests`  | Query   | None                                           | `RechargeRequest[]` (all pending requests)     |
| `approveRequest`      | Mutation| `{ rechargeRequestId: string, notes?: string }` | `{ success: boolean, rechargeId: string, pointsAdded: number, newBalance: number }` |
| `rejectRequest`       | Mutation| `{ rechargeRequestId: string, reason: string }` | `{ success: boolean, rechargeId: string }`     |
| `getStatistics`       | Query   | `{ cafeteriaId?: string }`                     | `{ total: number, pending: number, approved: number, rejected: number, totalAmount: number, approvedAmount: number }` |
| `getHistory`          | Query   | `{ cafeteriaId: string }`                      | `RechargeHistoryEntry[]` (with commission details) |
| `getCafeteriaDetails` | Query   | `{ cafeteriaId: string }`                      | `{ id: string, name: string, location: string, pointsBalance: string, graceMode: boolean, currency: string, createdAt: Date }` |

### 8. `staffRouter`

**Description:** Manages staff members, roles, and assignments.

| Procedure Name        | Type    | Input Structure                                | Output Structure                               |
| :-------------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `createStaff`         | Mutation| `{ cafeteriaId: string, userId: number, name: string, role: "manager" | "waiter" | "chef" }` | `{ id: string, name: string, role: string }`   |
| `getStaff`            | Query   | `{ cafeteriaId: string, role?: "manager" | "waiter" | "chef" }` | `CafeteriaStaff[]` (filtered by cafeteria and role) |
| `grantLoginPermission`| Mutation| `{ staffId: string, userId: number }`          | `{ success: boolean }`                         |
| `assignToSection`     | Mutation| `{ staffId: string, sectionId: string }`       | `{ success: boolean }`                         |
| `getAssignedSections` | Query   | `{ staffId: string }`                          | `{ sectionIds: string[] }`                     |
| `assignToCategory`    | Mutation| `{ staffId: string, categoryId: string }`      | `{ success: boolean }`                         |
| `getAssignedCategories`| Query   | `{ staffId: string }`                          | `{ categoryIds: string[] }`                    |

### 9. `systemRouter`

**Description:** Provides system-level information and utilities.

| Procedure Name | Type    | Input Structure                                | Output Structure                               |
| :------------- | :------ | :--------------------------------------------- | :--------------------------------------------- |
| `healthcheck`  | Query   | None                                           | `{ status: "ok" }`                             |
| `version`      | Query   | None                                           | `{ version: string }`                          |
