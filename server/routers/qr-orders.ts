import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { cafeteriaTables, orders, orderItems, menuItems } from "../../drizzle/schema";
import { and } from "drizzle-orm";
import { logger } from "../utils/logger";

/**
 * QR Table Ordering Router
 * Public endpoints for customer QR-based ordering
 */
export const qrOrdersRouter = router({
  /**
   * Resolve table by token (public endpoint)
   * Returns table details if token is valid
   */
  resolveTableByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const table = await db
        .select()
        .from(cafeteriaTables)
        .where(eq(cafeteriaTables.tableToken, input.token));

      if (!table || table.length === 0) {
        throw new Error("Invalid table token");
      }

      const tableData = table[0];
      return {
        id: tableData.id,
        tableNumber: tableData.tableNumber,
        capacity: tableData.capacity,
        cafeteriaId: tableData.cafeteriaId,
        sectionId: tableData.sectionId,
        status: tableData.status,
      };
    }),

  /**
   * Create customer order from QR scan
   * Links order to table and marks source as "customer"
   */
  createCustomerOrder: publicProcedure
    .input(
      z.object({
        token: z.string(),
        items: z.array(
          z.object({
            menuItemId: z.string(),
            quantity: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Resolve table from token
        const tableResult = await db
          .select()
          .from(cafeteriaTables)
          .where(eq(cafeteriaTables.tableToken, input.token));

        if (!tableResult || tableResult.length === 0) {
          logger.warn("ORDER_SUBMISSION_ERROR", "Invalid table token used", { token: input.token });
          throw new Error("Invalid table token");
        }

        const table = tableResult[0];
        const orderId = nanoid();
        const now = new Date();

        // TASK 3 — Basic Rate Limiting: 1 order per table every 5 seconds
        const recentOrders = await db
          .select()
          .from(orders)
          .where(
            and(
              eq(orders.tableId, table.id),
              eq(orders.source, "customer")
            )
          );

        if (recentOrders.length > 0) {
          const lastOrder = recentOrders[recentOrders.length - 1];
          const timeSinceLastOrder = now.getTime() - new Date(lastOrder.createdAt).getTime();
          if (timeSinceLastOrder < 5000) {
            logger.warn("RATE_LIMIT_EXCEEDED", "Table order rate limit exceeded", { tableId: table.id });
            throw new Error("Please wait before creating another order (Rate limit: 5s)");
          }
        }

        // Calculate total amount from menu items
        let totalAmount = 0;
        const itemsWithPrices = [];

        for (const item of input.items) {
          const menuItem = await db
            .select()
            .from(menuItems)
            .where(eq(menuItems.id, item.menuItemId));

          if (!menuItem || menuItem.length === 0) {
            throw new Error(`Menu item ${item.menuItemId} not found`);
          }

          const price = parseFloat(menuItem[0].price || "0");
          const itemTotal = price * item.quantity;
          totalAmount += itemTotal;

          itemsWithPrices.push({
            ...item,
            price,
            itemTotal,
          });
        }

        // Create order with source = "customer"
        await db.insert(orders).values({
          id: orderId,
          cafeteriaId: table.cafeteriaId,
          tableId: table.id,
          totalAmount: String(totalAmount),
          status: "open",
          source: "customer",
          pointsConsumed: "0",
          createdAt: now,
        });

        // Add order items
        for (const item of itemsWithPrices) {
          const orderItemId = nanoid();
          await db.insert(orderItems).values({
            id: orderItemId,
            orderId,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            unitPrice: String(item.price),
            totalPrice: String(item.itemTotal),
            status: "pending",
            createdAt: now,
          });
        }

        // Update table status to occupied
        await db
          .update(cafeteriaTables)
          .set({ status: "occupied" })
          .where(eq(cafeteriaTables.id, table.id));

        // TASK 2 — Logging: order created and table status changed
        logger.info("ORDER_CREATED", `Customer order ${orderId} created for Table ${table.tableNumber}`, { orderId, tableId: table.id });
        logger.info("TABLE_STATUS_CHANGED", `Table ${table.tableNumber} status changed to occupied`, { tableId: table.id, status: "occupied" });

        return {
          orderId,
          tableId: table.id,
          tableNumber: table.tableNumber,
          totalAmount,
          itemCount: input.items.length,
          status: "open",
          createdAt: now,
        };
      } catch (error: any) {
        logger.error("ORDER_SUBMISSION_ERROR", error.message, { input });
        throw new Error(error.message || "Failed to submit order. Please try again.");
      }
    }),

  /**
   * Get customer order details (public endpoint)
   */
  getCustomerOrder: publicProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId));

      if (!orderResult || orderResult.length === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult[0];

      // Get order items
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, input.orderId));

      return {
        id: order.id,
        tableId: order.tableId,
        totalAmount: order.totalAmount,
        status: order.status,
        source: order.source,
        items: items.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          status: item.status,
        })),
        createdAt: order.createdAt,
      };
    }),
});
