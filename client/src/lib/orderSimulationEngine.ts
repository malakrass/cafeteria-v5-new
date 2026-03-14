import { trpcVanilla } from "./trpcVanilla";

export interface SimulationResult {
  success: boolean;
  message: string;
  ordersCreated?: number;
  errors?: string[];
  duration?: number;
}

/**
 * End-to-End Order Simulation
 * Simulates a complete order lifecycle: customer scan → order → waiter → chef → served → closed
 */
export async function runEndToEndSimulation(cafeteriaId: string): Promise<SimulationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  try {
    // Step 1: Get available table
    const tables = await trpcVanilla.tables.getTables.query({ cafeteriaId });
    const availableTable = tables.find((t) => t.status === "available");

    if (!availableTable) {
      return { success: false, message: "No available tables" };
    }

    // Step 2: Get menu items
    const menuItems = await trpcVanilla.menu.getMenuItems.query({ cafeteriaId });
    if (menuItems.length === 0) {
      return { success: false, message: "No menu items available" };
    }

    // Step 3: Simulate customer order creation
    const items = menuItems
      .sort(() => 0.5 - Math.random())
      .slice(0, 2)
      .map((item) => ({
        menuItemId: item.id,
        quantity: Math.floor(Math.random() * 2) + 1,
      }));

    const order = await trpcVanilla.qrOrders.createCustomerOrder.mutate({
      token: availableTable.tableToken ?? "",
      items,
    });

    // Step 4: Get order items to mark as sent to kitchen
    const orderDetails = await trpcVanilla.qrOrders.getCustomerOrder.query({
      orderId: order.orderId,
    });

    // Step 5: Chef marks items as ready
    for (const item of orderDetails.items) {
      await trpcVanilla.orders.updateItemStatus.mutate({
        orderItemId: item.id,
        newStatus: "in_preparation",
      });

      await trpcVanilla.orders.updateItemStatus.mutate({
        orderItemId: item.id,
        newStatus: "ready",
      });
    }

    // Step 6: Waiter marks order as served
    for (const item of orderDetails.items) {
      await trpcVanilla.orders.updateItemStatus.mutate({
        orderItemId: item.id,
        newStatus: "served",
      });
    }

    // Step 7: Close order
    await trpcVanilla.orders.closeOrder.mutate({
      orderId: order.orderId,
      exchangeRate: 1,
    });

    const duration = Date.now() - startTime;

    return {
      success: true,
      message: `End-to-end simulation completed successfully for Table ${availableTable.tableNumber}`,
      ordersCreated: 1,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    errors.push(error.message || "Unknown error");
    return {
      success: false,
      message: "End-to-end simulation failed",
      errors,
      duration,
    };
  }
}

/**
 * Load Test Simulation
 * Simulates 10 tables ordering simultaneously, each with 3 orders
 */
export async function runLoadTestSimulation(cafeteriaId: string): Promise<SimulationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let ordersCreated = 0;

  try {
    // Get all tables
    const tables = await trpcVanilla.tables.getTables.query({ cafeteriaId });
    const availableTables = tables.filter((t) => t.status === "available").slice(0, 10);

    if (availableTables.length === 0) {
      return { success: false, message: "No available tables for load test" };
    }

    // Get menu items
    const menuItems = await trpcVanilla.menu.getMenuItems.query({ cafeteriaId });
    if (menuItems.length === 0) {
      return { success: false, message: "No menu items available" };
    }

    // Simulate 3 orders per table
    for (const table of availableTables) {
      for (let orderIndex = 0; orderIndex < 3; orderIndex++) {
        try {
          // Create order items
          const items = menuItems
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 2) + 1)
            .map((item) => ({
              menuItemId: item.id,
              quantity: Math.floor(Math.random() * 2) + 1,
            }));

          // Create customer order
          await trpcVanilla.qrOrders.createCustomerOrder.mutate({
            token: table.tableToken ?? "",
            items,
          });

          ordersCreated++;

          // Small delay to avoid overwhelming the server
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error: any) {
          errors.push(`Table ${table.tableNumber}, Order ${orderIndex + 1}: ${error.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    return {
      success: errors.length === 0,
      message: `Load test completed. Created ${ordersCreated} orders across ${availableTables.length} tables`,
      ordersCreated,
      errors: errors.length > 0 ? errors : undefined,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    errors.push(error.message || "Unknown error");
    return {
      success: false,
      message: "Load test simulation failed",
      errors,
      ordersCreated,
      duration,
    };
  }
}
