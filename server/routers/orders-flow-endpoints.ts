// New endpoints to add to orders router for waiter and chef flow
import { protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { orders, orderItems } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const waiterOrdersEndpoint = protectedProcedure
  .input(
    z.object({
      cafeteriaId: z.string(),
      waiterId: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const conditions = [
      eq(orders.cafeteriaId, input.cafeteriaId),
      eq(orders.status, "open"),
    ];

    if (input.waiterId) {
      conditions.push(eq(orders.waiterId, input.waiterId));
    }

    const result = await db
      .select()
      .from(orders)
      .where(and(...conditions));

    const ordersWithItems = await Promise.all(
      result.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));

        return {
          id: order.id,
          tableId: order.tableId,
          waiterId: order.waiterId,
          totalAmount: Number(order.totalAmount) || 0,
          status: order.status,
          source: order.source,
          items: items.map((item) => ({
            id: item.id,
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            status: item.status,
            notes: item.notes,
          })),
          createdAt: order.createdAt,
        };
      })
    );

    return ordersWithItems;
  });

export const chefOrdersEndpoint = protectedProcedure
  .input(
    z.object({
      cafeteriaId: z.string(),
    })
  )
  .query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const items = await db
      .select()
      .from(orderItems)
      .where(
        and(
          eq(orderItems.status, "sent_to_kitchen")
          // Join with orders to filter by cafeteriaId
        )
      );

    // Filter by cafeteria
    const ordersInCafeteria = await db
      .select()
      .from(orders)
      .where(eq(orders.cafeteriaId, input.cafeteriaId));

    const cafeteriaOrderIds = ordersInCafeteria.map((o) => o.id);

    const chefItems = items.filter((item) =>
      cafeteriaOrderIds.includes(item.orderId)
    );

    const itemsWithOrderDetails = await Promise.all(
      chefItems.map(async (item) => {
        const order = ordersInCafeteria.find((o) => o.id === item.orderId);
        return {
          id: item.id,
          orderId: item.orderId,
          tableId: order?.tableId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          status: item.status,
          notes: item.notes,
          sentToKitchenAt: item.sentToKitchenAt,
        };
      })
    );

    return itemsWithOrderDetails;
  });
