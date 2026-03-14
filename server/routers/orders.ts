import { z } from "zod";
import { protectedProcedure, staffProcedure, router } from "../_core/trpc";
import { nanoid } from "nanoid";
import { eq, and, asc, desc } from "drizzle-orm";
import { getDb } from "../db";
import {
  orders,
  orderItems,
  cafeterias,
  shiftSales,
  ledgerEntries,
} from "../../drizzle/schema";
import { logger } from "../utils/logger";
import {
  convertBillToPoints,
  canTransitionItemStatus,
} from "../utils/orderEngine";

export const ordersRouter = router({
  createOrder: staffProcedure
    .input(
      z.object({
        cafeteriaId: z.string(),
        tableId: z.string().optional(),
        waiterId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = nanoid();
      const now = new Date();

      await db.insert(orders).values({
        id,
        cafeteriaId: input.cafeteriaId,
        tableId: input.tableId,
        waiterId: input.waiterId,
        status: "open",
        totalAmount: "0",
        pointsConsumed: "0",
        createdAt: now,
      });

      return {
        id,
        status: "open",
        createdAt: now,
      };
    }),

  addItem: staffProcedure
    .input(
      z.object({
        orderId: z.string(),
        menuItemId: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const id = nanoid();
      const totalPrice = input.quantity * input.unitPrice;

      await db.insert(orderItems).values({
        id,
        orderId: input.orderId,
        menuItemId: input.menuItemId,
        quantity: input.quantity,
        unitPrice: String(input.unitPrice),
        totalPrice: String(totalPrice),
        status: "pending",
        notes: input.notes,
        createdAt: new Date(),
      });

      return {
        id,
        status: "pending",
        totalPrice,
      };
    }),

  getOrders: protectedProcedure
    .input(z.object({ cafeteriaId: z.string(), status: z.enum(["open", "closed", "cancelled"]).optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const ordersResult = await (db.query as any).orders.findMany({
        where: and(
          eq(orders.cafeteriaId, input.cafeteriaId),
          input.status ? eq(orders.status, input.status) : undefined
        ),
        with: {
          table: true,
          waiter: true,
          orderItems: {
            with: {
              menuItem: true,
            },
          },
        },
        orderBy: asc(orders.createdAt),
      });

      return (ordersResult as any[]).map(order => ({
        ...order,
        totalAmount: Number(order.totalAmount),
        pointsConsumed: Number(order.pointsConsumed),
        items: (order.orderItems as any[]).map(item => ({
          ...item,
          unitPrice: Number(item.unitPrice),
          totalPrice: Number(item.totalPrice),
          menuItem: item.menuItem ? { ...item.menuItem, price: Number(item.menuItem.price) } : undefined,
        })),
      }));
    }),

  getOrderDetails: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId));

      if (orderResult.length === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult[0];
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, input.orderId));

      return {
        id: order.id,
        cafeteriaId: order.cafeteriaId,
        tableId: order.tableId,
        waiterId: order.waiterId,
        totalAmount: Number(order.totalAmount) || 0,
        status: order.status,
        pointsConsumed: Number(order.pointsConsumed) || 0,
        items: items.map((item) => ({
          id: item.id,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          status: item.status,
          notes: item.notes,
        })),
        createdAt: order.createdAt,
        closedAt: order.closedAt,
      };
    }),

  sendToKitchen: staffProcedure
    .input(z.object({ orderItemId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();

      await db
        .update(orderItems)
        .set({
          status: "sent_to_kitchen",
          sentToKitchenAt: now,
        })
        .where(eq(orderItems.id, input.orderItemId));

      return {
        success: true,
        itemId: input.orderItemId,
        status: "sent_to_kitchen",
      };
    }),

  updateItemStatus: staffProcedure
    .input(
      z.object({
        orderItemId: z.string(),
        newStatus: z.enum(["in_preparation", "ready", "served", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const itemResult = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.id, input.orderItemId));

        if (itemResult.length === 0) {
          throw new Error("Order item not found");
        }

        const item = itemResult[0];

        if (!canTransitionItemStatus(item.status || "pending", input.newStatus)) {
          logger.warn("INVALID_STATUS_TRANSITION", `Attempted invalid transition from ${item.status} to ${input.newStatus}`, { itemId: input.orderItemId });
          throw new Error(
            `Cannot transition from ${item.status} to ${input.newStatus}`
          );
        }

        const updateData: Record<string, any> = { status: input.newStatus };

        if (input.newStatus === "ready") {
          updateData.readyAt = new Date();
        } else if (input.newStatus === "served") {
          updateData.servedAt = new Date();
        }

        await db
          .update(orderItems)
          .set(updateData)
          .where(eq(orderItems.id, input.orderItemId));

        if (input.newStatus === "in_preparation") {
          logger.info("ORDER_ACCEPTED", `Chef started preparing item ${input.orderItemId}`, { itemId: input.orderItemId });
        } else if (input.newStatus === "ready") {
          logger.info("ORDER_READY", `Item ${input.orderItemId} is ready for service`, { itemId: input.orderItemId });
        } else if (input.newStatus === "served") {
          logger.info("ORDER_SERVED", `Item ${input.orderItemId} has been served`, { itemId: input.orderItemId });
        }

        return {
          success: true,
          itemId: input.orderItemId,
          newStatus: input.newStatus,
        };
      } catch (error: any) {
        logger.error("ORDER_UPDATE_ERROR", error.message, { input });
        throw new Error(error.message);
      }
    }),

  getKitchenOrders: staffProcedure
    .input(z.object({ chefId: z.string(), cafeteriaId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.status, "sent_to_kitchen"))
          .orderBy(asc(orderItems.sentToKitchenAt));

        return items.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          status: item.status,
          notes: item.notes,
          sentToKitchenAt: item.sentToKitchenAt,
        }));
      } catch (error: any) {
        logger.error("DATABASE_TIMEOUT", "Failed to fetch kitchen orders", { error: error.message });
        throw new Error("Kitchen queue is temporarily unavailable. Please refresh.");
      }
    }),

  closeOrder: staffProcedure
    .input(
      z.object({
        orderId: z.string(),
        exchangeRate: z.number().positive(),
        shiftId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId));

      if (orderResult.length === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult[0];
      const totalAmount = Number(order.totalAmount) || 0;

      const cafeteriaResult = await db
        .select()
        .from(cafeterias)
        .where(eq(cafeterias.id, order.cafeteriaId));

      if (cafeteriaResult.length === 0) {
        throw new Error("Cafeteria not found");
      }

      const cafeteria = cafeteriaResult[0];
      const currentBalance = Number(cafeteria.pointsBalance) || 0;

      const pointsDeduction = convertBillToPoints(totalAmount, input.exchangeRate);

      if (currentBalance < pointsDeduction) {
        throw new Error("Insufficient points balance");
      }

      const newBalance = currentBalance - pointsDeduction;
      const now = new Date();

      await db
        .update(orders)
        .set({
          status: "closed",
          pointsConsumed: String(pointsDeduction),
          closedAt: now,
        })
        .where(eq(orders.id, input.orderId));

      await db
        .update(cafeterias)
        .set({ pointsBalance: String(newBalance) })
        .where(eq(cafeterias.id, order.cafeteriaId));

      await db.insert(ledgerEntries).values({
        id: nanoid(),
        type: "order_closed",
        ledgerType: "points_deduction",
        description: `Order ${input.orderId} closed: ${pointsDeduction} points deducted`,
        cafeteriaId: order.cafeteriaId,
        amount: String(pointsDeduction),
        refId: input.orderId,
        createdAt: now,
      });

      if (input.shiftId) {
        await db.insert(shiftSales).values({
          id: nanoid(),
          shiftId: input.shiftId,
          orderId: input.orderId,
          amount: String(totalAmount),
          pointsDeducted: String(pointsDeduction),
          createdAt: now,
        });
      }

      return {
        success: true,
        pointsDeducted: pointsDeduction,
      };
    }),
});
