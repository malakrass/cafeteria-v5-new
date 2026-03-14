/**
 * Order Engine
 * Handles order processing, bill calculation, and points conversion
 */

import { addPrecise, multiplyPrecise, dividePrecise, subtractPrecise, roundTo, areEqualPrecise } from "./precision";

/**
 * Order item structure
 */
export interface OrderItemData {
  menuItemId: string;
  quantity: number;
  unitPrice: number | string;
}

/**
 * Order summary structure
 */
export interface OrderSummary {
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
  tax: number;
  total: number;
  averageItemPrice: number;
}

/**
 * Points conversion result
 */
export interface PointsConversionResult {
  billAmount: number;
  exchangeRate: number;
  pointsDeducted: number;
  remainingPoints: number;
}

/**
 * Calculate order summary from items
 */
export function calculateOrderSummary(items: OrderItemData[], taxRate: number = 0.1): OrderSummary {
  if (items.length === 0) {
    return {
      totalItems: 0,
      totalQuantity: 0,
      subtotal: 0,
      tax: 0,
      total: 0,
      averageItemPrice: 0,
    };
  }

  const subtotal = items.reduce((sum, item) => {
    const itemTotal = multiplyPrecise(item.quantity, item.unitPrice);
    return addPrecise(sum, itemTotal);
  }, 0);

  const tax = multiplyPrecise(subtotal, taxRate);
  const total = addPrecise(subtotal, tax);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const averageItemPrice = totalQuantity > 0 ? dividePrecise(total, totalQuantity) : 0;

  return {
    totalItems: items.length,
    totalQuantity,
    subtotal,
    tax,
    total,
    averageItemPrice,
  };
}

/**
 * Calculate bill total from order items
 */
export function calculateBillTotal(items: OrderItemData[]): number {
  const total = items.reduce((sum, item) => {
    const itemTotal = multiplyPrecise(item.quantity, item.unitPrice);
    return addPrecise(sum, itemTotal);
  }, 0);

  return total;
}

/**
 * Convert bill amount to points based on exchange rate
 * Exchange rate: how many currency units = 1 point
 */
export function convertBillToPoints(
  billAmount: number,
  exchangeRate: number = 1
): number {
  if (exchangeRate === 0) {
    throw new Error("Exchange rate cannot be zero");
  }

  return dividePrecise(billAmount, exchangeRate);
}

/**
 * Validate order can be closed (has items, valid total)
 */
export function validateOrderForClosure(items: OrderItemData[], totalAmount: number): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!items || items.length === 0) {
    errors.push("Order must have at least one item");
  }

  if (totalAmount <= 0) {
    errors.push("Order total must be greater than zero");
  }

  const calculatedTotal = calculateBillTotal(items);
  if (!areEqualPrecise(totalAmount, calculatedTotal)) {
    errors.push(
      `Order total mismatch: expected ${roundTo(calculatedTotal).toFixed(2)}, got ${roundTo(totalAmount).toFixed(2)}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if cafeteria has enough points for order
 */
export function canDeductPoints(
  cafeteriaBalance: number,
  pointsRequired: number
): boolean {
  return roundTo(cafeteriaBalance) >= roundTo(pointsRequired);
}

/**
 * Calculate points deduction with validation
 */
export function calculatePointsDeduction(
  billAmount: number,
  exchangeRate: number,
  cafeteriaBalance: number
): {
  pointsDeducted: number;
  newBalance: number;
  canDeduct: boolean;
  insufficientPoints: boolean;
} {
  const pointsRequired = convertBillToPoints(billAmount, exchangeRate);
  const canDeduct = canDeductPoints(cafeteriaBalance, pointsRequired);
  const newBalance = Math.max(0, subtractPrecise(cafeteriaBalance, pointsRequired));

  return {
    pointsDeducted: pointsRequired,
    newBalance,
    canDeduct,
    insufficientPoints: !canDeduct,
  };
}

/**
 * Get order item status progression
 */
export function getItemStatusProgression(): string[] {
  return ["pending", "sent_to_kitchen", "in_preparation", "ready", "served"];
}

/**
 * Check if item can transition to next status
 */
export function canTransitionItemStatus(currentStatus: string, nextStatus: string): boolean {
  const progression = getItemStatusProgression();
  const currentIndex = progression.indexOf(currentStatus);
  const nextIndex = progression.indexOf(nextStatus);

  if (currentIndex === -1 || nextIndex === -1) {
    return false;
  }

  // Allow normal progression (e.g., pending -> sent_to_kitchen)
  if (nextIndex > currentIndex) {
    return true;
  }

  // Allow cancellation from specific states: pending, sent_to_kitchen, in_preparation
  if (nextStatus === "cancelled") {
    const cancellableStates = ["pending", "sent_to_kitchen", "in_preparation"];
    return cancellableStates.includes(currentStatus);
  }

  return false;
}

/**
 * Calculate order completion percentage
 */
export function calculateOrderCompletion(items: any[]): {
  percentage: number;
  completed: number;
  total: number;
} {
  if (items.length === 0) {
    return { percentage: 0, completed: 0, total: 0 };
  }

  const completedItems = items.filter((item) => item.status === "served").length;
  const percentage = Math.round((completedItems / items.length) * 100);

  return {
    percentage,
    completed: completedItems,
    total: items.length,
  };
}

/**
 * Estimate order preparation time based on items and kitchen load
 */
export function estimatePreparationTime(
  items: OrderItemData[],
  baseTimePerItem: number = 5,
  kitchenLoad: number = 1
): number {
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const baseTime = totalQuantity * baseTimePerItem;
  const adjustedTime = Math.ceil(baseTime * kitchenLoad);

  return adjustedTime;
}

/**
 * Format order summary for display
 */
export function formatOrderSummary(summary: OrderSummary): string {
  return `
    Items: ${summary.totalItems}
    Quantity: ${summary.totalQuantity}
    Subtotal: ${roundTo(summary.subtotal).toFixed(2)}
    Tax: ${roundTo(summary.tax).toFixed(2)}
    Total: ${roundTo(summary.total).toFixed(2)}
    Avg Price: ${roundTo(summary.averageItemPrice).toFixed(2)}
  `.trim();
}

/**
 * Calculate discount on order
 */
export function applyDiscount(
  totalAmount: number,
  discountPercentage: number
): {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
} {
  const discountAmount = dividePrecise(multiplyPrecise(totalAmount, discountPercentage), 100);
  const finalAmount = subtractPrecise(totalAmount, discountAmount);

  return {
    originalAmount: roundTo(totalAmount),
    discountAmount,
    finalAmount,
  };
}
